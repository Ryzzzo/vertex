# Vertex multi-room ship — phased build plan

Drafted 2026-08-19. Research and architecture only; no code written, nothing installed,
nothing committed beyond this file.

Sources read in full before drafting: `docs/capability-stack-research.md` (1,390 lines),
`docs/skill-update-drafts/vx-elite-design-research-v1.4.md`,
`docs/skill-update-drafts/vx-3d-asset-pipeline-v1.0.md`, the installed
`vx-elite-design-research` v1.3.0 skill including `performance.md`, `techniques.md` and
`capabilities.md`, the working tree, and the `vx/ship-hero-v3` branch in full.

Provenance convention follows the skill. `Measured:` came off a machine or a registry on the
date shown. `Primary:` is the vendor's own documentation. `Estimate:` is arithmetic and is
labelled as such. Every figure carries the parameter that produced it.

---

## 0. Read this first — four things that change the brief

### 0.1 There is already a ship bridge in this repo, and it works

`vx/ship-hero-v3` (commit `afd5d4f`) is 13,928 lines across 32 files, unmerged, and it contains
a built and debugged bridge interior: `components/v3/ship-parts.ts` (1,134 lines),
`ship-layout.ts`, `palette.ts`, `environment.ts`, `volumetric-fog.ts` (647 lines), plus
`docs/ship-hero-decisions.md` (439 lines) which is one of the more useful documents in the repo
because it is mostly a list of things that were wrong and what they looked like on screen.

That branch also carries `scripts/capture-ship.mjs` — a Playwright harness that drives real
Chromium through ANGLE/D3D11 and looks at actual pixels, with a JSON report covering render
path per width, horizontal-overflow, console errors, and whether the reduced-motion path
requested three.js at all.

**That harness closes the standing verification gap and it must be ported before any scene
code is written.** The in-app browser pane does not composite, so `requestAnimationFrame` never
fires there and a screenshot is a screenshot of nothing. This is already solved in this repo;
re-learning it would be paying twice.

What ports, what does not:

| From `vx/ship-hero-v3` | Verdict |
|---|---|
| `scripts/capture-ship.mjs` | **Port first**, generalise to N rooms. Highest-value single file on that branch |
| `palette.ts` — hex + linear triples + CSS var emission, with measured contrast ratios | **Port whole.** Renderer-agnostic. The `dust`/`dim` split exists because 3.54:1 shipped once |
| `ship-parts.ts`, `ship-layout.ts` — BufferGeometry construction | **Port as the kit seed.** Geometry is renderer-agnostic; only the materials change |
| The DOM-button interaction model (§8 of the decisions doc) | **Port as doctrine.** Real `<button>`s drive scene uniforms; the mesh reacts to a number |
| `narrative.ts`, `ship-score.ts` — scroll spine, GSAP timeline | **Discard.** The whole scroll architecture goes away with teleport nav |
| `volumetric-fog.ts` — raw GLSL custom Pass on pmndrs `postprocessing` | **Discard, rewrite in TSL.** See §1.3 |
| `cannon-es`, `gsap`, `lenis`, `postprocessing` | **Do not install.** None survives the pivot |

### 0.2 The three.js generators only exist on the WebGPU build

This settles the renderer question with a measurement rather than a preference.

```
Measured: unpkg.com/three@0.185.1 · 2026-08-19
  examples/jsm/generators/CityGenerator.js       imports from 'three/webgpu' and 'three/tsl'
  examples/jsm/generators/TreeGenerator.js       imports from 'three/webgpu' and 'three/tsl'
  examples/jsm/objects/SkyMesh.js                imports from 'three/tsl'
  examples/jsm/tsl/display/BloomNode.js          imports from 'three/webgpu' and 'three/tsl'
```

`CityGenerator` and `TreeGenerator` return `MeshStandardNodeMaterial`. They **cannot** be used
with `WebGLRenderer`. The procedural direction and the WebGPU renderer are not two decisions —
they are one decision, already made by choosing the direction.

The corollary is the good news: because every addon on this path imports from `three/webgpu`
and `three/tsl` exclusively, there is **no dual-instance risk**. A build that imports app code
from `'three/webgpu'` and addons from `'three/addons/*'` gets one copy of three, not two.

The r185 addon surface is also larger than the capability research recorded. Confirmed present
in `0.185.1` and not named in that document:

```
Measured: unpkg.com/three@0.185.1/?meta · 2026-08-19
  examples/jsm/generators/   TerrainGenerator · ForestGenerator · SkyscraperGenerator · SidewalkGenerator
  examples/jsm/tsl/display/  GodraysNode · DepthOfFieldNode · ChromaticAberrationNode · FilmNode
                             GTAONode · SSRNode · SSGINode · TRAANode · SMAANode · FXAANode
                             LensflareNode · TransitionNode · GaussianBlurNode · BloomNode
  examples/jsm/tsl/lighting/ ClusteredLightsNode · DynamicLightsNode
  examples/jsm/tsl/utils/    Raymarching.js
  examples/jsm/tsl/math/     curlNoise · RNoise · Bayer
  examples/jsm/capabilities/ WebGPU.js
  examples/jsm/inspector/    Inspector.js + extensions/tsl-graph/TSLGraphEditor.js
```

Two of those matter enough to name. **`GodraysNode`** is the light-shaft effect `v3` hand-rolled
as a 647-line raymarch — it now ships as a TSL node. **`TSLGraphEditor`** partially answers the
capability research's "TSL has no dedicated tooling" finding; three ships a TSL graph inspector
in the box. Neither is confirmed working until run — both are Phase 0 spike targets, not
assumptions.

### 0.3 The WebGPU bundle delta, measured at the build level

```
Measured: unpkg.com/three@0.185.1 file sizes, minified, not gzipped · 2026-08-19
  build/three.module.min.js        365,552 bytes    (WebGL)
  build/three.webgpu.min.js        667,861 bytes    (WebGPU + node system)
  build/three.tsl.min.js            23,676 bytes
  delta                           +302,309 bytes    — the WebGPU build is 1.83× the WebGL build
```

Those are whole-build figures, not tree-shaken app bundles, so they are an upper bound on the
ratio rather than a bundle prediction. Against them, the two figures we do have for real
bundles:

> Repro: `lab/bundle-cost`, esbuild minify + gzip -9, React externalised · 2026-08-15 ·
> three 0.185.1 WebGL build, minimal scene — **128.4 KB gz**
> Measured: `vx/ship-hero-v3` Next production build · 2026-08-18 — three + `postprocessing` +
> gsap + 16.8 KB of scene code = **242.2 KB gz** for the whole WebGL path

