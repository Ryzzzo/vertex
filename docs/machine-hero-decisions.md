# The Machine hero — technical decisions

Build log for `vx/machine-hero-v2`. Written to be inherited: every number here
carries the reasoning that produced it and, where it was wrong first, what the
wrong version looked like on screen. The failures are the useful part — a
correct value is a lookup, a corrected value is a lesson.

Measured 2026-08-17 against `three@0.185.1`, `postprocessing@6.39.4`,
`gsap@3.15.0`, `cannon-es@0.20.0`, `next@16.2.10`. Frame timings from headless
Chromium 1234 with ANGLE, 1440×900, dpr 1.

---

## 1. What was actually wrong with v1

v1's technical layer was good and almost all of it survives: the procedural PMREM
environment, the anisotropic aluminium, the shared-geometry module that both
renderers draw from, the self-building sequence, drag-to-orbit, the scroll-driven
SVG fallback.

The failure was framing, and it was a scoping failure before it was a design one.
v1's brief optimised for bundle size — it explicitly forbade R3F, `postprocessing`,
a physics engine and GSAP — and a brief written that way produces a hero that
fits in a sidebar, because a sidebar is what those constraints leave room for.
The object filled roughly 20% of the viewport width inside a fixed-aspect box in
one column of a two-column grid. Nothing about the render was wrong. It was
simply small, and small is not a rendering problem you can fix by rendering
better.

**The transferable lesson:** state the *composition* in the brief, not just the
technique list. "Full-viewport scene, copy composited on it" is a one-line
constraint that would have made every other decision in v1 fall out differently.
A bundle budget is a proxy for a goal; when it is the only number in the brief it
becomes the goal.

---

## 2. Fidelity tier and reference reading

Target tier: **5 — photoreal cinematic render** (aluminium, machined edges,
volumetric fog, monumental scale). Reference #2 (NASA test-equipment still) is
the anchor; #1 and #3 supply details.

What was actually extracted from the references, as opposed to described:

| Signal | Where from | How it was built |
|---|---|---|
| Near-black void, no environment visible | all three | `FogExp2` at 0.031 + a near-black procedural PMREM |
| Brushed aluminium, warm-grey, visible fasteners | #1, #2 | `MeshPhysicalMaterial`, metalness 1, anisotropy 0.7, procedural roughness map |
| Blue light escaping *from within* through machined pockets | #2, #3 | one emissive plane behind the panels, occluded by real through-holes |
| Fog bank at the base, machine standing *in* it | #2, #3 | depth-clamped raymarch (§5) |
| Labels floating outside the silhouette with leader lines | #2 | DOM callout rail, positions projected server-side (§7) |
| A single green against all the blue | #2, #3 | the terminal screen, and nothing else on the object |
| Heavy machined plinth | #2, #3 | inherited from v1 |

The one reference detail deliberately *not* taken: reference #3's glowing
standoff signage spells a brand name in the render. Baking text into the
picture fails WCAG 1.4.5 and it is also the AI-render tell — every label on this
page is DOM text.

---

## 3. Library decisions, and one that was declined

**Raw three.js, not R3F.** The brief permitted R3F for "camera choreography
ergonomics". The choreography here is a pure function of one scalar — scroll
progress — evaluated once per frame against a plain object. There is no
component tree, no reconciliation, and nothing that JSX makes more readable.
Against that, converting v1's 1,400 imperative lines would have cost a day and
~110 KB gz for ergonomics the problem does not have. Declined, and the decision
would flip immediately if the scene needed multiple interactive objects with
independent lifecycles.

**`postprocessing`, taken.** Not for bloom — v1's sixteen-tap golden-angle spiral
was fine. For depth of field, which needs a circle-of-confusion pass, near/far
bokeh passes and a proper CoC-weighted gather to not look like a blur filter.
That is a day of shader work already done. Its `EffectPass` also merges bloom,
CA, noise, vignette and tone mapping into a single fragment shader, so five
effects cost roughly one pass.

**`cannon-es`, not Rapier.** Rapier is the better solver and the wrong choice
here: it ships a WebAssembly binary that must be fetched and instantiated before
the first step, putting a network round trip on a hero that is otherwise entirely
self-contained, and `@react-three/rapier`'s ergonomics are worth nothing without
R3F. Fourteen spheres in a box is not a problem that needs a wasm solver.

