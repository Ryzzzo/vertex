# 3D scene composition — GitHub reference library

Written for the Bridge iteration after this one. Research only; no code touched.

> Method: eight repositories inspected on GitHub between 2026-08-18 and 2026-08-19,
> star counts and last-release dates read from the repo page, source files pulled
> via `raw.githubusercontent.com` where the tool would return them and via the
> rendered file view otherwise. Where I quote a technique to a file, I opened the
> file. Where I quote it to a *pattern* across a codebase, I read the README's
> claim and confirmed it against at least one file. License checked per repo —
> the shortlist is entirely MIT / BSD / Zlib / Apache; nothing with GPL contagion
> and nothing missing a license file. Vertex Bridge context (`lib/ship/rooms/bridge.ts`,
> `lib/ship/scene/post.ts`, `lib/ship/palette.ts`, `components/ship/ShipCanvas.tsx`)
> read once, not modified.
>
> Companion to `docs/hero-rebuild-research.md`. That doc measured what agency
> showreels ship on the wire; this one reads what they open in the editor.

The Bridge as it stands is engineered well and framed generically. The engineering
shows: octagon plan, vaulted ceiling, key/rim/fill split, 8 practicals on the ceiling
run, GTAO → emissive-buffer bloom → shallow DoF in a WebGPU node graph, and a
palette that has been reasoned about in `srgb → linear` space
(`lib/ship/palette.ts:130-140`). The framing is where studios pull ahead: they
stage a scene, they don't just build one. That is a taste problem and taste is
transferred by looking at other people's files with the answer already visible.
This document is the file list.

---

## 1. The shortlist

Ranked by fidelity to the Bridge problem, not by star count. A 200-star
implementation of the exact effect you need beats a 30,000-star framework whose
`README` gif is a spinning cube.

### 1. `mrdoob/three.js` — the source of truth

