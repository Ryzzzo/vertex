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
ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "work")

for master in sorted(glob.glob(os.path.join(ROOT, "*", "*-desktop.avif"))):
    stem = master[:-5]
    im = Image.open(master).convert("RGB")
    for w in WIDTHS:
        h = round(im.height * w / im.width)
        small = im.resize((w, h), Image.LANCZOS)
        small.save(f"{stem}-{w}.avif", quality=72, speed=4)
        small.save(f"{stem}-{w}.webp", quality=86, method=6)
        print(os.path.relpath(f"{stem}-{w}", ROOT), w, "x", h,
              os.path.getsize(f"{stem}-{w}.avif")//1024, "KB avif",
              os.path.getsize(f"{stem}-{w}.webp")//1024, "KB webp")