**GSAP, taken. ScrollTrigger, declined.** See §4.

---

## 4. Camera choreography

`components/v2/camera-score.ts`. A `paused()` GSAP timeline of total duration 1;
the frame loop calls `tl.progress(p)` with the hero's scroll fraction.

### Why GSAP earns its place

Eleven channels across seven keyframes with **deliberately unequal spans**. The
focus pull leads the dolly into each module by 8% of the track; the fog lags it
by 6%; the fov opens for the launch a beat before the tilt starts. Written as one
keyframe array with a shared `t`, every channel is forced to break at the same
instants — and a camera whose properties all change together is precisely what
"interpolated, not directed" looks like. Overlapping tweens are the entire
product.

### Why ScrollTrigger does not

Its three features are pin, scrub and snap. The hero is pinned by
`position: sticky`, which survives with JavaScript off and costs nothing. Scrub
is one `progress()` call against a number the loop already reads. Snap is banned
by the house rule against mandatory snapping. What it would add is a second
scroll authority requiring manual reconciliation with Lenis via `scrollerProxy` —
a known-fragile seam — for features that are already present or unwanted.

### Easing, and the one place the site curve does not apply

House rule is one curve everywhere: `cubic-bezier(0.32, 0.72, 0, 1)`. That rule
governs **time-driven** motion, where the curve supplies the timing.
Scroll-driven motion has no timing of its own — the wheel is the clock — and an
ease on top of it re-times the user's input. A long-tail ease-out on a scrubbed
camera reads as the page lagging the scroll by a few frames, which is the exact
sensation the curve exists to prevent elsewhere.

So: **camera position channels use `power1.inOut`; discrete events keep the site
curve.** The site curve is evaluated directly by a fifteen-line Newton solve
rather than importing `CustomEase`, so it is provably the same curve the CSS
uses rather than an eyeballed `power3.out`.

### The shot list

| Scroll | Beat | Camera | Notes |
|---|---|---|---|
| 0–4% | hold | r 11.9, az 0.20, el −0.17, fov 30 | establishing; the built object gets a beat before anything moves |
| 4–14% | the drop | r → 8.9, ty → 1.15, el → −0.08 | cranes to the funnel; copy clears out over 0.035–0.125 |
| 10–25% | Schema | r → 6.4, az → −0.36, fov → 31 | swings **left**; focus leads by 8% |
| 25–40% | RLS gate | r → 5.5, az → +0.48, el → +0.07 | swings **right**; ¼° roll in and out |
| 40–55% | Server actions | r → 5.0, el → −0.19, fov → 33 | lowest angle in the sequence — the arm sweeps overhead only if the camera is under it |
| 55–70% | Interface | r → 4.35, bokeh → 3.4 | closest shot; bloom pulled **down** to 1.05 — a green screen at 1.5 is a green smear |
| 70–85% | Deploy | r 6.2 → 9.4, ty → 2.6, el → −0.30, fov → 39 | pull back then tilt up; the fov opens 8° across the move, a dolly-zoom in the direction that exaggerates height |
| 85–100% | settle | back to establishing, az mirrored to −0.14 | an *exact* return reads as a rewind |

Modules alternate sides on the way down, so the descent reads as a camera walking
around the object rather than a lift going down it.

---

## 5. Volumetric fog — the biggest single technique

`components/v2/volumetric-fog.ts`. A `postprocessing` `Pass` that raymarches at
half resolution and composites at full.

### Why v1's billboards had to go

v1's comment argued a raymarch "costs an order of magnitude more and looks the
same once the bloom has been over it". At v1's framing that was true. It stops
being true the moment the camera moves, for a reason billboards cannot be tuned
out of: **a billboard has no depth, so it cannot be occluded by the object it
surrounds.** It is wholly in front of the plinth or wholly behind it. Real fog
around a machine base is both — filling the gap under the casting, wrapping the
legs, hidden by the plinth in between. That interleaving is most of what makes
fog read as a volume, and a camera orbit puts it directly under the viewer's
nose.

### The technique, in order of what mattered

