"""Place 10_smile.png like the other mouths: scaled to their width (64 px)
and centred under the nose dots at the shared mouth anchor. Writes
10_smile_placed.png next to the original.

Usage: python scripts/astra/place_smile.py
"""
import os
import numpy as np
from PIL import Image

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "art-source")
NOSE_CX, MOUTH_TOP, MOUTH_W = 704, 533, 64          # same anchor as build_face.py; width of the other mouths

im = Image.open(os.path.join(SRC, "10_smile.png")).convert("RGBA")
a = np.array(im)[..., 3]
ys, xs = np.nonzero(a >= 64)
content = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))   # drops faint stray pixels
s = MOUTH_W / content.width
content = content.convert("RGBa").resize((MOUTH_W, max(1, round(content.height * s))), Image.LANCZOS).convert("RGBA")
out = Image.new("RGBA", im.size, (0, 0, 0, 0))
x, y = round(NOSE_CX - content.width / 2), MOUTH_TOP + 3                # +3 matches the others' content top (536)
out.paste(content, (x, y), content)
out.save(os.path.join(SRC, "10_smile_placed.png"))
print(f"scale {s:.4f}  placed box {x},{y} {content.width}x{content.height}")
