# Hero rebuild — research brief

Written for the implementation session that follows this one. Research only; nothing in this
document has been built.

> Method: 15 reference sites loaded in headless Chromium at 1440×900 with `shaderSource`,
> `drawArrays`/`drawElements` and `getContext` patched before page scripts ran, so GLSL source,
> draw-call counts and context types are read rather than inferred. Screenshots in
> `docs/hero-refs/`. Measured 2026-08-15 · decay: 6mo.
>
> **Limit on the transfer-byte figures:** they count only responses carrying a `content-length`
> header, so anything streamed chunked is undercounted. Linear reporting "0 kB JS" is proof of
> that limit, not evidence it ships none. Treat the byte columns as a floor, and as reliable only
> where the number is large. Shader counts, draw counts and GLSL character counts have no such
> caveat — those are read from the running page.
>
> Bundle figures measured the same day with esbuild, minify + gzip -9, React externalised.
> three 0.185.1 · @react-three/fiber 9.7.0 · @react-three/drei 10.7.8 · postprocessing 6.39.4 ·
> lenis 1.3.26 · gsap 3.15.0 · ogl 1.0.11 · motion 13.1.0.

The left column stays. Everything below concerns the right column only.

---

## 1. Diagnosis of the first attempt

Captured live at `docs/hero-refs/vx-current-hero.png` and `vx-current-morph1.png`.

It is not Canvas 2D. `components/v2/InstrumentRig.tsx:31–115` compiles a real WebGL 2
vertex/fragment pair, and `components/v2/instrument-shapes.ts:303` resamples hand-authored line
segments into 16,000 `gl.POINTS`. The engineering is sound. The artwork failed, in four ways.

**The geometry is a line drawing.** Each object is roughly 90–150 hand-placed segments
(`instrument-shapes.ts:83–275`). Sampling that at 16,000 points adds samples, not information —
16,000 readings of 150 segments. The eye reads the silhouette, and the silhouette is clip-art:
awning stripes, a barcode, a torn-receipt zigzag.

**It is flat.** `aFrom` and `aTo` are `vec2`; `gl_Position` ships `z = 0` with no perspective
divide (`InstrumentRig.tsx:36`, `:96`). No depth, no occlusion, no parallax, no size-by-distance.
A single plane cannot read as an object.

**Nothing is lit.** The fragment shader is a radial disc mixed between two colours by flight speed
(`InstrumentRig.tsx:110–115`). No normals, no light direction, no material. Nothing has a surface.

**The jitter fuzzes the line rather than building one.** `sample()` offsets each point ±0.014
perpendicular to its segment (`instrument-shapes.ts:322`). That is the chalk-outline effect
exactly.

---

## 2. The finding that should change the plan

Before the site-by-site notes, the thing the measurement actually settled.

**The premium *product* sites in this set run no shaders at all.** Not fewer — none.

| Site | canvas | shader programs | GLSL chars | custom easing curves |
|---|---|---|---|---|
| linear.app | 0 | **0** | 0 | 2 |
| vercel.com | 1 | **0** | 0 | 44 |
| cursor.com | 0 | **0** | 0 | 7 |
| warp.dev | 1 | **0** | 0 | 10 |
| arc.net | 0 | **0** | 0 | 0 |
| rauno.me | 0 | **0** | 0 | 1 |
| studiofreight.com | 0 | **0** | 0 | 24 |
| teenage.engineering | 0 | **0** | 0 | 1 |
| stripe.com | 2 | 4 | 28,205 | 0 |
| basement.studio | 2 | 74 | 484,466 | 2 |
| immersive-g.com | 8 | 92 | 553,476 | 6 |
| lusion.co | 3 | 96 | 288,860 | 7 |
| bruno-simon.com | 1 | 127 | 494,802 | 4 |
| igloo.inc | — | 180 | 1,042,355 | 0 |
| activetheory.net | 1 | 248 | 754,586 | 1 |

The brief assumed Vercel, Cursor and Warp were running "grain/gradient shaders." They are not.
Vercel's hero is a black triangle with a CSS shadow. Cursor's is a screenshot of the product on a
painted background. Warp's is a screenshot of the product. Linear — the most-cited expensive
product site in software — ships 4,201 elements, 180 inline SVG, zero canvas, zero video, and two
easing curves.