1. **Depth-clamped ray.** Reconstruct a world position per pixel from the scene
   depth buffer; march from camera to that point and stop. Occlusion is free and
   exact — no sorting, no blend mode to get wrong. This is the whole reason for
   the rewrite.
2. **A 32³ 3D noise texture, three octaves packed into RGB.** One fetch for three
   octaves. Generated at init from a fixed seed: 128 KB of VRAM, **0 KB of
   bundle**, identical on every client. Analytic 3D value noise was the first
   version and measured ~2.4× the pass cost for an indistinguishable result.
3. **Henyey-Greenstein phase** (g = 0.42 for the practicals, 0.24 for the key).
   Fog that is one flat tint is a smoke machine. The HG term is what puts a
   bright rim on the lit side of the plinth and leaves the far side blue-grey.
   Costs one `pow`.
4. **Beer-Lambert transmittance**, front to back, with the loop breaking under 1%
   transmittance. Dense frames get *cheaper*, which is the opposite of how the
   billboard version behaved.
5. **Half resolution pinned to CSS pixels, not device pixels.** Fog is
   low-frequency; nothing in it survives to a retina pixel. Worth ~4× on the
   pass, invisible.
6. **Interleaved-gradient dither on the first step.** 26 fixed steps band hard
   across a floor plane; jittering converts banding into per-pixel noise, which
   the film grain downstream is supplying anyway.

### Three tuning mistakes worth inheriting

**The frequency constant was the whole ball game.** For three iterations the fog
was physically correct and looked like a smooth blue pool — indistinguishable
from a glow a bloom pass would give for free. Cause: `q = p * 0.085`. The noise
volume tiles over `1/scale` world units, so that is a period of nearly twelve
units against a three-unit-wide machine — the entire bank sat inside a quarter of
one period, so the field was effectively constant. **0.55** gives a period of
about 1.8 units and two or three billows across the plinth. Correct physics with
a wrong frequency constant is invisible physics.

**In-scatter needs source intensities to match the normalisation.** HG is
normalised by 4π, as it must be to conserve energy, so its peak is ~0.34 and its
hemispherical average nearer 0.1. Multiply by inverse-square falloff and
accumulated transmittance and unit-intensity lights produce in-scatter around
**0.02 against an alpha of 0.56** — fog that dims the scene by half and glows by
two percent, which is a neutral-density filter. The practicals ended at 11–20×
after the light colours were also desaturated halfway to grey: lighting vapour
with the accent at full chroma produced a solid lavender bank. Real vapour is
grey and takes a *tint*.

**The useful density range is about 1.5× wide and not where intuition puts it.**
0.62 was weather; 0.40 was nothing; 0.54 is the shot.

### The ceiling this hit

**No light shafts.** Shadowing the fog properly means a secondary march toward
each source from every sample — 24 × 6 more fetches per pixel, measured at
roughly 4× the pass cost, for an effect reference #2 does not visibly have. The
substitute is a self-shadowing proxy: density already accumulated along the view
ray attenuates in-scatter for samples behind it (`exp(-behind * 0.55)`). It reads
correctly and costs one multiply. **This is the honest gap** — a specialist studio
shipping a hero built around god rays would have to pay for the real thing.

The proxy's own tuning failure is instructive: at the first value (1.35) it
extinguished in-scatter faster than transmittance extinguished the background, so
the fog bank was *darker* than the void it stood in. Lit fog never does that.

---

## 6. Post-processing chain

```
RenderPass         → scene into a half-float buffer, MSAA ×4
VolumetricFogPass  → raymarch + composite + exposure
EffectPass         → DOF · bloom · CA · grain · vignette · ACES  (one merged shader)
```

**Fog is a Pass, not an Effect, and the placement is load-bearing.**
`BloomEffect` samples the buffer as it *entered* the pass, so fog composited
alongside it in the merged shader would never bloom. Fog that does not bloom has
no glow around the indigo, which is the entire look.

### The exposure bug worth remembering

`renderer.toneMappingExposure` was controlling **nothing**. three only compiles
the `tonemapping_fragment` chunk into a material when
`renderer.toneMapping !== NoToneMapping`, and tone mapping is off on the renderer
because `ToneMappingEffect` does it in post. So the line that looked like scene
exposure was inert, every emissive arrived at the bloom threshold at full
strength, and the object read as backlit blue plastic. It cost a full round of
"why is the metal blue".

