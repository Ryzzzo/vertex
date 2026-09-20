# -*- coding: utf-8 -*-
"""British -> American in USER-FACING STRINGS ONLY.

Operates inside quoted string literals, so identifiers (normaliseQuery,
normaliseCell, normaliseAnswer) and comments are left alone by construction.
Place names stay British on purpose: the museum is in the west of England.

Run from the repo root:
      python scripts/americanize.py            (report only)
      python scripts/americanize.py --write
"""
import io, os, re, sys

WRITE = "--write" in sys.argv

# British stem -> American stem. Order matters: longer stems first.
MAP = [
    ("discoloured", "discolored"),
    ("mislabelled", "mislabeled"),
    ("labelling", "labeling"),
    ("labelled", "labeled"),
    ("colours", "colors"), ("coloured", "colored"), ("colour", "color"),
    ("catalogued", "cataloged"), ("cataloguing", "cataloging"),
    ("catalogues", "catalogs"), ("catalogue", "catalog"),
    ("recognised", "recognized"), ("recognises", "recognizes"),
    ("recognising", "recognizing"), ("recognise", "recognize"),
    ("organisation", "organization"), ("organised", "organized"),
    ("organises", "organizes"), ("organising", "organizing"), ("organise", "organize"),
    ("analysed", "analyzed"), ("analyses", "analyzes"),
    ("analysing", "analyzing"), ("analyse", "analyze"),
    ("normalisation", "normalization"), ("normalised", "normalized"),
    ("normalises", "normalizes"), ("normalising", "normalizing"), ("normalise", "normalize"),
    ("optimised", "optimized"), ("optimises", "optimizes"),
    ("optimising", "optimizing"), ("optimise", "optimize"),
    ("minimised", "minimized"), ("minimise", "minimize"),
    ("maximised", "maximized"), ("maximise", "maximize"),
    ("prioritised", "prioritized"), ("prioritise", "prioritize"),
    ("summarised", "summarized"), ("summarise", "summarize"),
    ("emphasised", "emphasized"), ("emphasises", "emphasizes"),
    ("emphasising", "emphasizing"), ("emphasise", "emphasize"),
    ("realised", "realized"), ("realises", "realizes"),
    ("realising", "realizing"), ("realise", "realize"),
    ("utilised", "utilized"), ("utilise", "utilize"),
    ("standardised", "standardized"), ("standardise", "standardize"),
    ("customised", "customized"), ("customise", "customize"),
    ("initialised", "initialized"), ("initialise", "initialize"),
    ("serialised", "serialized"), ("serialise", "serialize"),
    ("visualised", "visualized"), ("visualise", "visualize"),
    ("categorised", "categorized"), ("categorise", "categorize"),
    ("apologised", "apologized"), ("apologise", "apologize"),
    ("behaviours", "behaviors"), ("behaviour", "behavior"),
    ("neighbours", "neighbors"), ("neighbouring", "neighboring"), ("neighbour", "neighbor"),
    ("judgements", "judgments"), ("judgement", "judgment"),
    ("centres", "centers"), ("centred", "centered"), ("centre", "center"),
    ("defence", "defense"), ("licence", "license"), ("practise", "practice"),
    ("travelled", "traveled"), ("travelling", "traveling"),
    ("cancelled", "canceled"), ("cancelling", "canceling"),
    ("modelled", "modeled"), ("modelling", "modeling"),
    ("fuelled", "fueled"), ("signalled", "signaled"),
    ("favourite", "favorite"), ("favours", "favors"), ("favour", "favor"),
    ("honours", "honors"), ("honour", "honor"),
    ("programme", "program"), ("metres", "meters"), ("litres", "liters"),
    ("fulfil", "fulfill"), ("ageing", "aging"), ("storey", "story"),
    ("kerb", "curb"), ("sceptical", "skeptical"), ("sceptic", "skeptic"),
    ("aluminium", "aluminum"), ("jewellery", "jewelry"),
    ("grey", "gray"),
]

STRING = re.compile(r'"(?:[^"\\]|\\.)*"' r"|'(?:[^'\\]|\\.)*'" r"|`(?:[^`\\]|\\.)*`")
COMMENT = re.compile(r"^\s*(\*|//|/\*|\{/\*)")


def fix_text(s):
    changed = []
    for brit, amer in MAP:
        def sub(m):
            w = m.group(0)
            changed.append((w, amer if w[0].islower() else amer[0].upper() + amer[1:]))
            return amer if w[0].islower() else amer[0].upper() + amer[1:]
        s = re.sub(r"\b" + brit + r"\b", sub, s, flags=re.I)
    return s, changed


TARGETS = [
    (r"C:\DEVELOPMENT\sql-game", ["src"]),
    (r"C:\DEVELOPMENT\vertex", ["lib", "components", "app"]),
]

total = 0
for root, bases in TARGETS:
    print("\n========== %s" % os.path.basename(root))
    for base in bases:
        d = os.path.join(root, base)
        if not os.path.isdir(d):
            continue
        for dp, dirs, fns in os.walk(d):
            dirs[:] = [x for x in dirs if x not in ("node_modules", ".next")]
            for fn in sorted(fns):
                if not fn.endswith((".ts", ".tsx")):
                    continue
                p = os.path.join(dp, fn)
                raw = io.open(p, encoding="utf-8", newline="").read()
                nl = "\r\n" if "\r\n" in raw else "\n"
                lines = raw.replace("\r\n", "\n").split("\n")
                hits = []
                for i, line in enumerate(lines):
                    if COMMENT.match(line):
                        continue
                    def repl(m):
                        new, ch = fix_text(m.group(0))
                        if ch:
                            hits.append((i + 1, ch))
                        return new
                    lines[i] = STRING.sub(repl, line)
                if hits:
                    rel = p.replace(root + os.sep, "")
                    for ln, ch in hits:
                        for a, b in ch:
                            print("  %s:%d  %s -> %s" % (rel, ln, a, b))
                            total += 1
                    if WRITE:
                        io.open(p, "w", encoding="utf-8", newline="").write(nl.join(lines))

print("\n%d replacements%s" % (total, " WRITTEN" if WRITE else " (dry run)"))