The heavy WebGL is entirely on the **agency showreels**, where the site *is* the portfolio. Those
sites are selling the ability to build that site. Vertex is not. Copying Lusion's technique is
copying the wrong category, and it is the category error that would waste the rebuild.

Second correlation, unprompted and hard to unsee: **the sites that read as most premium run one or
two easing curves; the ones that read as assembled run seven to forty-four.** Rule 5, measured.
Vercel at 44 and Studio Freight at 24 are the two in this set whose motion reads least coherent.

Third: `basement.studio`, `warp.dev`, `cursor.com`, `vercel.com`, `linear.app` and
`teenage.engineering` declare `prefers-reduced-motion`. Lusion, Active Theory, Immersive Garden,
Bruno Simon, Igloo, Arc, Rauno and Studio Freight do not. The showreels skip the accessibility
work. Do not copy that either.

---

## 3. Reference sites, measured

Screenshots are `docs/hero-refs/<slug>-hero.png` and `<slug>-scroll.png` (one viewport down).

### lusion.co — `lusion-hero.png`
A tumbling pile of glossy jack-shaped primitives in blue, white and black, inside a rounded-rect
dark viewport set into a light page. Real PBR: specular highlights, soft shading, depth-of-field
falling off on the back objects. 96 shader programs, 288,860 characters of GLSL, and the draw
count climbs 15,449 → 29,559 across two captures four seconds apart, so the pile is being
simulated continuously, not played back. GLSL fingerprint includes curl noise, SDF, matcap,
refraction/transmission, bloom and film grain. Cost: 9.5 MB video, 6.0 MB images, 589 kB of 3D
assets. **Fit: the material lesson, not the technique.** Solid lit geometry with a specular
highlight is what "premium object" looks like. The simulation budget is not available to us.

### activetheory.net — `activetheory-scroll.png`
A single refractive glass toroid suspended in a near-black void with faint dust motes, dispersing
light into chromatic fringes at its edges. 248 shader programs, 754,586 characters of GLSL — the
densest shader payload in the set — and 36.2 MB of video plus 12.5 MB of 3D assets. Ships 94 DOM
elements and exactly one easing curve, `cubic-bezier(0.17, 0.4, 0.02, 0.99)`. The hero capture
caught the preloader (`activetheory-hero.png`, a progress ring at `/75`), which is itself the
finding: the experience is gated behind a multi-second load. **Fit: the composition is the
transferable part** — one object, centred, in a void, at small scale relative to the frame. That
restraint is doing more work than the shader.

### igloo.inc — `igloo-hero.png`, `igloo-scroll.png`
The most directly relevant site in the set. Opens as an **isometric wireframe igloo** drawn in
white hairlines against warm grey, surrounded by a wide field of construction lines and floating
dimension callouts (11, 23, 29, 18, 32), with a blown-out white light source at the apex. Scroll
one viewport and the same object has **resolved into lit, textured snow-block masonry on a
fog-bounded terrain**, with the construction wireframe still faintly overlaid. That is the
schematic-becomes-artifact narrative executed at the highest level currently on the web.

The cost is extreme: 180 shader programs, 1,042,355 characters of GLSL, 12.7 MB of 3D assets, and
a light DOM of **27 elements** with no canvas reachable from `document.querySelectorAll` — two
`webgl2` contexts are created against canvases that are shadow-rooted or detached. The entire page
is one WebGL surface. **Fit: take the narrative, reject the budget.** This is the argument I want
Vertex making; it is not the implementation.

### basement.studio — `basement-hero.png`
A full 3D interior — a basement, literally — with a seated figure, a dog, an arcade cabinet, a
basketball hoop, wall-mounted CRTs and real shadow casting. 74 programs, 484,466 chars GLSL, and
**64,233 draw calls in the first few seconds**, the highest per-frame load measured. Type is
Geist at 87px, tracking −0.04em. Declares reduced-motion. **Fit: low.** It argues "we are a
studio with personality." Vertex's argument is precision.

### immersive-g.com — `immersive-g-scroll.png`
An off-white page whose centre is a **bas-relief sculpture pressed into the paper** — birds,
flowers, drapery in low relief, lit from the upper left, with the wordmark and the line "Innovative
digital experiences studio" sitting flat on top of it. 92 programs, 553,476 chars GLSL, with matcap
and normal-displacement markers; the relief is a shader on a plane, not modelled geometry. 9.9 MB
of 3D assets. **Fit: the one light-background reference worth studying.** It proves an object can
read as expensive without a dark void, purely through directional lighting on a surface.

