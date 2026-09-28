"""Round 2: seamless lids with round-capped lid line, oriented cup, previews.

Writes (next to the originals, which stay untouched):
  04_eyelids_generated.png  lids at rest height (45%)
  04_lid_skin.png           the inpainted skin inside each (grown) oval — what
                            the animation paints lids with at any height
  09_cup_placed.png         from 09_cup_oriented.png
  astra_eyes.json           oval geometry + lid parameters
Previews (scratchpad only): 1x of the trimmed ~400px export and ~180px display size.
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
B = np.array(base).astype(np.float64)
alpha = B[..., 3]
dark = (alpha > 200) & (B[..., :3].mean(-1) < 60)
skin = (alpha > 200) & ~dark

def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]; return (x * x + y * y) <= r * r

def content(img, thr=64, pad=3):
    a = np.array(img)[..., 3]; ys, xs = np.nonzero(a >= thr)
    return img.crop((max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, img.width), min(ys.max() + pad + 1, img.height)))

def scaled(img, s):
    return img.convert("RGBa").resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS).convert("RGBA")

def on_canvas(img, x, y):
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0)); c.paste(img, (int(x), int(y)), img); return c

def feasible(mask, forbidden, edge=4):
    hits = signal.fftconvolve(forbidden.astype(np.float32), mask[::-1, ::-1].astype(np.float32), mode="valid")
    ok = hits < 0.5
    ok[:edge], ok[:, :edge], ok[ok.shape[0] - edge:], ok[:, ok.shape[1] - edge:] = False, False, False, False
    return ok

geo = json.load(open(P("astra_eyes.json")))
outline_rgb, outline_px = geo["outline_rgb"], geo["outline_px"]
lab, _ = ndimage.label(dark)
eyes = []
for e in geo["eyes"]:
    cx, cy = e["centre"]
    m = ndimage.binary_fill_holes(lab == lab[int(cy), int(cx)])
    eyes.append(dict(e, mask=m))

# ── Skin under the lids: harmonic inpainting from the surrounding skin ─────
# Solve Laplace's equation inside the grown oval with the surrounding skin as
# the boundary, so the fill continues the base's shading with no seam.
# Dark pixels (outline, nose dots) are not used as boundary values.
GROW = 3
lid_skin = np.zeros((H, W, 4), np.float64)
for e in eyes:
    region = ndimage.binary_dilation(e["mask"], disk(GROW))
    x0, y0, x1, y1 = e["bbox"]; pad = 24
    sl = (slice(y0 - pad, y1 + pad + 1), slice(x0 - pad, x1 + pad + 1))
    U = region[sl]; K = skin[sl] & ~U
    img = B[sl][..., :3].copy()
    img[U] = np.median(img[K & ndimage.binary_dilation(U, disk(12))], axis=0)
    # exact solve: each unknown equals the mean of its valid neighbours
    # (unknowns or known skin); dark neighbours are ignored
    from scipy.sparse import lil_matrix
    from scipy.sparse.linalg import spsolve
    idx = -np.ones(U.shape, int); uy, ux = np.nonzero(U); idx[uy, ux] = np.arange(len(uy))
    A = lil_matrix((len(uy), len(uy))); rhs = np.zeros((len(uy), 3))
    for k, (y, x) in enumerate(zip(uy, ux)):
        n = 0
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if not (0 <= ny < U.shape[0] and 0 <= nx < U.shape[1]): continue
            if U[ny, nx]: A[k, idx[ny, nx]] = -1; n += 1
            elif K[ny, nx]: rhs[k] += img[ny, nx]; n += 1
        A[k, k] = n
    A = A.tocsr()
    for c in range(3): img[uy, ux, c] = spsolve(A, rhs[:, c])
    tile = lid_skin[sl]
    tile[U, :3] = img[U]; tile[U, 3] = 255
    e["region"] = region
    e["skin_fill"] = lid_skin                                       # shared canvas-sized array
Image.fromarray(lid_skin.round().astype(np.uint8), "RGBA").save(P("04_lid_skin.png"))

# ── Lids: fill = inpainted skin, line = round-capped stroke ────────────────
SS = 4
LID_SAG = 0.10

def lid_edge_params(frac):
    # the edge curves down in the middle, most at mid-close; flattens near fully
    # closed so the last of the eye disappears as a thin crescent, not two slivers
    return LID_SAG * min(1.0, frac * 3) * (1 - np.clip((frac - 0.7) / 0.3, 0, 1) ** 2)

def render_lids(frac):
    layer = np.zeros((H, W, 4), np.float64)
    if frac <= 0.01: return Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sag = lid_edge_params(frac)
    t = outline_px * SS
    for e in eyes:
        x0, y0, x1, y1 = e["bbox"]; pad = int(outline_px) + 8
        bx0, by0, bx1, by1 = x0 - pad, y0 - pad, x1 + pad + 1, y1 + pad + 1
        bw, bh = (bx1 - bx0) * SS, (by1 - by0) * SS
        reg = np.array(Image.fromarray((e["region"][by0:by1, bx0:bx1] * 255).astype(np.uint8)).resize((bw, bh), Image.BILINEAR)) > 127
        yy, xx = np.mgrid[0:bh, 0:bw]
        # 0..1 spans the grown oval (its anti-aliased rim included), so 100% covers it all
        oy, oh = (y0 - GROW - by0) * SS, (y1 - y0 + 1 + 2 * GROW) * SS
        cx, halfw = (e["centre"][0] - bx0) * SS, (x1 - x0 + 1) * SS / 2
        u = np.clip((xx - cx) / halfw, -1, 1)
        edge = oy + frac * oh + sag * oh * (1 - u * u)
        lid = reg & (yy <= edge)
        # lid line: every pixel within t/2 of the part of the edge curve that lies
        # inside the lid region — distance to a point set, so the ends are round
        cols = np.arange(bw)
        ey = np.round(edge[0]).astype(int)
        on = (ey >= 0) & (ey < bh)
        pts = np.zeros((bh, bw), bool)
        inner = ndimage.binary_erosion(reg, disk(max(1, int(t / 2) - SS)))
        keep = on.copy(); keep[on] = inner[ey[on], cols[on]]
        pts[ey[keep], cols[keep]] = True
        line = ndimage.distance_transform_edt(~pts) <= t / 2 if pts.any() else np.zeros_like(pts)
        fill = np.array(Image.fromarray(lid_skin[by0:by1, bx0:bx1].round().astype(np.uint8), "RGBA").resize((bw, bh), Image.BILINEAR)).astype(np.float64)
        rgba = np.zeros((bh, bw, 4))
        rgba[lid] = fill[lid]; rgba[lid, 3] = 255
        line_a = 1 - np.clip((frac - 0.9) / 0.1, 0, 1)
        rgba[line, :3] = rgba[line, :3] * (1 - line_a) + np.array(outline_rgb) * line_a
        rgba[line, 3] = np.maximum(rgba[line, 3], 255 * line_a)
        tile = Image.fromarray(rgba.round().astype(np.uint8), "RGBA").convert("RGBa").resize((bx1 - bx0, by1 - by0), Image.BOX).convert("RGBA")
        layer[by0:by1, bx0:bx1] = np.array(tile)
    return Image.fromarray(layer.astype(np.uint8), "RGBA")

render_lids(0.45).save(P("04_eyelids_generated.png"))

# seam check: along the lid's outer boundary, how much does the lid differ from
# the skin just outside it? (max per-channel difference, 0-255)
def seam(frac):
    comp = Image.new("RGBA", (W, H), (5, 5, 15, 255)); comp.alpha_composite(base); comp.alpha_composite(render_lids(frac))
    C = np.array(comp).astype(np.float64)[..., :3]
    lids_a = np.array(render_lids(frac))[..., 3] > 250
    line = ndimage.binary_dilation(np.array(render_lids(frac))[..., :3].sum(-1) < 150, disk(2)) & lids_a
    inner = lids_a & ~line & ~ndimage.binary_erosion(lids_a, disk(2))
    outer = ndimage.binary_dilation(lids_a, disk(3)) & ~lids_a & skin
    if not inner.any(): return None
    # compare each boundary pixel inside the lid with the mean of skin just outside nearby
    diffs = []
    ys, xs = np.nonzero(inner)
    for y, x in zip(ys[::3], xs[::3]):
        win = outer[y - 4:y + 5, x - 4:x + 5]
        if win.any(): diffs.append(np.abs(C[y, x] - C[y - 4:y + 5, x - 4:x + 5][win].mean(0)).max())
    return round(float(np.percentile(diffs, 95)), 1), round(float(np.max(diffs)), 1)

def window_metric(C, inner, outer):
    diffs = []
    ys, xs = np.nonzero(inner)
    for y, x in zip(ys[::3], xs[::3]):
        win = outer[y - 4:y + 5, x - 4:x + 5]
        if win.any(): diffs.append(np.abs(C[y, x] - C[y - 4:y + 5, x - 4:x + 5][win].mean(0)).max())
    return round(float(np.percentile(diffs, 95)), 1), round(float(np.max(diffs)), 1)

# baseline: the same measurement on untouched skin, using the right eye's
# shape moved 150px up onto the forehead
shape = np.roll(eyes[1]["region"], -150, axis=0)
C0 = np.array(base).astype(np.float64)[..., :3]
b_inner = shape & ~ndimage.binary_erosion(shape, disk(2)) & skin
b_outer = ndimage.binary_dilation(shape, disk(3)) & ~shape & skin
report = {"seam_baseline_plain_skin_p95_max": window_metric(C0, b_inner, b_outer),
          "seam_p95_max": {f"{int(f * 100)}%": seam(f) for f in (0.2, 0.45, 0.75, 1.0)}}

# ── Cup: 09_cup_oriented, left of Astra, bottom on the feet line ───────────
GROUND = 985
cup_src = content(load("09_cup_oriented.png"))
ca = np.array(cup_src)[..., 3] >= 64
cl, cn = ndimage.label(ca); csz = ndimage.sum(ca, cl, range(1, cn + 1))
body = ndimage.find_objects(cl)[int(np.argmax(csz))]
forb = ndimage.binary_dilation(alpha >= 32, disk(12))
for s in np.arange(1.0, 0.5, -0.01):
    c = scaled(cup_src, s) if s < 1 else cup_src
    ok = feasible(np.array(c)[..., 3] >= 32, forb)
    y = round(GROUND - body[0].stop * s)
    xs = np.nonzero(ok[y])[0] if 0 <= y < ok.shape[0] else []
    xs = [x for x in xs if x + c.width <= 520]
    if len(xs):
        x = int(max(xs)); cup = on_canvas(c, x, y)
        report["09_cup"] = dict(scale=round(float(s), 2), box=[x, y, x + c.width, y + c.height]); break
cup.save(P("09_cup_placed.png"))

# ── Geometry for the animation ─────────────────────────────────────────────
geo["lid"] = dict(
    rest_frac=0.45, sag=LID_SAG, grow_px=GROW,
    sag_schedule="sag * min(1, 3*frac) * (1 - clamp((frac-0.7)/0.3, 0, 1)^2)",
    line="outline colour, outline_px wide, round caps, drawn along the part of the edge inside the grown oval",
    fill="04_lid_skin.png (inpainted skin inside each oval grown by grow_px)")
json.dump(geo, open(P("astra_eyes.json"), "w"), indent=1)

# ── States, shared trim box, previews ──────────────────────────────────────
L = load
stars, wavy, surprise = L("03_eye_stars_placed.png"), L("05_wavy_mouth_placed.png"), L("06_surprise_mouth_placed.png")
sweat, zzz = L("07_sweat_placed.png"), L("08_zzz_placed.png")
lids_rest, lids_closed = render_lids(0.45), render_lids(1.0)
REST = [base, stars, lids_rest, wavy, sweat, zzz, cup]
AWAKE = [base, stars, surprise, cup]
union = np.zeros((H, W), bool)
for l in REST + AWAKE + [lids_closed]:
    union |= np.array(l)[..., 3] >= 8
ys, xs = np.nonzero(union)
PAD = 6
box = (max(xs.min() - PAD, 0), max(ys.min() - PAD, 0), min(xs.max() + PAD + 1, W), min(ys.max() + PAD + 1, H))
EXPORT_W = 400
scale = EXPORT_W / (box[2] - box[0])
report["trim_box"] = box
report["export_size"] = [EXPORT_W, round((box[3] - box[1]) * scale)]

def state(layers):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for l in layers: im.alpha_composite(l)
    return im.crop(box)

def on_bg(img, bg=(5, 5, 15, 255)):
    c = Image.new("RGBA", img.size, bg); c.alpha_composite(img); return c.convert("RGB")

for name, layers in [("rest", REST), ("awake", AWAKE)]:
    full = state(layers)
    exp = full.convert("RGBa").resize(tuple(report["export_size"]), Image.LANCZOS).convert("RGBA")
    on_bg(exp).save(os.path.join(OUT, f"export_{name}_1x.png"))
    disp_w = 180
    disp = exp.convert("RGBa").resize((disp_w, round(exp.height * disp_w / exp.width)), Image.LANCZOS).convert("RGBA")
    on_bg(disp).save(os.path.join(OUT, f"display_{name}_180.png"))
    report[f"display_{name}"] = list(disp.size)

# side-by-side sheets at true pixel size
def sheet(names, fname, gap=24):
    ims = [Image.open(os.path.join(OUT, n)) for n in names]
    s = Image.new("RGB", (sum(i.width for i in ims) + gap * (len(ims) + 1), max(i.height for i in ims) + 2 * gap), (5, 5, 15))
    x = gap
    for i in ims: s.paste(i, (x, gap)); x += i.width + gap
    s.save(os.path.join(OUT, fname))
sheet(["export_rest_1x.png", "export_awake_1x.png"], "sheet_export_1x.png")
sheet(["display_rest_180.png", "display_awake_180.png"], "sheet_display_180.png")

# lid heights with the new fill/line, 3x crop of the right eye area for seams
FACE = (540, 300, 1120, 640)
strip = Image.new("RGB", ((FACE[2] - FACE[0]) * 4, FACE[3] - FACE[1] + 30), (0, 0, 0))
d = ImageDraw.Draw(strip)
for k, f in enumerate([0.0, 0.45, 0.75, 1.0]):
    im = Image.new("RGBA", (W, H), (5, 5, 15, 255)); im.alpha_composite(base); im.alpha_composite(stars); im.alpha_composite(render_lids(f))
    strip.paste(im.crop(FACE).convert("RGB"), (k * (FACE[2] - FACE[0]), 30))
    d.text((k * (FACE[2] - FACE[0]) + 8, 6), f"lid {int(f * 100)}%", fill=(255, 255, 255), font_size=18)
strip.save(os.path.join(OUT, "lid_heights_v2.png"))
for f in (0.45, 1.0):
    im = Image.new("RGBA", (W, H), (5, 5, 15, 255)); im.alpha_composite(base); im.alpha_composite(render_lids(f))
    im.crop((740, 380, 990, 570)).resize((750, 570), Image.NEAREST).convert("RGB").save(os.path.join(OUT, f"lid_{int(f*100)}_right_eye_3x.png"))
print(json.dumps(report, indent=1, default=int))
