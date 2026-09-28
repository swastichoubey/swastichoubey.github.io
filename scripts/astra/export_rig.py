"""Export Astra's layers for the in-page rig (src/Astra.jsx).

Reads the placed / generated source layers in src/assets/ (1536x1024, all in
01_base's coordinate frame), trims them to their shared bounding box plus an
8% transparent margin on every side (so bob / tilt never clips), scales to
EXPORT_W wide and writes WebP layers to src/assets/astra/ plus rig.json with
every position in export pixels.

Full-frame layers (same size, stacked at 0,0): base, star_left, star_right,
wavy, surprise, smile, sweat, zzz, cup. Per-eye crops for the animated lids:
eyemask_{left,right} (grown oval, used as a CSS mask) and lidskin_{left,right}
(inpainted skin the lid is filled with).

Usage: python scripts/astra/export_rig.py

Pipeline (Python 3 + numpy, scipy, Pillow; dev-only, not an npm dependency):
  place_stickers.py <assets> <preview-dir>   07 sweat / 08 zzz relative to 01_base
  build_face.py     <assets> <preview-dir>   eye ovals -> astra_eyes.json, stars, mouths, sweat on the temple
  build_face2.py    <assets> <preview-dir>   inpainted lid skin, lids, 09_cup_oriented placement
  place_smile.py                             10_smile under the nose dots
  export_rig.py                              this file: trimmed WebP layers + rig.json
"""
import json, os, warnings
warnings.filterwarnings("ignore")
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "src", "assets")
OUT = os.path.join(SRC, "astra")
EXPORT_W = 500
MARGIN = 0.08
# The exported lid mask is the eye oval grown by this many source px: enough
# (~2.4 export px) that its soft edge lands on clean skin rather than on the
# oval's dark anti-aliased rim, which would otherwise show as a faint ring.
GROW = 8

load = lambda n: Image.open(os.path.join(SRC, n)).convert("RGBA")
geo = json.load(open(os.path.join(SRC, "astra_eyes.json")))

layers = {
    "base": load("01_base.png"),
    "wavy": load("05_wavy_mouth_placed.png"),
    "surprise": load("06_surprise_mouth_placed.png"),
    "smile": load("10_smile_placed.png"),
    "sweat": load("07_sweat_placed.png"),
    "zzz": load("08_zzz_placed.png"),
    "cup": load("09_cup_placed.png"),
}
stars = load("03_eye_stars_placed.png")
lid_skin = load("04_lid_skin.png")
W, H = layers["base"].size

# split the two stars, and rebuild the grown oval masks from 01_base
B = np.array(layers["base"]).astype(int)
dark = (B[..., 3] > 200) & (B[..., :3].mean(-1) < 60)
lab, _ = ndimage.label(dark)
yy, xx = np.ogrid[-GROW:GROW + 1, -GROW:GROW + 1]
eyes = []
for e in geo["eyes"]:
    cx, cy = e["centre"]
    oval = ndimage.binary_fill_holes(lab == lab[int(cy), int(cx)])
    grown = ndimage.binary_dilation(oval, structure=(xx * xx + yy * yy) <= GROW * GROW)
    x0, y0, x1, y1 = e["bbox"]
    star = np.array(stars).copy()
    keep = np.zeros((H, W), bool); keep[y0:y1 + 1, x0:x1 + 1] = True
    star[~keep] = 0
    layers[f"star_{e['name']}"] = Image.fromarray(star, "RGBA")
    eyes.append(dict(e, grown=grown))

# shared bounding box over every layer (lids live inside the grown ovals)
union = np.zeros((H, W), bool)
for im in layers.values():
    union |= np.array(im)[..., 3] >= 8
for e in eyes:
    union |= e["grown"]
ys, xs = np.nonzero(union)
bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
mx, my = round((bx1 - bx0) * MARGIN), round((by1 - by0) * MARGIN)
cx0, cy0 = bx0 - mx, by0 - my                               # padded box in source px (may be < 0)
cw, ch = (bx1 - bx0) + 2 * mx, (by1 - by0) + 2 * my
s = EXPORT_W / cw
EW, EH = EXPORT_W, round(ch * s)