### bruno-simon.com — `bruno-simon-hero.png`
No longer the drivable car. Current build is a receding perspective grid of small purple ×
markers with a single glowing white ellipse ring floating above it — a horizon. 127 programs,
494,802 chars GLSL, instanced draws climbing 519 → 6,365 across the two captures. Transfers a
1,659 kB physics library alongside 102 kB of three.js and 974 kB of 3D assets. One `cursor: grab`
declared. **Fit: the grab cursor is the whole lesson.** Rule 4 — a single `cursor: grab` on a hero
does more than any autoplay.

### stripe.com — `stripe-hero.png`
The only *product* site in the set using WebGL, and it uses it minimally: 4 shader programs,
28,205 chars GLSL driving the mesh-gradient ribbon that sweeps across the upper right. 1,814
`cursor: pointer` and **78 `cursor: grab`** — there is far more draggable surface on that page than
is visible in one viewport. h1 is 48px / 55.2px, weight 300, tracking −0.02em. **Fit: high, as a
ceiling.** This is the most WebGL a serious product site spends, and it is spent on a background,
not an object.

### linear.app — `linear-hero.png`
Zero canvas, zero video, 180 inline SVG, 4,201 elements. The hero is the product UI itself,
screenshotted at high fidelity and set on near-black. Two custom easing curves — `cubic-bezier(0.32,
0.72, 0, 1)` and `cubic-bezier(0.16, 1, 0.3, 1)` — confirming the skill's recorded measurement
exactly. h1 64px / 64px, weight 510, tracking −0.022em, Inter Variable. 501 kB of font against
2 kB of images — the only site in the set that spends more on type than on pictures. **Fit: the
discipline benchmark.** Every gram of its perceived quality is type, spacing, density and one
curve.

### warp.dev — `warp-hero.png`
72px headline at −0.035em over an enormous product screenshot, framed by a lilac dot-and-symbol
field and a ticker of capability claims along the bottom edge. 213 inline SVG, 1,485 kB of JS, 10
easing curves, zero shaders. **Fit: medium.** Proves a developer-tool site can be visually loud
using only DOM. The 10 curves are why the motion does not cohere.

### cursor.com — `cursor-hero.png`
26px headline — deliberately small — over a wide painted-landscape panel containing three floating
product windows at different depths. One video, no canvas, 1,057 kB JS, 765 kB fonts, 7 curves
including `cubic-bezier(0.22, 1, 0.36, 1)`, which is also the curve currently in the Vertex
`globals.css`. **Fit: medium.** The interesting move is the *small* headline: the visual carries
the page and the type gets out of the way. That is the opposite of Vertex's current balance.

### vercel.com — `vercel-hero.png`
A black triangle with a soft white halo, centred, on white. One 1080×720 canvas with a 2d context
and no shaders. 220 kB fonts, **44 custom easing curves**. h1 64px, tracking −0.06em. **Fit: low
as a visual, high as a permission slip.** The most-watched infrastructure company on the web ships
a static logo as its hero graphic.

### arc.net — `arc-hero.png`
Pastel gradient band between two blue fields with scalloped edges, a black pill CTA, and a product
screenshot below the fold line. Zero canvas, zero shaders, **zero custom easing curves**, 4.3 MB of
images and 1.5 MB of video. **Fit: low.** Consumer-warm; wrong register for Vertex entirely.

### rauno.me — `rauno-hero.png`
Light grey ground, a white card holding alternating-indent Helvetica-ish type at 32px, and a hard
flat yellow circle punched over the right half with a small `+` registration mark at its centre.
184 elements, one easing curve, 51 kB total font, zero images. A neighbouring panel bleeds in from
the right edge — the page is a horizontal filmstrip. Declares `cursor: copy` in 4 places. **Fit:
high for attitude.** Proves that taste plus one geometric primitive beats a render farm.

### teenage.engineering — `teenage-engineering-hero.png`
An actual instrument company. Black-and-white line illustration, a 4-column icon-led nav, a
hard-set condensed headline, a spot orange, and dense product metadata (`EP–133 2.5`,
`EP–40 2.5`) in the corner. Zero canvas, 101 CSS custom properties, **one easing curve**
`cubic-bezier(0.6, 0.2, 0, 0.8)`. **Fit: high, conceptually.** The company whose products *are*
instruments sells them with drawn line-work and typographic density, not 3D.