Exposure now lives in the fog composite (`0.46 + built × 0.34`), which is also
where it belongs: **upstream of the bloom**, because `luminanceThreshold` is
meaningless if the exposure deciding what crosses it is applied afterwards.

### Effect settings and why

| Effect | Setting | Reason |
|---|---|---|
| Bloom | `luminanceThreshold: 0.94` | Took three passes. Must sit above the brightest *specular* on a chamfer and below the emissives. Every lower value turned the machined edges into a glowing wireframe — which the close-up keyframes exposed and the establishing shot hid, because specular on a bevel gets hotter as the camera closes. **A threshold tuned on a wide shot is tuned on the easiest frame in the sequence.** |
| DOF | `worldFocusRange = 3.6 / bokeh`, floor 0.55 | Left at its 2.4 default the effect provably ran and visibly did nothing: the object is ~1 unit deep, so every part of it sat inside the sharp band at every keyframe. **A planar subject gives DOF nothing to bite on unless the band is narrower than the subject.** |
| DOF | `target` = world point, not a distance | Focusing on a fixed distance makes every orbit a rack focus. |
| CA | `0.00032` base, `radialModulation: true` | 0.0007 ("half a pixel", from the brief) rendered as nameable red/green fringing on every edge — that is a decoding artefact, not a lens. Correct CA is noticed only when switched off. Radial modulation is what separates "sharp lens" from "broken JPEG": a real lens is corrected at centre and drifts to the corners. |
| Grain | 2.4%, `BlendFunction.OVERLAY` | Additive grain lifts the blacks, and this page is mostly black. Overlay leaves the void alone and puts noise in the midtones, where film grain lives. |
| dpr cap | 1.75, down from 2 | The raymarch and DOF are fill-rate bound. On a 3× panel the 1.75→2 difference is invisible under grain and about 30% of the frame budget. |

---

## 7. Material and lighting

All changes are relative to v1's setup, which was already good.

| Change | From → to | Why |
|---|---|---|
| Environment ground/sky floor | 0.012 → 0.026 | Metalness is 1 across the object, so every panel face is *entirely* reflected environment with no diffuse underneath. A 0.012 room makes a 0.012 machine wherever it is not catching a highlight — the difference between dark aluminium and black plastic. |
| Key card size | 2.3 → **1.85** | The more consequential of the two. A card wide enough to cover most of the upper hemisphere is not a soft box, it is ambient light, and ambient light on metal flattens every face to the same value. Reference #2's tonal range is *falloff*. Amplitude went up (1.05 → 2.7) to keep the energy while concentrating it. |
| Second fill card | new, 0.42 amplitude | One card leaves every face angled away from it black. Deliberately ~1/6 of the key: a fill approaching the key erases the falloff the key was shrunk to create. |
| `envMapIntensity` | 1.35 → 1.85 | See the floor note; this is the number that decides whether the object is aluminium. |
| Key light | 2.1 → 2.45 | v2 grades at a lower exposure; putting the difference back as *light on the object* rather than as exposure brightens the metal without brightening the void. |
| Indigo practical | 7.5 → 3.1 | There is now a real volumetric throwing indigo in-scatter across the lower frame. The practical was standing in for that; stacking both turned every panel lavender. |
| Backlight | 0.94 → 2.35 | The interior glow through the pockets is reference #2's signature and it nearly got lost: raising the environment also raised the surfaces the light contrasts against, and the exposure came down. Both moves were right and both pushed the same way. Emissives are `toneMapped: false`, so this number moves the light and nothing else. |
| Shadow mapping | none → PCFSoft, 1536², frustum ±3.2/±3.6 | v1 had none, defensibly — at 450px there is nowhere visible for a shadow to fall. At full viewport it is the difference between standing on a plinth and floating in front of one. `normalBias 0.022` rather than a large constant bias: this object is nothing but chamfers meeting at shallow angles, exactly the geometry a constant bias detaches shadows from. |

