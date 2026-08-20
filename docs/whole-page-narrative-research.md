# Whole-page scroll narrative — measured research for vertexapps.dev

> Measured: 41 URLs · 2026-08-17 · decay: 6mo
> Method: Playwright 1.62.1 / headless Chromium, 1440×900, `deviceScaleFactor: 1`, en-GB,
> Europe/London, desktop Chrome UA, `prefers-color-scheme` at its default (light) except where a
> dark check is named. WebGL and animation instrumentation injected via `addInitScript` **before
> any page script ran**: `HTMLCanvasElement.prototype.getContext`, `WebGLRenderingContext` and
> `WebGL2RenderingContext` `shaderSource`, `createProgram`, `drawArrays`/`drawElements`
> (+`Instanced`), `texImage2D`, plus `requestAnimationFrame`, `IntersectionObserver`,
> `AudioContext` and `Element.animate`. Scroll driven by synthetic wheel events in 30
> document-sized steps so Lenis/Locomotive-style hijacked scroll still advances. Five screenshots
> per URL.
>
> **The five ambition-ceiling sites in §0 got a deeper pass** (`instrument2.js`): the same
> instrumentation plus WebGPU (`requestAdapter` → `requestDevice` → `createShaderModule`, so WGSL
> is captured wherever it compiles), `Worker`, `transferControlToOffscreen`, `WebAssembly`,
> `getExtension`, video-texture uploads, Rive/Lottie/Spline/OGL/Babylon/PlayCanvas detection, 700
> characters of every shader's source for renderer fingerprinting, eight scroll depths, and two
> cursor-sweep frames.
> Raw JSON and 264 screenshots: `docs/whole-page-narrative-refs/`.

**Read this first.** Three of the four sites the brief named as the dark-cinematic canon —
Cursor, Warp, Rauno — measured **light** on 2026-08-17. Studio Freight, Immersive Garden, Lusion,
Arc and Vercel are light too. Linear's ground is `#08090A`; vertexapps.dev's `--bg` is `#08090a`
(`app/globals.css:8`). Those are the same colour. The genre has moved and the current site is
standing where it was.

The other load-bearing finding: of the sixteen whole-page sites, **nine ship zero WebGL**, and the
two most technically ambitious pages in the set cost **205,580 KB** (Active Theory, ≈201 MB) and
**15,690 KB** (igloo.inc, ≈15 MB) to deliver experiences with 91 and 27 DOM elements respectively.
Weight is not the lever. The lever is what the page argues.

---

## Contents