### studiofreight.com — `studiofreight-hero.png`
The Lenis originators. `lenis` confirmed on `window`; zero canvas, zero shaders. Layout is a wide
scatter of ~26 project thumbnails around a centred serif line, "Moving Missions Forward." 177 CSS
custom properties and **24 custom easing curves**. **Fit: low visually, useful as evidence** that
Lenis is a scroll-feel decision, not a rendering one, and costs 5.5 kB.

### Sites not visited
None blocked. `activetheory.net` and `immersive-g.com` served preloaders at the hero capture; the
scroll capture is the real state for both and is what I described.

---

## 4. Toolkit landscape

Ranked by relevance to this rebuild. Bundle figures measured today, gzipped, React externalised.

**three.js — 128.4 kB gz (minimal scene) / 150.0 kB gz (with instancing + GLTF loader).** The
WebGL standard: a scene graph, cameras, lights, materials, geometry and a renderer. It gives you
perspective, depth sorting, and lit surfaces — the three things the current prototype lacks. This
is the entry fee for anything that needs to read as a solid object. Learning curve is real but
bounded; the InstrumentRig code already in the repo shows the raw-WebGL competence is there, and
three.js is strictly easier than that. Mobile: fine at moderate polygon counts, expensive to
*download* on a slow connection, which is a loading strategy problem rather than a frame-rate one.

**React Three Fiber — +85.5 kB gz on top of three (235.5 kB gz total).** Lets you write a three.js
scene as JSX components with React state and hooks instead of imperative setup. Genuinely pleasant
for scenes with many interacting parts and React-driven state. For a single hero scene mounted
once and driven by scroll, it is 85 kB for ergonomics you do not need. **Recommend against for
this job.**

**Drei — +25.2 kB gz on top of R3F (260.7 kB gz total, importing five common helpers).** A helper
library for R3F: orbit controls, camera rigs, environment maps, texture loading, instancing
wrappers, shader utilities. Tree-shakes reasonably, so the number moves with what you import.
Only relevant if R3F is in, which I am recommending it is not.

**OGL — 13.2 kB gz.** A minimal WebGL library: renderer, program, geometry, mesh, math types, and
almost nothing else. Ten times lighter than three.js and roughly the same mental model, minus
loaders, lights, materials and the ecosystem. Excellent when you are writing your own shaders for
a bespoke scene and will not use a single stock material — which is exactly what a shader-driven
schematic hero looks like. **The real alternative to three.js here.** Cost: no GLTF loader, no
built-in lighting, so every material is yours to write.

**GSAP + ScrollTrigger — 44.2 kB gz (27.0 kB for core alone).** A timeline engine plus scroll-linked
triggers: define a sequence of tweens with labels and offsets, then scrub it from scroll position.
The timeline model has no real CSS equivalent, and ScrollTrigger's pinning and scrub handling are
genuinely hard to reproduce. Now free for commercial use including SplitText and MorphSVG. The
question is whether you need it: if a rAF loop is already running for WebGL, reading `scrollY`
inside that loop costs nothing and the current prototype already does exactly this
(`InstrumentRig.tsx:312`).

**Lenis — 5.5 kB gz.** Replaces the browser's scroll response with an eased virtual scroll, so the
page glides rather than steps. Confirmed live on studiofreight.com. It is the cheapest thing on
this list and the single largest change to how a site *feels* per kilobyte. Caveat: it changes a
system behaviour users did not ask to have changed, must not trap scroll, and must be disabled
under `prefers-reduced-motion`.

**GLSL shaders.** Small C-like programs run per-vertex and per-fragment on the GPU. The vertex
shader decides where a point lands; the fragment shader decides what colour a pixel is. This is
where lighting, materials, noise, dissolves and edge glow actually live. The current prototype has
both, which is why the fix is a shader rewrite rather than a technology change. Learning curve is
the steepest item on this list; bundle cost is zero because shaders are strings.

