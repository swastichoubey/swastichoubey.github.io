"""Inputs and outputs live in the artwork folder passed as the first argument
(art-source/ at the repo root, gitignored).

Astra layer fixes against 01_base (all on the shared 1536x1024 canvas).

Writes new files next to the originals (originals untouched):
  03_eye_stars_placed.png   stars inside the detected eye ovals
  04_eyelids_generated.png  lids at 45% (rendered by render_lids(frac))
  05_wavy_mouth_placed.png  under the nose dots (same anchor as surprise mouth)
  06_surprise_mouth_placed.png, 07_sweat_placed.png, 09_cup_placed.png
  astra_eyes.json           oval bounds + lid parameters for the animation
and composites / close-ups to the output folder.
"""
import sys, os, json, warnings
warnings.filterwarnings("ignore")
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, signal

ASSETS, OUT = sys.argv[1], sys.argv[2]
W, H = 1536, 1024
P = lambda n: os.path.join(ASSETS, n)
load = lambda n: Image.open(P(n)).convert("RGBA")

base = load("01_base.png")
B = np.array(base).astype(np.int32)
alpha = B[..., 3]
lum = B[..., :3].mean(-1)
dark = (alpha > 200) & (lum < 60)
opaque = alpha > 200
skin = opaque & ~dark

def content(img, thr=64, pad=3):
    a = np.array(img)[..., 3]
    ys, xs = np.nonzero(a >= thr)
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, img.width), min(ys.max() + pad + 1, img.height))
    return img.crop(box)

def scaled(img, s):
    w, h = max(1, round(img.width * s)), max(1, round(img.height * s))
    return img.convert("RGBa").resize((w, h), Image.LANCZOS).convert("RGBA")

def on_canvas(img, x, y):
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0)); c.paste(img, (int(x), int(y)), img); return c

def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]; return (x * x + y * y) <= r * r

def feasible(mask, forbidden, edge=4):
    hits = signal.fftconvolve(forbidden.astype(np.float32), mask[::-1, ::-1].astype(np.float32), mode="valid")
    ok = hits < 0.5
    ok[:edge], ok[:, :edge], ok[ok.shape[0] - edge:], ok[:, ok.shape[1] - edge:] = False, False, False, False
    return ok

report = {}

# ── Anchors ────────────────────────────────────────────────────────────────
lab, n = ndimage.label(dark)
sizes = ndimage.sum(dark, lab, range(1, n + 1))
# nose dots: small dark blobs just below-left of the right eye
NOSE_CX, NOSE_BOTTOM = 704, 523
MOUTH_TOP = NOSE_BOTTOM + 10

# eye ovals: the dark components under two seed points
def oval_at(x, y):
    l = lab[y, x]
    assert l, f"seed ({x},{y}) is not on a dark pixel"
    return ndimage.binary_fill_holes(lab == l)
ovals = [oval_at(645, 405), oval_at(865, 470)]
eyes = []
for name, m in zip(["left", "right"], ovals):
    ys, xs = np.nonzero(m)
    cx, cy = xs.mean(), ys.mean()
    cov = np.cov(np.vstack([xs - cx, ys - cy]))
    evals, evecs = np.linalg.eigh(cov)
    a, b = 2 * np.sqrt(evals[1]), 2 * np.sqrt(evals[0])          # semi-axes of the best-fit ellipse
    ang = float(np.degrees(np.arctan2(evecs[1, 1], evecs[0, 1])))
    eyes.append(dict(name=name, mask=m,
                     bbox=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                     centre=[round(float(cx), 1), round(float(cy), 1)],
                     semi_axes=[round(float(a), 1), round(float(b), 1)], angle_deg=round(ang, 1),
                     area_px=int(m.sum())))

# body green around each eye, and the base's outline colour / thickness
for e in eyes:
    ring = ndimage.binary_dilation(e["mask"], disk(14)) & ~ndimage.binary_dilation(e["mask"], disk(5)) & skin
    e["skin_rgb"] = [int(v) for v in np.median(B[ring][:, :3], axis=0)]