def padded(im):
    """Crop the padded box from a source-frame layer (transparent outside the canvas)."""
    c = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    c.paste(im, (-cx0, -cy0))
    return c

def resized(im, size):
    return im.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")

T = lambda x, y: [round((x - cx0) * s, 2), round((y - cy0) * s, 2)]   # source px -> export px

os.makedirs(OUT, exist_ok=True)
sizes = {}
def save(im, name, lossless=False):
    path = os.path.join(OUT, f"{name}.webp")
    im.save(path, "WEBP", quality=90, method=6, lossless=lossless)
    sizes[name] = os.path.getsize(path)

def centre_of(im):
    a = np.array(im)[..., 3] >= 32
    ys, xs = np.nonzero(a)
    return T((xs.min() + xs.max() + 1) / 2, (ys.min() + ys.max() + 1) / 2), [round((xs.max() + 1 - xs.min()) * s, 2), round((ys.max() + 1 - ys.min()) * s, 2)]

rig = dict(size=[EW, EH], source_scale=round(s, 5), layers={}, eyes=[])
for name, im in layers.items():
    save(resized(padded(im), (EW, EH)), name)
    c, wh = centre_of(im)
    rig["layers"][name] = dict(file=f"{name}.webp", centre=c, size=wh)

for e in eyes:
    ys, xs = np.nonzero(e["grown"])
    gx0, gy0, gx1, gy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    # crop boxes snapped to whole export pixels, so the mask and fill line up exactly
    ex0, ey0 = int(np.floor((gx0 - cx0) * s)), int(np.floor((gy0 - cy0) * s))
    ex1, ey1 = int(np.ceil((gx1 - cx0) * s)), int(np.ceil((gy1 - cy0) * s))
    src_box = (cx0 + ex0 / s, cy0 + ey0 / s, cx0 + ex1 / s, cy0 + ey1 / s)
    # white + alpha: used as a CSS mask-image, only the alpha matters
    m = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    m.putalpha(Image.fromarray((e["grown"] * 255).astype(np.uint8)))
    box = tuple(round(v) for v in src_box)
    save(resized(m.crop(box), (ex1 - ex0, ey1 - ey0)), f"eyemask_{e['name']}")
    # lid skin made fully opaque (edge colours extended outwards), so the oval
    # mask alone defines the lid's edge — no second soft edge to show a ring
    ls = np.array(lid_skin.crop(box))
    inside = ls[..., 3] > 250
    _, (iy, ix) = ndimage.distance_transform_edt(~inside, return_indices=True)
    ls = ls[iy, ix]; ls[..., 3] = 255
    save(Image.fromarray(ls, "RGBA").resize((ex1 - ex0, ey1 - ey0), Image.LANCZOS), f"lidskin_{e['name']}")
    a, b = e["semi_axes"]
    star = rig["layers"][f"star_{e['name']}"]
    rig["eyes"].append(dict(
        name=e["name"],
        box=[ex0, ey0, ex1 - ex0, ey1 - ey0],                  # lid / mask crop, export px
        centre=T(*e["centre"]),
        # axis-aligned half-extents of the oval (from its bbox), export px — for clamping
        half=[round((e["bbox"][2] - e["bbox"][0] + 1) / 2 * s, 2), round((e["bbox"][3] - e["bbox"][1] + 1) / 2 * s, 2)],
        star_rest=star["centre"], star_size=star["size"],
    ))
lid = geo["lid"]
rig["lid"] = dict(rest_frac=lid["rest_frac"], sag=lid["sag"], line_px=round(geo["outline_px"] * s, 2),
                  line_rgb=geo["outline_rgb"])
json.dump(rig, open(os.path.join(OUT, "rig.json"), "w"), indent=1)

print(f"padded box (source px): x {cx0}..{cx0 + cw}, y {cy0}..{cy0 + ch}  margin {mx}x{my}px")
print(f"export size: {EW}x{EH}, scale {s:.4f}")
for k, v in sizes.items(): print(f"  {k:18} {v / 1024:6.1f} KB")
print(f"  {'TOTAL':18} {sum(sizes.values()) / 1024:6.1f} KB")