**Instanced mesh rendering.** Draw the same geometry thousands of times in one GPU call, varying
per-instance transform and colour through an extra attribute. This is how you get 5,000 distinct
solid objects at 60fps instead of 5,000 draw calls. Measured live on bruno-simon.com (519 → 6,365
instanced calls) and igloo.inc (140 → 463). **This is the specific technique that replaces "16,000
dots" with "2,000 small solid parts."** Zero bundle cost; it is a three.js/OGL API, not a library.

**Post-processing (bloom, chromatic aberration, film grain, depth of field, vignette).** Render the
scene to a texture, then run full-screen passes over it. This is most of what separates "a 3D
model on a page" from "cinematic." The `postprocessing` library costs **83.9 kB gz** for
bloom + noise + vignette. A hand-written single fragment pass doing vignette + grain + a cheap
bright-pass bloom is roughly 40 lines of GLSL and costs nothing. **Write it; do not import it.**

**Perlin / simplex noise.** A function returning smooth pseudo-random values that vary continuously
across space and time — the standard way to make motion look organic rather than mechanical.
Detected in Active Theory's shaders. Curl noise (a derivative) produces divergence-free flow and is
what makes particle fields swirl convincingly; detected on Lusion, Active Theory and Igloo. Free,
about 40 lines of GLSL, high value per line.

**Signed Distance Fields.** A function returning the distance from any point to a shape's surface,
negative inside. Because they are just maths, two SDFs can be blended smoothly, which is the clean
way to morph between shapes — and it is a genuinely better morph than the per-vertex interpolation
the current prototype uses. Also used for crisp text and shape rendering at any zoom. Detected on
Lusion and Immersive Garden. Free; conceptually the hardest item here.

**Physics — Rapier / Cannon.** Real rigid-body dynamics: gravity, collision, constraints. This is
what makes Lusion's pile settle and re-settle. Bruno Simon ships **1,659 kB** of physics library.
For a hero that assembles into a fixed configuration, physics is the wrong tool — you want
deterministic choreography, not a simulation that lands somewhere slightly different each load.
**Out of scope.**

**CSS scroll-driven animation — 0 kB.** `animation-timeline: scroll()` and `view()` link a keyframe
animation to scroll position natively, off the main thread. Chrome/Edge 115+, Safari 26+, and
**Firefox stable still behind a flag** as of the last check, so it ships behind
`@supports (animation-timeline: view())` with the unanimated state designed as the correct one.
This covers all the DOM-side reveals and is the reason ScrollTrigger may not be needed.

**View Transitions API — 0 kB.** Browser-native morphing between two DOM states. Same-document is
Baseline since October 2025 and safe; cross-document is Chromium and Safari only. Relevant if a
hero element needs to morph into a page element on navigation. Not central to this job.

**Framer Motion (`motion/react`) — 44.3 kB gz.** Already in `package.json` at `^13.0.0`. Worth its
weight for `AnimatePresence`, layout animation and drag; not worth it for entrances and reveals,
which CSS does for free. The vanilla `motion` import is roughly half the cost for the same visual
result if React bindings are not needed.

**Motion One.** The same engine as Framer Motion's vanilla API, built on the Web Animations API.
Materially smaller than the React binding. Only relevant if a non-React imperative animation layer
is wanted, which it is not here.

**Lottie — 77.1 kB gz plus the JSON payload.** Plays After Effects animations exported to JSON.
The right answer when a motion designer authors the animation and a developer only plays it back.
Wrong here: nobody is authoring in After Effects, it cannot respond to a pointer, and it does not
light a surface.

---

## 5. Object narratives

The current sequence is storefront → laptop → dashboard → receipt. Four objects, three morphs.
Before ranking replacements, two structural arguments.

**Particles are arguing against the thesis.** A point cloud is a *dissolution* metaphor: it says
this thing is made of smoke and is about to disperse. The page copy at `app/v2/page.tsx:70` says
the opposite — "the thing that separates software from a project is whether it survives the person
who wrote it." Documented, owned outright, boring to operate. Particles argue ephemerality against
a thesis of permanence, and no amount of fidelity fixes an inverted metaphor. Rule 6. This is the
part of the current design I would kill regardless of how well it were rebuilt.

**Build one object, not four.** Four low-information icons is the density mistake in a different
costume. One object with 1,500 legible parts reads as an instrument; four objects with 150
segments each read as an icon set. The existing copy survives the change intact — the four beats
already read as four *states* rather than four *things*: "you already run the business" → "gets
built around how the work actually happens" → "you run it every day" → "what comes out is the
point." That is drawing → assembly → running → output, on one object.