**HDRI: procedural won, and it was not close.** The brief asked to test a real
Poly Haven EXR against v1's procedural PMREM. The procedural version was
extended (second fill card, raised floor) rather than replaced, because the
authoring loop is the whole advantage: every tuning step in the table above is a
two-line change to a 128×64 float loop, evaluated against *this* palette. A
loaded EXR is a photograph of a room somebody else stood in — it can be graded
but not authored, it costs a request on the critical path, and it makes the hero
look different when a CDN is slow. Cost of the procedural version: **0 KB
bundle, ~4 ms at init**. The trade only reverses if the scene needs recognisable
real-world reflections, which a void does not.

---

## 8. Physics — and a conflict the brief did not anticipate

`components/v2/marble-physics.ts`.

The brief asks for real physics on the marble *and* for the marble's position to
be choreographed across seven scroll keyframes. **Those are not compatible**, and
the reason is worth stating precisely rather than quietly picking one.

A rigid-body solver integrates forward from state. Scroll is not a clock — it is
a **seek bar**. A visitor can throw it backwards, land on an arbitrary offset via
a hash link, or restore a tab at 63%. A simulated marble has no defined position
at 63%; it only has the position implied by every frame that came before, which
on a scrub is a history that never happened. The result is a marble that is
somewhere different every time the same visitor passes the same point, which
reads as a bug, not as physics.

**The resolution is a split:**

- **The primary marble is kinematic.** Its position is the arc-length
  parameterisation of the route, so the sequence stays deterministic and
  reversible. But it is a body in the world and its velocity is written every
  step from its own frame-to-frame delta, so contacts transfer real momentum. It
  pushes; nothing pushes it. That is also the correct model for a marble on a
  constrained track — the rail *is* holding it to a path.
- **Everything it touches is fully dynamic**, and that is where the bytes go: a
  tray of fourteen loose marbles under real gravity, restitution and rolling
  friction, settled by 90 pre-steps before the first frame so the visitor never
  sees them rain in.

### Why the tray is the right place to spend a solver

It cannot be faked — fourteen spheres settling into a pile against each other and
a machined wall is the one thing on this page a jaded visitor has not seen
approximated, and the pile differs on every reload. It also makes the drag *mean*
something: before it, dragging rotated a static object; now it perturbs a system.

### The rotating frame, which is the interesting part

The machine rotates about its own Y axis. A naive setup gets nothing from this —
gravity is world-down, a Y rotation does not tilt the tray, and the marbles would
sit dead still while the object spun around them. So the simulation runs in the
**machine's own rotating frame**, where the tray is fixed and body positions map
straight onto local mesh positions, and Newton's laws need three pseudo-forces
added by hand:

- **Centrifugal** `mω²r` — marbles climb the outer wall under sustained spin
- **Euler** `−m(dω/dt)×r` — the lurch when the drag starts or stops. This is the
  one that actually reads
- **Coriolis** `−2m(ω×v)` — curls the paths of marbles already rolling. Subtle,
  but its absence makes fast rolls look like they are on rails

### The failure that clamping fixed

**A pointer stream is not a smooth function.** One 11px mouse move in a 16 ms
frame is 0.057 rad of yaw, which differentiates to ω ≈ 3.6 rad/s and then to
α ≈ 225 rad/s². The Euler force at that α is about **seven times the marbles' own
weight**, and the first drag test fired all fourteen out of the tray to y = −14,
permanently. The physics was correct; the input was a step function. Clamps at
ω ±4 and α ±26 cap the strongest possible flick at roughly one gravity of lateral
kick.

A containment pass also resets any body that escapes its bounds. Escape is now
unlikely; "unlikely and unrecoverable" is the failure mode that surfaces on
someone else's machine six months later.

---

## 9. Layout

The correction the whole rebuild exists for.

- `.da-hero` is a 260svh track; `.da-hero-sticky` is one 100svh pinned scene,
  full-bleed, `overflow: clip`.
- `.mx-stage` is `position: absolute; inset: 0` — no aspect ratio, no max width.
- `.da-overlay` is a grid whose cells are **frame regions**, not content boxes.
- Copy fades on the score's own `copyOut` channel, so the overlay and the camera
  can never disagree about whether this is still the establishing shot.
  `pointer-events` cannot be interpolated, so a data attribute flips at the
  halfway point — otherwise the machine is un-grabbable for the middle 80% of the
  scroll.

### The header bug, because the symptom was misleading

