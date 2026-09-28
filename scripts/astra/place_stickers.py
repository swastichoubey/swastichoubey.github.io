"""Inputs and outputs live in the artwork folder passed as the first argument
(art-source/ at the repo root, gitignored).

Place stickers 06-09 relative to 01_base on the shared 1536x1024 canvas.

Every placement is a search: the sticker is scaled, then positioned where
none of its pixels come within a margin of Astra (01_base) or of stickers
already placed, and entirely on the canvas, choosing the position closest
to its target. Originals are untouched; results go to *_placed.png.
"""
import sys, os, json, warnings
warnings.filterwarnings("ignore")
import numpy as np
from PIL import Image
from scipy import ndimage, signal

ASSETS, OUT = sys.argv[1], sys.argv[2]
W, H = 1536, 1024
EDGE = 4                                     # keep this far from the canvas edge

def load(name):
    return Image.open(os.path.join(ASSETS, name)).convert("RGBA")

base = load("01_base.png")
base_a = np.array(base)[..., 3] >= 32

def content(img, thr=64, pad=3):
    """Crop to solid content (drops faint stray pixels far from it)."""
    a = np.array(img)[..., 3]
    ys, xs = np.nonzero(a >= thr)
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, W), min(ys.max() + pad + 1, H))
    return img.crop(box), box

def scaled(img, s):
    w, h = max(1, round(img.width * s)), max(1, round(img.height * s))
    # premultiplied resize: no dark fringes on anti-aliased edges
    return img.convert("RGBa").resize((w, h), Image.LANCZOS).convert("RGBA")

def feasible(mask, forbidden):
    """Boolean map over top-left positions (y, x): no overlap and on-canvas."""
    k = mask[::-1, ::-1].astype(np.float32)
    hits = signal.fftconvolve(forbidden.astype(np.float32), k, mode="valid")
    ok = hits < 0.5
    ok[:EDGE, :] = False; ok[:, :EDGE] = False
    ok[ok.shape[0] - EDGE:, :] = False; ok[:, ok.shape[1] - EDGE:] = False
    return ok