**Estimate: 200–260 KB gz for a tree-shaken WebGPU path.** That is 128.4 × 1.83 with a haircut
for tree-shaking, and it is arithmetic, not a measurement. It is the first thing Phase 0
measures and it carries an abort condition (§7.2).

### 0.4 The two audit warnings currently in the tree

`npm run audit-repo` flagged two heuristics on session start, both pre-existing:

- **Focus visible** — one file suppresses `outline` with no focus replacement in the same file.
  Worth a real look; a missing focus indicator is a WCAG 2.4.7 exposure, and the ship HUD is
  about to become the primary keyboard surface on the site.
- **WCAG 1.4.3 runtime-configurable colour** — one colour defined in component code fails 4.5:1
  against a fixed surface. This is very likely the known `ops-table` token-collision false
  positive: the auditor's token map is global with first-definition-wins, so a site-scope token
  gets cross-paired with a surface token defined inside an embedded lab.

Neither blocks this work. **Do you want the focus-visible one checked before Phase 0, or after
the Bridge lands?** It is about twenty minutes either way, and it touches the same non-negotiable
the HUD has to satisfy — so there is a mild argument for doing it first.

---

## 1. Tech stack decisions

### 1.1 Install — the whole list

| Package | Version (measured 2026-08-19) | Why |
|---|---|---|
| `three` | `0.185.1`, published 2026-07-01 | The renderer, the node system, the generators, the TSL post nodes. Imported as `three/webgpu` and `three/tsl` |
| `@types/three` | `0.185.4`, published 2026-08-04 | TS strict is on. Non-optional |

That is the entire runtime dependency addition. Two packages.

Dev-only, `--no-save`, never a dependency of the project:

| Tool | Form | Why |
|---|---|---|
| `playwright` | `npm install --no-save`, run from `scripts/` | The capture harness. It is a verification tool, not a shipped one — `vx/ship-hero-v3` established this convention and it is right |
| `source-map-explorer` | `npx`, no install | One-shot bundle measurement in Phase 0 |

### 1.2 Deferred, with the condition that flips each one

| Deferred | Condition that flips it |
|---|---|
| `@react-three/fiber` | React state needs to drive the scene *graph* rather than scene *uniforms*. See §1.4 — I do not expect this to flip |
| `@react-three/drei` | Only after R3F. And drei's README documents no WebGPU/TSL support, so most of what it sells is unusable on this path anyway |
| `three-mesh-bvh` | **Phase 1b.** Needed the moment anything is picked by raycast against detailed geometry — Portfolio Bay panels. Room 1 has no raycasting by design (§1.5). Five-minute install, `v0.9.14`, MIT, 3.4M downloads/week |
| `@react-three/uikit` | Only if in-world WebGL panels beat DOM panels for a specific room. Requires R3F, so it inherits that decision. Licence is cleared — two stacked MIT grants, read 2026-08-18 |
| `@react-three/rapier` / `@dimforge/rapier3d-compat` | Something falls, tips, rolls or is driven. A static interior with teleport nav has no dynamics. ~500 KB of WASM on the critical path for nothing |
| `ecctrl` | Only with a walking character, which the approved architecture explicitly rules out |
| `postprocessing` / `@react-three/postprocessing` | Never on this path. Both are WebGL-era; three's node post-processing is the WebGPU equivalent and ships in the dependency |
| `gsap`, `lenis` | The scroll spine is gone. Room transitions are short, authored, and driven by one interpolator — not a timeline library |
| `simplex-noise` | Only if CPU-side noise is needed for layout seeds. TSL ships `mx_noise_float`, `mx_fractal_noise_float`, `curlNoise` and `RNoise` |
| ElevenLabs MCP / a sound layer | **Phase 1e**, and it is the single cheapest tier upgrade available. RESN ships six shader programs and 7,619 KB of mp3, measured — the machine-like read there is carried by audio. Gated behind an explicit unmute control, always |
| Blender MCP, Meshy, Poly Haven models | Backup only, for a hero object procedural code genuinely cannot express. Not expected in rooms 1–5 |

### 1.3 The shader path

**`WebGPURenderer` unconditionally. TSL exclusively. No raw GLSL anywhere in the build.**

`WebGPURenderer` uses the WebGPU backend where available and silently falls back to a WebGL2
backend where it is not. It is not a WebGPU-only choice — it *is* the WebGL2 path. Application
code never branches on backend.

The rule that prevents the expensive failure, stated as a hard constraint on every room:

> **Compute shaders and storage buffers silently do nothing on the WebGL2 fallback.** No error,
> no warning. The page renders, minus whatever that pass contributed.

So: **nothing load-bearing lives in a compute shader.** Not in Room 1, not in Room 5. If a
future room genuinely needs one, it ships with a non-compute path that has been tested by
forcing the WebGL2 backend. And forcing that backend is routine from day one, not a pre-launch
check — the development machine is an RTX 5060 on Chrome and will never surface the fallback
by accident.

Room 1's fog is a **depth-driven scattering composite**, not a raymarch: render the scene,
blur it, mix blurred over sharp by fog density. That is the `webgpu_custom_fog_scattering`
technique, ~190 lines in the reference example, and the capability research calls it the highest
fidelity-per-effort technique in the entire pass. `v3` shipped a 647-line raymarched volumetric
to reach a comparable read; the composite is cheaper *and* it is what the reference examples
actually do.

`GodraysNode` is held in reserve. If the Bridge frame reads flat without light shafts from the
practicals, it is one node in the post chain rather than a rewrite. That is a Phase 1a stretch
item, explicitly not a Phase 1a requirement.

### 1.4 Why no React Three Fiber — the pushback

The brief lists `@react-three/fiber` and `@react-three/drei` among the packages to install. I
think that is wrong for this build, and the reasoning is worth stating properly because it is
the largest cost decision in the plan.

**What it costs.**

> Measured: esbuild, minify + gzip -9, React externalised · 2026-08-15
> `@react-three/fiber` on top of three — **+85.5 KB gz** · `drei`, five common helpers —
> **+25.2 KB gz**

That is ~111 KB gz, against an estimated 200–260 KB gz shell. It is a 45% increase on the
heaviest thing the site downloads.

**What it would buy, and why it does not buy it here.** The standard argument for R3F on a
multi-room build is that the reconciler manages scene-graph lifecycle, so room mount and unmount
— and therefore disposal, the single most-named architectural failure mode — comes for free.

That argument does not survive contact with a procedural build. `CityGenerator` returns a plain
`THREE.Group`. `TreeGenerator` bakes to a single `BufferGeometry`. Procedural geometry arrives
as an opaque object dropped in via `<primitive>`, which R3F's reconciler does **not** manage or
dispose. On this path we would hand-write disposal anyway, and pay 85.5 KB for the ergonomics
of not having to.

