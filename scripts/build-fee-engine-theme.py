"""Build the themed Fee Engine: tokens, light palette, toggle, scrollbars.

Runs from the ORIGINAL source every time so it is idempotent and reviewable.

Four things learned the hard way are encoded here:

 1. The palette must be injected into the <script type="__bundler/template">
    document, not the shell's <head> -- the shell is discarded by the loader.
 2. Anything injected into that template is inside a JSON *string*: no raw
    double quotes, no newlines, no backslashes, or JSON.parse dies at the
    first one. Hence single quotes everywhere and one-line script.
 3. Alpha colours can NOT all be left untokenised. The sticky top bar is
    rgba(8,9,10,0.93); leaving it alone made it a dark bar with dark text in
    light mode. Alpha literals get their own tokens.
 4. The amber FILLS must not be remapped. A chromatic mid-tone works on both
    near-black and near-white; remapping them for text legibility is what
    turned the composition bars brown. Only amber *ink* darkens.
"""
import io, re, json
from collections import Counter, defaultdict

# Read from the PRISTINE source, never from the live file -- pointing this at
# public/labs/fee-engine.html after one ship re-tokenises an already-tokenised
# document (70 tokens over 108 literals instead of 49 over 226, which is how
# that mistake shows itself). The pristine copy is not committed, because it is
# 337KB that git already has. Extract it first:
#
#   git show bdc133f~3:public/labs/fee-engine.html > /tmp/fee-engine.orig.html
#
# then run:  python scripts/build-fee-engine-theme.py /tmp/fee-engine.orig.html
import sys
SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/fee-engine.orig.html'
OUT = 'public/labs/fee-engine.html'
s0 = io.open(SRC, encoding='utf-8').read()

def parse(t):
    t = t.strip().lower()
    m = re.fullmatch(r'#([0-9a-f]{3})', t)
    if m: return tuple(int(c*2,16) for c in m.group(1)) + (1.0,)
    m = re.fullmatch(r'#([0-9a-f]{6})', t)
    if m: return tuple(int(m.group(1)[i:i+2],16) for i in (0,2,4)) + (1.0,)
    m = re.fullmatch(r'rgb\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)', t)
    if m: return tuple(int(float(g)) for g in m.groups()) + (1.0,)
    m = re.fullmatch(r'rgba\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)[\s,/]+([\d.]+)\s*\)', t)
    if m: return tuple(int(float(g)) for g in m.groups()[:3]) + (round(float(m.group(4)),3),)
    return None

def rl(rgb):
    c = [x/255 for x in rgb[:3]]
    c = [x/12.92 if x <= 0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def ratio(a, b):
    la, lb = rl(a), rl(b)
    return (max(la,lb)+0.05)/(min(la,lb)+0.05)

luma = lambda c: 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]
warm = lambda c: c[0] > c[2]*1.30 and c[1] > c[2]
def css(c):
    return '#%02x%02x%02x' % c[:3] if c[3] == 1.0 else 'rgba(%d,%d,%d,%s)' % (c[0],c[1],c[2],c[3])

TOK = re.compile(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]{0,48}\)')

# ---- 1. inventory every literal, with the CSS property it sits in ----------
PROPS = [('border', r'border[A-Za-z]*\s*[:=][^;{}]*$'),
         ('ink',    r'(?<![a-zA-Z])color\s*[:=][^;{}]*$'),
         ('fill',   r'(?:fill|stroke)\s*[:=][^;{}]*$'),
         ('bg',     r'background[A-Za-z]*\s*[:=][^;{}]*$')]

occ = defaultdict(Counter)
for m in TOK.finditer(s0):
    c = parse(m.group(0))
    if not c: continue
    ctx = s0[max(0, m.start()-90):m.start()]
    role = 'other'
    for name, pat in PROPS:
        if re.search(pat, ctx): role = name; break
    occ[c][role] += 1

# ---- 2. name tokens by family, splitting amber and any dual-role surface ---
names, dark = {}, {}
fam = lambda c: ('a' if warm(c) and luma(c) > 60 else
                 'w' if warm(c) else
                 't' if luma(c) >= 90 else 's')
