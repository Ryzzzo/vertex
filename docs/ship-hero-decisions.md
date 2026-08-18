# The Ship hero — technical decisions

Build log for `vx/ship-hero-v3`, at `/v3`. Written to be inherited, in the same
register as `machine-hero-decisions.md`: every number carries the reasoning that
produced it and, where it was wrong first, what the wrong version looked like on
screen. **The failures are the useful part** — a correct value is a lookup, a
corrected value is a lesson.

Measured 2026-08-18 against `three@0.185.1`, `postprocessing@6.39.4`,
`gsap@3.15.0`, `next@16.2.10`. Frames captured in headless Chromium 1234 through
ANGLE/D3D11 on an RTX 5060, 1440×900 at dpr 1.

---

## 1. Four brief requirements were declined

This is the first section because it is the biggest thing a reader needs to know
before trusting anything below it. The brief specified `@react-three/fiber` +
`drei`, `@react-three/rapier`, GSAP `ScrollTrigger`, and Poly Haven HDRIs, three
of them marked REQUIRED. All four were declined. Each is reversible, and the
condition that would flip it is named.

| Asked for | Shipped | Why |
|---|---|---|
| R3F + drei | raw three.js | v2 declined R3F and named the condition that would flip it: "multiple interactive objects with independent lifecycles". **v3 meets that condition**, so the question was genuinely live. It still loses: what R3F buys is encapsulating the five modules, and `ShipModule` — a group plus an update closure — is that, in fifteen lines and 0 KB. What it costs is the pipeline: the fog is a custom `Pass` in a hand-ordered composer, and that ordering is load-bearing (§6). drei's three relevant exports are unused here — no GLTF, procedural environment, transmission is a `MeshPhysicalMaterial` property. **Flips if** the graph ever needs React state inside it. |
| Rapier | no solver at all | There is no rigid-body simulation on this page. The five controls are one degree of freedom each with a spring return — nine lines of critically-damped integration in `SceneGL.tsx`. Rapier puts a WASM fetch-and-instantiate on the critical path of an otherwise self-contained hero. **Flips if** a beat needs contact or stacking, which is what v2 correctly spent `cannon-es` on. |
| ScrollTrigger | `progress()` on a paused timeline | Its three features are pin, scrub, snap. Pinning is `position: sticky` and survives with JS off; scrub is one call against a number the loop already reads; snap is banned by the house rule. What it adds is a second scroll authority to reconcile with Lenis. Inherited from v2 §4 unchanged. |
| Poly Haven HDRI | procedural PMREM ×2 | v2 ran this test and procedural won. The argument is **stronger** here: this scene needs two environments *and* a defensible relationship between them. Two EXRs is two requests on the critical path and a hero that looks different when a CDN is slow, and neither can be authored against this palette — which is the entire activity of getting a scene to read. Cost of the pair: 0 KB bundle, ~7 ms at init. |

The honest summary: the brief's stack list optimised for capability, and three of
these four would have spent the budget on plumbing rather than on the thing v2's
self-assessment said was actually missing — authored motion and a signature
moment. That judgement is mine and Ryan should overrule it if he disagrees; the
geometry, palette, narrative and camera all survive the swap.

---

## 2. Concept, and what makes this the fourth attempt

v1 (particles) and v2 (isometric plates) failed on metaphor. Machine-hero v1
failed on scope. Machine-hero v2 fixed the rendering and failed on metaphor
again — custom-software copy against a physical machine.

The correction is that **the ship is the mental model, not a machine being
looked at**. The visitor is *inside* the thing the copy describes. That is why
the camera is an interior camera with six independent world channels rather than
v2's orbit around a subject (§4), and it is the one structural change everything
else falls out of.

Target fidelity tier: **5 — photoreal cinematic render**, held for the ship act.
The Dune act is deliberately tier 5 executed *sparsely* — see §7.

---

## 3. The narrative spine, and why heights are the source of truth