`SiteHeader` is an ordinary in-flow block, ~96px tall. So `<main>` starts 96px
down the page, and a `position: sticky` hero with `height: 100svh; top: 0` begins
96px below the viewport top and runs 96px off the bottom. The symptoms presented
as **two unrelated measurement mistakes** — the plinth was cropped, and the
callout ladder was uniformly low — and cost a round of adjusting numbers that
were already correct. Scoped under `.da-root`, the header is now
`position: absolute` and floats over the scene, which is also what every
reference does.

### The callout ladder

Positions are **projected server-side** through the establishing camera
(`moduleFrameY()` in `camera-score.ts`), not measured off a screenshot. The first
version *was* two hand-read constants, and they failed in the way measured
constants always do: the step was ~12% too large, which is close enough that the
top label looked right and the bottom one was 100px adrift — so the error read as
"the bottom module moved" rather than "the step is wrong".

Labels are a **fixed rail**, not per-frame projections. Re-projecting each frame
makes them swim across the screen during every dolly, which is a game HUD, not a
technical drawing. It also would not work on the no-JavaScript path.

### One number, two renderers

`--mx-machine-x` positions the SVG opener; the canvas is placed by the score's
look-at `tx`. On a wide frame they coincide, so moving the CSS variable to fix a
portrait-tablet collision moved the drawing and left the render exactly where it
was — and since the drawing is on screen for two seconds, the change appeared to
do *nothing* rather than to half-work. Both are now solved from one fraction in
`measure()`, which also writes the custom property.

### Responsive

| Width | Treatment |
|---|---|
| ≥1024 | Machine at 65%, copy left third, callout rail right |
| ≤1023 landscape | Same composition, machine at 58%, tighter margins |
| ≤1023 portrait | Machine at **38%** — its silhouette is much wider than its panel stack because the launch rail stands outboard, so centring the panels still runs the rail through the callout column. Copy bottom-anchored over a linear scrim |
| ≤767 | SVG path only (capability gate). Machine upper half sized by `96vw`, copy bottom-anchored, callout legend clipped to the a11y tree (§11) |

Vertical fov is widened below 16:9 (`min(1.42, 1.778/aspect)`) so the *horizontal*
extent stays roughly constant — a cinematographer changing lenses for a format.
That expression exists in three places (`measure()`, `moduleFrameY()`, and the
`--mx-fovs` media-query steps) and they must stay in step; flagged in the source
rather than hidden.

**No horizontal overflow at 320, 375, 768, 1440, 1920 or 2560** — verified by
`scrollWidth === clientWidth` at each.

---

## 10. Measurements

### Bundle (gzip level 9, all built chunks)

| | v1 baseline | v2 | Δ |
|---|---|---|---|
| three (+ merged libs) | 146.4 KB | 219.7 KB | +73.3 |
| app code | 132.2 KB | 132.2 KB | 0 |
| react-dom | 76.7 KB | 76.7 KB | 0 |
| framer-motion | 43.3 KB | 43.3 KB | 0 |
| lenis | 5.3 KB | 5.3 KB | 0 |
| **Total** | **403.9 KB** | **477.2 KB** | **+73.3 KB** |

`postprocessing`, `gsap` and `cannon-es` tree-shake into the same dynamic chunk as
three, so they cannot be separated post-build without a per-library build; the
+73.3 KB is the honest joint figure for the entire pipeline — full post chain,
GSAP timeline, rigid-body solver, raymarched fog, shadow mapping and sound.

Against the brief's 400–600 KB gz target and the peer set's 400 KB – 2 MB, this
is at the *lean* end. Nothing was cut to get there; the raymarch, the noise
volume, the environment map and the entire audio layer are procedural and cost
**0 KB** of bundle between them.

None of it reaches a phone, a reduced-motion client, Save-Data, a
sub-4 GB device or a browser without WebGL 2 — the capability gate in
`Machine.tsx` decides before the dynamic import is requested.

### Frame timing — 1440×900, dpr 1, headless ANGLE

| | median | p95 | worst |
|---|---|---|---|
| Establishing, idle | 4.2 ms | 4.3 ms | 4.4 ms |
| With DOF active | 4.2 ms | 8.4 ms | 12.5 ms |
| 1920×1080 | 4.2 ms | 8.3 ms | 50.4 ms |