The second half of the argument is that React state drives the scene. It does — but it drives
**uniforms**, not graph structure. `v3` solved this with a twelve-channel state object written
from the DOM, and its own decisions doc calls it "the cheapest thing in the build to recommend."
A group plus an update closure is fifteen lines and zero kilobytes.

And drei, the third of it, documents no WebGPU or TSL support at all. Its staging components are
WebGL-era `ShaderMaterial` abstractions. Buying it means buying a spot-check obligation on every
component used.

**The tradeoff you would push back on:** raw three means writing the room lifecycle by hand, and
hand-written lifecycle is where disposal bugs live. My answer is that the disposal check becomes
a **build gate** rather than a hope — `renderer.info.memory.geometries` and `.textures` must
return to baseline after leaving every room, asserted in the capture harness, not eyeballed. A
leak caught by an assertion costs minutes; one caught by a visitor costs the build. That gate is
required on the R3F path too, so it is not extra work — it is the same work, minus 111 KB.

If you want R3F anyway, say so and I will build it that way; the geometry, palette, room
registry, navigation model and accessibility story all survive the swap unchanged. But I would
be spending your bundle on ergonomics the procedural path does not exercise.

### 1.5 Room 1 has no raycasting

Interactive elements in the Bridge are real DOM controls in the HUD and in the room's copy —
`<button>` and `<a>` — which drive named uniforms. The mesh reacts to a number.

This is `v3`'s §8 decision and its own author calls it "the decision I would most strongly defend
against a *but the interaction should be on the object* note." A 3D object has no accessible
name, no focus ring and no keyboard path. A button has all three for free.

It also means `three-mesh-bvh` is genuinely not needed until Portfolio Bay, where clicking a
panel in the scene is the natural gesture. Deferred, not skipped.

---

## 2. File structure

```
app/
  layout.tsx                       unchanged — fonts, metadata, Assistant
  page.tsx                         unchanged in Phase 1a — the existing landing page
  labs/                            unchanged
  ship/
    layout.tsx                     PERSISTENT SHELL. Mounts the canvas + HUD once.
                                   Survives every /ship/* navigation — this is the
                                   whole architecture in one file
    page.tsx                       redirect() → /ship/bridge
    [room]/
      page.tsx                     Server Component per room: <h1>, prose, room content,
                                   the SVG fallback drawing. generateStaticParams() and
                                   generateMetadata() read lib/ship/rooms.ts
      opengraph-image.tsx          per-room OG card — rooms are shareable, so they need one

components/
  ship/
    ShipShell.tsx                  'use client' — capability gate, canvas host, boot state
    ShipCanvas.tsx                 'use client' — owns SceneManager, reads usePathname()
    Hud.tsx                        the ship computer. A real <nav>. DOM, always
    RoomTile.tsx                   one room in the HUD: live / current / sealed
    BootSequence.tsx               first-visit arrival choreography + onboarding hint
    RoomFallback.tsx               Tier C — per-room SVG drawing, zero WebGL
    TransitionVeil.tsx             the warp overlay (DOM + canvas, cross-faded)
    controls/                      DOM controls that write scene uniforms

lib/
  ship/
    rooms.ts                       THE REGISTRY. slug, title, blurb, status, seed,
                                   generation params, adjacency, a11y summary.
                                   Read by the router, the HUD, the scene and the sitemap
    palette.ts                     ported from v3 — hex, linear triples, CSS var emission,
                                   measured contrast ratios in the header comment
    scene/
      SceneManager.ts              one renderer, one scene, one loop. mount/unmount rooms
      RoomModule.ts                the contract: { group, update(dt, state), dispose() }
      capability.ts                WebGPU / WebGL2 / none. Honours ?gl=webgl2 override
      quality.ts                   two named tiers from day one, not retrofitted
      disposal.ts                  traverse + dispose + renderer.info baseline assertions
      state.ts                     the named uniform channel object (v3's §4 pattern)
      loop.ts                      rAF, dpr cap, visibility pause, reduced-motion abort
    rooms/
      bridge.ts                    Room 1 — the only one in Phase 1a
    kit/                           the instanced kit-of-parts. Rooms are placements, not models
      rib.ts  panel.ts  conduit.ts  console.ts  strut.ts  light.ts
      instancing.ts                InstancedMesh helpers + transform reference tables
      materials.ts                 TSL node materials, shared across the kit
    shaders/
      panelGrid.ts                 TSL procedural surface detail from a layout description
      scatterFog.ts                TSL depth-driven scattering composite
      nebula.ts                    TSL gas giant / nebula for the Bridge viewport
      post.ts                      the node post chain: pass() → bloom() → grade

scripts/
  capture-ship.mjs                 ported from vx/ship-hero-v3, generalised to N rooms
  measure-bundle.mjs               source-map-explorer wrapper, prints the gz table
```

Two conventions that carry the architecture:

**`lib/ship/rooms.ts` is the single source of truth.** The router generates its static params
from it, the HUD renders from it, the scene looks up its module from it, `sitemap.ts` reads it,
and every room's metadata comes from it. Adding room 6 is one object literal plus one module
file.

**Seeds and generation parameters are committed as data, in the registry.** A room's look is a
seed plus parameters, which makes it reproducible, diffable and art-directable without touching
geometry. Changing the Bridge's rib spacing should be a one-line diff you can read in a PR.

---

## 3. Room-by-room scope

Effort figures are CC-days at a quality that survives comparison with the measured reference
set. They assume Phase 0 is done and the kit exists — which is why Room 1 is expensive and
rooms 3–5 are not.

### Room 1 — Bridge · `/ship/bridge` · **Phase 1a · 5–8 days**

**What the visitor sees.** They arrive into a dark bridge. The ship computer boots: consoles
come up in sequence, LED runs light along the ribs, and the viewport shutter opens onto a gas
giant with a nebula behind it. The room is a receding interior — ribs and conduit running away
from the lens into scattering haze — with the viewport as the one bright thing in frame. The HUD
resolves last, as the ship computer's own interface.

**Techniques.** TSL `MeshStandardNodeMaterial` throughout. Procedural panel-grid surface detail
derived from the room layout — the `createBuildingMaterial` / `createRoadMaterial` technique
from the city example, which is exactly what deck plating, conduit runs and hazard striping
want, and ships zero bytes of texture. `SkyMesh` → `PMREMGenerator` for the environment, so
there is no HDRI download. Depth-driven scattering composite for the fog. Node `bloom()` on the
practicals. The gas giant is a TSL fragment on a screen-space quad behind the viewport, banded
with `mx_fractal_noise_float`, not a texture.