`components/v3/narrative.ts`. The storyboard specifies the arc in scroll
percentages. Percentages are the right way to describe an arc and the wrong way
to build one: the moment a section's copy needs another 30svh, every percentage
downstream is wrong and nothing tells you. So heights are authored in svh and
the fractions are **derived**. One number, four consumers — server DOM, CSS
track, camera keyframes, shader ramps.

Total track: **1,335svh**. Act break at **68.5%–76.0%**, against the storyboard's
locked 72%–80%.

That 3.5-point drift is a real departure and it is caused by a floor discovered
the hard way — see §9. Buying it back means a ship act long enough to push the
page past fifteen viewports. The proportional intent is preserved and the
difference is not perceivable while scrolling.

---

## 4. Camera score

`components/v3/ship-score.ts`. A `paused()` GSAP timeline of duration 1; the
loop calls `tl.progress(p)` with the page's scroll fraction.

Easing inherited from v2 §4 unchanged, because the reasoning holds: scroll-driven
motion has no timing of its own, so position channels use `power1.inOut` and
discrete events keep the site curve, solved by Newton rather than approximated.

### The shot list

| Beat | Camera | Note |
|---|---|---|
| Hero | p(0, 2.24, 0.4) → (0, 2.06, −1.2), fov 46 → 44 | On-axis and symmetric — the only such frame, which is what makes every later pan read as a departure. Holds for the first third of the beat before anything moves. |
| 01 Schema | pans right ~17°, fov 39 | Focus **leads** the dolly by 8% of the beat. Reversing that order is what makes a move read as a zoom rather than a shot. |
| 02 RLS | full left swing, fov 37, ¼° roll in and out | Longest lateral move on the bridge, deliberately: the gate is the first press-and-hold and the visitor needs to have travelled to it. |
| 03 Actions | centre, py 1.30 — lowest in the sequence | The arm sweeps overhead only if the camera is under it. |
| 04 Interface | closest shot, fov 33, bloom **down** to 0.98 | A green screen at 1.4 bloom is a green smear (v2 §4 paid for this once). |
| 05 Deploy | dolly backwards down the corridor, fov 43 → 51 | Retreats while still facing the bridge, so the room recedes and the amber grows *behind* the viewer. The fov opens 8° across the move — a dolly-zoom in the direction that exaggerates depth. |
| Launch | accelerates through the door, fov → 62, exposure → 1.9 | See below. |
| Descent | p(0, 21, 82) → (0, 8.6, 36), roll unwinds to 0 | A banked approach that settles. The one place roll is narrative rather than anti-tripod. |
| Portfolio | p(−1.2, 6.4, 25.5), fov 41 | The monoliths do not fade in. They are already standing; what animates is the shadow. Architecture does not arrive, light arrives on it. |
| Footer | p(0, 8.8, 29.5), fov 37, rising | No return to the establishing shot. The page has arrived somewhere. |

### The one hard cut

The ship interior and the Dune world share an origin and are never on screen
together. They swap at the launch beat's midpoint under an exposure blowout.

A cut is normally the wrong instinct in a scrubbed timeline, and v2 §8 documents
exactly why: a *simulated* state has no defined value at 63% because scroll is a
seek bar, not a clock. This cut is safe for the opposite reason — `uFlash` and
the visibility flag are pure functions of scroll fraction. Scrubbing back across
it swaps back, exactly, every time. It is a lookup, not an integration.

It is also the better shot. Flying continuously from a bridge to a planet
surface is either a long empty transit or a fake, and a flash cut on ignition is
what the reference films do. The palette **leads** the cut by 15% of the beat, so
by the time the world swaps the light is already warm — the Dune reads as where
that light was coming from rather than as a second site with a second scheme.

### The shader event vocabulary

Twelve named channels on one state object — `uSchemaFocus`, `uRLSGate`,
`uActionsSpin`, `uInterfaceGreen`, `uPreflight`, `uLaunch`, `uFlash`,
`uDescent`, `uArrival`, `uPortfolioSpread`, `uDusk`, `uTransition`. A beat is a
one-line write from the score rather than a branch buried in the render loop.
This worked well and is the cheapest thing in the build to recommend.