outline = lab == (int(np.argmax(sizes)) + 1)                       # the character outline: largest dark component
outline_rgb = [int(v) for v in np.median(B[outline][:, :3], axis=0)]
runs = []
for y in range(360, 600, 6):                                      # head's left edge, scanning inwards
    row = outline[y, 480:640]
    xs = np.nonzero(row)[0]
    if len(xs):
        run = 1
        while run < len(row) and row[xs[0] + run]: run += 1
        runs.append(run)
outline_px = float(np.median(runs))

# ── 03 eye stars: upper-left highlight, ~25% of the oval width ─────────────
stars_src = load("03_eye_stars_exact.png")
sa = np.array(stars_src)[..., 3] >= 64
slab, sn = ndimage.label(sa)
ssz = ndimage.sum(sa, slab, range(1, sn + 1))
star_objs = sorted([ndimage.find_objects(slab)[i] for i in range(sn) if ssz[i] > 30],
                   key=lambda o: -(o[0].stop - o[0].start) * (o[1].stop - o[1].start))
stars_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
by_size = sorted(eyes, key=lambda e: -e["area_px"])
for e, (sy, sx) in zip(by_size, star_objs):
    star = stars_src.crop((sx.start - 2, sy.start - 2, sx.stop + 2, sy.stop + 2))
    ow = e["bbox"][2] - e["bbox"][0]
    star = scaled(star, 0.25 * ow / star.width)
    inside = ndimage.binary_erosion(e["mask"], disk(3))
    cx, cy = e["centre"]
    oh = e["bbox"][3] - e["bbox"][1]
    fx, fy = -0.30, -0.32                                           # upper-left of centre, as a fraction of the half-extents
    for _ in range(40):                                             # pull towards the centre until fully inside
        px, py = cx + fx * ow / 2 - star.width / 2, cy + fy * oh / 2 - star.height / 2
        m = np.array(on_canvas(star, round(px), round(py)))[..., 3] >= 32
        if not (m & ~inside).any(): break
        fx *= 0.9; fy *= 0.9
    stars_layer.paste(star, (round(px), round(py)), star)
    e["star"] = dict(size_px=[star.width, star.height], centre=[round(px + star.width / 2), round(py + star.height / 2)],
                     offset_frac=[round(fx, 3), round(fy, 3)])
stars_layer.save(P("03_eye_stars_placed.png"))

# ── 04 eyelids, generated: render_lids(frac) for any lid height ────────────
SS = 4                                                             # supersampling for smooth edges
LID_SAG = 0.10                                                     # lid edge curves down by 10% of the oval height

