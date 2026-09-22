"""Patch the Ops Queue Triage static export.

The demo under public/labs/ops-table/ is a Next static export whose SOURCE NO
LONGER EXISTS -- never committed here, not on the GitHub account, and only two
commits ever touched the folder, both adding the build. So fixes have to be
applied to the artifact, and they have to be re-appliable, because any future
rebuild wipes them. That is what this file is for. Same reason
build-fee-engine-theme.py exists.

Edits are made at the BYTE level on ASCII-only targets, so the middot and other
non-ASCII in the bundle cannot be damaged by an encoding round-trip.

Run:  python scripts/patch-ops-table.py          (report only)
      python scripts/patch-ops-table.py --write
"""
import glob, os, sys

WRITE = "--write" in sys.argv
ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "labs", "ops-table")

# 1. "1 filters active"
#
# The status bar renders the active-filter count with a hard-coded plural:
#
#     o({...x,q:v})>0 && jsxs("span",{children:["\u00b7 ",o({...x,q:v})," filters active"]})
#
# `o({...x,q:v})` is the count. Calling it a third time for the noun is what
# minified React does anyway and costs nothing, and it avoids introducing a
# binding into a minified scope whose names are not ours to choose.
PATCHES = [
    (
        "plural filter count",
        b'o({...x,q:v})," filters active"',
        b'o({...x,q:v}),1===o({...x,q:v})?" filter active":" filters active"',
    ),
]

targets = sorted(glob.glob(os.path.join(ROOT, "_next", "static", "chunks", "*.js")))
applied = 0
for name, old, new in PATCHES:
    where = []
    for p in targets:
        with open(p, "rb") as f:
            data = f.read()
        n = data.count(old)
        if n:
            where.append((p, n, data, new if new not in data else None))
    done = sum(1 for p in targets
               if new in open(p, "rb").read())
    if done and not where:
        print("%-22s already applied" % name)
        continue
    if not where:
        print("%-22s NOT FOUND -- the bundle changed; re-derive before shipping" % name)
        sys.exit(1)
    for p, n, data, _ in where:
        if n != 1:
            print("%-22s %d matches in %s -- expected exactly 1" % (name, n, os.path.basename(p)))
            sys.exit(1)
        print("%-22s %s  (%d byte%+d)" % (name, os.path.basename(p), len(data), len(new) - len(old)))
        if WRITE:
            with open(p, "wb") as f:
                f.write(data.replace(old, new, 1))
            applied += 1

print("\n%d patch(es)%s" % (len(PATCHES), " WRITTEN" if WRITE else " (dry run)"))