**Interactive elements.** The viewport is draggable — `cursor: grab`, drag swings the ship's
attitude and the gas giant tracks. Auto-drift idles underneath and yields to input, then
resumes. Five console readouts respond to hover/focus on the corresponding DOM copy. The HUD
lists all five rooms; four are sealed in Phase 1a and say so plainly.

**Data source.** `lib/ship/rooms.ts` for the registry, `lib/content.ts` for nothing yet.

**Signature moment.** See §5. The boot reveal plus the draggable viewport.

**Why it is the expensive one.** It builds the kit, the SceneManager, the disposal gate, the
capability gate, the HUD, the fallback tier and the capture harness integration. Rooms 2–5
inherit all of it.

### Room 2 — Portfolio Bay · `/ship/portfolio` · **Phase 1b · 5–7 days**

**What the visitor sees.** A long bay, ribs continuing the Bridge's vocabulary, with the work
mounted as lit panels along both walls receding into haze. Selecting one brings it forward; the
bay dims around it.

**Techniques.** Kit reuse — same ribs, same conduit, same panel-grid material, different
placement table. The panels are the first case for **instancing with a transform reference
table**: one panel mesh, N placements, which is the technique that lets Bruno ship an entire
explorable world in 974 KB across 23 files (measured, dump dated 2026-08-17). The project
screenshots already in `public/work/` become the panel faces — they are AVIF at 36–276 KB and
already optimised.

**Interactive elements.** This is where `three-mesh-bvh` enters, for hover raycast against the
panel array. Every panel also has a DOM equivalent in a real list, so the keyboard path lights
the panels too.