- <https://github.com/mrdoob/three.js> — 115k stars, r185 (2026-07-01), active
- MIT · [Live examples](https://threejs.org/examples/)
- **What it teaches.** The `webgpu_postprocessing_bloom.html` example is the
  closest published reference to what the Bridge is trying to do. It loads a
  sci-fi model (`PrimaryIonDrive.glb` by Mike Murdock), lights it with a single
  `AmbientLight(0xcccccc)` plus a `PointLight(0xffffff, 100)` welded to the
  camera, tone-maps with `ReinhardToneMapping` — **not ACESFilmic** — then runs
  the scene through either `bloom()` or `dualKawaseBloom()` from
  `three/addons/tsl/display/BloomNode.js` with `strength`, `radius`, and
  `threshold` as explicit uniforms rather than magic numbers. The whole example
  is 130 lines. The sibling `webgpu_postprocessing_dof.html` shows the same
  `RenderPipeline` composed with `dof()` where the focal length parameter has
  the same load-bearing role the Bridge's `post.ts:158` derived from the node
  source.
- **Sci-fi ship-interior relevance — foundational.** Same renderer, same TSL
  graph, same effect nodes the Bridge already imports (`three/addons/tsl/display/*`).
  Not a scene to steal; the reference build for the pipeline the Bridge sits on.
- Key files:
  - `examples/webgpu_postprocessing_bloom.html` — the tone-mapping + bloom
    canonical setup on the WebGPU renderer
  - `examples/webgpu_postprocessing_dof.html` — DoF via `getViewZNode()`, which
    is exactly the mistake `post.ts:135-158` calls out
  - `examples/webgpu_postprocessing.html` (dev branch) — the multi-effect
    composition pattern
  - `examples/jsm/tsl/display/GTAONode.js` — the source for the effect the
    Bridge is already using; reading it is the fastest way to understand the
    `.r`-channel bug documented in `post.ts:95-108`

### 2. `brunosimon/folio-2025` — atmosphere-through-time architecture

- <https://github.com/brunosimon/folio-2025> — 1.5k stars, 930 commits, active
- MIT · [Live: bruno-simon.com](https://bruno-simon.com)
- **What it teaches.** The README's game-loop declaration is the whole lesson.
  Steps 8 through 10 read: `Intro`, `DayCycles`, `YearCycles`, `Weather`,
  `Zones`, `VisualVehicle`, then `Wind`, `Lighting`, `Tornado`, `Tracks`, then
  `Foliage`, `Fog`, `Reveal`, `Terrain`, `Grass`, `Lightnings`, `RainLines`,
  `Snow`, `WaterSurface`. Lighting is *downstream* of DayCycles. Fog is
  downstream of the view. Weather is a system that feeds Lighting rather than a
  parameter on it. The dependency order is declared and enforced by the loop,
  not by import order. **This is the file that argues that a scene is not lit,
  it is *in an atmosphere*, and the atmosphere is a first-class system with its
  own state.** The Bridge currently has neither — light intensities are static
  constants scaled by a boot factor (`rooms/bridge.ts:621-626`), fog does not
  exist, and there is no notion of a time-of-scene.
- **Sci-fi ship-interior relevance — direct, once translated.** A ship interior
  needs one atmosphere state, not four seasons, but the structure — a system
  that owns colour temperature, intensity, fog density, and hero-light
  presence, driven by scene beat rather than by cargo-culted constants — is
  exactly what promotes a "well-lit render" to a "location".
- Key files:
  - `readme.md` (root) — the game-loop declaration; read this first
  - `sources/game/*` — the modules referenced by name in the loop; inspect
    `Lighting`, `Weather`, `Fog`, `Reveal` for the state model
  - `scripts/compress` — the KTX2/GLB compression pipeline invoked by
    `npm run compress`, worth studying for the Bridge's `public/ship/bridge/`
    assets which are currently unoptimised WebMs
- Note: written in vanilla three, not R3F. That is a feature, not a bug — the
  Bridge is also vanilla three.

### 3. `brunosimon/folio-2019` — single continuous scene, hand-placed density

- <https://github.com/brunosimon/folio-2019> — 4.7k stars, 258 commits
- MIT · [Live: prior version at bruno-simon.com](https://bruno-simon.com)
- **What it teaches.** Hand-placed density inside one scene, no scene loader
  streaming acts. Every object is authored in `resources/3d/` as a `.blend` and
  compiled to `.gltf`, then arranged in code with named positions. The
  `sections/` architecture is a menu of "chapters" that are all
  simultaneously loaded and rendered — you drive between them. This is the
  argument against the streaming-room approach when the whole world can afford
  to be in memory. The Bridge is small enough that a similar always-loaded
  architecture is the right call, and the routing in `ShipCanvas.tsx:122-141`
  already implicitly assumes it.
- **Sci-fi ship-interior relevance — foundational as a composition lesson.**
  The specific 2019 code is early (pre-Vite, pre-vanilla-three-migration in
  places) and I would not steal implementation from it, but the *scene
  organisation* — one continuous world with named zones, no acts, no fades —
  is a stronger fit for a ship than the multi-page mental model the current
  routing implies.
- Key files:
  - `src/javascript/World/Sections/` — how a "section" is a spatial region
    rather than a route
  - `src/javascript/World/Materials.js` — how a small palette of shared
    materials is threaded through every mesh; the Bridge's
    `kit/materials.ts` already follows this pattern
  - `resources/3d/` — the .blend authoring workflow

### 4. `Ameobea/three-good-godrays` — the effect the Bridge is missing

- <https://github.com/Ameobea/three-good-godrays> — 225 stars
- View license (permissive, non-copyleft) · [Live demo](https://three-good-godrays.ameo.design/)
- **What it teaches.** Screen-space raymarched godrays via shadow-map sampling.
  Adapted from `n8python/goodGodRays`. The API is one line: `new GodraysPass(light, camera, params)`
  where `params.density` sits around `1/128` and `params.raymarchSteps`
  defaults to 60. Requires the light to `castShadow` and requires meshes to
  both cast and receive. Ships with a demo scene of a dark hallway with light
  cutting through slats — **that reference image is closer to what the Bridge
  viewport wants to project than any other single screenshot in this list.**
- **Sci-fi ship-interior relevance — direct.** The Bridge's key light comes
  through the viewport (`rooms/bridge.ts:546-566`). That's already the setup
  the shot wants — a light source outside a dark interior. What the shot is
  missing is the volumetric evidence of that light: godrays streaking through
  the viewport frame, dust particles in the beam, atmospheric density that
  makes the *outside* feel present rather than painted. This library is a
  postprocessing pass; the Bridge is on the WebGPU node pipeline. Not a
  drop-in — it's a `pmndrs/postprocessing` effect. The lesson to steal is the
  *raymarching-against-shadow-map* technique, which is straightforward to port
  to TSL, and the shot direction it produces.
- Key files:
  - `src/index.ts` — the pass integration point
  - `src/godrays.fragment.glsl` — the raymarch loop worth reading before
    porting to TSL
  - `demo/` — the reference scene that shows what the effect is *for*
- Version-window caveat: README lists three.js `>=0.125.0 <=0.182.0`. The
  Bridge is on the current stable — no problem for reading, real problem for
  drop-in use.

### 5. `pmndrs/postprocessing` — the effect stack, done exhaustively

- <https://github.com/pmndrs/postprocessing> — 2.8k stars, 3,149 commits, active
- Zlib · [Demo](https://pmndrs.github.io/postprocessing/public/demo)
- **What it teaches.** The reference implementation of the exact effect
  vocabulary the Bridge is recreating in TSL. What matters here is not the
  code (WebGL, wrong renderer) but the *decisions*: `HalfFloatType` frame
  buffers for linear HDR-like precision, `NoToneMapping` on the renderer with
  `ToneMappingEffect` at the *end* of the pipeline instead, `EffectPass`
  merging multiple effects into one full-screen triangle to avoid ping-pong
  overhead, and the demo's own tuning parameters for BloomEffect
  (`intensity`, `luminanceThreshold`, `luminanceSmoothing`) and BokehEffect
  (`focus`, `aperture`, `maxBlur`) that have been argued about in issues for
  years. Reading those defaults is faster than deriving your own.
- **Sci-fi ship-interior relevance — tangential-as-code, direct-as-pattern.**
  The Bridge's `post.ts` has already made most of these calls correctly
  (emissive-buffer bloom rather than luminance-threshold bloom, shallow DoF
  with a large focal length, AO before bloom) but the *why* is only obvious
  once you've read the demo source.
- Key files:
  - `src/effects/BloomEffect.js` — the reference intensity/threshold split
  - `src/effects/DepthOfFieldEffect.js` — the CoC computation the Bridge's
    `dof()` node compresses into `smoothstep(0, focalLength, ...)`
  - `demo/src/demos/DepthOfFieldDemo.js` — the tuning-story-as-code
  - `manual/` — the maintainer's own words on order-of-operations

### 6. `pmndrs/drei` — the staging vocabulary R3F converged on

- <https://github.com/pmndrs/drei> — 9.7k stars, 897 releases, v10.7.7 (2025-11-13), active
- MIT · [Docs and demos](https://drei.pmnd.rs/)
- **What it teaches.** The complete R3F vocabulary for staging a scene:
  `Environment` (HDRI cubemaps with presets), `ContactShadows`,
  `AccumulativeShadows` + `RandomizedLight` (progressive shadow accumulation
  producing the offline-look shadow softness), `SoftShadows`, `Lightformer`
  (planar area lights that show up in reflections), `Float`, `CameraShake`,
  `PerformanceMonitor`, `useDetectGPU`, `Stage` (opinionated scaffold that
  centres and lights a subject). Every one of these is a decision the R3F
  community made under production pressure. The Bridge is not on R3F, so the
  code doesn't transfer directly; the *concepts* do.
- **Sci-fi ship-interior relevance — the concept dictionary.** The Bridge
  writes its own version of `AccumulativeShadows` (baked shadows for the
  practicals would let the runtime shadow budget go to the key light alone),
  its own `Lightformer` (rect area lights for the viewport frame that would
  make the frame visible in the chair's chrome), its own `Float` (the "breath"
  idle Ryan named in the hero-rebuild doc). Drei being the reference means
  those Bridge-side implementations should look like their drei counterparts
  or should have a documented reason not to.
- Key files:
  - `src/core/AccumulativeShadows.tsx` — the progressive-shadow pattern
  - `src/core/Lightformer.tsx` — the area-light-as-mesh trick that reads in
    reflections
  - `src/core/SoftShadows.tsx` — the PCSS shader replacement
  - `src/staging/Environment.tsx` — HDRI + `Lightformer` composition
  - `src/misc/PerformanceMonitor.tsx` — the DPR downshift pattern; the Bridge's
    quality tiers in `scene/quality.ts` should read like this

### 7. `MaximeHeckel/blog.maximeheckel.com` — same tech stack, thought out

- <https://github.com/MaximeHeckel/blog.maximeheckel.com> — 728 stars
- MIT (source) / CC BY-NC 4.0 (article prose) · [Blog](https://blog.maximeheckel.com)
- **What it teaches.** The only sizeable open-source codebase actively
  publishing R3F/TSL/WebGPU explorations with the reasoning visible next to
  the shaders. Notably: "Field Guide to TSL and WebGPU", "On Shaping Light:
  Real-Time Volumetric Lighting with Post-Processing and Raymarching",
  "Building a Vaporwave scene with Three.js", "The Study of Shaders with React
  Three Fiber". The vaporwave scene is a moody perspective interior — grid
  floor, distant sun, one atmosphere — and its code walks through the
  compositional decisions rather than only the shader.
- **Sci-fi ship-interior relevance — direct as pedagogy.** Same renderer, same
  node graph, same problems, worked out in public. The volumetric-lighting
  article specifically covers the shader technique that would produce the
  viewport godrays discussed above, but written for TSL rather than for the
  Ameobea pass.
- Key files:
  - `content/` (MDX posts, especially `field-guide-to-tsl-and-webgpu.mdx`,
    `shaping-light-volumetric-lighting-with-post-processing-and-raymarching.mdx`,
    `vaporwave-3d-scene-with-threejs.mdx`, `the-study-of-shaders-with-react-three-fiber.mdx`)
  - `core/components/MDX/Widgets/` — the runnable shader demos embedded in
    the posts; several are single-file self-contained scenes worth reading

### 8. `wass08/r3f-webgpu-starter` — the smallest-possible WebGPU + R3F template

- <https://github.com/wass08/r3f-webgpu-starter> — 23 stars, 6 commits
- MIT · Wassim Samad (Wawa Sensei) teaches R3F on YouTube
- **What it teaches.** Not much on its own — this is a 6-commit starter that
  wires `WebGPURenderer` into R3F's `Canvas` and demonstrates a TSL material
  works inside the R3F tree. Its value is that it exists at all. If any part
  of the Bridge's downstream evolution introduces an R3F leaf (say, for a
  reactive HUD panel that wants to observe scene state), this is the
  integration pattern that has already been shaken out.
- **Sci-fi ship-interior relevance — foundational for the R3F/WebGPU bridge
  case only.** Skip unless the plan changes to include R3F.
- Key files:
  - `src/App.jsx` — the four-line WebGPU renderer swap
  - `package.json` — the version pins that actually work together in a given
    quarter

---

## 2. Patterns that recur across the top of the list

Read across the eight repos in Section 1, the following patterns show up in
more than half. They are what the shortlist has in common that the
long tail of "cool three.js demo" GitHub does not.

**Atmosphere is a system, not a light rig.** Every reference that reads as a
*location* rather than as a lit render (`folio-2025`, the `three-good-godrays`
demo scene, the vaporwave scene in Maxime's blog) has an owned atmospheric
state: a fog colour and density, a light-tint colour, an overall exposure, a
time-of-scene. `folio-2025`'s game loop declares this explicitly — DayCycles →
Weather → Lighting → Fog is a dependency chain, not a list of siblings. The
Bridge currently has none of it: `hemi`, `key`, `rim`, `fill` and 8 point
practicals are all constants that get multiplied by `state.boot` on frame update
(`rooms/bridge.ts:621-626`). One state object called `atmosphere` — with
`temperature`, `intensity`, `fogNear`, `fogFar`, `fogColor`, `exposure` — held on
the room and driven by scene state is the missing spine.

**Godrays are the "outside is real" tell.** The Ameobea demo screenshot with
the pink light cutting through vertical slats is arresting for a specific,
copyable reason: the shot proves the light source is *outside* the frame and
that there is *stuff between camera and light* — dust, mist, air. Bridge scenes
in film do this every time; Star Trek's bridge has particles catching the
practicals; every Ridley Scott interior has volumetric backlight. The Bridge's
key light already comes through the viewport in the code, and the room is dark
enough that a volumetric pass would land. It is one of the two highest-leverage
additions available and it is documented in both `Ameobea/three-good-godrays`
(as a `pmndrs/postprocessing` effect) and Maxime Heckel's volumetric-lighting
post (as raymarching in the fragment shader).

**Bevels are visible bevels; chamfers must catch light.** The Bridge already
uses `bevelBox` / `bevelPanel` / `bevelFrame` and the palette note in
`palette.ts:53-70` names the correct mechanism — dark albedo, high metalness,
mid-low roughness, form described by *specular* rather than by *diffuse*. That
is the exact recipe the Blender-corridor benchmark used and it is what puts the
Bridge above most GitHub interior scenes on a still. It only pays off, however,
if there is something for the bevels to *catch*. In `drei`'s `Lightformer`
pattern, a bright thin plane is placed *behind* the camera specifically to
show up in front-facing chrome; this is the technique the vertex bridge needs
for the command dais rim.

**One-point perspective with an intermediate object.** The Bridge already fixes
this — see the extensive `HELM` comment at `rooms/bridge.ts:409-416`, "the
single most important addition of the rebuild". The reference repos confirm the
pattern. Every arresting interior shot in the shortlist has three planes of
depth minimum: something near the camera occluding the frame edge, a
mid-ground the eye can measure distance against, and a far bright plane. Empty
floor between camera and back wall — the failure mode the octagon rebuild
addressed — is a specific enough failure that it has a name in cinematography
("miniature effect at scale") and it is what `folio-2019`'s dense scene
authoring specifically avoids by *always* putting props in the mid-ground.

**Ceiling matters as much as walls.** The Bridge's vaulted ceiling
(`rooms/bridge.ts:277-315`) is doing more work than most viewers will notice
consciously. The reference here is the negative: interior scenes on GitHub that
skip the ceiling — flat lid, or worse, no lid at all with skybox showing
through — are read as sets rather than rooms. `folio-2025`'s tunnels, the
`three-good-godrays` demo hallway, and the Codrops sci-fi tutorials with
convincing interiors all treat the ceiling as a first-class surface with its
own light strips or vault geometry. The stepped-vault approach the Bridge
takes is a specific technique borrowed from cathedral architecture and it
reads as "considered" the way a flat ceiling never will.

**Emissive-buffer bloom, not luminance-threshold bloom.** This is the single
strongest signal that separates a premium build from a tutorial one. Threshold
bloom asks "is this pixel bright enough to glow" and the answer is often "yes,
the white panel is bright". Emissive-buffer bloom asks "was this pixel
authored as glowing" and only the LED strips get through. The Bridge already
does this correctly (`post.ts:113-122`) — the point in this section is that
the shortlist confirms it as the right call. `pmndrs/postprocessing`'s
`SelectiveBloomEffect` exists specifically to work around WebGL not having
MRT natively; WebGPU makes the correct pattern the easy pattern.

**Motion is one repeating element on a still frame.** The Bridge's gas giant
rotating slowly at `y += delta * 0.02` (`rooms/bridge.ts:603`) is the whole
motion budget on that room and it is enough. This is the same lesson the hero
research doc landed on — Rule 4, `cursor: grab`, one thing moves — and the
shortlist confirms it. `folio-2025`'s idle state has grass swaying and cloud
shadows moving; nothing else. `three-good-godrays`' demo has particles
drifting; nothing else. `folio-2019` has the car engine idling; nothing else.
Every scene that reads as inhabited has *one* moving element the eye anchors
on, and every scene that reads as a screensaver has three or more.

**Bundle discipline is asset discipline.** The bundle numbers the hero
research measured live cleanly correlate with what the shortlist codebases do
with assets. `folio-2025` ships a `scripts/compress` step that runs KTX2 on
textures and Draco on GLBs before deployment; that is why a driving game with
weather and terrain fits in the byte budget it does. The Bridge currently
ships `public/ship/bridge/gasgiant.webm` and `.mp4` unoptimised at whatever
size the source is. If the atmosphere-through-time system in point 1 adds
anything to the asset budget, the pipeline needs a compress step before it,
not after.

---

## 3. Anti-patterns from low-quality Three.js scenes

A GitHub search for `three.js spaceship` or `r3f interior` past the first two
well-lit results returns a long tail of scenes that failed for identifiable
reasons. The patterns below are what the failures have in common — named
because naming a failure is what stops you shipping it.

**Ambient + one directional and nothing else.** The `AmbientLight(0.5) + DirectionalLight(0.8)`
recipe is the tutorial default and it produces the tutorial look. No form on
curved surfaces, no rim, no highlight moving around the geometry, and shadows
either hard-edged in a single direction or absent because
`renderer.shadowMap.enabled = false` was never flipped. Every scene in the
long tail that reads as "unlit primitives" is this rig. The Bridge already has
four-light key/rim/fill/hemi split plus eight practicals; the failure mode is
what to *avoid regressing to*.

**Primitive geometry with no bevel.** `BoxGeometry` returned from a helper,
placed at integer coordinates, with an `MeshStandardMaterial({ color: 0x333333 })`
and nothing else. The specific tell is *silhouette*: at any camera angle, the
silhouette is straight lines meeting at hard 90° angles, and the eye reads
"CAD render" or worse "Roblox". Every corner needs a chamfer, no exception.
The Bridge's `bevelBox` / `bevelPanel` / `bevelFrame` are exactly the fix and
they are worth defending.

**Uniform roughness/metalness across the whole scene.** Setting a global
`roughness: 0.5, metalness: 0.5` on every material is the same class of
mistake as flat lighting — everything reads as the same material. Real
interiors have brushed metal (rough) next to polished chrome (mirror) next to
matte paint (very rough) next to glass (transmissive), and the eye needs that
material variety to read the scene as physical. The Bridge does this correctly
(`hull` vs `hullEdge` vs `chrome` vs `strip` vs `recess` in `kit/materials.ts`)
but it is the second-most-common failure in the long tail.

**Bloom on the entire frame at high radius.** The "cinematic" setting most
tutorials show — `BloomPass` with `intensity: 1.5, luminanceThreshold: 0.85, radius: 0.85` —
blooms every white surface into a haze and reads as "someone discovered
post-processing this morning". The correct call is either MRT-emissive bloom
(what the Bridge does) or a *very* low intensity with a very tight radius
against a specific luminance threshold, and every scene in the long tail with
"why does everything glow" has skipped this decision. Bloom is a signal about
*which pixels emit light*, and if that signal is not authored it should not
exist.

**Post-processing before lighting is fixed.** A large family of tutorial scenes
add depth-of-field or chromatic aberration to a scene that has a lighting
problem, and the DoF makes the problem worse — the eye now cannot see what
went wrong, only that the whole picture is soft. Post-processing is a
multiplier on a scene that reads well without it. If the scene reads flat
without post, it will read flat *and* soft with it. The Bridge's DoF is on a
scene that already reads dimensional; the anti-pattern is when a demo turns on
DoF to *make* the scene look dimensional.

---

## 4. Concrete moves for the vertex Bridge

Written as "if you have X, do Y" so they apply without opening the Bridge
source in this session. Each move is annotated with the reference repo that
demonstrates it.

**If your lighting values are constants scaled by a boot factor, promote them
to an `atmosphere` state object owned by the room.** Structure it like
`folio-2025`'s DayCycles → Weather → Lighting chain (`readme.md` game-loop
declaration, steps 8–9). The state carries `keyIntensity`, `keyColor`, `rimIntensity`,
`fillIntensity`, `hemiSky`, `hemiGround`, `hemiIntensity`, `fogNear`, `fogFar`,
`fogColor`, `exposure`, and a `beat` name. Every named beat — say `"idle"`,
`"engaged"`, `"alert"` — is a preset. The frame update reads from `atmosphere`,
not from local constants. This is the change that makes the room feel *in a
place at a time* rather than *lit*.

**If your room has no godrays through the viewport, add them.** The Bridge
setup is already correct for it — a dark interior with a bright light source
outside a defined frame. Port the raymarch loop from
`Ameobea/three-good-godrays` (`src/godrays.fragment.glsl`) into a TSL node so
it lives inside the existing WebGPU post chain. Read Maxime Heckel's
volumetric-lighting post for the TSL-side authoring pattern. Density starts
around `1/128`, steps around 40 for `medium` quality and 60 for `full`, colour
tinted from the key light's colour rather than white. The single biggest
"outside is real" tell available and the Bridge is one shader away from it.

**If your fog is not implemented, add it, and drive its colour from the
atmosphere state.** The Bridge's `space` colour `#04060B` is set as the void
beyond the viewport but the interior itself has no fog. A very subtle
`FogExp2` — density around 0.008, colour equal to `scrim #0A0C10` — flattens
the far-wall practicals against a receding value and reads as depth without
looking foggy. `folio-2025` does this on every terrain scene; the effect is
"there is air in this room". Skip on `reduced-motion`; add exposure ceiling on
mobile so the fog doesn't wash the phosphor green out of frame.

**If your key light is unshadowed or the shadow map is not sized to the room,
size it.** The Bridge already sizes the DirectionalLight shadow camera to the
octagon plan (`rooms/bridge.ts:556-566`) which is the correct call. If any
future light is added, apply the same sizing — the default ±5 unit orthographic
box on `DirectionalLight` is what makes 90% of tutorial shadows read as
"shadows are subtle" when the actual problem is "shadows are missing from most
of the frame". This is the specific failure the shortlist's shadow rigs avoid
by hand-sizing.

**If your practicals are all runtime shadow-casters, most of them shouldn't
be.** The eight ceiling practicals (`rooms/bridge.ts:582-589`) all
`castShadow = false` by default from `PointLight`, which is correct at the
default but worth defending because R3F tutorials often set it true reflexively.
For the rim and fill DirectionalLights specifically, keep `castShadow = false`
— the key alone should carry the shadow budget. The reference here is drei's
`AccumulativeShadows` pattern: bake what doesn't move, cast what does.

**If your tone mapping is `ACESFilmic`, keep it — but understand why the
three.js reference uses Reinhard.** The `webgpu_postprocessing_bloom.html`
example uses `ReinhardToneMapping` because it preserves highlight detail on a
scene where the bloom source is genuinely bright (the ion drive nozzle).
`ACESFilmic` compresses highlights harder, which flattens the ceiling
practicals against the LED strips at high intensities. For the Bridge, where
the LEDs are the intentional bright spot and the practicals are secondary,
ACESFilmic is defensible — but if the LEDs are ever bloomed hard and read as
white blobs rather than as glowing lines, the answer is a tone-mapping change,
not a bloom-radius change.

**If your ceiling practical placement is uniform, offset it.** The Bridge
places practicals on a `[-1.5, 1.5] × [-13, -8, -3, 3]` grid, which is a
regular 2×4. Regular grids are readable as "someone laid these out" rather
than as functional — a real bridge would have irregular practical placement
following where the crew stations actually are. Offset a few by ~0.4 units to
break the grid without breaking the coverage. Reference: `folio-2019`'s
`resources/3d/` .blend authoring where every prop position is hand-placed and
none of them fall on a grid.

**If your idle motion is "one thing rotates slowly", stop there.** The gas
giant at `y += delta * 0.02` is enough. The failure mode is when a second
element (say, the LED strips) starts pulsing, and a third (say, the video
screen) is playing at full framerate, and a fourth (the practicals) starts
flickering. The eye then has no anchor. `folio-2019` idles the car engine only;
`three-good-godrays` drifts particles only. One thing moves; everything else
stays.

**If you don't have a `Lightformer`-equivalent for the viewport frame, the
chrome doesn't know a viewport exists.** The chair post at `rooms/bridge.ts:514`
is `chromeMaterial` — presumably high metalness, low roughness. In a
sufficiently reflective material, that surface should be catching the
viewport's bright rectangle as a *reflected shape*, not just a general highlight.
The drei pattern (`src/core/Lightformer.tsx`) is a mesh with an emissive
material that reads in reflections but doesn't itself cast diffuse light. The
Bridge's viewport surround already has a bright frame authored (`hull` +
`strip` framing at `rooms/bridge.ts:346-369`); making that frame *emissive* at
low intensity would put a visible rectangle in the chair's chrome and would
close a small but noticeable "why can't I see the window in the reflection"
gap.

**If you don't have a `PerformanceMonitor` downshift, add one.** The Bridge's
`quality.ts` presumably ties tier to capability at load time
(`ShipCanvas.tsx:75` — `capability` prop). Drei's runtime
`PerformanceMonitor` measures actual FPS and downshifts DPR or effects when
the tier bet turns out wrong (integrated GPU on desktop, throttled tab,
battery-save mode). Add a runtime downshift path so a mis-classified `full`
tier can degrade to `medium` without a reload. Reference: `src/misc/PerformanceMonitor.tsx`.

**If you don't compress GLBs and textures, the shortlist codebase's asset
pipeline is the reference.** `folio-2025/scripts/compress` and the referenced
`gltf-transform.dev/cli` + `KTX-Software` toolchain is the current bar. Any
new asset added to the Bridge — outside skybox, gas giant texture, screen
video — should go through this before it hits `public/`. Bytes-on-the-wire is
a design decision measured in the hero research doc; keeping this discipline
is what stops the Bridge from ballooning as it grows.

---

## 5. `vx-3d-scene-composition` — skill draft

Ready to paste into the skill library.

```markdown
---
name: vx-3d-scene-composition
description: When composing a 3D scene in three.js or R3F, especially interior/cinematic work — apply the composition, lighting, material, and post-processing patterns that separate premium references from the tutorial long tail.
---

# vx-3d-scene-composition

Complements `vx-3d-asset-pipeline` (which handles GLB/KTX2/Draco) and
`vx-elite-design-research` (which handles the taste-of-references discipline).
This skill is the specific ruleset for the *scene* the assets go into.

Cite the source for each rule when you invoke it; the point is that these are
measured against real repos and not opinions.

## Rules

1. **Atmosphere is a system, not a lighting rig.** Light intensities, colours,
   fog, and exposure belong to an owned `atmosphere` state on the room, driven
   by beat name, not local constants. Ref: `brunosimon/folio-2025` readme
   game-loop steps 8–9.

2. **Emissive-buffer bloom, not luminance-threshold bloom.** MRT-emissive
   channel through `bloom()` at threshold 0. Threshold bloom blooms bright
   surfaces as hard as intentional LEDs and dates the shot immediately. Ref:
   three.js WebGPU pipeline; the vertex Bridge's `lib/ship/scene/post.ts`.

3. **Tone-map at the end of the post chain, not on the renderer.** With
   post-processing, set the renderer to `NoToneMapping` and add a
   `ToneMappingEffect` last. Otherwise colours clamp at the start of the
   pipeline and every effect is fighting a compressed range. Ref:
   `pmndrs/postprocessing` README, "Tone Mapping" section.

4. **Reinhard on scenes whose subject is bright; ACESFilmic on scenes whose
   subject is form.** Reinhard preserves highlight detail — right for the ion
   drive, right for LED strips against dark chrome. ACESFilmic compresses
   highlights — right for exterior daylight, wrong for a scene whose whole
   point is one bright thing. Ref: `mrdoob/three.js`
   `examples/webgpu_postprocessing_bloom.html`.

5. **DoF's `focalLength` is "how far past focus is fully out of focus", not a
   lens length.** Large value = gentle. Ref:
   `mrdoob/three.js/src/renderers/webgpu/nodes/display/DepthOfFieldNode.js`;
   documented in the vertex Bridge's `post.ts:135-158`.

6. **Godrays are the "outside is real" tell.** If your scene has a bright
   light source outside a dark interior — window, viewport, doorway — add
   volumetric evidence. Raymarched shadow-map sampling at density ~1/128, 40–60
   steps, colour tinted from the light. Ref: `Ameobea/three-good-godrays`
   README; Maxime Heckel "On Shaping Light" for the TSL-side authoring.

7. **Form described by specular, not by diffuse.** Dark albedo, high
   metalness, mid-low roughness. Bevels catch narrow highlights that describe
   geometry the diffuse value doesn't. Ref: the vertex Bridge's `palette.ts:53-70`
   which names the mechanism from the Blender VFX corridor reference.

8. **Bevel every corner. No exceptions.** A hard 90° corner in the silhouette
   reads as CAD. Ref: the vertex Bridge's `kit/shapes.ts` `bevelBox`, `bevelPanel`, `bevelFrame`.

9. **Never right angles in peripheral vision.** Two parallel side walls meeting
   a flat back wall put a hard corner in bottom-frame that no lighting
   undoes. Cut it with an octagon, curve, or cant. Ref: the vertex Bridge's
   `rooms/bridge.ts:1-32` design comment.

10. **Three planes of depth minimum.** Near occluder, mid-ground object, far
    bright plane. Empty floor between camera and back wall reads as miniature
    at scale. Ref: `rooms/bridge.ts:409-416` HELM comment; `folio-2019`'s dense
    section authoring.

11. **The ceiling is a surface, not a lid.** Vault, steps, or lit runs.
    A flat ceiling on a boxed interior reads as a set. Ref: the vertex
    Bridge's stepped-vault `rooms/bridge.ts:277-315`; every hallway in
    `Ameobea/three-good-godrays` demo.

12. **Fog on interiors — very subtle FogExp2, colour equal to the darkest
    palette value.** Density ~0.008. Reads as "there is air in this room"
    without looking foggy. Skip on `reduced-motion`. Ref: `folio-2025`
    weather system.

13. **Size the shadow camera to the room.** The default ±5 unit ortho box on
    `DirectionalLight` covers a fraction of the frame and reads as "shadows are
    subtle" when the problem is "shadows are missing from most of the frame".
    Ref: `rooms/bridge.ts:556-566`.

14. **AO before bloom in the pass order.** AO darkens the beauty pass;
    bloom then samples that. Reversed, the recesses bloom back out to the value
    AO just removed. Ref: `pmndrs/postprocessing` pass-ordering docs; the
    vertex Bridge's `post.ts:11-15` documents the same lesson.

15. **`Lightformer`-equivalent for any reflective surface in view.** A
    reflective material with no emissive rectangle placed to catch it reads
    unlit. Ref: `pmndrs/drei/src/core/Lightformer.tsx`.

16. **One thing moves. Everything else is still.** The eye needs an anchor. A
    second and third moving element make the scene read as a screensaver. Ref:
    `brunosimon/folio-2019` (car engine idle); the vertex Bridge's gas giant
    rotation `rooms/bridge.ts:603`.

17. **Practicals in irregular positions, not on a grid.** A regular grid reads
    as "someone laid these out"; irregular reads as functional. Ref:
    `folio-2019/resources/3d/` hand-placed prop authoring.

18. **Runtime performance downshift.** Load-time capability tier can be wrong.
    Measure FPS in flight and downshift DPR or effects when the bet fails.
    Ref: `pmndrs/drei/src/misc/PerformanceMonitor.tsx`.

19. **Bake shadows that don't move; cast shadows that do.** Progressive shadow
    accumulation for static geometry — key light gets the runtime shadow
    budget. Ref: `pmndrs/drei/src/core/AccumulativeShadows.tsx`.

20. **Asset budget belongs in the pipeline, not in the review.** Every GLB
    through Draco; every texture through KTX2 (`etc1s --quality 255` for
    non-normal-map lossy). Run before publish, not after. Ref:
    `brunosimon/folio-2025/scripts/compress` and
    `github.com/KhronosGroup/KTX-Software`.

## When to apply

- New 3D scene from scratch — apply 1–20 as the design bar
- Existing scene reads flat / generic / "tutorial" — audit against 1, 2, 5, 6, 10, 15
- Existing scene reads noisy — audit against 4, 6, 14, 16
- Existing scene slow — audit against 13, 18, 19, 20

## When NOT to apply

- Data-viz 3D (nodes and edges) — the composition rules assume physical
  interior semantics
- Product configurator on white — most of the atmospheric rules invert; use
  `Environment` + `ContactShadows` from drei
- Anything that runs in an XR headset — stereo view breaks several of the
  monoscopic composition heuristics (parallax already provided by binocular
  depth; DoF actively wrong)
```

---

## Sources

- [mrdoob/three.js](https://github.com/mrdoob/three.js) — 115k stars, r185 (2026-07-01)
- [pmndrs/drei](https://github.com/pmndrs/drei) — 9.7k stars, v10.7.7 (2025-11-13)
- [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) — 2.8k stars, 3,149 commits
- [brunosimon/folio-2025](https://github.com/brunosimon/folio-2025) — 1.5k stars, 930 commits
- [brunosimon/folio-2019](https://github.com/brunosimon/folio-2019) — 4.7k stars, 258 commits
- [Ameobea/three-good-godrays](https://github.com/Ameobea/three-good-godrays) — 225 stars
- [MaximeHeckel/blog.maximeheckel.com](https://github.com/MaximeHeckel/blog.maximeheckel.com) — 728 stars
- [wass08/r3f-webgpu-starter](https://github.com/wass08/r3f-webgpu-starter) — 23 stars
- [Three.js WebGPU bloom example live source](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_postprocessing_bloom.html)
- [Ameobea three-good-godrays live demo](https://three-good-godrays.ameo.design/)