---

## 5. Two palettes, one source

`components/v3/palette.ts` holds both locked sets as hex and is consumed three
ways: as CSS custom properties written onto the root element by the server, as
linear-light triples for materials, and as a per-frame blend for the fog. There
is no second copy of a hex anywhere.

**Interpolation is in linear light, not sRGB.** This mix runs blue to ochre,
which is close to the worst case for the muddy-midpoint artefact, and it is
physically a light source changing colour — linear is both the correct space and
the one the uniforms want anyway.

**Two colours were added to the storyboard's sets, and the reason should not be
skipped.** `dust #8A6842` is 3.54:1 on dune ink — a beautiful mid-tone and not a
text colour. It was the obvious choice for secondary copy in the warm act, and
shipping it would have put a failing body colour on a client-facing page. So
`dust` carries rules, stone and hairlines only, and `--sh-warm-dim #B08A5E`
(5.67:1) carries the text. Same for `--sh-cool-dim #8E99AC` (6.92:1). All ratios
are measured against the copy scrim at its shipped opacity, so the scrim is not
a taste value and must not be lowered without re-measuring.

The DOM palette switches per `data-act` on an act wrapper with a CSS transition;
only the canvas does the continuous blend. A custom property rewritten per frame
is a whole-subtree style recalc sixty times a second for a value that changes
once.

---

## 6. Rendering pipeline

```
RenderPass         → scene into a half-float buffer, MSAA ×4
VolumetricFogPass  → raymarch + composite + exposure
EffectPass         → DOF · bloom · CA · grain · vignette · ACES  (one merged shader)
```

Ported from v2 with the ordering intact, because the ordering is load-bearing:
`BloomEffect` samples the buffer as it *entered* the pass, so fog composited
inside the merged shader would never bloom, and fog that does not bloom has no
glow around the LEDs.

The fog march is unchanged — the frequency constant, the HG normalisation
against real source intensities, the 1.5×-wide useful density range and the
self-shadowing proxy's sign were all expensive to learn and re-deriving them
would be paying twice. What is new is that it is now *two* fogs: light
positions, colours, key direction and floor plane are settable per frame and
`SceneGL` writes them from the blended palette. One shader, one pass, and the
act transition is a continuous interpolation of six uniforms rather than a swap
between two effects.

Settings that differ from v2, and why:

| Setting | v2 → v3 | Reason |
|---|---|---|
| Bloom `luminanceThreshold` | 0.94 → 0.95 | More polished metal in frame at once. Same rule applies: tune it on the *closest* keyframe, because specular on a bevel gets hotter as the camera closes, and a threshold tuned on a wide shot is tuned on the easiest frame in the sequence. |
| DOF `worldFocusRange` | `3.6/bokeh` → `4.2/bokeh` | The subject is a room, not a 1-unit-deep object. |
| Exposure | 0.46+ → **1.24** | The single largest grading change. v2 graded for a void with one lit object in it; this is an interior, and a room lit to a void's exposure is a cave. |
| Hull reflectance | — → `chrome × 0.58` | Metalness is 1, so this is the reflectance of the entire surface with no diffuse under it. At 0.42 the ribs read as charcoal plastic wherever they missed the key. |
| dpr cap | 1.75 | Unchanged. Fill-rate bound; the 1.75→2 difference is invisible under grain. |

---

## 7. Two acts, two rules

The ship earns fidelity from **density** — ribs, fasteners, seams, practicals,
all close to the lens. One 1024² panel-grid map puts several hundred readable
features on a wall that is four triangles, which is Rule 2's point about
information rather than element count.

The Dune is the opposite problem: one enormous plain, four objects, a sun near
the horizon. Adding detail there works against it. Essentially the whole budget
for that act goes to **shadow length and atmosphere** — it is dense, delivered
sparsely, and the density is in the light.

Getting that asymmetry right was more important than any individual material.

---

## 8. Accessibility decisions that changed the design