def render_lids(frac):
    """Lids covering the top `frac` of each oval (0 = open, 1 = fully closed)."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if frac <= 0.01: return layer
    for e in eyes:
        x0, y0, x1, y1 = e["bbox"]; pad = 6
        bx0, by0, bx1, by1 = x0 - pad, y0 - pad, x1 + pad + 1, y1 + pad + 1
        # lid shape: the oval grown by 1.5px (covers its anti-aliased rim), clipped at the lid edge
        m = ndimage.binary_dilation(e["mask"], disk(2))[by0:by1, bx0:bx1]
        big = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize(((bx1 - bx0) * SS, (by1 - by0) * SS), Image.BILINEAR)) > 127
        hh, ww = big.shape
        yy, xx = np.mgrid[0:hh, 0:ww]
        ox, oh = (x0 - bx0) * SS, (y1 - y0 + 1) * SS
        oy = (y0 - by0) * SS
        cx = ((e["centre"][0] - bx0) * SS)
        halfw = (x1 - x0 + 1) * SS / 2
        u = np.clip((xx - cx) / halfw, -1, 1)
        edge = oy + frac * oh + LID_SAG * oh * (1 - u * u) * min(1, frac * 3)
        lid = big & (yy <= edge)
        t = outline_px * SS
        line = big & (np.abs(yy - edge) <= t / 2)
        rgba = np.zeros((hh, ww, 4), np.uint8)
        rgba[lid] = e["skin_rgb"] + [255]
        rgba[line] = outline_rgb + [255]
        tile = Image.fromarray(rgba, "RGBA").convert("RGBa").resize((bx1 - bx0, by1 - by0), Image.LANCZOS).convert("RGBA")
        layer.alpha_composite(tile, (bx0, by0))
    return layer

render_lids(0.45).save(P("04_eyelids_generated.png"))

# ── 05 wavy mouth and 06 surprise mouth: centred under the nose dots ───────
def under_nose(img):
    c = content(img)
    return on_canvas(c, round(NOSE_CX - c.width / 2), MOUTH_TOP), [round(NOSE_CX - c.width / 2), MOUTH_TOP, c.width, c.height]
wavy, report["05_wavy_mouth"] = under_nose(load("05_wavy_mouth.png"))
wavy.save(P("05_wavy_mouth_placed.png"))
surprise, report["06_surprise_mouth"] = under_nose(load("06_surprise_mouth.png"))
surprise.save(P("06_surprise_mouth_placed.png"))

# ── 09 cup (new art): moved, not rescaled, left of Astra on the feet line ──
GROUND = 985
cup_src = content(load("09_cup.png"))
ca = np.array(cup_src)[..., 3] >= 64
clab, cn = ndimage.label(ca); csz = ndimage.sum(ca, clab, range(1, cn + 1))
body = ndimage.find_objects(clab)[int(np.argmax(csz))]
forb = ndimage.binary_dilation(alpha >= 32, disk(12))
for s in np.arange(1.0, 0.5, -0.01):
    c = scaled(cup_src, s) if s < 1 else cup_src
    ok = feasible(np.array(c)[..., 3] >= 32, forb)
    y = round(GROUND - body[0].stop * s)
    if 0 <= y < ok.shape[0]:
        xs = np.nonzero(ok[y])[0]; xs = xs[xs + c.width <= 520]
        if len(xs):
            x = int(xs.max()); cup = on_canvas(c, x, y)
            report["09_cup"] = dict(scale=round(float(s), 2), box=[x, y, x + c.width, y + c.height]); break
cup.save(P("09_cup_placed.png"))

# ── 07 sweat: on the right temple/cheek beside the right eye, 70% size ─────
SWEAT_SCALE = 0.293 * 0.7                                          # previous placement x 0.7
sw = scaled(content(load("07_sweat.png")), SWEAT_SCALE)
right = eyes[1]
target = (right["bbox"][2] + 50, (right["bbox"][1] + right["bbox"][3]) / 2)
# on skin only, clear of dark lines (eye, ear, outline) by 5px
forb = ~skin | ndimage.binary_dilation(dark, disk(5))
ok = feasible(np.array(sw)[..., 3] >= 32, forb)
ys, xs = np.nonzero(ok)
d = np.hypot(xs + sw.width / 2 - target[0], ys + sw.height / 2 - target[1])
if len(d) and d.min() < 120:
    i = int(np.argmin(d)); sweat = on_canvas(sw, xs[i], ys[i])
    report["07_sweat"] = dict(scale=round(SWEAT_SCALE, 3), mode="as drawn", box=[int(xs[i]), int(ys[i]), int(xs[i]) + sw.width, int(ys[i]) + sw.height])
else:
    # pack the three drops individually, top to bottom, down the temple
    src = content(load("07_sweat.png")); a = np.array(src)[..., 3] >= 64
    dl, dn = ndimage.label(a); dsz = ndimage.sum(a, dl, range(1, dn + 1))
    drops = sorted([o for k, o in enumerate(ndimage.find_objects(dl)) if dsz[k] > 200], key=lambda o: o[0].start)
    sweat = Image.new("RGBA", (W, H), (0, 0, 0, 0)); centres = []
    slots = [(target[0] - 8, target[1] - 55), (target[0] + 14, target[1]), (target[0] - 6, target[1] + 55)]
    for (sy, sx), slot in zip(drops, slots):
        piece = scaled(src.crop((sx.start - 3, sy.start - 3, sx.stop + 3, sy.stop + 3)), SWEAT_SCALE)
        f = forb | ndimage.binary_dilation(np.array(sweat)[..., 3] >= 32, disk(4))
        ok = feasible(np.array(piece)[..., 3] >= 32, f)
        py, px = np.nonzero(ok)
        j = int(np.argmin(np.hypot(px + piece.width / 2 - slot[0], py + piece.height / 2 - slot[1])))
        sweat.paste(piece, (int(px[j]), int(py[j])), piece); centres.append([int(px[j] + piece.width / 2), int(py[j] + piece.height / 2)])
    report["07_sweat"] = dict(scale=round(SWEAT_SCALE, 3), mode="drops packed down the temple", drop_centres=centres)
sweat.save(P("07_sweat_placed.png"))

# ── Record eye geometry for the animation ──────────────────────────────────
eyes_json = dict(
    canvas=[W, H],
    note="Pixel coordinates on the 1536x1024 source canvas. Clamp star (pupil) movement inside each oval; "
         "lids cover the top `frac` of an oval (0 open, 1 closed), edge sagging by lid_sag x oval height, "
         "grown by 2px past the oval so its rim is covered.",
    outline_rgb=outline_rgb, outline_px=outline_px, lid_sag=LID_SAG, lid_rest_frac=0.45,
    eyes=[{k: v for k, v in e.items() if k != "mask"} for e in eyes],
)
with open(P("astra_eyes.json"), "w") as f: json.dump(eyes_json, f, indent=1)
report["eyes"] = eyes_json["eyes"]; report["outline"] = dict(rgb=outline_rgb, px=outline_px)
print(json.dumps(report, indent=1))

# ── Composites ─────────────────────────────────────────────────────────────
BG = (5, 5, 15, 255)
def comp(layers):
    im = Image.new("RGBA", (W, H), BG); im.alpha_composite(base)
    for l in layers: im.alpha_composite(l)
    return im
L = lambda n: load(n)
zzz = L("08_zzz_placed.png")

# A: current layers exactly as they are (for "what needs fixing")
comp([L("03_eye_stars_exact.png"), L("04_eyelids.png"), L("02_orbit_front.png"), L("05_wavy_mouth.png"),
      L("07_sweat_placed.png") if False else load("07_sweat_placed.png"), zzz, L("09_cup.png")]).convert("RGB").save(os.path.join(OUT, "A_asis_rest.png"))
comp([L("03_eye_stars_exact.png"), L("02_orbit_front.png"), L("06_surprise_mouth.png"), L("09_cup.png")]).convert("RGB").save(os.path.join(OUT, "A_asis_awake.png"))

# B: with the fixes
lids45 = render_lids(0.45)
rest = comp([stars_layer, lids45, wavy, sweat, zzz, cup]); rest.convert("RGB").save(os.path.join(OUT, "B_rest.png"))
awake = comp([stars_layer, surprise, cup]); awake.convert("RGB").save(os.path.join(OUT, "B_awake.png"))
FACE = (540, 300, 1120, 640)
for name, im in [("rest", rest), ("awake", awake)]:
    im.crop(FACE).resize(((FACE[2] - FACE[0]) * 2, (FACE[3] - FACE[1]) * 2), Image.LANCZOS).convert("RGB").save(os.path.join(OUT, f"B_face_{name}_2x.png"))
# lid-height strip: the animation range
strip = Image.new("RGB", ((FACE[2] - FACE[0]) * 4, FACE[3] - FACE[1] + 30), (0, 0, 0))
dr = ImageDraw.Draw(strip)
for k, frac in enumerate([0.0, 0.45, 0.75, 1.0]):
    strip.paste(comp([stars_layer, render_lids(frac)]).crop(FACE).convert("RGB"), (k * (FACE[2] - FACE[0]), 30))
    dr.text((k * (FACE[2] - FACE[0]) + 8, 6), f"lid {int(frac * 100)}%", fill=(255, 255, 255), font_size=18)
strip.save(os.path.join(OUT, "B_lid_heights.png"))