groups = defaultdict(list)
for c in occ: groups[fam(c)].append(c)
for f in groups:
    for i, c in enumerate(sorted(groups[f], key=luma)):
        names[c] = '--fe-%s%d' % (f, i)

# amber that is used as ink needs a second token; so does any surface used as
# a border, because the two invert in opposite directions in light mode.
SPLIT = {}
for c, roles in occ.items():
    n = names[c]
    if fam(c) == 'a' and roles['ink'] and (roles['bg'] or roles['fill']):
        SPLIT[(c, 'ink')] = n + 'i'
    if fam(c) == 's' and roles['border'] and roles['bg']:
        SPLIT[(c, 'border')] = n + 'b'

def repl(m):
    c = parse(m.group(0))
    if not c: return m.group(0)
    ctx = s0[max(0, m.start()-90):m.start()]
    role = 'other'
    for nm, pat in PROPS:
        if re.search(pat, ctx): role = nm; break
    return 'var(%s)' % SPLIT.get((c, role), names[c])

s = TOK.sub(repl, s0)
for c in occ: dark[names[c]] = css(c)
for (c, _), n in SPLIT.items(): dark[n] = css(c)

# ---- 3. the light palette -------------------------------------------------
GROUND_D, GROUND_L = (8,9,10,1.0), (236,238,240,1.0)

def cool(v):
    """Keep the demo's blue cast: its greys run B > G > R by ~8 each."""
    return (max(0,min(255,v-5)), max(0,min(255,v-1)), max(0,min(255,v+4)), 1.0)

def grey_at_ratio(target, ground, darker):
    best, bd = None, 9e9
    for v in range(256):
        cand = cool(v)
        if (rl(cand) < rl(ground)) != darker: continue
        d = abs(ratio(cand, ground) - target)
        if d < bd: bd, best = d, cand
    return best or cool(90)

light = {}

for c in occ:
    if c[3] == 1.0: continue
    n = names[c]
    if warm(c):                      light[n] = css(c)                       # amber wash, holds
    elif max(c[:3]) <= 24 and c[3] < 0.5:
                                     light[n] = css(c)                       # dark scrim, holds
    elif max(c[:3]) <= 24:
        # near-black at high alpha is a SURFACE, not a scrim -- this is the
        # sticky top bar at rgba(8,9,10,0.93), and treating it as a scrim is
        # what left a dark bar with dark text on it in light mode.
                                     light[n] = 'rgba(%d,%d,%d,%s)' % (GROUND_L[0], GROUND_L[1], GROUND_L[2], c[3])
    elif min(c[:3]) >= 232:          light[n] = 'rgba(0,0,0,%s)' % c[3]      # light overlay, inverts
    else: light[n] = 'rgba(%d,%d,%d,%s)' % (GROUND_L[0], GROUND_L[1], GROUND_L[2], c[3])

solid       = [c for c in occ if c[3] == 1.0]
bg_toks     = sorted([c for c in solid if fam(c) == 's' and occ[c]['bg']     and not occ[c]['border']], key=luma)
border_toks = sorted([c for c in solid if fam(c) == 's' and occ[c]['border'] and not occ[c]['bg']],     key=luma)
ink_toks    = sorted([c for c in solid if fam(c) == 't'], key=luma)

for i, c in enumerate(bg_toks):
    v = round(236 + i*(255-236)/max(1,len(bg_toks)-1))
    light[names[c]] = css(cool(v) if v < 255 else (255,255,255,1.0))
for i, c in enumerate(border_toks):
    v = round(226 - i*(226-170)/max(1,len(border_toks)-1))
    light[names[c]] = css(cool(v))
for c in ink_toks:
    light[names[c]] = css(grey_at_ratio(ratio(c, GROUND_D), GROUND_L, True))
# split tokens
for (c, role), n in SPLIT.items():
    if role == 'border': light[n] = css(cool(198))
    if role == 'ink':    light[n] = '#7a5200'      # amber ink: 5.9:1 on the light ground