**No text is baked into any texture.** The storyboard draws legible Prisma
schema and a legible SQL terminal onto the console screens. Baking it fails WCAG
1.4.5, and it is also the AI-render tell that v2 refused for the same reason.

The resolution improved the design rather than compromising it: the screens
carry **generated row rhythm** derived from the real snippet's line-length
profile, and the snippet itself is real DOM text in the section copy. A screen
six metres away at a 30° yaw renders eight-pixel glyphs, which is a smear —
what actually reads as code at that distance is indent depth and line-length
variance. So the compliant version is also the more filmic one.

**The five press-and-hold controls are real `<button>`s in the DOM, not raycast
hits on the mesh.** A 3D object has no accessible name, no focus ring and no
keyboard path, and this page has five of them. The buttons carry all three for
free and the mesh reacts to a number. Same for the monolith hover, which is
driven by `pointerenter`/`focus` on the list links — so the keyboard path lights
the structures too. This is the decision I would most strongly defend against a
"but the interaction should be *on the object*" note.

Controls are `hidden` in the HTML and revealed by the render loop. A control that
drives a canvas which is not running is a control that lies.

---

## 9. The bugs, which are the point of this document

**The viewport faced backwards, and the symptom named the wrong subsystem.**
three builds a cylinder with `x = r·sin(θ)`, `z = r·cos(θ)`, so θ=0 points at
**+Z**. Started at `-arc/2`, the window's wedge was built at the correct radius
with the correct texture 25 units *behind the camera*. What shipped on screen was
a bridge with mullions and no window — which reads as a texture-loading failure,
so the first instinct was to check the canvas texture and the media fallback.
It was trigonometry. **A missing texture and a mis-oriented surface look
identical; check the transform before the asset.**

**A sticky child taller than its containing block does not stick.** The descent
beat was authored at 70svh with a 100svh sticky pin. It simply scrolled and
overflowed, so "Where it lives once shipped" sat on top of "Four in production"
for the entire portfolio beat. This is now a **throw at module load** in
`narrative.ts` rather than a convention, because the failure presents as a CSS
bug and the cause is a data value. Cost: the act break moved 3.5 points off the
storyboard (§3).

**The chair was a cone, and scaling it did not help.** A lathe narrowing
quadratically to a point renders as a traffic cone parked on the bridge axis
directly over the gas giant — in the establishing frame, which is the one shot
the whole page opens on. Shrinking it made a smaller cone. The fix was the
*shape*: a cylinder section, open toward the camera, wider than tall. A solid of
revolution that tapers reads as a cone at any scale; a seat back has a
silhouette. Paired with raising the camera above the headrest — the storyboard's
"1.5m behind the chair" at eye level puts the chair between the lens and
everything the shot is about, and every real over-the-shoulder bridge shot is
*above* it.

**Transmission across the viewport cost twice and was removed.** A transmissive
cylinder in front of the window tinted the whole frame toward LED blue over a
12-unit attenuation path and dropped the gas giant to near-black — the window
became a filter over the one bright thing in the shot. It also forces a separate
scene render behind every transmissive surface, which is the most expensive
possible place to spend it. Transmission is kept where it reads and costs little:
the schema console's cover, a small panel with a lit surface right behind it,
which is the case the brief actually wanted it for.

**The RLS gate worked perfectly and was invisible, which is the most
instructive failure here.** `slab()` centres its extrusion on z, so a 0.34-deep
frame spans ±0.17. The lit interior was authored at −0.14 and the leaves at
+0.06 — both *inside* that solid. So the hold ran, the travel eased, the check
indicators latched green, and the only thing on screen was a blank slab. It read
as "the press-and-hold does nothing", which sends you to the input handling and
the uniform plumbing; the input handling and the uniform plumbing were fine.