def dilate(mask, r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return ndimage.binary_dilation(mask, structure=(x * x + y * y) <= r * r)

layers, report = {}, {}
forbidden_base = base_a.copy()
placed_union = np.zeros((H, W), bool)

def put(name, img, x, y):
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(img, (x, y), img)
    layers[name] = canvas
    global placed_union
    placed_union |= np.array(canvas)[..., 3] >= 32

# ── 06 surprise mouth: centred under the nose dots, eye-gap wide ───────────
NOSE_CX, NOSE_BOTTOM, EYE_GAP = 704, 523, 72
m, _ = content(load("06_surprise_mouth.png"))
s = EYE_GAP / m.width
m = scaled(m, s)
mx, my = round(NOSE_CX - m.width / 2), NOSE_BOTTOM + 10
put("06_surprise_mouth", m, mx, my)
report["06_surprise_mouth"] = dict(scale=round(s, 3), box=[mx, my, mx + m.width, my + m.height])

# ── 09 cup: left of Astra, bottom on the feet line, as tall as the head ────
GROUND, HEAD_H, MARGIN_CUP = 985, 490, 12
cup_src, cup_box = content(load("09_cup.png"))
cup_a = np.array(cup_src)[..., 3] >= 64
lab, n = ndimage.label(cup_a)
sizes = ndimage.sum(cup_a, lab, range(1, n + 1))
body = ndimage.find_objects(lab)[int(np.argmax(sizes))]          # the cup itself, not the sparkles
body_h, body_bottom = body[0].stop - body[0].start, body[0].stop
forb = dilate(forbidden_base, MARGIN_CUP)
for s in np.arange(HEAD_H / body_h, 0.3, -0.005):
    c = scaled(cup_src, s)
    ok = feasible(np.array(c)[..., 3] >= 32, forb)
    y = round(GROUND - body_bottom * s)                          # body bottom on the ground line
    if 0 <= y < ok.shape[0] and ok[y].any():
        xs = np.nonzero(ok[y])[0]
        # left of Astra only, and as close to his hand as allowed
        xs = xs[xs + c.width <= 520]
        if len(xs):
            x = int(xs.max())
            put("09_cup", c, x, y)
            report["09_cup"] = dict(scale=round(float(s), 3), body_height=round(body_h * s), head_height=HEAD_H,
                                    box=[x, y, x + c.width, y + c.height])
            break

# ── 08 zzz: above and slightly right of the head, clear of antenna/ring ────
ZZZ_TARGET, ZZZ_MARGIN, ZZZ_MAX_DIST = (1010, 85), 16, 170
z_src, _ = content(load("08_zzz.png"))
forb = dilate(forbidden_base | placed_union, ZZZ_MARGIN)
for s in np.arange(0.4, 0.08, -0.01):
    z = scaled(z_src, s)
    ok = feasible(np.array(z)[..., 3] >= 32, forb)
    ys, xs = np.nonzero(ok)
    if not len(xs): continue
    cx, cy = xs + z.width / 2, ys + z.height / 2
    d = np.hypot(cx - ZZZ_TARGET[0], cy - ZZZ_TARGET[1])
    i = int(np.argmin(d))
    if d[i] <= ZZZ_MAX_DIST:
        put("08_zzz", z, int(xs[i]), int(ys[i]))
        report["08_zzz"] = dict(scale=round(float(s), 3), centre=[round(float(cx[i])), round(float(cy[i]))],
                                target=ZZZ_TARGET, box=[int(xs[i]), int(ys[i]), int(xs[i]) + z.width, int(ys[i]) + z.height])
        break

# ── 07 sweat: beside the head on the right, drops ~3x a nose dot ───────────
DOT_W, SWEAT_TARGET, SWEAT_MARGIN = 19, (1265, 330), 10
sw_src, _ = content(load("07_sweat.png"))
sw_a = np.array(sw_src)[..., 3] >= 64
lab, n = ndimage.label(sw_a)
sizes = ndimage.sum(sw_a, lab, range(1, n + 1))
drops = [o for i, o in enumerate(ndimage.find_objects(lab)) if sizes[i] > 200]
drop_w = np.mean([o[1].stop - o[1].start for o in drops])
s = 3 * DOT_W / drop_w
sw = scaled(sw_src, s)
forb = dilate(forbidden_base | placed_union, SWEAT_MARGIN)
ok = feasible(np.array(sw)[..., 3] >= 32, forb)
ys, xs = np.nonzero(ok)
cx, cy = xs + sw.width / 2, ys + sw.height / 2
d = np.hypot(cx - SWEAT_TARGET[0], cy - SWEAT_TARGET[1])
i = int(np.argmin(d)) if len(d) else None
if i is not None and d[i] <= 110:
    put("07_sweat", sw, int(xs[i]), int(ys[i]))
    report["07_sweat"] = dict(scale=round(float(s), 3), mode="as drawn", drop_width=round(drop_w * s),
                              centre=[round(float(cx[i])), round(float(cy[i]))], target=SWEAT_TARGET)
else:
    # The drawn arrangement is too tall for the gap between the ring arcs:
    # keep each drop as drawn but pack them closer (same order, top to bottom),
    # each placed at the nearest clear spot to its slot.
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    slots = [(1245, 290), (1295, 340), (1250, 390)]
    placed = []
    order = sorted(drops, key=lambda o: o[0].start)
    for (sy, sx), slot in zip(order, slots):
        piece = sw_src.crop((sx.start - 3, sy.start - 3, sx.stop + 3, sy.stop + 3))
        piece = scaled(piece, s)
        f = dilate(forbidden_base | placed_union | (np.array(canvas)[..., 3] >= 32), SWEAT_MARGIN)
        ok = feasible(np.array(piece)[..., 3] >= 32, f)
        py, px = np.nonzero(ok)
        dd = np.hypot(px + piece.width / 2 - slot[0], py + piece.height / 2 - slot[1])
        j = int(np.argmin(dd))
        canvas.paste(piece, (int(px[j]), int(py[j])), piece)
        placed.append([int(px[j] + piece.width / 2), int(py[j] + piece.height / 2)])
    layers["07_sweat"] = canvas
    placed_union |= np.array(canvas)[..., 3] >= 32
    report["07_sweat"] = dict(scale=round(float(s), 3), mode="drops packed closer", drop_width=round(drop_w * s),
                              drop_centres=placed)

# ── save placed layers + checks ────────────────────────────────────────────
for name, img in layers.items():
    img.save(os.path.join(ASSETS, f"{name}_placed.png"))
for name, img in layers.items():
    if name == "06_surprise_mouth": continue
    a = np.array(img)[..., 3] >= 32
    report[name]["overlap_with_astra_px"] = int((a & base_a).sum())
    report[name]["min_clearance_px"] = round(float(ndimage.distance_transform_edt(~base_a)[a].min()), 1)
print(json.dumps(report, indent=1, default=int))

def comp(names):
    im = Image.new("RGBA", (W, H), (5, 5, 15, 255))
    im = Image.alpha_composite(im, base)
    for n in names: im = Image.alpha_composite(im, layers[n])
    return im.convert("RGB")
comp(["07_sweat", "08_zzz", "09_cup"]).save(os.path.join(OUT, "placed_rest.png"))
comp(["06_surprise_mouth", "09_cup"]).save(os.path.join(OUT, "placed_awake.png"))