# amber and warm-tinted fills: UNCHANGED between themes on purpose
for c in occ:
    n = names[c]
    if n in light: continue
    if fam(c) == 'a':   light[n] = css(c)                    # chromatic: holds on both grounds
    elif fam(c) == 'w': light[n] = css((246,236,214,c[3]))   # warm-tinted state surface
    elif fam(c) == 's': light[n] = css(cool(248))
    else:               light[n] = css(c)

# ---- 4. scrollbars + toggle ----------------------------------------------
SCROLL = ('*{scrollbar-width:thin;scrollbar-color:var(--fe-bar) transparent}'
          '::-webkit-scrollbar{width:11px;height:11px}'
          '::-webkit-scrollbar-track{background:transparent}'
          '::-webkit-scrollbar-thumb{background:var(--fe-bar);border-radius:99px;'
          'border:3px solid transparent;background-clip:content-box}'
          '::-webkit-scrollbar-thumb:hover{background:var(--fe-bar-hi);'
          'border:3px solid transparent;background-clip:content-box}'
          '::-webkit-scrollbar-corner{background:transparent}')

TOGGLE_CSS = ('#fe-toggle{position:fixed;right:14px;bottom:14px;z-index:9999;'
              'font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.09em;'
              'text-transform:uppercase;padding:8px 12px;border-radius:99px;cursor:pointer;'
              'color:var(--fe-toggle-ink);background:var(--fe-toggle-bg);'
              'border:1px solid var(--fe-toggle-bd);transition:opacity .15s linear;opacity:.55}'
              '#fe-toggle:hover{opacity:1}'
              '@media print{#fe-toggle{display:none}}')

TOGGLE_JS = ("<script>(function(){var K='fe-theme',r=document.documentElement,"
             "s=null;try{s=localStorage.getItem(K)}catch(e){}"
             "if(s==='light')r.setAttribute('data-fe-theme','light');"
             "var b=document.createElement('button');b.type='button';b.id='fe-toggle';"
             "var sync=function(){b.textContent=r.getAttribute('data-fe-theme')==='light'?'Dark':'Light';"
             "b.setAttribute('aria-label','Switch to '+b.textContent.toLowerCase()+' theme')};sync();"
             "b.onclick=function(){var n=r.getAttribute('data-fe-theme')==='light'?'dark':'light';"
             "if(n==='light'){r.setAttribute('data-fe-theme','light')}else{r.removeAttribute('data-fe-theme')}"
             "try{localStorage.setItem(K,n)}catch(e){}sync()};"
             "var add=function(){if(document.body&&!document.getElementById('fe-toggle'))document.body.appendChild(b)};"
             "add();document.addEventListener('DOMContentLoaded',add);setTimeout(add,1200)})()</script>")

BAR_D = {'--fe-bar':'#2a3037','--fe-bar-hi':'#3a424a',
         '--fe-toggle-bg':'#14171a','--fe-toggle-ink':'#c9cfd5','--fe-toggle-bd':'#2a3037'}
BAR_L = {'--fe-bar':'#c4cad0','--fe-bar-hi':'#a8b0b8',
         '--fe-toggle-bg':'#ffffff','--fe-toggle-ink':'#3c4349','--fe-toggle-bd':'#cfd5db'}

blk = lambda sel, d: sel + '{' + ''.join('%s:%s;' % kv for kv in d.items()) + '}'
STYLE = ('<style>' + blk(':root', {**dark, **BAR_D})
         + blk('html[data-fe-theme=light]', {**light, **BAR_L})
         + SCROLL + TOGGLE_CSS + '</style>')

tpl = re.search(r'<script type="__bundler/template">', s)
# Light is the DEFAULT now, not the alternate. The embed's job is to be
# understood at a glance and light does that; dark is one click away and
# remembered in localStorage. Unquoted attribute value on purpose -- the
# template is a JSON string and a raw double quote terminates it.
h = s.find('<html>', tpl.end())
s = s[:h] + '<html data-fe-theme=light>' + s[h + 6:]
i = s.find('<head>', tpl.end()) + 6
s = s[:i] + STYLE + s[i:]