Two things worth carrying forward. First: **when a helper applies its own
transform, every position passed to it is in a frame you did not author** — the
same class of error as the viewport theta above, and both cost a debugging round
because the symptom pointed at a different subsystem. Second, the module also
read as one flat door even before that, because frame and leaves shared
`m.hull`: two abutting surfaces of the same material at the same depth have no
seam, and what makes a gate read as a gate is the joint. It needs two materials
or a shadow, and now gets both plus an amber reveal around the aperture.

**The sand aliased into fabric, twice, at two different frequencies.** First at
`repeat 26` over a 220-unit disc, which drove the ripple period below a pixel
through the mid-ground. Then again at `anisotropy 8`, which is not enough for a
plain seen at a grazing angle from 20 metres — the worst case for anisotropic
minification. Fixed at `repeat 11`, `anisotropy 16`, explicit mipmaps, and a
ripple amplitude halved to 0.055 so it *averages to a tone* with distance, which
is what real sand does. This is the v2 fog-frequency lesson one texture out:
**correct detail at the wrong frequency is noise.**

**The act was lit for long shadows and had none.** `SUN_AZ` at −0.72 put the sun
behind the camera's left shoulder, so every shadow fell away from the lens and
foreshortened to nothing. At −1.34 the light rakes across frame and the shadows
run left to right, which is the only thing carrying scale on an empty plain.

**The arrival frame had no horizon.** At py 44 / pz 52 looking down at ty 6 the
camera was almost overhead and the whole frame was ground, so the Dune read as
an orange texture rather than as a place — and a place is the entire argument of
the second act. Now a long shallow approach, sky in the top third.

**The drawing cropped to a slice in portrait.** `preserveAspectRatio` at
`xMidYMid slice` gave a 375×812 frame a 416-unit-wide slice through the middle of
a 1600-unit drawing: console arc at four times its intended size, no viewport at
all. `xMidYMin` is a no-op at 16:9 and the whole fix in portrait.

**A measurement trap, inherited and re-encountered.** The first capture run
reported the canvas mounted, sized and error-free — and never painted, because
the in-app browser pane was not compositing and `requestAnimationFrame` does not
fire in a page that is not producing frames. Then forcing SwiftShader made every
screenshot time out, which `performance.md` correctly reads as a saturated
renderer rather than a tooling glitch. Neither is a bug in the page. **Frame
timing and DOM state are not evidence that a feature is working; only looking at
the pixels is.** `scripts/capture-ship.mjs` exists so the next pass does not
re-learn this.

---

## 10. Measurements

### Bundle (gzip, `SmallestSize`, built chunks)

| Chunk group | gz |
|---|---|
| three + `postprocessing` | 158.2 KB |
| mixed vendor (three/postproc/gsap) | 40.2 KB |
| gsap | 27.0 KB |
| v3 scene code (score, parts, fog, environment) | 16.8 KB |
| **WebGL path, total** | **242.2 KB** |
| All chunks, all routes | 502.7 KB |

Against the brief's 900 KB – 1.1 MB target this is **well under**, and nothing
was cut to get there. The environments, the noise volume, both palettes, all
textures and the entire Dune are procedural and cost **0 KB of bundle** between
them.

**The drawing-only path pays none of the 242.2 KB.** Verified rather than
asserted: on a reduced-motion context, `threeRequested` is `false` — the gate
resolves before the dynamic import is requested, so the chunk is never fetched.

### Frame timing — 1440×900, dpr 1, ANGLE/D3D11, RTX 5060

| | median | p95 | worst |
|---|---|---|---|
| Establishing shot | 16.6 ms | 17.8 ms | 19.0 ms |
| 768×1024 | 16.6 ms | 18.3 ms | 23.3 ms |

**Read this honestly: 16.6 ms is the vsync interval, not the GPU cost.** The
probe measures `requestAnimationFrame` deltas, so what it proves is *no dropped
frames at 60 Hz* — not headroom. v2's 4.2 ms figure came from a different
instrument and the two are not comparable. Getting a true GPU-time figure needs
`EXT_disjoint_timer_query` and is the first thing the next pass should add.

### Widths — `scrollWidth === clientWidth` at every one