Comfortably inside a 16.7 ms budget at the median. The p95 and worst figures are
composer resize and shader compilation on the first frames after a size change,
not steady state.

**A measurement trap worth recording:** the first perf run reported a flattering
238 fps median while the fog pass was producing *nothing* — the march shader had
failed to compile. A shader that fails to compile is a very fast shader. Frame
timing is not evidence that a feature is working; only looking at the pixels is.

---

## 11. What was given up, honestly

**The pixel-exact SVG→canvas handoff.** v1 pinned the frame's aspect to the
camera's so both renderers framed the identical rectangle, and held the drawing
at 14% over the finished object — construction lines sitting exactly on the
material edges. It is a genuinely good effect and it cannot survive a moving
camera: the ghost sat visibly up and left of the object it described, which reads
as a registration error. The drawing now cross-fades out completely. **This is
the one real regression from v1** and it is the price of the full-bleed camera.

**The callout legend on phones.** At 375×812 the budget is: 812, minus ~90 for
header and byline, minus ~46 for cue and readout, leaves 676; the copy block
(three-line headline at 44px, five-line lede, two buttons) needs ~340 of it
however it is set. Every placement was tried. Under the drawing collides with the
headline; under the buttons collides with the foot; in the top band fits only by
cutting the machine to 200px — at which point the hero is a thumbnail again and
v2 has reintroduced v1's actual problem. It is **clipped, not deleted**:
`aria-describedby` still resolves, the names are still in the accessibility tree
in order, the readout still names the live stage in words, and the same five
names are headings in the beats below.

**Light shafts in the fog.** §5. The one place a specialist studio would spend
where this build did not.

---

## 12. Honest self-assessment

**Did this hit the Cursor / Warp / Basement bar?**

Partly, and the split is clean along one line: **the rendering is there; the
authored motion is not.**

What is at that bar. The material genuinely reads as machined aluminium under
studio light rather than as a shaded mesh — anisotropic highlights along the
brush direction, chamfers catching a concentrated key, a second fill card
stopping the unlit side going black, and real cast shadows tying the object to
its plinth. The fog is a true depth-clamped volumetric that interleaves with the
casting rather than hanging in front of it, and the interior indigo escaping
through machined pockets is reference #2's signature rendered rather than
imitated. The post chain is correctly ordered: exposure upstream of a bloom whose
threshold is tuned on the *hardest* frame in the sequence, aberration that is
radially modulated and sub-pixel, grain that does not lift the blacks. The
composition is a real cinematic frame at every width, and the whole thing runs at
4.2 ms for 73 KB gz over the previous build. Those are specialist-tier decisions,
and several of them (the frequency constant, the HG normalisation, the inert
exposure line, the planar-subject DOF failure) are the kind that separate people
who have shipped this from people who have read about it.

Where the gap is. Bruno Simon and Basement do not win on material fidelity —
they win on **authored performance**. Their heroes have an editorial rhythm: a
held beat, a snap, a deliberate pause before a reveal. This build's camera is
seven correctly-eased keyframes moving between correctly-chosen positions, and
correct is not the same as *directed*. Nothing in the sequence surprises. The
signature moment (Rule 4a) is the strongest evidence: the marble tray is real,
unfakeable physics and it is parked on top of the machine where a visitor may
never touch it — a genuine interaction hidden behind a discovery problem. A
studio would have built the whole hero around the thing that makes people say
"wait, do that again", not added it as a fifth feature. The secondary tells are
smaller and consistent: the machine's geometry is still v1's, designed to read at
450px, so at full viewport there are surfaces with nothing on them where a
specialist would have added machined detail; the sequence has no sound design
beyond stage clicks and a hum; and there are no light shafts.

**Which parts feel like a general-purpose CC's ceiling.** The engineering
does not — the fog, the post ordering, the rotating-frame physics and the
projected ladder are all things I would defend in front of a graphics engineer.
The **art direction of motion** does. I can reason my way to a camera that is
technically correct and I cannot reliably feel when a hold is 200 ms too short.
That is the gap between this and Basement, it is a taste gap rather than a
technique gap, and more shader work will not close it. The next iteration should
spend its budget on **one signature moment placed where the visitor cannot miss
it**, and on editing the existing sequence for rhythm — not on more fidelity.
The fidelity is done.