for bad, why in [('"', 'double quote'), ('\\', 'backslash'), ('\n', 'newline'), ('</script', 'nested script close')]:
    assert bad not in STYLE, 'template payload contains a ' + why

SHELL_JS = '''
<script>
/* The theme toggle. Lives in the shell rather than in the bundler template,
   because a nested closing script tag inside that template ends the tag and
   truncates its JSON. Writing that tag literally in this comment ends THIS
   script for exactly the same reason, which is how the last attempt failed.
   The loader replaces documentElement, so this waits for the swap and
   re-appends on any later re-render. */
(function () {
  var K = 'fe-theme';
  var add = function () {
    var r = document.documentElement;
    if (!document.body || document.getElementById('fe-toggle')) return;
    var saved = null; try { saved = localStorage.getItem(K); } catch (e) {}
    if (saved === 'light') r.setAttribute('data-fe-theme', 'light');
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'fe-toggle';
    var sync = function () {
      var lit = r.getAttribute('data-fe-theme') === 'light';
      b.textContent = lit ? 'Dark' : 'Light';
      b.setAttribute('aria-label', 'Switch to ' + b.textContent.toLowerCase() + ' theme');
      b.setAttribute('aria-pressed', String(lit));
    };
    sync();
    b.addEventListener('click', function () {
      var next = r.getAttribute('data-fe-theme') === 'light' ? 'dark' : 'light';
      if (next === 'light') r.setAttribute('data-fe-theme', 'light');
      else r.removeAttribute('data-fe-theme');
      try { localStorage.setItem(K, next); } catch (e) {}
      sync();
    });
    document.body.appendChild(b);
  };
  add();
  document.addEventListener('DOMContentLoaded', add);
  new MutationObserver(add).observe(document, { childList: true, subtree: true });

  /* When embedded, collapse the demo own masthead. The host page states the
     same pitch directly above the frame, so a visitor read it twice before
     reaching anything interactive. Cropping it from the host instead needed a
     fixed pixel offset, and the correct offset measured 346px at 1118 wide,
     339 at 1020, 351 at 860 and 467 at 620 -- not monotonic with width, so no
     single number and no clamp() is right. The demo knows its own layout. */
  if (window.self !== window.top) {
    document.documentElement.setAttribute('data-fe-embed', '');
    var hideMasthead = function () {
      var lead = null, anchor = null;
      var all = document.querySelectorAll('body *');
      for (var i = 0; i < all.length; i++) {
        var t = all[i].children.length === 0 ? all[i].textContent.trim() : '';
        if (!lead && /^CAPABILITY DEMONSTRATION$/i.test(t)) lead = all[i];
        if (!anchor && /^LOAD RULE SET$/i.test(t)) anchor = all[i];
      }
      if (!lead || !anchor) return false;
      /* Walk up from the masthead label until the parent also contains the
         rule-set row: that child IS the masthead block, whatever it is called
         in markup generated at runtime. */
      var node = lead;
      while (node.parentElement && !node.parentElement.contains(anchor)) node = node.parentElement;
      if (node === lead || node.contains(anchor)) return false;
      node.style.display = 'none';
      return true;
    };
    var n = 0;
    var t = setInterval(function () { if (hideMasthead() || ++n > 50) clearInterval(t); }, 110);
  }
})();
</script>
'''
s = s.replace('</body>', SHELL_JS + '</body>', 1)

io.open(OUT, 'w', encoding='utf-8').write(s)
json.dump({'dark': dark, 'light': light}, io.open('scripts/fee-engine-palette.json','w',encoding='utf-8'), indent=1)

print('tokens        :', len(dark))
print('literals      :', sum(sum(v.values()) for v in occ.values()))
print('splits        :', {n: 1 for n in SPLIT.values()})
print('bg ladder     :', ' '.join(light[names[c]] for c in bg_toks))
print('border ladder :', ' '.join(light[names[c]] for c in border_toks))
print('amber (held)  :', ' '.join('%s=%s' % (names[c], light[names[c]]) for c in occ if fam(c)=='a'))
print('alpha surfaces:', [(names[c], css(c), light[names[c]]) for c in occ if c[3] < 1.0])