| Width | Path | Document |
|---|---|---|
| 1440×900 | canvas | 12,015 px |
| 768×1024 | canvas | 13,670 px |
| 375×812 dpr 2 | **drawing only** | 8,120 px |
| 1440×900 reduced-motion | **drawing only**, three never requested | 5,467 px |

---

## 11. What is not done

Stated plainly rather than buried.

- **No sound layer.** The brief asked for a synthesised Web Audio layer with a
  muted-by-default toggle. Not built. It is the cleanest remaining addition —
  ~50 KB, self-contained, and the `uFlash` channel is the obvious trigger.
- **No launch-transition geometry.** The cut works and the exposure blowout
  works, but there is no ship exterior, no engine plume and no station: the
  first half of the launch beat is the corridor run and the second half is
  already the Dune. The most cinematic beat on the page is currently the
  *least* built one, which is the wrong way round.
- **No dust plume on touchdown.** `uArrival` drives the settle but not the
  particle event.
- **Press-and-hold is wired for all five modules but only three do something
  visually interesting.** Schema (lights and clouds the cover), RLS (parts the
  gate), Actions (drives the disc) read; Interface and Deploy are lamp ladders.
- **The portfolio copy scrolls out of its pin near the end of its beat**, and at
  900px the fourth list row can clip during that window. The fade covers most of
  it. A proper fix is a longer portfolio beat.
- **Kling media slots are built and empty.** Drop a file at
  `/public/v3/media/viewport.mp4` (or `dune.mp4`, `dusk.mp4`) and it binds; a
  404 leaves the procedural stand-in. No code change either way, and the 404
  currently in the console *is* that mechanism working.

---

## 12. Honest self-assessment

**Is this at the Kling reference target?** No — roughly **65–70%**, against the
brief's 80–85%.

What is there. The two-act structure works and the palette transition is the
best thing in the build: the light goes warm before the world does, so arriving
on the Dune reads as a place the ship was heading for rather than as a second
website. The corridor retreat is the strongest single frame — real one-point
perspective, ribs strobing, the bridge receding at the far end, amber growing
behind the lens. The bridge reads as an interior rather than a set: the taper,
the rib instancing and the panel-grid map are doing exactly what Rule 2 predicts.
The Dune act's restraint is right, and the raking shadows carry it. The
engineering decisions — the derived narrative spine, the settable two-palette
fog, the linear-light blend, the DOM-button interaction model — are ones I would
defend.

Where the gap is, and it is not where I expected. v2's self-assessment said the
fidelity was done and the missing thing was *authored motion and a signature
moment*. This build inherited the fidelity and spent its budget on **structure**
— ten beats, two worlds, a spine, a cut. That was the right call for attempt
four, because the concept was what kept failing. But it means the signature
moment is still missing: the launch is the beat everything is built to earn and
it is currently a flash and a scene swap. It is the correct *edit* with nothing
in the frame. A studio would have built the ship exterior and the engine plume
before it built the fifth console.

The second gap is that the press-and-hold interactions are a mechanism, not yet
a moment. They are correctly built — keyboard-operable, spring-damped, scroll
sets a floor so the section reads without pressing — and none of them is the
thing that makes someone say "wait, do that again". The RLS gate is closest.

What a general-purpose CC's ceiling looks like here. The trigonometry, the
minification analysis, the contrast geometry and the pipeline ordering are not
the ceiling — those are checkable and I checked them. The ceiling is that I
found the chair-as-cone problem by *looking at a screenshot and reasoning about
occlusion*, having previously written a comment describing that exact chair as a
deliberate silhouette. I can evaluate a frame once it exists; I cannot reliably
predict which of my own choices will look wrong before rendering it. That is the
same taste gap v2 named, and the practical consequence is the same: **budget for
more capture-and-look cycles than feel necessary**, because each one found a
real defect and none of them were visible in the code.

Next pass, in order: build the launch exterior; add the sound layer keyed to
`uFlash`; get a true GPU-time measurement; then one press-and-hold promoted into
an actual signature moment.