Ranked:

### 1. The exploded stack — recommended
One object, drawn in isometric projection, whose horizontal layers lift apart and seat back
together. The layers are the stack named in the existing copy at `app/v2/page.tsx:62`:
schema, row-level-security policies, server actions, interface, deploy. Each layer is a thin plate
carrying its own real detail — the schema plate has table outlines and foreign-key lines, the
policy plate has predicate rows, the interface plate has an actual dense UI. At rest they are
seated into a single solid slab. On scroll they separate along the vertical axis, each layer
labelled, then re-seat.

Argues: *architecture → build → operate → output*, and specifically "same hands the whole way
down," which is a claim no competitor with a subcontracted delivery model can make. It is the only
narrative here where the visual metaphor and the differentiator are the same thing. It is also the
cheapest of the top three to build, because the geometry is plates and lines — no organic
modelling, no external asset, procedurally authorable in the same style as
`instrument-shapes.ts`.

### 2. Schematic → artifact
The wireframe-to-solid narrative, validated at the highest level by igloo.inc. A single object
begins as a hairline technical drawing with dimension callouts and construction lines extending
past its bounds, then resolves — same camera, same position — into a lit, material object with the
construction lines fading to a ghost.

Argues: *specification → built thing*. Which is precisely the problem the thesis names — software
that gets specified and never lands. The drawing becoming the object is that sentence as a
picture. Ranked second only because it needs a convincing *lit* end state, which is the expensive
half, and because on its own it does not say what the object is. Best combined with #1: the
exploded stack in schematic linework that resolves to material as it seats.

### 3. The movement
A mechanical watch movement, macro, near-black, shot at a slight angle. Mainspring barrel, gear
train, escapement, jewels, bridges. Hundreds of parts, all of them real, all of them legible.

Argues: *precision, density, and independence from its maker*. A movement is the canonical
instrument, it is dense in the way Rule 2 wants, and it runs for decades without the watchmaker —
which is the "it does not need me" claim exactly. Ranked third only on cost: a movement is organic
industrial modelling, which means Blender and a GLTF file rather than procedural code, and a 1–3 MB
asset on the critical path. Highest ceiling, highest bill.

### 4. The bench — instrument panel
Knob → console → hands on the control → readout. Argues control affordance → interface → operator
→ signal. Strong on its own terms, but the shipped landing page already carries a tilted operating
console (commit `b54c8fe`), so this would put the same idea in two places and dilute both.
Reconsider only if that graphic is being retired.

### 5. The board — PCB
Blueprint → traces → mounted board → oscilloscope. Reads well and is easy to make dense. Two
problems: it argues *hardware* for a company that ships software, and it is the single most
over-used visual in technology marketing right now. It would look competent and say nothing
specific.

### 6. The die — CPU
Same objection as the board, more so. Silicon is further from what Vertex sells than a circuit
board is, and a die shot is a texture rather than an object — which puts it back in the same
category as the current problem.

---

## 6. Recommended stack

**three.js, no React Three Fiber, no Drei, no `postprocessing` library. Lenis. CSS scroll-driven
animation behind `@supports` for the DOM reveals. Scroll progress read inside the existing rAF
loop.**

| Layer | gz | In or out |
|---|---|---|
| three, instancing + no loader if geometry is procedural | ~128–150 kB | **in** |
| Lenis | 5.5 kB | **in**, and easy to drop if the feel is wrong |
| Hand-written post pass (vignette + grain + bright-pass bloom) | ~0 kB | **in** |
| CSS scroll-driven animation for DOM reveals | 0 kB | **in** |
| React Three Fiber | +85.5 kB | out — ergonomics for a scene mounted once |
| Drei | +25.2 kB | out — follows R3F |
| `postprocessing` | +83.9 kB | out — write ~40 lines of GLSL instead |
| GSAP + ScrollTrigger | +44.2 kB | out unless DOM-side pinning is needed |
| Physics (Rapier/Cannon) | 500 kB+ | out — choreography, not simulation |

**Budget: roughly 134–156 kB gzipped**, all of it in a dynamically imported chunk that never enters
the initial bundle. The R3F + Drei + `postprocessing` route would be **~345 kB gz** for the same
picture. That difference is the whole argument for hand-rolling.