0. [The ambition ceiling — five sites, deep pass](#0)
1. [Whole-page scroll narrative patterns — 16 sites, instrumented](#1)
2. [Aesthetic range — what reads as elite versus dev-portfolio-default](#2)
3. [Mental-model visualisation techniques](#3)
4. [Landing / portfolio split architecture](#4)
5. [Recommended direction for VX](#5)
6. [Signature-moment inventory, ranked by novelty](#6)
7. [Measurement limits and honest gaps](#7)

---

<a id="0"></a>
## 0. The ambition ceiling — five sites, deep pass

Five references that define the target. Instrumented harder than the rest: shader source captured
and fingerprinted, WebGPU wired for WGSL capture, workers and WASM counted, GL extension requests
logged, eight scroll depths plus two cursor-sweep frames.

**The headline: two of the five ship zero WebGL, and one of those two is a 42-screen scroll
narrative.** The most format-relevant reference in the set — a chaptered whole-page story with a
persistent chapter rail — runs on Lenis, CSS scroll timelines, sticky positioning and 83 WebP
images. No canvas at all.

### The comparison

| Site | Screens | Renderer | GL programs | GLSL chars | Draw calls | canvas | Workers | WASM | Total KB | Curves | Ground |
|---|---|---|---|---|---|---|---|---|---|---|---|
| nabilissa.com | **42.62** | none | 0 | 0 | 0 | 1 (2D) | 0 | 0 | 7,596 | **1** | `#0B0B0B` |
| valmont.com | 5.80 | none observed | 0 | 0 | 0 | 0 | 0 | 0 | 5,900 | 0 † | `oklch(0 0 0)` |
| resn.co.nz | 1.00 | **three.js r84** | 6 | 58,407 | 15,948 | 6 | **9** | 0 | 27,831 | 4 | `#000000` + grain |
| nk.studio/work | 24.15 | three.js (WebGL2) | **60** | **2,785,871** | 34,118 | 4 | 0 | **2** | 48,565 | 5 | `#070B0A` |
| 60fps.fr | 7.73 | three.js (WebGL2) | **3** | 9,772 | 7,187 | 1 | 0 | 0 | 13,331 | 3 | `#000000` |

† Valmont exposes only 4 readable CSS rules across 5 unreadable cross-origin sheets; its motion is
GSAP, so a zero here means "no CSS curves", not "no motion system".

**Nobody in this set runs WebGPU.** `navigator.gpu` was available in all five contexts; zero
adapters were requested, zero WGSL modules compiled. The ceiling in August 2026 is still WebGL.

---

### nabilissa.com — a 42-screen chaptered narrative with no canvas

`docs/whole-page-narrative-refs/nabil-issa/`

**What it does.** Black preloader with a centred wordmark, then `CAN DESIGN SHAPE HOW WE FEEL?` set
100px in a hairline grotesk over a dimmed architectural photograph, with `SCROLL DOWN / TO BEGIN
THE STORY` bottom-left. Then five chapters across **38,357 px** — the deepest page in the entire
research pass — with a **persistent chapter rail docked at the bottom of the viewport**:
`CHAPTER I · II · III · IV · V`, the active one underlined, a square marker sliding along a hairline.
Between chapters the page goes to near-total black before the next scene resolves.

**Pipeline.** Nuxt + Vue + **Lenis**. Zero WebGL, zero video, one unused 2D canvas. 7,596 KB total,
of which **6,037 KB is WebP** across 83 `<img>`. 68 requests.

**Load-bearing techniques, in order of contribution:**

1. **One easing curve, tokenised.** `--default-ease: cubic-bezier(.83, 0, .17, 1)` and every other
   easing reference in the stylesheet is `cubic-bezier(var(--easing))`. Rule 5 satisfied more
   cleanly than any site in this research pass, including Linear.
2. **Sticky-plus-blur as the transition mechanism.** 22 `position: sticky` CSS rules, 11 sticky
   computed elements, and **`filter: blur()` on 74 computed elements** — chapters do not slide past
   each other, they defocus into each other.
3. **`view-timeline` + `scroll-timeline` + `timeline-scope`** all present. Native CSS scroll-driven
   animation, carrying a 42-screen narrative in production.
4. **69 `ResizeObserver`s** and only 2 pointermove listeners — layout-reactive, not pointer-reactive.
5. `mask-image` on 20 computed elements, `mix-blend-mode` on 8, `transform3d` on 50, `will-change`
   on 75.

**Palette and type.** Two colours and their alpha steps, with names worth stealing:
`--c-obsidian-dust: #0b0b0b`, `--c-soft-concrete: #f1f1f1`, each with `-50 / -20 / -6 / -1` alpha
variants. 17.43:1 both directions. h1/h2 **GothamThin at 100px/90px (ratio 0.90), tracking
−0.08em**; body HelveticaNeueLight 15/20.25 (1.35) at −0.01em. Eight faces shipped as **TTF and
OTF** (737 KB + 468 KB) rather than WOFF2 — the one clear technical miss on the page.

**Signature moment.** The chapter rail itself. It converts an enormous scroll into something with a
readable position and an implied ending, which is the thing that makes 42 screens feel like a film
rather than a long page.

**How close could a general-purpose Opus 5 CC get? ~95%, and the gap is not code.** Lenis, sticky
chapters, blur transitions, a tokenised curve and a chapter rail are all squarely within a
generalist's range — this is a week of work, not a specialism. The 5% that is unreachable is 6 MB
of art-directed architectural photography. **No 3D specialist is required for this site at all.**

*Measurement note:* depth-04 captured a near-empty frame. The synthetic wheel outran a pinned
chapter transition; that is an instrumentation artifact, not a blank section.

---

### valmont.com — the competent corporate baseline

`docs/whole-page-narrative-refs/valmont/`

**What it does.** Aerial photography of infrastructure and agriculture, `Conserving Resources.
Improving Life.` at 76.5px, `SCROLL TO EXPLORE`, then a long-form statement, then three numbered
full-bleed cards (`01 About Us`, `02 Infrastructure`, `03 Agriculture`).

**Pipeline.** **GSAP 3.13.0 + ScrollTrigger + Lenis + Swiper.** Zero WebGL, zero canvas, zero video.
5,900 KB over **41 requests** — the leanest request count in the ceiling five. Roboto, Roboto Mono
and Material Icons; h1 76.5/80.3 (1.05) tracking −0.03.

`ogl` — a ~10 KB WebGL micro-library — appears in the script URLs, but **no GL context was ever
created** in a 60-second session covering the full scroll. Either it is bundled and unused, or it
is gated behind a route I did not reach. Recorded as measured.

**One thing worth copying:** the whole palette is declared in **oklch at zero chroma** —
`oklch(0 0 0)`, `oklch(0.6066 0 0)`, `oklch(0.8078 0 0)`, `oklch(1 0 0)`. A pure lightness ladder,
which is the discipline `principles.md` argues for, shipped by an industrial manufacturer.

**Honest assessment: this is not in the same tier as the other four.** It is a very well-made
corporate marketing site. There is no signature moment, no interaction beyond hover, and nothing
technically distinctive. Its value as a reference is different and arguably higher for VX: **it is
the proof that photography plus Lenis plus one GSAP timeline reads as expensive without any of the
rest.** It is also the closest of the five to what Ryan's actual client work has to look like.

**How close could a general-purpose Opus 5 CC get? 100%.** There is nothing here a generalist
cannot build. The entire differentiator is the photo commission.

---

### resn.co.nz — nine workers, three audio contexts, and a 2017 renderer

`docs/whole-page-narrative-refs/resn/`

**What it does.** One viewport, no scroll. A shattered crystal — a gem exploded into floating
shards — hangs in near-black under heavy film grain, with `Resn · Creative Studio / Est. 2004` set
through the middle of it in a 43.2px hairline. `VIEW ALL PROJECTS` above, **`CLICK & HOLD`** below.
Sweeping the pointer across the viewport reconfigures the shards; the two cursor frames captured
show materially different geometry.

**Pipeline — and this is the finding.** **three.js, `REVISION 84`.** That release is from 2017.
The site that still reads as the ceiling nine years later is running a renderer nine years old.

- **6 shader programs** from 12 `shaderSource` calls, 58,407 GLSL characters. Two are stock
  `MeshBasicMaterial`; four are custom `ShaderMaterial`. That is the entire shader budget.
- 15,948 draw calls, **19,072 rAF ticks** — it never idles.
- **Nine `Worker`s, all spawned from `blob:` URLs** (inline worker source, no separate files).
- **Three `AudioContext`s** and **7,619 KB of MP3** inside a 27,831 KB page. More than a quarter of
  the payload is sound.
- Geometry is **one 188 KB Wavefront `.obj`** (`drop_gem5.obj`). No GLB, no Draco, no KTX2.
- 17 2D canvas contexts alongside 1 `experimental-webgl` and 2 `webgl` — text and UI rendered into
  textures.
- `projects.json` 850 KB and `letters.json` 413 KB — custom letterform path data.
- **171 DOM elements. One interactive element.** Zero `<img>`, zero `<video>`.
- Requests `WEBGL_debug_renderer_info` (GPU fingerprinting for quality tiering) and
  `KHR_parallel_shader_compile` (shader compilation off the critical path).
- Two of its four easing curves are hand-authored **`linear()` spring approximations with ~20 stops
  each**.
- Type: Fort (Extralight → Bold) and Work Sans (Thin → Regular). `cursor: grab` on 4 elements.

**Signature moment.** `CLICK & HOLD`. Press-and-hold rather than click, with the crystal responding
physically for as long as you hold. *I could not execute a sustained press in the headless harness,
so the behaviour is inferred from the on-screen instruction and the cursor-response frames, not
observed.* Say so rather than describing something I did not see.

**How close could a general-purpose Opus 5 CC get? 40–55%, and this is the one where the honest
answer is "hire specialists" — plural.** The obstacle is not shader count; six programs is nothing.
It is that the load-bearing inputs are three separate crafts a coding agent does not have:

- a hand-modelled refractive gem with correct facet topology,
- 7.6 MB of bespoke sound design across three audio graphs,
- motion tuned by hand into twenty-stop spring curves.

A generalist can build the *mechanism* — an OBJ loader, a refraction shader, a pointer-driven
shard rig, a press-and-hold state machine. What it cannot supply is the modelling, the sound, and
the several hundred hours of tuning that separate "shards move" from "shards feel like glass".
**A 3D-web specialist gets you to maybe 75%. The remaining 25% is a sound designer and a modeller.**

---

### nk.studio/work — 2.79 MB of shader text and outcome metrics on every project

`docs/whole-page-narrative-refs/nk-studio-work/`

**What it does.** A near-black `#070B0A` field with a cyan-green **particle terrain** rolling
underneath and the studio's `/` mark standing in it as a glowing, particle-filled slab.
`For crafting bold digital realities, / the world is our canvas.` Then — and this is the part worth
stealing — the page **flips to warm white `#FDFDF9`** and each project becomes a full-bleed
brand-coloured panel carrying **two outcome metrics**: `IMPACT — 30% bounce rate improvement`,
`RECOGNITION — 2+ Awards`, with the project name and tag chips (`BRANDING`, `DIGITAL`, `BOOST`)
beneath. A sidebar rail persists down the left edge throughout.

**Pipeline.** three.js on WebGL2. **60 shader programs from 120 `shaderSource` calls totalling
2,785,871 characters of GLSL** — the largest shader payload measured anywhere in this research
pass, ahead of igloo.inc's 1,042,176. 34,118 draw calls, 5,592 instanced.

Two important qualifications on that 2.79 MB, because the raw number overstates the authorship:
most of it is three.js's own material chunks expanded across 60 program permutations, and the first
two shaders captured are a tiny hand-written blit pair (`attribute vec2 vertex; uniform vec4 mat;
uniform vec2 translate;`) that belongs to the **dotLottie WASM renderer**, not to the 3D scene.
`dotlottie-player.wasm` is 683 KB and is one of the two WASM compiles.

- 24 2D canvas contexts, one **OffscreenCanvas** 2D context, two WebGL2.
- **161 `ResizeObserver`s and 55 `IntersectionObserver`s**, 17 pointermove listeners, 10 wheel
  listeners. The page is instrumented against its own layout to an unusual degree.
- 48,565 KB total, of which **36,249 KB is JPEG served from `images.prismic.io`** — a headless CMS
  behind the whole thing.
- Requests `WEBGL_multisampled_render_to_texture` and `KHR_parallel_shader_compile`.
- **One font family: DM Sans.** h1/h2/h3 all at 56px, ratios 1.09–1.20, tracking −0.03. Body 16/24.
  Only four `:root` tokens, all layout (`--grid-cols-space: 28px`, `--wrapper: 95%`,
  `--max-w-wrapper: 1280px`, `--sidebar: 140px`).
- `#FDFDF9` on `#070B0A` measures **19.41:1**. `cursor: pointer` on 1,612 elements.
- Five easing curves; one `animation-timeline` rule.

**Signature moment.** The particle terrain with the logo standing in it, and then the hard cut to
white. The dark→light flip *inside the work page* is the thing most portfolios get wrong and this
one gets right.

**How close could a general-purpose Opus 5 CC get? 50–65%.** The particle terrain (instanced points
displaced by noise, additive glow, fog) is a well-documented pattern a generalist can implement
credibly. The dark→light work grid, the metric pairs and the sidebar rail are ordinary front-end.
The gap is 36 MB of art-directed project photography and the CMS behind it — a budget problem, not
a skill problem. **No specialist strictly required; a specialist buys you polish on the terrain.**

---

### 60fps.fr — three shader programs and a 49 KB scene

`docs/whole-page-narrative-refs/60fps/`

**What it does.** Black. A tunnel of dark geometry rushing toward a single blown-out light source,
under heavy grain. `We provide` in gold `#D9BA84`, `Strong back-end expertise` in white below it —
the second line cycles. A `Highlighted projects / 4` strip of muted video thumbnails sits at the
fold. Further down, the 3D scene becomes the *background* for a glass grid of capability tiles
(`Social creative filters`, `AR / VR`, `Technical direction`, `Strong backend expertise`,
`Hosting and infrastructure`, `Long-term maintenance`), then a scroll-linked line-by-line text
reveal (grey resolving to white).

**Pipeline — the most instructive of the five.** three.js on WebGL2, **Svelte** for the app shell.
**Three shader programs. 9,772 characters of GLSL. One canvas at 1440×900, DPR 1.** The 3D scene
file, `room-Cb4bLSll.glb`, is **49 KB**. The whole visual system is one postprocessing shader, and
its `#define` block is the design document:

```glsl
#define USE_SCREEN_DEFORMATION true
#define USE_GAMMA true
#define USE_RGB_SPLIT true
#define USE_NOISE true
#define USE_VIGNETTING true
#define USE_AFTER_IMAGE true

uniform sampler2D tDiffuse, tDepth, tTexts, tAnalyser, tSolidNoise, tBlur, tNoise, tFluid;
uniform float uMobile, uTime, uToonGlitch, uThunder, uLongpress, uBlur, uBlackFade;
```

Read that uniform list closely, because it contains four separate ideas:

- **`tTexts`** — the page's typography is rendered into a texture and passed *through* the post
  stack, so grain, RGB split and deformation apply to the words as well as the scene. That is why
  there is an `offscreen:2d` context. The DOM is an input to the picture, not a layer above it.
- **`tAnalyser`** — an **audio-analyser texture**. The image is modulated by the sound. (Zero
  `AudioContext`s were created in this run because headless Chromium blocks autoplay, so the path
  exists in the shader and was not exercised. Stated as found.)
- **`tFluid`** with a companion program declaring `uniform sampler2D tNoise, tLast; uniform vec2
  uMouse;` — a ping-pong mouse-trail fluid simulation, the cheapest high-value effect in the set.
- **`uToonGlitch`, `uThunder`, `uLongpress`, `uBlackFade`** — the shader has a **named event
  vocabulary**. Story beats are one-line JavaScript writes into a uniform. That is an architecture
  decision, not an effect, and it is the single most transferable thing in this section.

12,234 KB of the 13,331 KB page is MP4 (22 `<video>` elements as project previews). Everything
else is small: 684 KB JPEG, 49 KB GLB, 42 KB WOFF2, 4 KB CSS, **335 CSS rules total**. One font,
Nekst. Three easing curves. `transform3d` on 165 computed elements.

Note the header: `/ Full website is coming soon`. This is a teaser build, which makes the
economy sharper still.

**Signature moment.** `uLongpress` — press and hold to trigger a state change in the post stack.
Same primitive as RESN's `CLICK & HOLD`, arrived at independently.

**How close could a general-purpose Opus 5 CC get? 60–75%.** Every individual mechanism here is
documented and reachable: a ping-pong fluid buffer, RGB split, vignette, after-image feedback,
screen deformation, an analyser texture, rendering text to a canvas texture. A generalist can write
all seven. What a generalist will not reliably produce is the **composite** — the balance of grain
against black, the exact amount of chromatic fringing, the timing of `uThunder` — which is what
separates this from a shader-toy demo. **Mechanism reachable, art direction not.** A specialist is
not required to build it; a colourist's eye is required to make it land.

---

### What all five share — adopt these

Seven patterns appear in more than one of the five. Where they also contradict the wider survey, I
have said so.

1. **One easing curve, or at most five.** Nabil ships exactly one, tokenised as `--default-ease`
   and referenced everywhere. 60fps ships three, RESN four, NK five. **Nobody in the ceiling five
   exceeds five**, against Vercel's 45, Studio Freight's 24 and Josh Comeau's 24. This is the
   clearest single correlation in the whole research pass between measured discipline and perceived
   quality.
2. **Lenis or GSAP ScrollTrigger — never a hand-rolled scroll listener.** Nabil: Lenis + Nuxt.
   Valmont: Lenis + GSAP + ScrollTrigger. The three WebGL sites push scroll into a shader uniform
   (`uScroll`) instead.
3. **`KHR_parallel_shader_compile` requested by all three WebGL sites**, and by none of the sixteen
   sites in §1. Compiling shaders off the critical path is a first-paint discipline that separates
   this tier from the tier below it.
4. **Content rendered into a texture and composited by a shader.** 60fps has `tTexts`; RESN runs 17
   2D contexts; NK runs 24 plus an OffscreenCanvas. In all three the DOM is an input to the final
   image rather than a layer sitting on top of it.
5. **One or two font families.** NK: DM Sans alone. 60fps: Nekst alone. RESN: Fort + Work Sans.
   Nabil: Helvetica Neue + Gotham. Against framer.com's 76 loaded families.
6. **Press-and-hold as the interaction primitive.** RESN prints `CLICK & HOLD`; 60fps carries a
   `uLongpress` uniform. Two independent studios, same gesture, no obvious shared lineage.
7. **Near-black grounds, one accent.** `#0B0B0B`, `#070B0A`, `#000000`, `#000000`. All four studio
   sites are dark, with a single accent (60fps gold `#D9BA84` at 11.31:1; NK cyan-green).

**Point 7 cuts against my §5 recommendation and I am not going to bury it.** The reconciliation is
that these four are *studios selling spectacle*, where dark is the correct register because the
product is the render. §1's evidence — that Cursor, Warp, Studio Freight, Immersive Garden and
Rauno all went light — is about *product and portfolio* sites, which is what VX is. Both readings
are true of their own category. If Ryan's real ambition is to be read as a studio rather than as a
developer, Direction C in §5 becomes the lead and Direction A the alternative. That is a
positioning decision, not a design one, and it is his to make.

### Never seen before — candidates for the signature inventory

Four things in this set I have not measured anywhere else:

- **A named event vocabulary inside the post-processing shader** (`uThunder`, `uToonGlitch`,
  `uLongpress`, `uBlackFade`, 60fps). Story beats become one-line uniform writes. This is the
  strongest architectural idea in the section and it costs nothing to adopt.
- **An audio-analyser texture wired into the picture** (`tAnalyser`, 60fps). Sound modulating the
  image rather than accompanying it.
- **Press-and-hold as the primary interaction** (RESN, 60fps). Independently arrived at by two
  studios.
- **A 42-screen chaptered narrative with a persistent chapter rail and zero WebGL** (Nabil Issa).
  Not novel as an effect; novel as a demonstration that the format Ryan wants does not need a
  renderer.

And one finding that is not a technique but changes the budget conversation: **RESN runs three.js
r84, a 2017 release, and still reads as the ceiling.** Nine years of renderer progress is not what
separates that site from an ordinary one.

### The honest verdict on reachability

| Site | Generalist Opus 5 CC | Specialist needed? | What actually blocks it |
|---|---|---|---|
| **valmont.com** | **~100%** | No | Photography commission |
| **nabilissa.com** | **~95%** | No | 6 MB of architectural photography |
| **60fps.fr** | **60–75%** | Helpful, not required | Compositing taste — grain/fringing/timing balance |
| **nk.studio/work** | **50–65%** | Helpful, not required | 36 MB of art-directed photography + CMS |
| **resn.co.nz** | **40–55%** | **Yes — and more than one** | Gem modelling, 7.6 MB of sound design, hand-tuned springs |

**The conclusion Ryan should take from this section:** the two most achievable sites in his own
ambition set are the two with no WebGL, and the more relevant of those two — Nabil Issa — is
precisely the format he asked for. The ceiling on the *format* is reachable this month. The ceiling
on RESN is not reachable at all without commissioning modelling and sound, and that is a budget
question rather than a capability one.

---

<a id="1"></a>
## 1. Whole-page scroll narrative patterns

### The comparison table

All figures read back from the JSON records on disk. Draw calls are cumulative over roughly 25–40
seconds of page life on a CPU-shared Windows machine — they are order-of-magnitude signals, not
benchmarks. "Curves" counts custom `cubic-bezier` / `linear()` / `steps()` in **readable**
stylesheets only. "Ground" is the single background colour covering the most painted area across
the full scroll.

| Site | Screens deep | GL programs | Draw calls | canvas | inline SVG | Video KB | Total KB | Curves | Ground |
|---|---|---|---|---|---|---|---|---|---|
| basement.studio | 7.02 | 37 | 64,122 | 2 | 10 | 942 | 12,382 | 4 | `#000000` |
| igloo.inc | 1.00 | **90** | 50,254 | 0 † | 0 | 0 | 15,690 | 0 | `#A0A5B1` |
| immersive-g.com | 1.00 | 47 | 15,996 | 8 | 4 | 37,980 | 60,577 | 6 | `#E8E8E8` |
| studiofreight.com | 1.00 | 0 | 0 | 0 | 0 | 0 | 1,274 | **24** | `#FEFDFC` |
| lusion.co | 1.00 | 48 | 29,852 | 3 | 41 | 13,215 | 24,779 | 7 | `#FFFFFF` ‡ |
| activetheory.net | 1.00 | **131** | 54,587 | 1 | 0 | **187,139** | **205,580** | 1 | `#000000` |
| bruno-simon.com | 1.00 | 80 | **275,301** | 1 | 7 | 0 | 7,044 | 4 | canvas |
| rauno.me | 6.79 | 0 | 0 | 0 | 3 | 0 | **51** | 1 | `#EDEDED` |
| joshwcomeau.com | 4.60 | 0 | 0 | 1 | 51 | 0 | 486 | 24 | `#A0D4EE` |
| linear.app | 12.11 | 0 | 0 | 0 | 183 | 0 | 2,659 | 3 | `#08090A` |
| cursor.com | 9.14 | 0 | 0 | 0 | 59 | 61 | 4,185 | 7 | `#F7F7F4` |
| vercel.com | 6.59 | 0 | 0 | 1 | 47 | 0 | 384 | **45** | `#FAFAFA` |
| stripe.com/en-us | 16.76 | 10 | 595 | 5 | 284 | 0 | 2,830 | 0 § | `#FFFFFF` |
| every.to | 10.93 | 0 | 0 | 0 | 22 | 3,981 | 30,245 | 8 | `#000000` |
| framer.com | 12.09 | 0 | 0 | 0 | 161 | 9,702 | 10,814 | 2 | `#000000` |
| arc.net | 6.81 | 0 | 0 | 0 | 35 | 1,468 | 6,166 | 0 ¶ | `#FFFCEC` |

† igloo.inc acquired two WebGL2 contexts but `document.querySelectorAll('canvas')` returned zero at
all five depths. The render surface is not reachable from the document tree. Mechanism
unconfirmed — recorded as measured, not explained.
‡ Lusion's largest painted area is white, but the page frame token is `--color-off-white #F0F1FA`
and that is what the design reads as.
§ Stripe reported **eight** unreadable cross-origin stylesheets, so its zero is a blindness, not an
absence; its motion runs through 181 `Element.animate()` calls.
¶ Arc's stylesheets were fully readable (zero unreadable, and an `animation-timeline` rule was
found in them). It genuinely ships no `cubic-bezier` — six WAAPI animations instead.

---

### basement.studio — the room you are standing in

`docs/whole-page-narrative-refs/basement-studio/`

**What it does.** The page opens inside a rendered basement: staircase, arcade cabinet, a dog, a
basketball hoop, a neon `basement.` sign on the far wall. Nothing is a hero graphic — it is a
location. Scroll pulls the camera through it into a wall of 32 client logos (Vercel, Linear,
Cursor, Solana, MrBeast), then "Featured Projects", then a footer where `BSMNT.26` is set at full
viewport width. Pinned bottom-centre on every screen is a two-state pill: **HUMAN / MACHINE**.

**How.** Three.js under Next.js (React Three Fiber). 37 shader programs, 74 `shaderSource` calls
totalling **484,393 characters of GLSL**, 64,122 draw calls, two WebGL2 contexts. Thirty-one 3D
assets for 2,909 KB — and the interesting part is what they are: the lighting is not computed, it
is **baked**. `bake-00-lightmap` 196 KB, `bake-01` 179 KB, `bake-02` 165 KB, `bake-03` 194 KB, all
KTX2. That is how a photoreal room runs at 646 DOM elements and 12,382 KB total instead of 200 MB.

Type is Geist plus Geist Mono plus a display face called `flauta`. The tracking ladder is textbook:
h1 87px/78px (ratio 0.897) at weight 600, tracking **−0.04em**; h2 24/24 at −0.03; h3 20/20 at
−0.02; body 16/24 at 0. Four easing curves, two of them `steps()` driving sprite-sheet masks
(`steps(var(--mask-frames))`). `cursor: alias` on 186 elements — a drag affordance, everywhere.

**The tell.** They ship the Leva debug GUI's tokens in production: all 53 of the page's `:root`
custom properties are `--leva-*`. The dev panel is one keystroke away. Read that as confidence
rather than sloppiness — the site is the workshop.

**Transferable:** bake your lighting. An environment that would be unaffordable at runtime becomes
affordable as textures, and the DOM stays under 700 elements.

---

### igloo.inc — the page with 27 elements

`docs/whole-page-narrative-refs/igloo-inc/`

**What it does.** Fullscreen, no chrome, no nav, no scroll. An igloo on a snowfield under flat grey
sky, faint wireframe boxes hanging in the air like survey markers. `scrollHeight === innerHeight`
because there is no document to scroll.

**How.** The heaviest shader payload in the survey: **90 programs, 180 `shaderSource` calls,
1,042,176 characters of GLSL**, 50 asset files totalling 12,656 KB of KTX2, one `AudioContext`.
Twenty-seven DOM elements. **Twelve CSS rules.** Zero custom properties, zero easing curves, zero
`<img>`, zero `<svg>`.

The detail worth stealing the idea from: `IBMPlexMono-Medium-datatexture.ktx2`, 108 KB. **The
typography is uploaded to the GPU as a data texture.** There is no text on this page in any sense a
browser understands.

**Rejected for VX.** Nothing here survives the accessibility floor — no text, no keyboard path, no
document. It is a demo reel for a studio whose product is demo reels. Useful as proof of the
ceiling, not as a pattern.

---

### immersive-g.com — sculpture in plaster

`docs/whole-page-narrative-refs/immersive-garden/`

**What it does.** A preloader holds you on a flat `#E8E8E8` field with a hairline progress rule and
the wordmark in letterspaced small caps — deliberate curtain-down. Then a paper-white world: white
bas-relief forms (a hand, branches, cliff faces) scroll behind the copy while client work appears
as small dark inset video cards. The contrast between matte plaster field and lit rectangle is the
entire compositional idea.

**How.** Nuxt plus Three.js. 47 programs, 633,481 GLSL characters, eight canvases across thirteen
contexts (ten 2D, one WebGL, two WebGL2), 37,980 KB of video, 9,926 KB of 3D — including a single
2,248 KB normal map (`normal_05.ktx2`). `will-change` is set on **199 computed elements**, which is
how the compositor stays ahead of the scroll and also why the page costs 60,577 KB. Six easing
curves — no single motion system.

Type: `PSTimes` serif throughout, h1 44px/48.4px (ratio 1.1) at weight 400, ink `#030303` on
`#E8E8E8` — **16.83:1**. `cursor: pointer` on 147 elements.

**Transferable:** sculptural light on matte paper is the most expensive-looking composition in the
survey, and the WebGL is not what makes it so. The same read is achievable with one commissioned
render and CSS masks.

---

### studiofreight.com — the people who wrote Lenis ship no canvas

`docs/whole-page-narrative-refs/studio-freight/`

**What it does.** One screen. A cream `#FEFDFC` field carrying an asymmetric mosaic of 26 project
thumbnails, with `Moving Missions Forward` set in a serif (`jjannon-regular`, 42px/48.72) dead
centre. Nav is monospace (`publico-text-mono`). No hero, no scroll narrative, no reveal.

**How.** **Zero WebGL. Zero canvas. Zero video. 1,274 KB.** Lenis is present and running. Thirty
`IntersectionObserver` instances. `mix-blend-mode` on **133 computed elements** — that is how the
thumbnails sit *into* the cream instead of on top of it. 177 custom properties, mostly an alpha
ladder (`--black-5` through `--black-95`) plus `--white: #fefdfc`.

Two things in the CSS matter more than the visual. They ship **`view-timeline`, `scroll-timeline`
and `timeline-scope`** — native CSS scroll-driven animation, in production, by the studio whose
JavaScript smooth-scroll library everyone else installs. And they ship **24 distinct easing
curves**, which is a motion system in name only.

**Transferable:** the originators of the JS-scroll era are moving to the platform. If Lenis's
authors are shipping `scroll-timeline`, the case for adding a 44 KB scroll library to VX is weaker
than it was.

---

### lusion.co — glossy objects inside a frame

`docs/whole-page-narrative-refs/lusion/`

**What it does.** A pale lavender-white page (`--color-off-white #F0F1FA`) with the WebGL confined
to a rounded inset panel — not full bleed. Inside it, a tumbling pile of glossy jack-shaped objects
in blue, grey and black. `SCROLL TO EXPLORE` sits beneath between plus-sign registration marks. The
framing is the design decision: the 3D is treated as a screen inside a document, not as the
document.

**How.** Three.js, 48 programs, 288,765 GLSL characters, three canvases, 13,215 KB of video, one
589 KB `matcap.exr` — matcaps are how you get plastic-and-chrome without a real lighting rig. Seven
easing curves. `cursor: pointer` on **1,056 elements**. Thirty-one tokens are exposed and worth a
look as a palette study: `--color-off-white #F0F1FA`, `--color-blue #1A2FFB`, `--color-green
#C1FF00`, `--header-color #0016EC`. Aeonik plus IBM Plex Mono plus a house `LusionMono`.

**Transferable:** framing the expensive thing inside a panel, on a light page, costs less and reads
*more* deliberate than full-bleed. It is also the only way a heavy graphic survives being placed
next to restrained client work.

---

### activetheory.net — two hundred megabytes

`docs/whole-page-narrative-refs/active-theory/`

**What it does.** Black. A blue ASCII-hatched loading disc counting to 100. Then a photoreal
machine — a centrifuge or reactor, cabled, rim-lit teal, shedding a column of glittering particles
into a basin. Nav is a monospace pill top-right: `WORK ——— CONTACT`.

**How.** **131 shader programs, 262 `shaderSource` calls, 883,621 GLSL characters, 54,587 draw
calls, 1,374 instanced.** Fifty binary 3D files for 12,496 KB (`spine.bin`, `structure.bin`,
`chainlink.bin`, `rock_L.bin`). And **187,139 KB of video** inside a 205,580 KB page. Ninety-one
DOM elements. One easing curve — `cubic-bezier(0.17, 0.4, 0.02, 0.99)` — the most disciplined
motion system measured, sitting on the least disciplined payload.

**Rejected for VX.** Two hundred megabytes is not a Core Web Vitals conversation, it is a different
medium.

---

### bruno-simon.com — the only one you play

`docs/whole-page-narrative-refs/bruno-simon/`

**What it does.** You drive a car around a diorama. Projects are objects you crash into.

**How.** **275,301 draw calls — five times the next-highest in the survey — of which 38,481 are
instanced.** Eighty programs, 503,143 GLSL characters. Fifty-one 2D canvas contexts alongside one
WebGL2 context (texture atlases generated at runtime). Rapier physics in the bundle. **Two
`AudioContext`s.** `cursor: grab` on one element, `not-allowed` on thirty, `help` on seven. Only
7,044 KB total — 974 KB of Draco-compressed GLB does the work.

The motion signature is in the easings: `cubic-bezier(0.4, 1.6, 0.65, 1)` and
`cubic-bezier(0.49, 2.2, 0.53, 0.75)`. Control points above 1 mean deliberate overshoot. Amatic SC
and Nunito, both handwriting-adjacent. Everything here says *toy*, consistently.

**Transferable:** consistency of register. The bounce, the fonts and the physics argue the same
thing. Compare against the sites where a serious payload wears a playful font.

---

### rauno.me — fifty-one kilobytes

`docs/whole-page-narrative-refs/rauno/` and `rauno-dark.png`

**Correction to the brief: rauno.me is not dark and not saturated.** `color-scheme: light`, ground
`#EDEDED`, ink `#171717` (15.31:1). Re-measured under `prefers-color-scheme: dark` it returns the
same `rgb(237, 237, 237)` — there is no dark mode.

**What it does.** Vertical scroll drives a **horizontal filmstrip**. Full-bleed white cards slide
past on a light grey field: a bio card with an enormous saturated yellow disc riding the cursor
through `mix-blend`, then `Craft` set at 400px, then `History of Software Design` illustrated by a
single giant blue pixel-cursor, then `Projects`, then a yellow manifesto card — *Make it fast.
Make it beautiful. Make it consistent. Make it careful. Make it timeless. Make it soulful. Make
it.* A custom scroll indicator sits top-centre, drawn as a row of tally marks.

**How.** **51 KB over 37 requests.** 186 DOM elements. Zero canvas, zero video, zero WebGL, zero
`<img>`. One easing curve, `cubic-bezier(.2, .8, .2, 1)`. Fifty-seven tokens declared in
`color(display-p3 …)` — wide-gamut colour used as a differentiator on a page with almost nothing in
it. Font `X` (custom grotesk) plus JetBrains Mono. `cursor: copy` on four elements.

**This is the closest existing thing to what the brief describes**: a whole-page narrative that is
a manifesto, with the work moved elsewhere. It costs 51 KB.

*Measurement artifact:* the probe reported h3 at 720px and p at 85px. Those are SVG-hosted text
nodes, not a type scale. Ignore them.

---

### joshwcomeau.com — the heaviest real use of CSS scroll timelines

`docs/whole-page-narrative-refs/josh-comeau/` and `josh-comeau-dark.png`

**What it does.** A sky-blue gradient (`#A0D4EE`) with layered cloud hills, a claymation avatar of
the author sitting cross-legged under an arc of rainbow dashes, then an editorial two-column
article index. Under `prefers-color-scheme: dark` the ground becomes `#111B27`.

**How.** **26 CSS rules using `animation-timeline`**, plus one each of `view-timeline`,
`scroll-timeline` and `timeline-scope` — by a wide margin the most committed production use of
native scroll-driven animation in the set. Twenty-nine `prefers-reduced-motion` blocks. Nine
`oklch()` rules. One
`linear(0, 0.1407 4.43%, 0.9383 16.72%, 1.0774 20.43%, 1.1493 24.31%, …)` — a spring baked into a
CSS easing function. Two `AudioContext`s (the speaker toggle in the nav is real). Fifty-one inline
SVG with 154 drawable nodes, one canvas, zero WebGL.

**486 KB total, of which 1 KB is JavaScript.** Twenty-four easing curves, though — Rule 5 is not
observed here.

**Transferable:** the whole scroll-narrative vocabulary is available in CSS today, at 0 KB, and
this site is the existence proof. It is still behind `@supports` on Firefox stable, so the
unanimated state has to be the correct one.

---

### linear.app — 183 SVG and not one pixel of canvas

`docs/whole-page-narrative-refs/linear/`

**What it does.** Twelve screens of near-black. Headline, sub, then the product itself rendered at
high fidelity — issue view, roadmap Gantt, agent session panel — each section introduced by a
two-line statement and a numbered link (`2.0  Plan →`).

**How.** 4,707 DOM elements. **183 inline `<svg>` containing 1,227 drawable nodes.** Zero canvas,
zero video, zero WebGL. 2,659 KB over 693 requests. Inter Variable plus Berkeley Mono. Fifty-one
cross-origin stylesheets unreadable, so no tokens are harvestable.

The type ladder reproduces exactly what the library measured on 2026-08-05: h1 64/64 at weight
**510**, tracking −0.022em; h2 48/48 w510 −0.022; h3 20/26.6 w590 −0.012; p 15/24 −0.011; body
16/24 at 0.

**One thing has changed and it matters for our own rules.** Linear now ships **three** curves:
`steps(1)`, `cubic-bezier(0.32, 0.72, 0, 1)` and `cubic-bezier(0.16, 1, 0.3, 1)`. The library's
"Linear runs one curve" claim was true on 2026-08-05 and is not true on 2026-08-17. The
transferable point survives — two narrative curves plus a step is still a system — but the figure
needs restating with its date.

**Ground: `#08090A`.** Identical to `app/globals.css:8`.

---

### cursor.com — oil paintings behind the terminal

`docs/whole-page-narrative-refs/cursor/` and `cursor-dark.png`

**Correction to the brief: Cursor is not dark.** Ground `#F7F7F4`, ink `#26251E` (14.33:1). Under
`prefers-color-scheme: dark` it becomes `#14120B` — a *warm* near-black, hue-matched to the cream,
not Linear's blue-black.

**What it does.** Nine screens. Hudson-River-School oil paintings and grey-green plaster surfaces
are used as full-bleed backdrops; product windows float in front of them with soft shadows. Body
copy is set in **EB Garamond at 17.28px/23.33px**. Display is a house grotesk, `CursorGothic`, at
26px/32.5 tracking −0.0125.

**How.** Zero WebGL, zero canvas, zero video beyond a 498×544 logo loop. 2,299 elements, 59 inline
SVG, 1,066 KB of JavaScript, 57 WAAPI animations, seven easing curves. Under the hood it is one of
the most modern CSS codebases measured: **265 tokens in `lab()`, 331 rules using `color-mix()`, 44
`:has()`, 4 `@container`, 4 `subgrid`, 3 anchor-positioning rules.**

**One thing not to copy.** Body copy is `rgba(38, 37, 30, 0.55)`, which composites to `#84847E` on
their ground — **3.50:1**, under the 4.5:1 floor at 17.28px. Elite sites ship AA failures too.

**Transferable:** fine-art imagery as the ground, product chrome as the figure. It is the biggest
aesthetic shift in the AI-tools category this year, and it is cheap — it is `<img>`.

---

### vercel.com — a black triangle with a CSS shadow

`docs/whole-page-narrative-refs/vercel/`

**What it does.** `Agentic Infrastructure` at 64px, tracking **−0.06em**, next to a black triangle
with a soft shadow, on `#FAFAFA`. Then a logo wall, framed SVG diagrams of the edge network, then
customer sites shown as screenshots.

**How.** **384 KB total, 6 KB of JavaScript.** Zero WebGL — confirming the library's 2026-08-15
instrumentation two days later. What is remarkable is the CSS: **514 `:root` tokens, 98
`@container` rules, 161 `:has()` rules, 157 `color-mix()`, 28 `oklch()`, 4 each of `view-timeline`
/ `scroll-timeline` / `timeline-scope`, 3 `@starting-style`, 5 `subgrid`, 39 `text-wrap: balance`,
29 `prefers-reduced-motion`** — and **45 custom easing curves**, the largest Rule 5 violation in
the survey.

Typographically they ship five pixel display faces — `GeistPixelSquare`, `GeistPixelGrid`,
`GeistPixelCircle`, `GeistPixelTriangle`, `GeistPixelLine`. A display system built from one glyph
shape repeated at different primitives.

---

### stripe.com — the whole WebGL budget is one gradient

`docs/whole-page-narrative-refs/stripe/`

**How.** **10 shader programs, 20 `shaderSource` calls, 116,767 GLSL characters, 595 draw calls,
five canvases across seven contexts (two WebGL, four WebGL2, one 2D).** That is the famous animated
mesh gradient and nothing else. Set it against Active Theory's 54,587 draws: enterprise cinematic
is two orders of magnitude cheaper than agency cinematic.

Seventeen screens, 4,182 elements, **284 inline SVG with 762 nodes**, 66 `IntersectionObserver`s,
181 WAAPI animations, `clip-path` on 98 computed elements, and — the detail that gives it away —
**`cursor: grab` on 78 elements**. Things on this page are draggable. `sohne-var` at **weight 300**
(light, at 48px display), h1 48/55.2 tracking −0.02. Ink `#061B31` on `#FFFFFF`, panels `#F8FAFD`
and `#E5EDF5`, navy `#0D1738`.

*Limit:* a promotional modal opened on load and stayed open through all five depth captures. DOM,
type and palette figures are from the underlying document; the screenshots show the overlay.

---

### every.to — black paper, serif at 92px

`docs/whole-page-narrative-refs/every-to/`

**How.** Ground `#000000`. `Signifier` serif at **91.67px/82.5px (ratio 0.9), tracking −0.02em** —
display serif set tighter than its own leading. Founders Grotesk for the deck, Switzer for body,
Geist Mono for labels, plus a house face called `Every`. 176 images, 34 `IntersectionObserver`s,
one `animation-timeline` rule, eight easing curves, 30,245 KB. Zero WebGL.

*Limit:* a pale-blue (`#CDEFF9`) subscribe interstitial covered all five depth captures. Palette
and type figures are from the document beneath it.

---

### framer.com — dark, and the CSS proves the product

`docs/whole-page-narrative-refs/framer/`

**How.** Black ground. GT Walsheim Medium h1 54/54 tracking −0.04. Nine autoplaying videos for
9,702 KB. **`view-timeline` + `scroll-timeline` + `timeline-scope` present** — Framer's own output
uses native scroll-driven animation. `will-change` on 110 CSS rules and 34 computed elements;
`mask-image` on 42 computed elements. Only two custom curves. **`document.fonts` reports 76
distinct families**, which is what happens when a page previews other people's templates.

The signature moment is not visual: the hero carries a live line reading
`#7 on OpenRouter: 793.9B tokens this week`. Real data, on the page, above the fold.

---

### arc.net — signature colour, torn edges

`docs/whole-page-narrative-refs/arc/`

**How.** Cream `#FFFCEC` against electric blue `#3139FB` and a deeper `#2702C2`, with zig-zag
torn-paper section edges. 120 tokens including a 12-step primary ramp (`#FFEAE7` → `#090201`) and a
matching secondary. Marlin Soft SQ h1 32/31.2 at weight 700, tracking **−0.05**; ABC Oracle for
body; Space Mono, Sohne Breit and EB Garamond also loaded. One `animation-timeline` rule, six WAAPI
animations, **no `cubic-bezier` anywhere** (and zero unreadable stylesheets, so that is a real
absence). One 3106×2160 webm. 471 DOM elements.

---

<a id="2"></a>
## 2. Aesthetic range — what reads as elite versus dev-portfolio-default

### Direction 1 · Dark cinematic

**Measured examples:** linear.app `#08090A` · framer.com `#000000` · every.to `#000000` ·
basement.studio `#000000` · activetheory.net `#000000` · teenage.engineering `#0F0E12` in its
product sections.

**The palette that keeps recurring:** a near-black ground between `#000000` and `#0F0E12`, an
off-white at `#F5F5F5`–`#F7F8F8`, one mid-grey around `#8A8F98`, hairlines at 5–10 % alpha.
Linear's grey on its ground measures 6.13:1; Teenage Engineering's white on black, 17.64:1.

**Who it signals to.** Developers who already read Hacker News. It is the correct register for a
product whose surface *is* a dark IDE.

**What it costs in differentiation.** Everything. Two of these grounds are the same hex as
vertexapps.dev today. A recruiter or client opening Ryan's portfolio in a tab row beside Linear,
Vercel and a dozen other Next.js portfolios sees one continuous dark field. Its default status
*is* the problem: dark is now what you get when nobody made a decision.

**The exception worth studying is teenage.engineering.** Seventeen screens, **zero canvas, zero
video, zero WebGL**, one easing curve (`cubic-bezier(0.6, 0.2, 0, 0.8)`), 101 tokens, 39
photographs, 2,598 KB. Body copy at **weight 100**. The white sections are the larger painted area;
the black ones (`#0F0E12` and `#000000`) are the memorable ones, because each is a full-bleed
product photograph against nothing. It reads as the most expensive site in the survey and it is
photography on a black field. **If VX goes dark, this — not Linear — is the reference, and it
requires photography VX does not have.**

### Direction 2 · Editorial cream / off-white

**Measured examples:** immersive-g.com `#E8E8E8` ink `#030303` (16.83:1) · studiofreight.com
`#FEFDFC` · cursor.com `#F7F7F4` ink `#26251E` (14.33:1) · anthropic.com `#F0EEE6` / `#FAF9F5` ink
`#141413` (17.50:1) accent `#C6613F` · arc.net `#FFFCEC` · mongodb Atlas `#FDFEEC`.

**Who it signals to.** People who buy considered work. It is the register of architecture
monographs, gallery catalogues and industrial-design documentation, and it is where the elite tier
of this category actually moved in 2026.

**What it costs.** Nothing in differentiation — inside the developer-portfolio genre it is close to
unoccupied. It costs *craft*: on cream, every misaligned baseline and arbitrary spacing value is
visible. Dark hides sloppiness; paper does not. That is precisely why it reads as expensive, and
precisely why it is the harder brief.

**The Cursor variant is the most useful for VX** because it does not choose between light and dark:
warm paper by default, warm near-black `#14120B` under `prefers-color-scheme: dark`, one hue family
in both.

### Direction 3 · Warm grey / newspaper

**Measured examples:** cursor.com's `#F7F7F4` / `#F2F1ED` / `#EBEAE5` stack · anthropic.com's
`#FAF9F5` / `#F0EEE6` / `#E3DACC`.

A sub-mode of Direction 2 with a serif body face doing the work. Anthropic sets paragraphs in
**Anthropic Serif at 20px/28px (ratio 1.4)** and headlines in Anthropic Sans at 60.87/66.95 weight
700 — a serif body on a technology company's homepage, which five years ago would have read as a
mistake. Cursor does the same with EB Garamond at 17.28px. Anthropic's terracotta `#C6613F`
measures **3.85:1** on their paper: large text and UI only, not body.

**Stack note:** anthropic.com runs on **Webflow with GSAP 3.15.0 and ScrollTrigger**. The visual is
transferable; the build is not, and it is outside our stack filter.

### Direction 4 · High-contrast black-and-white

**Measured examples:** vercel.com `#FAFAFA` / `#171717` · planetscale.com `#FAFAFA` / `#414141`
(9.78:1) · rauno.me `#EDEDED` / `#171717` (15.31:1).

**Who it signals to.** Engineers. Nothing is decorative; the argument is that the work does not
need help. Vercel's hero is a black triangle. PlanetScale's entire page is `ui-monospace` at 16px.

**What it costs.** It is the easiest direction to execute badly, because "restraint" and "empty"
are one bad decision apart. It also depends on the content being dense — rauno.me gets away with
186 elements because each card is a full-bleed typographic statement.

### Direction 5 · Signature colour

**Measured examples:** arc.net electric blue `#3139FB` on cream · lusion.co `--color-blue #1A2FFB`
and `--color-green #C1FF00` · rauno.me's `#FFFF02` disc · basement.studio's orange nav highlight ·
joshwcomeau.com `#E60067`.

A signature colour is the cheapest differentiation available and the fastest to date. Arc's blue
does more work than any amount of WebGL on that page. The risk is that a saturated brand colour on
a portfolio reads as a brand exercise rather than as evidence of engineering.

### Direction 6 · Soft green

I looked for premium examples and mostly did not find them. The closest measured: **nautil.us**
pairs `#07863C` with cream `#FFF5CD` on white in Freight Display / Freight Sans, and it reads as a
science magazine rather than as software. **Lusion** carries `--color-green #C1FF00` as an accent
only. **PlanetScale** carries a nine-step green ramp (`#EFFFF3` → `#19652A`) but uses it as status
colour, not brand.

**Honest reading: green is unoccupied here for a reason worth testing, not a reason to avoid.**
Green's problem is that at accent lightness it collides with "success state". Used as **ink rather
than accent** — a deep bottle green as a text colour on paper — it stops reading as a status and
starts reading as a drawing ink. That is the version worth trying, and it is in Direction A below.

### Direction 7 · Cool slate + sky blue

**Measured examples:** nature.com white with deep teal `#01324B`, Harding serif h1 32px weight 700
tracking −0.0195, **zero custom easing curves** · warp.dev.

**Warp is the interesting one and it is not what the brief expected.** Ground
`oklch(0.992495 0.00178735 220)`, ink `oklch(0.07 0.007 220)`, mid `oklch(0.4 0.007 220)`. **The
entire neutral ramp is one hue — 220° — at chroma ≤ 0.007.** That is the lightness-ladder
discipline from `principles.md`, shipped: neutrals that are not grey but are all *the same*
not-grey. 614 `color-mix()` rules, 283 tokens, five `@starting-style` blocks. `theFuture` display
at 72px/90px tracking −0.035, Matter for body, Azeret Mono, and **Instrument Serif — which
vertexapps.dev already loads**. Framer Motion detected; 1,494 KB of JavaScript; ten easing curves.

**metabase.com** was measured (11.5 screens, 104 SVG, zero WebGL, white) and is a generic SaaS
page. I would not cite it as an elite reference.

### The summary judgement

Dark is the genre default and VX is already sitting on the exact hex of the category leader.
Cream/warm-paper is where the 2026 tier actually is, is nearly unoccupied among developer
portfolios, and punishes sloppiness in a way that becomes the argument. **The differentiating move
is to go light and make darkness a deliberate, contained event on the page** — which is exactly
what Immersive Garden and Lusion do with their inset panels.

---

<a id="3"></a>
## 3. Mental-model visualisation techniques

Eight pages measured, ranked by how well they turn an abstract system into something you can look
at.

**planetscale.com — the strongest reference in this section, and the cheapest.**
`docs/whole-page-narrative-refs/planetscale/`. **157 KB total. Zero KB of JavaScript. 70
requests.** 708 DOM elements, 136 inline SVG. The whole page — h1, h2, h3, body — is set in the
system `ui-monospace` stack at **16px/24px**, headings distinguished by weight 700 alone.
Architecture diagrams are drawn as bordered boxes with dashed connectors and arrowheads: `VTGate`
above three `Primary` nodes above six `Replica` nodes, each box outlined in a different hue. One
easing curve. Ink `#414141` on `#FAFAFA` (9.78:1) with `#F35815` and `#F2B600` the only saturation.

It reads as a technical paper that happens to be a website. For a "how I think about building
software" argument this is the closest thing to proof that the register works — at 157 KB.

**prefect.io** — 12.8 screens, 117 inline SVG, two canvases, zero WebGL. Near-black with fine noise
texture, monospace field labels (`SUCCESS RATE`, `AVG DURATION`, `P95 LATENCY`), and a task
timeline drawn as green and blue bars against a time axis: `ingest 3s`, `normalize 6s`,
`validate 5s`, `enrich 13s`. The abstraction is made concrete by showing a *specific run* rather
than a generic diagram. Fourteen easing curves, though.

**chromatic.com** — 13.18 screens, zero WebGL, 39 SVG. Renders a browser chrome mock containing the
real product doing a visual diff, complete with pinned review comments. The system is explained by
showing the moment it catches something.

**vercel.com/products/rendering** — 5.09 screens, 58 SVG, zero canvas. Small framed diagrams with
animated packets travelling along paths, each captioned in two lines (`Git-driven changes`,
`Global delivery`, `Built-in security`). Effective, low-cost, entirely `<svg>`.

**mongodb.com/products/platform/atlas-database** — 11.58 screens, cream ground `#FDFEEC`, green
accent, 31 SVG. The best single idea here is a code block wired by an arrow to the rendered UI it
produces — the document on the left, the listing card on the right. Data model made visible as a
mapping.

**retool.com** — 10.76 screens, 147 SVG, zero WebGL, nineteen easing curves. Product screenshots at
high fidelity; the mental model is carried by the app itself, not by diagrams.

**getdbt.com** — 9.43 screens, generic SaaS. **segment.com** — 3.83 screens; it is now a Twilio
migration notice and no longer a useful reference. Both recorded for completeness.

**The pattern that works, stated as a rule:** abstract systems become cinematic when they are shown
*running on a specific case*, not when they are diagrammed generically. Prefect shows one pipeline
run with real durations. Chromatic shows one diff. Mongo shows one document becoming one card.
PlanetScale shows one topology with named nodes. Nobody who did this well drew a generic
architecture.

---

<a id="4"></a>
## 4. Landing / portfolio split architecture

**basement.studio → /showcase** (`/work` redirects there). They do not hand off at all: **the
portfolio is the same 3D world with the camera moved.** You arrive at a lit wooden shelving wall
where each project is a physical object — a skate deck, a Vercel Ship poster, a MrBeast flight
case, a KidSuper handbag, an ASCII-rendered `a`. 35 shader programs, 461,110 GLSL characters, 49
asset files for 5,605 KB. Four screens against the landing's seven. The HUMAN/MACHINE pill persists.

The tonal handoff problem is solved by refusing to have one. Cost: the portfolio inherits the
landing's entire runtime, and a project's presence in the world is bounded by modelling time.

**rauno.me → /craft.** The landing is a 51 KB horizontal filmstrip. `/craft` is a vertical masonry
of small dated interaction studies — `Spatial Tooltip · September 2024`, `Staggered Text · August
2024`, `Minimap · April 2024` — each with `View Prototype` or `Read Essay`. **68 autoplaying muted
MP4s.** A full-page scroll pulls **233,630 KB of video** with **1 KB of JavaScript** and 81
`IntersectionObserver`s; blur-up placeholders show as computed `filter: blur()` on 68 elements.
(Condition: 233,630 KB is what crawling every card to the bottom costs. A visitor who scrolls
part-way pays proportionally less — the observers are the budget.)

Continuity is carried by three things and nothing else: the same font (`X` + JetBrains Mono), the
same single easing curve, and the same near-neutral ground (`#FCFCFC` against the landing's
`#EDEDED`). No shared graphic, no shared layout. **It does not feel like a letdown because the
landing never promised a spectacle — it promised taste, and the grid delivers more of it.**

**linear.app → /customers.** Identical shell, ground unchanged at `#08090A`, nav unchanged. Work
becomes brand-coloured cards — Automattic blue, Brex orange, a black-and-white photograph for
Dandelion Chocolate. 7.86 screens, 37,871 KB of video, ten easing curves against the homepage's
three. The handoff is invisible because there is no tonal shift to make.

**lusion.co/work** runs the same WebGL app as the landing (48 programs, 32,842 draw calls) and
opens on a full-bleed `PLAY ⏵ REEL` panel.

**immersive-g.com/work returns 404** — their projects live inline on the landing page. Noted rather
than guessed at. **joshwcomeau.com/tutorials/ also returns 404** (a dark-mode 404, which is how I
confirmed his theme handling).

**The rule for VX.** Ryan's client work is restrained: ConsultBase, Parenting Plan Pro, Civic
Strategy Partners, Revoix, FM24, Villa L'Estagne. If the landing is a spectacle, `/work` reads as a
comedown. If the landing is a *manifesto with taste* — Rauno's model — then `/work` is the evidence
and the page gets stronger, not weaker. That argues against a heavy WebGL landing on its own,
independent of budget.

---

<a id="5"></a>
## 5. Recommended direction for VX

Three directions, each with a real argument. **A is the recommendation.**

The constraint that drives all three: the landing must set up a `/work` page containing credibility
sites for a federal advisory practice, a German facility-management platform, a legal document
generator and a Mediterranean villa. Whatever the landing argues has to make *that* collection look
like the point.

Every pair below was computed against the WCAG 2.x formula. Hairline values are decorative
separators only — any border that identifies a control needs its own token at 3:1.

---

### Direction A — **The Drawing Office** · recommended

**The argument.** Custom software is drawn before it is built. The page is a drawing surface — warm
paper, ink, hairline rules, real annotation — and the only lit thing on it is the one console where
the system is actually running. Each section is a layer of the drawing: the schema, the tenant
boundary, the scheduler, the interface. The dark inset appears exactly once, and it is the moment
the drawing becomes a machine.

This argues the opposite of the category's visual claim. Linear, Cursor and Framer all argue *this
is a product*. Ryan is not selling a product; he is selling the judgement that goes in before the
product exists. A drawing surface says that. A dark IDE says he builds things that look like other
people's tools.

**Palette**

```css
--paper:          #F5F3EE;  /* ground */
--paper-sunk:     #EBE8E0;  /* recessed panels, table zebra */
--ink:            #17150F;  /* 16.46:1 on paper, 14.91:1 on paper-sunk */
--ink-muted:      #56534A;  /*  6.93:1 on paper,  6.28:1 on paper-sunk */
--hairline:       #D9D5CA;  /* decorative rules only */
--accent:         #2F6B4B;  /*  5.69:1 on paper,  5.16:1 on paper-sunk */
--on-accent:      #F5F3EE;  /*  5.69:1 on accent — clears AA in both directions */
--console:        #14120B;  /* the single dark inset */
--console-ink:    #F0EDE3;  /* 15.99:1 */
--console-muted:  #9C978A;  /*  6.43:1 */
--console-accent: #7FBF9B;  /*  8.77:1 */
```

The green answers Ryan's soft-green instinct, and it works because it is used as **ink, not as
accent** — bottle green at that lightness reads as drafting ink and fountain-pen blue-black's
sibling, not as a success toast. Note that `--accent` clears 4.5:1 in *both* directions, so unlike
the current `--accent` / `--accent-text` split at `app/globals.css:11-26` it does not need forking.

**Type.** All four faces are already loaded in the current build.

| Role | Face | Notes |
|---|---|---|
| Display | **Instrument Sans** | 500–600; tracking −0.022em at 64px tapering to 0 at body |
| Body | **Inter** | 16/24, `max-width: 65ch` on the prose element |
| Manifesto voice | **Instrument Serif** | section openings and pull-quotes only |
| Annotation, readings, IDs | **JetBrains Mono** | uppercase micro-labels at `--tracking-wider` |

The mono is load-bearing, not decorative: it is what makes an annotated drawing read as
machine-verifiable rather than illustrative.

**Motion.** One curve — keep `cubic-bezier(0.32, 0.72, 0, 1)` from `app/globals.css:59`. Scroll
narrative in CSS `animation-timeline` / `view-timeline` behind `@supports`, with the unanimated
state designed as the finished drawing. Josh Comeau's 26 rules are the proof this is
production-viable; Studio Freight and Framer shipping it independently is the corroboration.
Budget: 0 KB. No GSAP, no Lenis.

**Fidelity tier (Rule 6b): tier 1, wireframe / technical drawing** for the page, with **one tier-5
inset** — the console. That mix is unoccupied. Everyone doing tier 1 does it flat; everyone doing
tier 5 does it full-bleed.

**Why this beats the alternatives.** It differentiates on the axis that costs least and dates
slowest (paper, ink, one accent); it makes the restrained client work read as the natural
conclusion of the argument rather than an anticlimax; and it is buildable in a week by one person
at under 500 KB. The risk is real and worth stating: on paper, every spacing and baseline error is
visible. That is the price of the register, and it is also why it signals what it signals.

---

### Direction B — **The Blueprint** · the technical-register alternative

**The argument.** The site is set like an engineering document. Cool paper, near-black ink, one sky
blue for anything live or linked, carried by monospace and rules rather than imagery. PlanetScale
at 157 KB is the proof; Nature at zero custom easing curves is the tonal reference.

```css
--paper:    #F6F8FA;
--ink:      #0D1117;  /* 17.78:1 */
--slate:    #47536B;  /*  7.26:1 */
--hairline: #DCE1E8;
--sky:      #0B62C4;  /*  5.54:1 on paper; paper on sky also 5.54:1 */
--sky-deep: #0A56AC;  /*  6.71:1 — for links sitting on a panel */
--console:  #0D1117;
--slate-lt: #9AA6BC;  /*  7.71:1 on console */
--sky-lt:   #6FB2FF;  /*  8.55:1 on console */
```

Type: **JetBrains Mono as the primary text face** — PlanetScale does exactly this with the system
mono stack at 0 KB — Instrument Sans for display only, no serif.

**Strongest argument for it:** it is the most honest possible match to what Ryan actually sells —
RLS policies, `pg_cron` schedules, source-fidelity CI gates, static exports onto legacy Apache. The
Civic Strategy Partners audience literally verifies CAGE codes before it enquires. A document
register speaks to that reader directly.

**Why I would not lead with it:** an all-mono page has a low ceiling on *feeling*. It can be
respected; it is hard to make it land as beautiful. And it forecloses the manifesto voice — you
cannot write a memorable sentence in 16px monospace and have it hit.

---

### Direction C — **The Warm Instrument** · if the answer must be dark

**The argument.** Keep Ryan's lean but stop being Linear. Move the black off the blue axis onto a
warm one and let the accent be the only cool thing on the page.

```css
--bg:       #0C0B08;  /* warm near-black, not #08090A */
--surface:  #16150F;
--text:     #F3F0E6;  /* 17.26:1 on bg, 16.04:1 on surface */
--text-2:   #9A968A;  /*  6.66:1 on bg,  6.19:1 on surface */
--hairline: #26241C;
--brass:    #C8A24A;  /*  8.18:1 on bg — bg-on-brass is also 8.18:1 */
--green:    #7FBF9B;  /*  9.21:1 on bg — bg-on-green is also 9.21:1 */
```

Both accents clear AA in both directions, so neither needs the fill/text token split the current
palette carries.

**The reference is teenage.engineering, not Linear** — seventeen screens carrying nothing but
photography, one easing curve, body copy at weight 100. That is what dark done properly looks like
in 2026.

**Why it is third.** It requires photography or renders VX does not have, and without them it
collapses back into the genre default with a slightly warmer hex. A warm black is a real
differentiator to a designer and invisible to a client comparing tabs.

---

### The recommendation, stated plainly

**Build A.** If Ryan pushes back on light, build **C** — but only with a commitment to commission
or render the imagery it needs, because a dark page with no photography is the default with extra
steps. **B** is the right answer for a documentation subdomain, not for the landing.

The strongest single sentence for A: every site Ryan named as aspirational — Cursor, Warp, Studio
Freight, Immersive Garden, Rauno — measured light on 2026-08-17, and the ground he currently ships
is byte-identical to Linear's.

---

<a id="6"></a>
## 6. Signature-moment inventory, ranked by novelty

**Novelty ranking is judgement, not measurement.** The technique column is measured; the freshness
column is my read of how often a pattern has appeared in award galleries since 2023. Treat it as an
opinion with evidence attached.

### New entries from the ambition-ceiling pass

These four rank above everything in the main table on novelty. Lettered rather than numbered so the
original ranking stays stable.

| # | Moment | Measured where | Fresh in 2026? |
|---|---|---|---|
| **A** | **A named event vocabulary inside the post-processing shader.** `uThunder`, `uToonGlitch`, `uLongpress`, `uBlackFade` — narrative beats are one-line uniform writes. | 60fps.fr | **Not seen elsewhere in 41 sites.** Architectural rather than visual, which is why it is the most portable idea in this document. |
| **B** | **Press-and-hold as the primary interaction**, with physical response held for the duration. | resn.co.nz (`CLICK & HOLD`), 60fps.fr (`uLongpress` uniform) | **Very fresh**, and independently arrived at by two studios with no shared lineage — which is the strongest possible signal that it is a real pattern rather than a copy. |
| **C** | **An audio-analyser texture modulating the image.** Sound drives the picture rather than accompanying it. | 60fps.fr (`tAnalyser` sampler in the post stack) | **Not seen elsewhere.** High risk on a B2B site; the honest version needs a visible mute control. |
| **D** | **A persistent chapter rail over a 42-screen narrative, with zero WebGL.** `CHAPTER I–V` docked bottom, marker sliding along a hairline, chapters defocusing into each other via `filter: blur()` on 74 elements. | nabilissa.com | **Fresh as a whole-page structure.** Not novel as an effect — novel as proof the format needs no renderer. |

### The main inventory

| # | Moment | Measured where | Fresh in 2026? |
|---|---|---|---|
| 1 | **Let the visitor switch the expensive version off.** A persistent HUMAN/MACHINE toggle that swaps the render pipeline. | basement.studio — pinned bottom-centre on every screen, on both landing and /showcase | **Very fresh.** Almost nobody does this. It converts a performance liability into a statement about judgement. |
| 2 | **Live data on the page.** A number that is true right now. | framer.com — `#7 on OpenRouter: 793.9B tokens this week`, above the fold | **Very fresh**, and the cheapest high-credibility move available to a solo developer. |
| 3 | **Typography uploaded to the GPU as a data texture.** | igloo.inc — `IBMPlexMono-Medium-datatexture.ktx2`, 108 KB | **Very fresh** and almost entirely unusable (no text, no keyboard path). Listed because it marks the ceiling. |
| 4 | **The portfolio is the same world, re-framed.** Camera relocation instead of page transition. | basement.studio landing → /showcase — 35 programs, 5,605 KB of additional assets | **Fresh.** Few studios commit, because it makes adding a project a modelling task. |
| 5 | **Fine art as the ground, product as the figure.** | cursor.com — Hudson River School oils behind product windows, `<img>` only | **Fresh but spreading fast.** Six months of runway, maybe. |
| 6 | **Vertical scroll drives a horizontal filmstrip for the whole page.** | rauno.me — 51 KB, zero canvas | **Moderately fresh** for an entire page; common as a single section. |
| 7 | **A display family built from one repeated primitive.** | vercel.com — GeistPixel Square / Grid / Circle / Triangle / Line | **Fresh.** Typographic rather than motion novelty, which is why it dates slower. |
| 8 | **One-screen mosaic that refuses to scroll.** | studiofreight.com — 26 thumbnails, `mix-blend-mode` on 133 elements, one viewport | **Fresh by contrarianism.** Strong signal, hard to fill honestly. |
| 9 | **Sound at the exact moment of arrival.** | igloo.inc (1 `AudioContext`), bruno-simon.com (2), joshwcomeau.com (2, with a visible speaker toggle) | **Rare, not fresh.** Rare because it is risky; the honest version is Comeau's — off by default, one visible control. |
| 10 | **Baked lighting standing in for a real rig.** | basement.studio — four KTX2 lightmaps at 165–196 KB each | **Not novel to look at, novel to afford.** This is the technique that makes tier-5 fidelity survivable. |
| 11 | **Scroll-linked morph of one object through states.** | Rule 6c; closest measured is immersive-g.com's relief forms | **Still works** when the object is specific. Dead when it is a generic blob. |
| 12 | **Cursor-tracked saturated shape with `mix-blend`.** | rauno.me's yellow disc; studiofreight.com's 133 blended elements | **Worn** since roughly 2021, but cheap and still confident when the rest of the page is austere. |
| 13 | **Preloader as curtain.** | immersive-g.com; activetheory.net's `/76` counter | **Worn**, and it costs bounce. Only defensible when the payload genuinely cannot start without it. |
| 14 | **Drivable physics toy.** | bruno-simon.com — 275,301 draw calls, Rapier, 38,481 instanced | **Worn.** The original is from 2019 and has been copied into the ground. |
| 15 | **Object self-builds on load.** | inferred across the WebGL set | **Worn.** The default "wow" move of 2022–24. |

### What I would build for VX

**Three moments now, all cheap, and the ceiling pass changed the middle one.**

The signature is **#1 crossed with the drawing metaphor**: a persistent toggle reading
**DRAWING / RUNNING**. In DRAWING, the page is the technical illustration — hairlines, annotations,
mono labels, nothing moving. Flip to RUNNING and the same object stays in place while the console
inset lights, annotations resolve into live readings, and the scheduler ticks. The visitor controls
the transition, which satisfies Rule 4 (interactivity beats animation) and Rule 4a (one moment)
with the same control. It is a *statement about how Ryan works* — draw it, then run it — rather
than decoration, which is Rule 6.

The supporting moment is **#2**: put one real number on the page. Ryan already runs the NC Housing
Terminal off a build-time data pipeline; a genuine `last deploy`, `rows in the pipeline` or
`build time` readout inside the console inset costs almost nothing and does more for credibility
than any render. It also gives the console something honest to display, which is the thing most
terminal-aesthetic sites get wrong.

The third, added after the ceiling pass, is **B — press-and-hold**, and it fuses with the toggle
rather than sitting beside it. Instead of a click that flips DRAWING to RUNNING instantly, the
visitor **holds** and the system comes up under their thumb: annotations resolving, the console
warming, the scheduler starting to tick, all scrubbed to the duration of the press, and falling
back if they let go early. Release past the threshold and it commits. That is one control carrying
Rule 4, Rule 4a and the "assisted commit" pattern from `techniques.md` at once, and it costs a
`pointerdown` timer plus a progress value — no library, no renderer.

Borrow **A** as an architecture note even without WebGL: keep one state object with named beats
(`drawing`, `arming`, `running`, `fault`) and let every layer read from it, rather than wiring
transitions component by component. 60fps proves the pattern scales to a whole visual system; the
CSS-variable equivalent is `--beat: running` on `<html>`.

Borrow **D** wholesale: the chapter rail. Nabil Issa is the proof it carries 42 screens with no
canvas, and VX's five layers — schema, boundary, scheduler, interface, evidence — are already
chapters.

Explicitly **not** doing: preloader, drivable toy, cursor blob, self-building object, audio.

---

<a id="7"></a>
## 7. Measurement limits and honest gaps

- **Stripe** and **Every** were captured with a modal open across all five depths. Their DOM, type
  and palette numbers come from the document underneath; the screenshots show the overlay.
- **Stripe** reported eight unreadable cross-origin stylesheets, so its "zero easing curves" is a
  blindness, not an absence. Everywhere else the curve counts are from readable sheets. Linear
  reported 51 unreadable sheets, which is why no tokens are listed for it.
- **immersive-g.com/work** and **joshwcomeau.com/tutorials/** both returned 404. Recorded as found.
- **basement.studio/work** redirects to `/showcase`; the data is filed under `basement-work`.
- **segment.com** is now a Twilio migration notice and **metabase.com** is a generic SaaS page.
  Both were measured; neither is a useful elite reference. Saying so rather than padding the list.
- **igloo.inc** acquired two WebGL2 contexts while `querySelectorAll('canvas')` returned zero. I
  did not determine the mechanism.
- **rauno.me/craft's 233,630 KB** is the cost of scrolling every one of its 68 lazy video cards to
  the bottom. A partial visit costs proportionally less — that is what the 81
  `IntersectionObserver`s are for. Do not quote the figure without the condition.
- **Draw-call counts** are cumulative over roughly 25–40 s of page life on a CPU-shared Windows
  machine, with two Chromium instances occasionally running concurrently. They separate 595 from
  275,301; they do not separate 50,254 from 54,587.
- **Type figures** come from `getComputedStyle` on the first matching element per tag. Where a site
  hosts text inside SVG (rauno.me) the numbers are meaningless and I have said so inline.
  Nature's h1 reports `line-height: 0px`, so its ratio is unavailable rather than 0.
- **RESN's `CLICK & HOLD` was not executed.** The harness sweeps the pointer but does not hold a
  sustained mouse-down. The signature is inferred from the on-screen instruction and from two
  cursor-response frames showing different shard geometry — not observed. 60fps's `uLongpress` is a
  uniform name read out of the shader source, which is stronger evidence but still not an
  observation of the behaviour.
- **60fps's audio path did not run.** `tAnalyser` exists in the fragment shader; zero
  `AudioContext`s were created because headless Chromium blocks autoplay. The capability is in the
  code; the behaviour is unmeasured.
- **Valmont bundles `ogl` and never used it** in a 60-second session covering the full scroll — no
  GL context was created. Bundled-and-unused or gated behind a route I did not reach; I did not
  determine which.
- **nabilissa.com depth-04 is a near-empty frame.** The synthetic wheel outran a pinned chapter
  transition. Instrumentation artifact, not a blank section.
- **NK Studio's 2,785,871 GLSL characters overstate authorship.** Most of that is three.js's own
  material chunks expanded across 60 program permutations, and the two hand-written shaders
  captured belong to the dotLottie WASM renderer. Shader *volume* is a poor proxy for shader
  *craft*; 60fps does more with 9,772 characters.
- **Reachability percentages in §0 are judgement, not measurement.** They are my estimate of how far
  a general-purpose agent gets before the blocker becomes an input it cannot produce (photography,
  3D modelling, sound design, colour grading). Every technical claim they rest on is measured; the
  percentage is not.
- **Novelty rankings in §6 are judgement.** Every technique claim is measured; the freshness column
  is not.
- **Colour figures** are WCAG 2.x relative luminance computed locally. Per `principles.md` the
  formula overstates contrast near black — the dark palettes in §5 clear it comfortably (≥6.19:1 on
  every text pairing) rather than sitting on the line, which is the correct way to hold both
  standards.
- **Two sites in the survey ship AA failures in body copy** — Cursor at 3.50:1 and Anthropic's
  accent at 3.85:1. Being elite is not the same as being conformant, and neither is a licence.
- **Asset weight:** `docs/whole-page-narrative-refs/` is now **120.3 MB** across 264 PNGs and 41
  JSON files. That is far too much to put in git history. Either `.gitignore` it or keep only the
  ~30 frames cited above.

### Files

```
docs/whole-page-narrative-refs/
  <slug>/depth-0..4.png             standard pass — five scroll depths
  <slug>/depth-00-arrival.png       deep pass — first paint, before preloaders finish
  <slug>/depth-01-settled.png       deep pass — after preloader and cookie dismissal
  <slug>/depth-02..09.png           deep pass — eight scroll depths
  <slug>/interact-a.png             deep pass — pointer swept to (1100, 600)
  <slug>/interact-b.png             deep pass — pointer swept to (720, 200)
  <slug>.json                       full instrumentation record per URL
  rauno-dark.png                    prefers-color-scheme: dark check
  josh-comeau-dark.png              prefers-color-scheme: dark check
  cursor-dark.png                   prefers-color-scheme: dark check
```

Deep pass (§0), 5 slugs: `nabil-issa`, `valmont`, `resn`, `nk-studio-work`, `60fps`.

Standard pass, 36 slugs: `active-theory`, `anthropic`, `arc`, `basement-studio`, `basement-work`, `bruno-simon`,
`chromatic`, `cursor`, `dbt`, `every-to`, `framer`, `igloo-inc`, `immersive-garden`,
`immersive-garden-work`, `josh-comeau`, `josh-comeau-tutorials`, `linear`, `linear-customers`,
`lusion`, `lusion-work`, `metabase`, `mongodb-atlas`, `nature`, `nautilus`, `planetscale`,
`prefect`, `rauno`, `rauno-craft`, `retool`, `segment`, `stripe`, `studio-freight`,
`teenage-engineering`, `vercel`, `vercel-rendering`, `warp`.