**Data source.** `lib/content.ts` → `work: WorkItem[]`, unchanged. Six items today
(ConsultBase, Parenting Plan Pro, Civic Strategy Partners, Revoix, FM24, Villa L'Estagne). The
existing `featured` flag maps to a hero placement in the bay.

**This is also where the real warp lands** — the first room-to-room transition with a
destination. See §5.

### Room 3 — Labs Bay · `/ship/labs` · **Phase 1d · 5–8 days**

**What the visitor sees.** A workshop compartment with three or four sub-stations, each an
embedded lab. Denser and more cluttered than the Bridge on purpose — the Bridge argues
precision, this one argues work in progress.

**Techniques.** Kit reuse plus one new sub-kit (benches, racks, cable runs). The sub-station
screens are the first case for real content inside the scene, and the answer is the same as
everywhere else: **the labs are DOM, presented in a room, not textures on a mesh.**

**Data source.** `lib/content.ts` → `labs: LabItem[]`. Three items today: Ops Queue Triage,
Fee Engine, NC Housing Terminal.

**Integration mechanism, and it already exists.** `app/labs/ops-table/page.tsx:107` embeds a
static export via `<iframe src="/labs/ops-table/index.html">`, with the whole exported Next
build sitting under `public/labs/ops-table/`. That is the working precedent — no rewrite, no
edge config, no cross-origin. The Query Terminal / SQL game (`docs/sql-game-concepts.md`,
Concept A "Daily Query") slots into the same pattern when it exists. **It does not exist yet**,
so Labs Bay ships with the three current labs and a fourth station left dark.

### Room 4 — Engineering · `/ship/engineering` · **Phase 1c · 2–3 days**

**What the visitor sees.** The engine room. The about section, in fiction. Heavier structure,
warmer light, the reactor as the one bright object — the counterpart to the Bridge's viewport,
so the two bookend the ship.

**Techniques.** Kit reuse, one hero object (the reactor core), warmer palette branch of the
same source. Almost entirely a placement and lighting exercise, which is why it is cheap.

**Data source.** New prose. This is a writing task more than a build task.

### Room 5 — Comms · `/ship/comms` · **Phase 1c · 2–3 days**

**What the visitor sees.** A small compartment, one terminal, the contact form as the ship's
outbound channel.

**Techniques.** The cheapest room. Kit reuse, tight camera, one console. Most of the frame is
the form, which is DOM.

**Data source.** `lib/content.ts` → `affordances` (email, LinkedIn, Upwork, GitHub) plus the
existing `components/Contact.tsx` copy. The form itself is DOM with a server action — a form in
WebGL would be an accessibility failure with extra steps.

**Room ordering rationale.** Portfolio Bay is second because it carries the commercial argument
and because it forces the warp transition to be real. Engineering and Comms are third and fourth
because they are cheap and they complete the ship — a five-room ship with two sealed doors reads
as unfinished in a way a five-room ship with five open doors does not. Labs Bay is last because
it has the most moving parts and the one dependency that does not exist yet.

---

## 4. Deep-link architecture

### 4.1 One canvas, above the router

**Never a `<Canvas>` per route.** Browsers cap live WebGL contexts, commonly around 16, and
recreating the renderer on navigation leaks them unless explicitly released. The failure presents
as "context lost" several rooms in — after the build looks finished, which is the worst possible
time to find it.

The architecture is: **persistent canvas mounted in `app/ship/layout.tsx`, route-driven scene
swap.** Next App Router preserves a layout across navigation between its child segments, so
`app/ship/layout.tsx` mounts `<ShipShell>` once and `app/ship/[room]/page.tsx` swaps beneath it.
One GL context for the whole ship, real shareable URLs per room.

This is not theoretical. basement.studio runs `three` + `next` with per-route 3D splitting in
production — home ships 31 3D files / 2,909 KB, `/showcase` ships 49 / 5,605 KB, with shared
models across both and content-hashed filenames. It is the existence proof on this exact stack.

> Measured: `docs/whole-page-narrative-refs/basement-studio.json` · dump dated 2026-08-17

### 4.2 How a navigation actually runs

```
1. Visitor clicks a HUD tile → next/link navigation to /ship/portfolio
2. ShipCanvas reads usePathname(), sees the room changed
3. TransitionVeil begins: warp charge, ~600ms, one easing curve
4. SceneManager.unmount('bridge')
     → bridge.dispose(): traverse subtree, geometry.dispose(),
       material.dispose(), every texture.dispose()
     → assert renderer.info.memory returned to baseline
5. SceneManager.mount('portfolio')  — module already warmed by adjacency preload
6. Camera settles into the new room's rest pose. Veil clears.
7. React renders the new page's DOM beneath: <h1>, prose, panel list
```

Steps 4 and 5 never call `renderer.dispose()`. That is only correct when the canvas itself is
going away — leaving `/ship/*` entirely.

**Disposal is a build gate, not a convention.** `renderer.info.memory.geometries`, `.textures`
and `.programs` must return to baseline after leaving every room. The capture harness asserts
it by walking the full room graph and reading the counters. If it does not return to baseline,
the build fails.

### 4.3 Adjacency preloading

Room modules are code, not assets, so preloading is a dynamic `import()` rather than a fetch —
which makes it cheap and cancellable. On entering room N, warm N±1 and dispose N±2. Resident
memory stays flat regardless of how large the ship gets. With five rooms this is nearly
academic; the discipline exists so that room nine does not require an architecture change.

### 4.4 What lives in the shared shell

| In the shell (mounted once, survives navigation) | Per room |
|---|---|
| The `<canvas>` and `WebGPURenderer` | The room module — geometry, materials, lights |
| `SceneManager`, the rAF loop, the post chain | The room's placement table and seed |
| The HUD / ship computer nav | The room's DOM content, `<h1>`, prose |
| The capability gate and quality tier | The room's SVG fallback drawing |
| The palette and CSS custom properties | The room's OG image |
| The unmute control (Phase 1e) | The room's uniform channel writes |

The existing `<Assistant />` stays in the root layout and therefore appears on ship routes too.
That needs a look in Phase 1a — an assistant bubble floating over a ship bridge may be right or
may be noise. Flagging it now rather than discovering it in a screenshot.

### 4.5 Routing details worth deciding now

- `app/ship/[room]/page.tsx` with `generateStaticParams()` from the registry. Every room is
  statically generated — no dynamic rendering, no TTFB cost, and `bfcache` stays eligible.
- `app/ship/page.tsx` redirects to `/ship/bridge`. Arriving at the ship without a room means
  arriving at the Bridge, which is the arrival room by design.
- Deep-linking straight to `/ship/comms` with no prior state must work completely — full boot,
  full HUD, no assumption that the Bridge ran first. This is a test case, not a hope.
- `sitemap.ts` reads the registry so rooms are indexable. Each room page carries real prose, so
  there is something to index.
- **The landing page at `/` is untouched through Phase 1a–1d.** The ship lives at `/ship/*` and
  the live site never breaks while it is built. Whether `/` becomes the Bridge is a Phase 1e
  decision made against a real artifact rather than a plan.

---

## 5. First-visit onboarding and the signature moment

### 5.1 The problem, stated honestly

This is where explorable builds most often fail: the wow exists, and it is behind three minutes
of exploration. A visitor who leaves before reaching it experienced a site with no signature
moment at all. **If the concept requires exploration, the first room is the hero.** Depth is a
reward for engagement, never a toll on it.

So the Bridge cannot be a lobby. It has to be the best room.

### 5.2 The arrival beat — cold boot

The visitor lands in a dark bridge and the ship computer brings it up. Consoles come alive in
sequence, LED runs travel along the ribs, the viewport shutter opens onto the gas giant, and the
HUD resolves last. Roughly 2.5 seconds, on the site's one easing curve
(`cubic-bezier(0.32, 0.72, 0, 1)` — measured as the only easing curve on linear.app, 2026-08-05,
and already the value of `--easing-linear` in `app/globals.css`).

**Why an assembly sequence and not something flashier.** The technique has to argue what the
copy argues. Assembly sequences argue *this was made deliberately*. Particles argue
ephemerality, which is the metaphor error a previous attempt on this site already paid for. The
site's thesis is that one person carries a project end to end and it survives them — permanence
and deliberate construction. A room that assembles itself in front of you argues exactly that.

The boot runs **once per session**, stored in `sessionStorage`. Returning to the Bridge from
another room resolves in ~400ms instead. A three-second reveal is a moment the first time and a
tax the fourth.

### 5.3 The signature moment in Phase 1a — the viewport

`cursor: grab` on the viewport. Dragging swings the ship's attitude; the gas giant and the
nebula track, the light on the console faces moves with it, the fog density shifts as the
scattering angle changes. Auto-drift idles underneath and yields to input, then resumes.

Interactivity beats animation, and one thing the visitor can grab and perturb reads as an
instrument where any amount of autoplay reads as wallpaper. It is reachable in the first few
seconds, it is discoverable purely from the cursor change, and it costs almost nothing because
the scene already exists.

Keyboard equivalent: the viewport is focusable and arrow keys nudge attitude, with a visible
focus indicator. Not an afterthought — it is the same uniform either way.

### 5.4 The warp — the moment that recurs, landing in Phase 1b

The teleport itself should be the site's signature moment, because it is the mechanic the whole
concept is built on and because a moment that recurs teaches navigation while it impresses.

**But it needs a destination, and Phase 1a has none.** `vx/ship-hero-v3`'s own self-assessment
named precisely this failure: *"the launch is the beat everything is built to earn and it is
currently a flash and a scene swap. It is the correct edit with nothing in the frame."* Do not
repeat that. A warp to a sealed door is a tease, and a tease is worse than a closed door.

So in Phase 1a, sealed rooms are **plainly sealed** — the HUD tile is disabled, labelled, and
says when it opens. No charge-and-abort theatre. The warp gets built properly in Phase 1b when
Portfolio Bay exists to arrive at, and it gets built with something in the frame.

### 5.5 Onboarding — no modal, no tour

The HUD is the onboarding. It is a persistent ship-computer panel listing all five compartments
with the current one marked, and a menu does not need explaining.

Three supports, all cheap:

- After the boot completes, the HUD's room list runs a staggered reveal — ~0.11s apart, on the
  one curve. The eye goes there because it is the last thing that moves.
- The Bridge's own copy names the mechanic in one line of prose, in the DOM, where a screen
  reader gets it too.
- Tab from page load reaches the HUD immediately, after a skip link. The keyboard path is not a
  fallback; it is the same path.

No overlay, no coach marks, no "click here to explore". If the interface needs a tutorial, the
interface is the problem.

---

## 6. Mobile

Teleport navigation is friendly to touch — it is DOM links, and there is no twin-stick camera to
be bad at. The question is whether each room renders on a phone, and the honest answer is
*probably, and it gets measured rather than assumed.*

### 6.1 What degrades

| | Desktop, WebGPU | Mobile |
|---|---|---|
| dpr | capped 1.75 | capped 1.5 |
| Lights | full practical set, `ClusteredLightsNode` | reduced set, key + rim + viewport |
| Post chain | scatter composite + bloom + grade | bloom + grade only; composite at half resolution |
| Instanced kit | full placement table | reduced counts from the same table, one parameter |
| Boot sequence | full 2.5s | full — it is animation, not geometry, and it costs nothing |
| Draggable viewport | pointer | touch, with the same uniform |
| HUD | side panel | bottom bar, expanding to a sheet |

Everything in that table is one value in `lib/ship/scene/quality.ts`. **Two named tiers exist
from day one** — retrofitting LOD costs far more than designing for it, and both measured
reference studios ship explicit tiers (`Quality.js` on bruno-simon.com, `ultralow` in Immersive
Garden's filenames).

### 6.2 What does not degrade

The room's content. Every room's copy, headings, links, project list and contact form are real
DOM at every width and every tier. A visitor on a phone with no WebGL gets the whole site,
correctly laid out, and misses only the environment.

### 6.3 The honest uncertainty

`vx/ship-hero-v3` shipped **drawing-only at 375px** — the canvas never ran on a phone. That was
the right call there, because a raymarched volumetric plus a depth-of-field gather is not a phone
workload. The scatter composite is materially cheaper, so mobile Tier B should be viable.

**Should is not measured.** The plan is: target Tier B on mobile, measure on a throttled profile,
and fall back to Tier C on measured failure — not on a guess in either direction. If the number
comes back bad, the fallback already exists and shipping it costs nothing.

### 6.4 The 320px rule

No horizontal scrolling at 320px width. The HUD collapses rather than scrolls. The canvas is
`position: fixed` behind content and never contributes to document width — which is also what
makes the `scrollWidth === clientWidth` assertion in the capture harness meaningful.

---

## 7. Performance budget

### 7.1 Core Web Vitals — the gate

| Metric | Target | Notes |
|---|---|---|
| **LCP** | ≤ 2.5s | At p75 of real users, segmented mobile and desktop |
| **INP** | ≤ 200ms | Lighthouse cannot measure this — it reports TBT instead. Field data required |
| **CLS** | ≤ 0.1 | The canvas must never contribute a shift; it is fixed and behind |

> Source: web.dev, "Web Vitals" · read 2026-08-05 · decay: 1y

**The load-bearing decision: the LCP element is never the canvas.** It is the room's `<h1>` and
its SVG fallback drawing, both in the HTML source, both server-rendered, both painted before a
single byte of `three.webgpu.js` is requested. The WebGPU boot happens after LCP has already
been recorded.

That is not a trick — it is the fallback-as-first-frame rule doing its job. The SVG drawing *is*
the opening scene, not a degraded copy, so the visitor sees the correct frame immediately and
capable clients watch it come to life.

Nearly all of a bad LCP is the browser not knowing the element exists yet — under 10% of p75 LCP
time on poor-LCP origins is spent actually downloading. Putting the LCP element in the HTML is
the whole fix.

### 7.2 Bundle

| | Target | Basis |
|---|---|---|
| Shell — `three/webgpu` + TSL + SceneManager + HUD | **≤ 300 KB gz** | Estimate 200–260 KB gz from §0.3. Measured in Phase 0 |
| Per-room delta | **≤ 25 KB gz** | Rooms are code, not assets. `v3`'s entire scene code was 16.8 KB gz |
| Total 3D payload over the wire | **~0 KB** | Everything is procedural. The only candidate asset is a water normal map, and no room currently needs water |
| Landing page and `/labs/*` | **unchanged** | The ship bundle must not leak into routes that do not use it |

**The abort condition, named now so it is not negotiated later under sunk cost:** if the
measured shell exceeds **300 KB gz** in Phase 0, stop and reconsider before building any room.
Options at that point, in order — drop the `Inspector` and any dev-only addon from the
production path; check whether `three.webgpu.nodes.js` (665,902 B min, marginally smaller than
`three.webgpu.js`) is a viable entry; and only then reopen the renderer decision.

### 7.3 Frame

- No dropped frames at 60 Hz on the reference machine at 1440×900, dpr 1.
- **Get a true GPU-time number.** `v3` measured 16.6ms median and correctly noted that this is
  the vsync interval, not the GPU cost — it proves no dropped frames, not headroom. A real
  figure needs `EXT_disjoint_timer_query` (or the WebGPU timestamp query pool, which r185 ships
  as `WebGPUTimestampQueryPool`). `v3`'s decisions doc names this as the first thing the next
  pass should add. This is that pass.
- dpr capped at 1.75. Beyond that is invisible and quadratically expensive.
- **`prefers-reduced-motion` does not start the loop at all.** A paused rAF loop still costs
  battery.

### 7.4 WebGPU vs WebGL2 — the fallback strategy

| Browser | WebGPU status |
|---|---|
| Chrome / Edge | v113 desktop · Android 12+ from v121 · Linux Intel Gen12+ v144, NVIDIA+Wayland v147 · Windows ARM64 flagged |
| Safari | enabled by default in macOS Tahoe 26, iOS 26, iPadOS 26, visionOS 26 |
| Firefox | 141 on Windows · 147 on all macOS · Nightly only on Linux and Android |

> Primary: gpuweb/gpuweb wiki, Implementation Status · read 2026-08-18 · **decay: 3mo** —
> re-read before quoting; do not quote this copy.

**Never quote a global coverage percentage.** Secondary sources surveyed on 2026-08-18 reported
70%, ~82%, 84.68%, ~87% desktop / ~71% mobile and ~95%, and disagreed on whether Firefox ships
it at all. The per-browser table is the only citable form.

The two real gaps are Firefox on Android/Linux, and **any Apple device not on OS 26** — which
matters more than it looks, because it is gated on a very recent OS generation rather than a
browser update. For a portfolio audience that is a meaningful share.

**The strategy is three tiers, and only the middle one is new work:**

| Tier | Trigger | What runs |
|---|---|---|
| **A** | WebGPU backend available | Full scene, full post chain, `ClusteredLightsNode` |
| **B** | WebGPU unavailable → automatic WebGL2 backend | Same scene, same TSL source lowered to GLSL. Reduced light count, half-res composite, dpr 1.5 |
| **C** | No WebGL2 · `prefers-reduced-motion` · low device memory · crawler | Per-room SVG drawing + full DOM content. **`three` is never requested** |

Tier B costs almost nothing to build because TSL emits both backends from one source. It costs
real effort to **verify**, which is the point.

> **The silent-failure warning, restated because it is the highest-risk property of this
> direction.** Compute shaders and storage buffers do nothing on the WebGL2 fallback, with no
> error. A build that looks correct on an RTX 5060 in Chrome can be quietly degraded for a
> meaningful share of visitors — disproportionately Apple users on pre-OS-26 devices. The
> mitigations are structural, not procedural: nothing load-bearing in a compute shader anywhere
> in the build, and a `?gl=webgl2` URL override plus a capture-harness pass that walks every
> room on the forced backend, from day one.

Tier C's assertion is the one `v3` already proved is checkable: on a reduced-motion context,
`threeRequested === false` — the gate resolves before the dynamic import fires, so the chunk is
never fetched. That assertion ports directly.

### 7.5 Measurement, and when

- **Phase 0**: bundle measured with `source-map-explorer` before a single room is built.
- **Every phase**: capture harness run at 1440×900, 768×1024 and 375×812, on both backends.
- **Phase 1a onward**: field measurement wired up — Vercel Speed Insights, or `web-vitals`
  posting to an endpoint. Lab data cannot tell you your p75, and p75 is what is graded.
- **Throttled**: 4× CPU slowdown and simulated slow 4G. The p75 user is not on this machine.

---

## 8. Accessibility

Everything here is a non-negotiable, not a nice-to-have. A WCAG A/AA failure on a portfolio is
an exposure, and on *this* portfolio it is also a contradiction of the thing being sold.

### 8.1 Reduced motion

`prefers-reduced-motion` **skips** the effect. It does not slow it. Freeze motion, drop the
overlay, keep the content reachable.

For this build that means **Tier C**: the room's SVG drawing plus its full DOM content, with
three.js never requested. Because navigation is discrete teleport rather than continuous camera
movement, the reduced-motion variant is a cross-fade instead of a dolly — **not a second
navigation system.**

This is the direct payoff of the teleport decision, and it is worth naming in the estimate. A
free-walking build would need a genuinely different, non-continuous way to move, and that second
system is roughly what doubles such a build. Any estimate for free navigation that omits it is
wrong. Teleport does not have that cost.

### 8.2 Keyboard

- The HUD is a real `<nav>` containing real `<Link>`s. Tab reaches it from page load, after a
  skip link.
- **Every interactive scene element has a DOM control.** The viewport drag has arrow-key nudge.
  Console readouts respond to `focus` as well as `pointerenter`. Portfolio panels are driven by
  a real list, so the keyboard path lights the panels.
- Visible focus indicator everywhere. Never `outline: none` without a replacement — which is
  exactly the audit warning currently open in the tree (§0.4).
- **Controls are `hidden` in the HTML and revealed by the render loop.** A control that drives a
  canvas which is not running is a control that lies. `v3`'s pattern, ported.

### 8.3 Screen readers

The architectural decision that makes this work: **the 3D is the frame; the content is DOM.**

Each room page is a real document — `<h1>`, prose describing the compartment and what is in it,
and the room's actual content as semantic HTML. The canvas is `aria-hidden="true"`. A screen
reader user gets a well-structured page about a ship's bridge, a portfolio bay, an engine room.
They are not told to imagine a rendering they cannot see, and they are not excluded from
anything the sighted visitor can act on.

Per-room screen-reader summary, one sentence each, lives in the registry alongside the seed —
so it cannot be forgotten when room six is added.

This is also, not incidentally, the entire SEO story. Real prose per room, statically generated,
indexable, with per-room OG cards.

### 8.4 Contrast

The HUD sits over a rendered scene, which is the classic way a contrast ratio gets lost.

The resolution is `v3`'s: the HUD sits on a scrim, **and every ratio is measured against that
scrim at its shipped opacity**, so the scrim is not a taste value and cannot be lowered without
re-measuring. 4.5:1 body, 3:1 large text and meaningful UI boundaries. When the ratio and the eye
disagree, resolve upward — never argue downward.

The ported palette already carries measured ratios in its header comment, including the one that
matters most: `dust #8A6842` is 3.54:1 and is **structural only**, never text. A separate `dim`
token at 5.67:1 exists because the obvious secondary-text choice would have shipped a failing
body colour.

### 8.5 The rest of the standing list

- Never bake text into a texture. `v3` found the compliant version was also the more filmic one:
  a screen six metres away renders eight-pixel glyphs, which is a smear — what actually reads as
  code at that distance is indent depth and line-length variance. So the screens carry generated
  row rhythm, and the real snippet is DOM text in the copy.
- Never trap scroll; never `scroll-snap-type: mandatory`.
- No bare `vw` in a `clamp()` middle term.
- No `filter: blur()` or `box-shadow` inside a render loop.
- Audio, when it arrives in Phase 1e, is behind an explicit unmute control. Autoplaying audio is
  its own failure.

---

## 9. Phased delivery

### Phase 0 — Gates and instrumentation · **½–1 day · before any scene code**

Nothing is built until the instruments work. Every item here is a gate with a pass/fail.

1. Branch `vx/bridge-room` off `main` (not off `vx/audit-fixes`, which is two commits behind).
2. `npm i three@0.185.1` + `npm i -D @types/three@0.185.4`.
3. **Measure the bundle.** A minimal `WebGPURenderer` + `SkyMesh` + one node material route,
   built, run through `source-map-explorer`. Record the gz figure. **Gate: ≤ 300 KB gz shell.**
4. Port `scripts/capture-ship.mjs` from `vx/ship-hero-v3`, generalised to take a room list.
5. Build the `?gl=webgl2` capability override and confirm the harness can force the backend.
6. **Spike the three r185 surface** on a throw-away route: does `SkyMesh` → `PMREMGenerator`
   work under R3F-less raw three? Does `bloom()` from `three/addons/tsl/display/BloomNode.js`
   compose? Does `GodraysNode` run on the WebGL2 backend or silently no-op? These are
   fifteen-minute questions with expensive wrong answers.
7. Sync the two skill drafts into `~/.claude/skills/` (§11). Five minutes, and the build fires
   rules that are otherwise not loaded.

**Report to Ryan: the bundle number, and the spike results.** If the bundle gate fails, stop
here and we talk before building anything.

### Phase 1a — The Bridge · **5–8 days**

The deliverable in the brief. Builds the kit, the SceneManager, the disposal gate, the capability
gate, the HUD, the fallback tier, and Room 1 itself. Rooms 2–5 sealed and labelled.

Gate: three green (`npm run build`, `npx tsc --noEmit`, `npm run lint`), capture harness passing
on both backends at three widths, disposal assertion passing, `threeRequested === false` on
reduced motion, screenshots reviewed by Ryan before merge.

### Phase 1b — Portfolio Bay + the real warp · **5–7 days**

Room 2, `three-mesh-bvh`, the instanced transform-reference technique, and the first genuine
room-to-room transition — built with something in the frame.

### Phase 1c — Engineering and Comms · **4–6 days for both**

The two cheap rooms, together. Completes the ship's silhouette: five compartments, five open
doors. Comms carries the contact form; Engineering carries the about prose.

### Phase 1d — Labs Bay · **5–8 days**

Room 3 and its sub-stations, on the existing static-export-plus-iframe pattern. Ships with the
three current labs and one dark station reserved for the Query Terminal.

### Phase 1e — Promotion and polish · **3–5 days**

Sound layer keyed to the warp and the boot. True GPU-time measurement. The decision on whether
`/` becomes the Bridge — made against a real artifact. Field-measurement review across all five
rooms.

### Total

**4–6 weeks of CC time**, which lands inside the capability research's 4–7 week estimate for
this scenario at this room count and this navigation mode. The navigation mode is what would move
that range, and it is already decided.

---

## 10. Risks, named honestly

**1. Bundle bloat on the WebGPU path.** *Likelihood: moderate. Impact: high.* The measured
whole-build delta is +302 KB minified over the WebGL build, and the tree-shaken figure is an
estimate. Mitigated by measuring in Phase 0 with a named abort condition, before any room exists
to be sunk cost.

**2. Silent WebGL2 degradation.** *Likelihood: high if unmanaged. Impact: high.* The auto-fallback
fails quietly, on other people's devices, disproportionately Apple users on pre-OS-26 devices.
Mitigated structurally — nothing load-bearing in compute, `?gl=webgl2` override, harness walks
every room on the forced backend every phase. This is the risk that most rewards paranoia.

**3. Shader debugging is where solo builds stall.** *Likelihood: moderate. Impact: moderate.*
Asset pipelines fail loudly; shaders fail visually and silently. Mitigated by building each
room's look as a standalone example-shaped file before integrating it — which isolates shader
debugging from React lifecycle debugging, two hard problems that should never be diagnosed
simultaneously. `v3`'s decisions doc is blunt about the deeper version of this: *"I can evaluate
a frame once it exists; I cannot reliably predict which of my own choices will look wrong before
rendering it."* The practical consequence is to **budget more capture-and-look cycles than feel
necessary**. Every one of them found a real defect on that build and none were visible in the
code.

**4. TSL API churn.** *Likelihood: moderate. Impact: moderate.* r185 is recent and the node
system is moving. Model knowledge of TSL is stale by default. Mitigated by reading the shipped
addon source in `node_modules/three/examples/jsm/tsl/` rather than recalling an API — the source
is right there and it is the ground truth.

**5. Room-to-room memory lifecycle.** *Likelihood: moderate. Impact: high.* Context loss several
rooms in, discovered after the build looks finished. Mitigated by the disposal build gate. The
mitigation is cheap and the failure is expensive; this is the easiest risk on the list to retire.

**6. Mobile performance on shader-heavy scenes.** *Likelihood: moderate. Impact: moderate.*
`v3` concluded phones could not run its scene at all. The composite fog is cheaper, but that is
reasoning, not measurement. Mitigated by having Tier C already built — the downside case costs
nothing to ship.

**7. The Bridge is pleasant but not memorable.** *Likelihood: moderate. Impact: high.* This is
the failure that has actually happened on this site, four times. A high-fidelity room with no
signature moment plateaus at pleasant, and fidelity improvements do not move it. Mitigated by
naming the moment before building (§5.3) and by the rule that if it tests weak, the question is
*what is the signature moment* before *is the fidelity high enough*. If two full passes land
weak, the concept is suspect and iterating on execution a third time is the wrong move.

**8. SQL game integration.** *Likelihood: low. Impact: low.* The brief mentions an iframe or
rewrite at the Vercel edge. Neither is needed — the working precedent in this repo is a static
export dropped into `public/labs/<slug>/` and iframed from a routed page, which involves no edge
config and no cross-origin. The real risk is simply that the game does not exist yet, which is
handled by shipping Labs Bay with one dark station.

**9. Eight git worktrees and eleven unmerged branches.** *Likelihood: certain. Impact: low but
compounding.* `vx/audit-fixes` is two behind `main` and unmerged; `vx/ship-hero-v3` holds 13,928
lines of unmerged work that this plan cherry-picks from. Worth a cleanup pass at some point, and
worth branching Phase 0 from `main` rather than from the current HEAD.

**10. The Assistant over a ship bridge.** *Likelihood: certain to need a decision. Impact: low.*
`<Assistant />` is in the root layout and will appear on every ship route. Needs a look in
Phase 1a rather than a discovery in a screenshot.

---

## 11. Open questions

Ordered by when they need an answer.

1. **The two audit warnings — before Phase 0 or after the Bridge?** (§0.4) The focus-visible one
   overlaps the HUD's own requirements, so there is a mild argument for first. Twenty minutes.
2. **R3F — do you want it anyway?** (§1.4) I recommend against on measured bundle cost and on
   the reconciler not managing procedural geometry. Your call; everything else survives the swap.
3. **The skill drafts are not installed.** The installed `vx-elite-design-research` is **v1.3.0**;
   `docs/skill-update-drafts/vx-elite-design-research-v1.4.md` is one cycle ahead and carries
   Rule 9, the tier-4/5 asset-supply notes and the reachability clause on Rule 4a.
   `vx-3d-asset-pipeline-v1.0` is not installed as a skill **at all**, and it is the one carrying
   the scene-lifecycle, WebGPU and navigation rules this build runs on. Five-minute fix, and
   until it is done the build is firing rules from a document rather than from a loaded skill.
4. **Does `/` become the Bridge?** Deferred to Phase 1e deliberately — decided against a real
   artifact, not a plan. Flagging now so it is not a surprise later.
5. **Does the Assistant belong on ship routes?** (§10.10)
6. **Is `GodraysNode` viable on the WebGL2 backend?** Phase 0 spike. If yes, the Bridge gets
   light shafts nearly free; if it silently no-ops, it is Tier A only and the frame must read
   without it.
7. **Sound in Phase 1e, or earlier?** It is the cheapest tier upgrade available — RESN reaches
   its read with six shader programs and 7.6 MB of audio. There is an argument for pulling it
   into 1a as part of the boot sequence. It is also the thing `v3` listed first under "what is
   not done".

---

## 12. What I would push back on, in one place

Three departures from the brief, so they are not buried in sections:

**No R3F, no drei.** ~111 KB gz for reconciler ergonomics that procedural geometry bypasses and
a helper library with no WebGPU support. §1.4 has the full argument and the condition that would
change my mind.

**No Rapier, no ecctrl.** Nothing in a static teleport interior falls, tips, rolls or is driven.
This one I do not expect to be controversial; the capability research reaches the same place.

**The warp is not built in Phase 1a.** The brief asks for the HUD skeleton with rooms 2–5 as
"coming soon" tiles, and that is right — but I want the tiles to read as *sealed*, not as
*teased*. A warp animation that ends in a locked door is the exact failure `vx/ship-hero-v3`
documented: the correct edit with nothing in the frame. The warp gets built in 1b, properly,
with a destination.

---

## 13. Before Phase 2 starts

- [ ] Ryan approves this plan, or names what changes
- [ ] Audit-warning timing decided (§11.1)
- [ ] R3F decision confirmed (§11.2)
- [ ] Skill drafts synced into `~/.claude/skills/` (§11.3)
- [ ] Branch `vx/bridge-room` cut from `main`
- [ ] Phase 0 bundle gate measured and reported before any room code