If the object turns out to need modelling in Blender (narrative #3), add the GLTF loader and a
Draco-compressed asset, and re-budget — a 1–3 MB asset dominates everything in this table.

**Consider OGL (13.2 kB) instead of three.js** if the final design uses no stock materials and no
loaders. For narrative #1, where every surface is a custom shader on flat plates, that is a live
option and would put the total under 20 kB. Decide it after the visual direction is locked, not
before — switching later is a rewrite of the scene layer, not of the shaders.

### Architecture — keep what exists

The InstrumentRig's *structure* is right and should be carried over, not rebuilt:

- Capability gate before context creation — reduced motion, Save-Data, `deviceMemory`
  (`InstrumentRig.tsx:145–170`).
- `position: fixed` canvas contributing no layout, radial-gradient masked so edges dissolve
  (`app/v2/direction-a.css:60–74`).
- Geometry measured on resize only; the sole per-frame read is `scrollY`
  (`InstrumentRig.tsx:254–272`).
- IntersectionObserver starting and stopping the loop by territory (`:409–422`).
- Fallback-first: the SVG ships visible and is hidden only once a frame has actually reached the
  canvas (`:374–377`). Keep this exactly.
- Full teardown including `WEBGL_lose_context` (`:440–459`).
- The dev-only `__daDraw` single-frame hook (`:386–395`). **Keep it.** It is the only reason this
  work is verifiable — the browser MCP surfaces do not fire rAF. Note for the implementation
  session: headless Playwright *does* fire rAF and does produce real WebGL output; that is how the
  reference measurements and `vx-current-*.png` in this brief were captured. Use Playwright to look
  at canvas work, not the browser pane.

### Mobile

The hero graphic must not be the LCP element — the headline is, and it is text in the HTML source.
Ship the schematic as inline SVG (0 kB, correct unanimated state, already the pattern in
`components/v2/StaticInstrument.tsx`), and `next/dynamic({ ssr: false })` the WebGL layer above it,
gated on viewport width and capability. On narrow viewports, do not load three.js at all: animate
the SVG's `stroke-dashoffset` and per-layer `transform` with CSS scroll-driven animation. That is a
better mobile experience than a reduced-instance 3D scene and costs nothing. A static WebP is the
weakest of the three options and should not be needed.

### Reduced motion

Skip, never slow. Do not create the context; do not start the loop. The SVG stays visible in its
assembled end state, and the layer labels stay legible — which means the *unanimated* composition
has to be designed as a finished picture, not as a frame of an animation. Also disable Lenis; an
eased virtual scroll is exactly the class of motion the preference is asking you to stop.

### SSR and Next 16

Route stays statically rendered. `'use client'` sits on the leaf WebGL component only, and three.js
is imported inside it so it lands in the dynamic chunk rather than the route bundle — the measured
penalty for getting this wrong is in the skill's `lab/rsc-boundary` repro, where one misplaced
directive pulled a whole library into the client graph. Never touch `window` or `document` outside
`useEffect`. Reserve the graphic's box with `aspect-ratio` so the swap from SVG to canvas shifts
nothing.

### Easing

One curve: `cubic-bezier(0.32, 0.72, 0, 1)`. It is already declared in `app/v2/direction-a.css:13`
and it is the curve measured live on linear.app today. `app/globals.css` currently declares
`cubic-bezier(0.22, 1, 0.36, 1)` — that is a second system and should be reconciled to one.

### Time to a proof of concept

Two to three days for a single-object hero with scroll-linked assembly, geometry authored
procedurally in the style of `instrument-shapes.ts`, one custom lit material, and a hand-written
post pass. Plus a day for the SVG fallback, reduced-motion path, mobile gate and capability
gating — most of which is adaptation of code that already exists rather than new work. **Call it
three to four days.** If the direction chosen needs Blender modelling, add two to four days and a
skill Vertex does not currently have on hand; that is the main reason narrative #3 sits third.

---

## 7. Three hero concepts

Contrasting directions, not variations. Each assumes the left column is unchanged.

### A. The Exploded Stack
Near-black ground. On the right, an isometric slab about 480px on its long axis, floating slightly
above centre, made of five thin plates seated flush into one solid. Hairline white edges catch a
single light from the upper left; the faces are a very dark blue-grey, close to the ground but not
equal to it, so the object reads as *near-black solid* rather than as line art on black. A ghost
copy at 1.4× scale and ~15% opacity sits behind it, and the whole canvas is radial-masked so the
slab dissolves into the page rather than ending.

**Idle:** the slab rotates perhaps four degrees over eight seconds and returns — a breath, not a
turntable. One layer's interface plate has a live cursor blinking in it.

**Hover:** `cursor: grab`. The pointer lifts the nearest plate two or three millimetres and its
edge highlight brightens. Nothing else moves.

**Drag:** the whole slab orbits with the pointer, damped, and eases back to its rest angle when
released. This is the Rule 4 move and it is worth more than everything else on this list.

**Scroll:** across the four beats the plates separate along the vertical axis — schema at the
bottom, deploy at the top — each arriving with its label. At the fourth beat they seat back down
into the slab and the object is whole again. The argument lands physically: it comes apart, you can
see every layer, it goes back together, one piece.

Feel: precise, engineered, restrained. Closest reference: igloo.inc's construction geometry with
Lusion's material discipline.

### B. The Drawing
Light ground — warm off-white, roughly `#F4F2ED`. No canvas at all, or Canvas 2D only. The right
column holds a full technical drawing of the same layered object in plan and elevation: hairline
black linework, dimension lines with arrowheads and real numbers, a title block in the lower right
with a revision letter, section markers, and callout leaders pointing into the interface plate.
Fifteen hundred discrete marks, none of them decorative.

**Idle:** nothing moves. A blinking cursor in one cell of the drawn interface, and that is all.

**Hover:** hovering a dimension line highlights the feature it measures and the number goes from
grey to black. Hovering a callout dims everything else to 20%.

**Scroll:** the drawing redraws itself — `stroke-dashoffset` on grouped paths, in construction
order: outline, then structure, then dimensions, then annotation. At the last beat a revision stamp
lands in the title block. Pure CSS scroll-driven animation behind `@supports`, so Firefox gets the
finished drawing immediately, which is the correct state.

Feel: precision, craft, seriousness. Zero JavaScript, zero kilobytes, and — on the evidence of
Linear, Rauno and Teenage Engineering — no less premium for it. This is the cheap direction and I
do not think it is the weak one. If you want the fastest route to something that is unambiguously
not kindergarten, it is this.

### C. The Movement
Near-black, macro, cinematic. A watch movement fills 70% of the right column, shot from 30° above,
shallow depth of field so the escapement is sharp and the mainspring barrel falls off into blur.
Brushed steel bridges with anisotropic highlights, three ruby jewels catching red. Real bloom on
the polished edges, film grain over everything, a slight vignette.

**Idle:** the escapement ticks. Balance wheel oscillating, once per second, forever. That single
repeating motion is the whole idea — the instrument runs whether or not anyone is watching.

**Hover:** the pointer acts as a second light source; highlights track it across the bridges.

**Scroll:** the camera dollies in across the four beats — full movement, then gear train, then
escapement, then the balance wheel alone filling the frame, still ticking. It does not disassemble;
it goes deeper, which is a different argument from A and a better one for "you run it every day, it
does not need me."

Feel: expensive, confident, slightly severe. Closest reference: Active Theory's void composition
with Lusion's material work. Also the most expensive, the only one needing a modelled asset, and
the one whose failure mode is looking like a watch advert rather than a software consultancy.

---

## Recommendation

**Direction A, with B as the fallback state and the mobile path.** They are the same drawing —
A is B with material and depth added — which means the SVG fallback is not a degraded version of
the hero, it is the hero's first act. That resolves the fallback problem and the narrative problem
in the same move, and it is the only pairing here where the cheap path and the expensive path are
the same idea.

If three to four days is not available, ship B alone. It would be better than what is on the branch
now, and on this evidence better than most of what the category ships.

---

## Note, unrelated to this task

`npm run audit-repo` flagged four non-negotiable failures already in the working tree, all
pre-existing: three easing curves across `app/globals.css` and `app/v2/direction-a.css`; 36
`clamp()` declarations in `app/globals.css` with a bare `vw` middle term, which stop scaling at
200% browser zoom (WCAG 1.4.4); a `blur()` inside `@keyframes` in `app/globals.css`; and two
contrast failures in `public/labs/ops-table/`. Worth a decision on sequencing, before or after the
hero work.
