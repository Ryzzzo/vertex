"""
Build sized variants of every *-desktop.avif master under public/work.

Vercel's optimizer passes AVIF sources through unresized, so the browser was
downscaling 3840px bitmaps to ~536px cards. Each master becomes
<name>-{640,960,1280,1920}.{avif,webp}; components reference those directly.
Run: python3 scripts/build-shot-variants.py
"""
import glob, os
from PIL import Image

WIDTHS = (640, 960, 1280, 1920)
# Two roots: client work, and Lab captures. A lab shot under public/work
# would have been less code and a worse path.
HERE = os.path.dirname(__file__)
ROOTS = [os.path.join(HERE, "..", "public", "work"),
         os.path.join(HERE, "..", "public", "labs-shots")]

masters = [m for ROOT in ROOTS
           for m in sorted(glob.glob(os.path.join(ROOT, "*", "*-desktop.avif")))]
for master in masters:
    stem = master[:-5]
    im = Image.open(master).convert("RGB")
    for w in WIDTHS:
        h = round(im.height * w / im.width)
        small = im.resize((w, h), Image.LANCZOS)
        small.save(f"{stem}-{w}.avif", quality=72, speed=4)
        small.save(f"{stem}-{w}.webp", quality=86, method=6)
        print(os.path.relpath(f"{stem}-{w}", os.path.dirname(os.path.dirname(master))), w, "x", h,
              os.path.getsize(f"{stem}-{w}.avif")//1024, "KB avif",
              os.path.getsize(f"{stem}-{w}.webp")//1024, "KB webp")
