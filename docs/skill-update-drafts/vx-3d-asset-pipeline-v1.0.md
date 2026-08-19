---
name: "vx-3d-asset-pipeline"
description: "Use when a web build needs real 3D — procedural or shader-generated environments, imported geometry, HDRIs and materials — covering cinematic heroes, product visualisations, WebGL/WebGPU scroll experiences, and multi-room or explorable 3D sites. Covers generating geometry from code before acquiring it, asset sourcing and licensing, the optimisation pipeline, the byte budget, instanced kit-of-parts at room scale, scene lifecycle and WebGL context discipline across routes, WebGPU/TSL renderer choice and the silent WebGL2 fallback trap, cheap atmosphere, navigation-mode selection and its accessibility consequences, in-world UI, and the provenance manifest. Trigger on Three.js, React Three Fiber, WebGPU, TSL, WGSL, shader, procedural generation, GLB/glTF, HDRI, PBR, Blender, Draco, Meshopt, KTX2, volumetric fog, character controller, first-person, teleport, room transition, scene disposal, or any brief where the visual argument requires dimension, material or light rather than line."
---

# 3D asset pipeline for web

Library v1.0.0 · 2026-08-18 · companion to `vx-elite-design-research`.
That skill decides **whether** a build should use 3D and at what tier. This one covers **where the
geometry comes from and how it ships.** Load that skill first; its Rule 6 (technique-as-argument)
and Rule 6b (fidelity tiers) gate everything here.

**Read in this order.** Rule 4a first — most environment geometry should be generated, not
acquired, and the rules either side of it only apply to what is left. Rules 1–5 are asset
acquisition. Rules 6–9 are room-scale architecture. Rules 10–11 are the WebGPU/shader path. Rule 12
is verification and applies to everything.

Stack filter is inherited: Node, React, Next.js, TypeScript, Tailwind, Vercel. One developer.
Three.js and React Three Fiber are the runtime. Game engines are out of scope — installing a Unity
or Godot MCP to build a website is a category error.

---

## The problem this skill exists to prevent

An agent writing Three.js from scratch can only construct geometry from primitives and procedural
maths. That caps output at fidelity tier 1–2 (wireframe, lightly-lit object) regardless of how well
the code is written. Briefs targeting tier 4–5 fail, and the failure gets misdiagnosed as
insufficient fidelity when it is insufficient *supply*.

There are two fixes, and **the cheaper one is usually correct.**

**Generate it (Rule 4a).** `three` ships documented procedural generators, and procedurally
generated geometry costs zero download, carries no licence and needs no optimisation pipeline. For
environment geometry — foliage, terrain, architecture, repeated structure — this is the default, and
it is what the current three.js reference examples actually do.

**Or acquire it**, when the object is genuinely bespoke. Then it is a supply chain with three links,
and skipping any one converts the problem rather than solving it:

```
ACQUIRE  →  PROCESS  →  VERIFY
 asset      to budget    on the page
```

Skip PROCESS and a polygon block becomes a performance block — a 40–60 MB hero that destroys LCP.
Skip VERIFY and you have shipped a rendering nobody looked at. **PROCESS is the link with no
substitute and the one most often skipped**, because the asset already looks right in the viewer.

**Decision order: generate → CC0 library → marketplace → AI generation.** Each step adds cost,
licence surface and pipeline work.

---

## Rule 1 — Lighting before geometry, every time

The single highest fidelity-per-byte asset in web 3D is an HDRI environment map, and it is free.

A moderately detailed mesh under a real HDRI with correct tone mapping reads as tier 5. A dense,
expensive mesh under three point lights reads as a 2009 game asset. When a build is short of its
target tier, **check the environment map before adding triangles.** It is the cheaper lever and it
is usually the actual defect.

Poly Haven is the default source: ~980 HDRIs, CC0, no API key, up to 24K EXR/HDR.

> Primary: polyhaven.com/license and polyhaven.com/our-api · read 2026-08-18 · decay: 1y

**Do not ship the 24K file.** Those exist for offline rendering. For an environment map driving
IBL and reflections on a web hero, 1K–2K is the working range, compressed at build time. Shipping a
24K EXR to a browser is a 100 MB mistake wearing the costume of "using the best available asset."

Three lighting mistakes that cost more than any mesh decision:

- **No tone mapping.** `ACESFilmicToneMapping` (or the current equivalent) plus a considered
  exposure value is most of the gap between "render" and "photograph."
- **Wrong colour space on textures.** Base colour maps are sRGB; normal, roughness and metallic
  maps are linear. Getting this backwards produces a flat, plastic, subtly-wrong surface that
  reads as cheap and is very hard to diagnose by eye.
- **Environment used for reflections but not for ambient.** If the scene still needs three fill
  lights after an HDRI is in place, the HDRI is not actually lighting it.

---

## Rule 2 — Write the byte budget before acquiring anything

Inherited from `vx-elite-design-research` Rule 9, restated because this is where it binds.

```
Hero asset budget — proposed defaults, re-measure per project
  Total 3D payload (GLB + env map + decoders)  ≤ 900 KB over the wire
  Draw calls at steady state                    ≤ 30
  Triangles                                     ≤ 150k
  Textures                                      1 atlas, ≤ 1K, KTX2
  Environment                                   1 HDR, ≤ 2K, compressed
  First paint                                   SVG/CSS fallback, zero WebGL cost
```

> Unverified: derived from the ~50–80 KB gz PBR+HDRI+fog premium over raw Three.js plus LCP
> arithmetic, not from a repro · 2026-08-18 · needs a lab pass before being stated as measured.

The numbers are provisional and should be re-derived per project. **The practice is not
provisional.** Written after the asset is chosen, a budget is a negotiation with sunk cost; written
before, it is a filter that makes acquisition decisions obvious.

---

## Rule 3 — Never ship a third-party mesh unprocessed

Marketplace and generated assets are authored for offline rendering: millions of triangles, four
4K texture sets, unused UV channels, unapplied transforms, and often n-gons that triangulate badly.

**First action on any download, before any other work:**

```powershell
npx @gltf-transform/cli inspect .\raw\model.glb
```

Two minutes, and it tells you whether the asset is viable at all — triangle count, texture
inventory, material count, extensions in use. Most marketplace assets are not viable for web at
their published fidelity. Finding that out before texturing work goes in is the whole point.

### The pipeline

```
acquire → inspect → decimate / retopologise → bake to a single atlas → export GLB
        → gltf-transform (meshopt + KTX2 + prune + dedupe) → measure → commit
```

The middle three steps need Blender. That is the honest reason Blender belongs in this stack — not
as a modelling tool for the agent, but as the **only agent-accessible compiler** from "asset exists
somewhere" to "GLB a browser should download."

### The compression calls

```powershell
npx @gltf-transform/cli optimize .\raw\model.glb .\public\models\model.glb `
  --compress meshopt --texture-compress ktx2
```

**Prefer Meshopt over Draco for heroes.** Draco reaches slightly better raw ratios, but its decoder
is heavier and decode is slower — and on a hero, decode time lands directly in the critical path
between first paint and the scene appearing. Meshopt with gzip reaches comparable ratios with
materially faster decode and a lighter client-side decoder. On a page whose entire argument is that
it feels immediate, decode latency is a design defect, not an engineering detail.

**KTX2 is the bigger win and the more commonly skipped one.** Textures are usually the heaviest
part of a model, and KTX2/Basis cuts download size *and* GPU memory — a JPEG inside a GLB
decompresses to raw RGBA on the GPU regardless of its file size. A build that Draco-compresses
geometry and ships JPEG textures has optimised the smaller half of the problem.

> Measured: `@gltf-transform/cli` v4.4.2, published 2026-07-25, MIT, first published 2018-12-19 ·
> registry.npmjs.org · 2026-08-18 · decay: 6mo

### Getting it into React

```powershell
npx gltfjsx .\public\models\model.glb --types --transform
```

Emits a typed R3F component with instancing. Generated components are a starting point, not a
deliverable — read what comes out before committing it.

---

## Rule 4 — Where assets come from, ranked by total cost of ownership

Total cost of ownership, not catalogue size. A licence obligation that follows a client site into
production costs more than a subscription.

| Source | Licence | Ongoing obligation | Verdict |
|---|---|---|---|
| **Poly Haven** | CC0 | None | **Default.** HDRIs, textures, ~520 models |
| **ambientCG** | CC0 | None | **Second source**, materials-heavy |
| **Sketchfab** | Creative Commons, mostly commercial-OK | **Attribution, permanently** | Use for specific objects; track it |
| **AI generation** | Vendor terms, generally output-owned | Per-vendor | When no library has the object |
| **Fab / Megascans** | Fab Standard License, Personal / Professional by revenue | Tier tracking | **Hold** — see open question below |

**CC0 first, always.** No attribution, no per-project licence tracking, no client indemnity
conversation. On client work that is worth more than a larger catalogue.

### Licence traps that are real, not theoretical

- **Attribution obligations survive into production.** Most of Sketchfab's free models are
  Creative Commons and most CC variants require crediting author and source. That is an ongoing
  duty attached to the shipped client site. It has to live in the repo, not in someone's memory.
- **At least one widely-used open 3D model licence carries a territorial exclusion.** Hunyuan3D-2.1
  defines its territory as "the worldwide territory, excluding the territory of the European Union,
  United Kingdom and South Korea." If the practice operates from an excluded territory, that path
  closes — including when reached indirectly through a Blender integration.
  > Primary: Tencent-Hunyuan/Hunyuan3D-2.1 LICENSE · read 2026-08-18 · decay: 1y
- **"Usable in any engine or tool" does not settle the web case.** Serving a GLB distributes the
  asset in a form an end user can extract. Some licences do not clearly address that. Where the
  terms are unclear, resolve before shipping.

### The provenance manifest

`public/models/ASSETS.md`, committed, one row per third-party asset:

| Asset | Source | Author | Licence | Attribution required | Acquired | Processing |
|---|---|---|---|---|---|---|
| `console.glb` | polyhaven.com/a/… | — | CC0 | None | 2026-08-18 | decimate 2.1M→140k, 1K atlas, meshopt+KTX2 |

Six months later, in a handover or a client's legal review, "where did this come from and what are
we obliged to do" must be answerable in seconds. This is the same principle as reporting a WCAG
failure in writing — applied upstream, where it costs two minutes instead of a week.

---

## Rule 4a — Ask whether the asset needs to exist at all

Before acquiring anything, ask whether the thing can be **generated from code**. On the current
platform this is far more often "yes" than the asset-first instinct assumes, and a generated asset
has no download cost, no licence, no provenance row and no optimisation pipeline.

`three` v0.185.1 ships documented procedural generators as addons: **`TreeGenerator`** (deterministic
tree skeleton from a seed, baked to one non-indexed BufferGeometry ready to instance) and
**`CityGenerator`** (grid of blocks filled by `SkyscraperGenerator` towers, returns a `THREE.Group`).
r185 also added terrain and forest generation to the `webgpu_custom_fog` example.

> Primary: threejs.org/docs/pages/TreeGenerator.html and CityGenerator.html, three.js r185 release
> notes · read 2026-08-18 · decay: 6mo — new API, moving.

**The decision order is: generate → CC0 library → marketplace → AI generation.** Each step down
adds cost, licence surface and pipeline work. Most environment geometry — foliage, terrain,
architecture, repeated structural elements — belongs at step one.

**What this does to the polygon-block problem:** it dissolves it rather than solving it. An agent is
good at writing code that generates geometry and bad at sourcing, licensing and optimising binary
assets. Procedural generation plays to the strength and retires the weakness — geometry becomes
arbitrarily dense at zero download cost.

**A room's look becomes a seed plus parameters.** Commit those as data and the room is
reproducible, diffable and art-directable without touching a mesh.

**Where it does not apply:** a genuinely bespoke hero object — a specific machine, a branded
artefact, the one thing the page is about. That is what the asset pipeline in Rules 1–5 is for, and
why it stays in this skill rather than being deleted.

## Rule 5 — *AI-generated* meshes are the last resort, not the first

Not to be confused with Rule 4a. **Procedural generation — geometry from code — is the first
choice. AI mesh generation is the last**, after CC0 libraries and marketplaces. The two are opposite
ends of the decision order and only share the word "generated".

AI 3D generation is genuinely useful and consistently reached for too early. Before generating:

0. **Can it be generated from code?** Rule 4a. For environment geometry the answer is usually yes,
   and it costs nothing.
1. **Does a CC0 library already have it?** For most architectural, industrial, natural and prop
   subjects, yes. Free, better topology, no licence question.
2. **Does the concept actually need that object?** Rule 6c in the parent skill — one object in four
   states usually beats four objects, and it is less work.
3. **Would a lighting fix close the gap?** Rule 1 above.

When generation *is* right — a specific object no library has, matched to a specific brand — it
works well. Two constraints:

- **Generated topology is usually poor.** Dense, irregular, often non-manifold. It still needs the
  full PROCESS pipeline, frequently more of it than a marketplace asset.
- **Local inference needs hardware most workstations do not have.** Verified 2026-08-18: the
  current machine has an RTX 5060 with **8151 MiB VRAM**. TRELLIS.2 states 24 GB and Linux-only;
  Hunyuan3D-2.1 needs 10 GB for shape alone and 29 GB for shape plus texture. **All local
  open-weight paths are blocked at 8 GB.** Hosted APIs are the only realistic route until the
  hardware changes. Re-check this constraint before assuming it still holds.

---

## Rule 6 — At room scale, instance the kit. Do not model the rooms

The number that settles this: **bruno-simon.com ships its entire explorable world in 974 KB across
23 files.** Active Theory ships 12,496 KB of 3D. Immersive Garden 9,926 KB. Igloo 12,656 KB.

The gap is not quality — it is instancing. Bruno's asset names give the technique away:
`respawns/respawnsReferences-compressed.glb` is **2,836 bytes** and
`bushes/bushesReferences-compressed.glb` is **25,588 bytes**. Those are not meshes. They are
*transform reference* files consumed by an `InstancedGroup` system. One bush, a thousand placements,
one mesh plus a list.

> Measured: `docs/whole-page-narrative-refs/bruno-simon.json` · dump dated 2026-08-17 · architecture
> read from the MIT source at github.com/brunosimon/folio-2025 · 2026-08-18 · decay: 1y

**Interiors are the ideal case.** A ship, an office, a facility — overwhelmingly repeated geometry:
the same panel, conduit, crate, light fitting, rotated and placed. Modelled as an instanced
kit-of-parts, a six-room interior is plausibly *smaller* than one bespoke hero object.

So the brief for a multi-room build is not "model six rooms." It is **"design a kit of 20–40 parts
and a placement scheme."** That inverts where the modelling effort goes, and it is the difference
between a viable solo build and an unviable one.

Two supporting practices from the same measured set:

- **Name explicit quality tiers from day one.** Immersive Garden ships `bg_ultralow_draco.glb` and
  `textures/ktx2/ultralow/`; Bruno has a `Quality.js`. Retrofitting LOD costs far more than
  designing for it. (Note also that one of Immersive Garden's `ultralow` KTX2 normal maps is still
  **2,301,978 bytes** — even disciplined studios ship a 2.3 MB texture. Check, do not assume.)
- **Zone-partition the world**, not just the files. Bruno has `Zones.js` and `Map.js` as named
  subsystems. Partitioning is an architecture decision, not a build-output detail.

---

## Rule 7 — One WebGL context, and disposal is a build gate

**Never mount a `<Canvas>` per route.** Browsers cap live WebGL contexts, and recreating the
renderer on navigation leaks them unless explicitly released. The failure presents as "context
lost" several rooms in — after the build looks finished, which is the worst time to find it.

The architecture that works: **one persistent canvas above the router, route-driven scene swap.**
Real URLs for shareable rooms, one context, explicit disposal on every transition. This is not
theoretical — basement.studio runs `three` + `next` with per-route 3D splitting in production
(home: 31 files / 2,909 KB; `/showcase`: 49 files / 5,605 KB; shared models across both, filenames
content-hashed by the build).

> Measured: `docs/whole-page-narrative-refs/basement-studio.json` and `basement-work.json` ·
> dumps dated 2026-08-17 · decay: 1y

### Disposal that actually frees memory

`scene.clear()` removes objects from the graph and frees nothing on the GPU.

```
traverse the departing subtree
  → geometry.dispose()
  → material.dispose()          (and every texture it references)
  → texture.dispose()
  → GLTF ImageBitmap textures also: texture.source.data.close?.()
renderer.dispose() ONLY if the canvas itself is going away
```

**Verify, do not assume.** `renderer.info.memory.geometries`, `.textures` and `.programs` must
return to baseline after leaving a room. That check is trivially automatable, which makes it a
**build gate rather than a hope** — and a leak that is caught by an assertion costs minutes, while
one caught by a user costs the build.

### Loading

Preload **adjacent** rooms only — entering room 3, warm 2 and 4, dispose 1 and 5. Resident memory
stays flat regardless of how large the world gets.

> Known conflict: drei's `<Preload>` used together with `useGLTF.preload()` can leave GLTF shaders
> un-precompiled. Pick one path and confirm shaders actually compiled.
> Source: pmndrs/drei issue #1985 · read 2026-08-18 · decay: 1y

### drei `<View>` is for selection screens, not rooms

`<View>` scissors one canvas into DOM-tracked segments. That is the right tool for a deck-plan or
project-grid screen where several live 3D thumbnails sit in a CSS layout — not for the room system
itself.

---

## Rule 8 — Navigation mode is an accessibility decision before it is a design one

| Mode | Wow ceiling | Mobile | Accessibility | Effort | Sickness risk |
|---|---|---|---|---|---|
| First-person WASD | Highest | Poor | **Worst** | High | **High** |
| Third-person follow | High | Fair | Poor–fair | High | Moderate |
| **Click-to-teleport** | Moderate–high | **Good** | **Good** | Moderate | **Low** |
| **Orbit-per-room** | Moderate | **Good** | **Good** | **Low** | **Lowest** |

Continuous pointer-driven camera motion is a known vestibular trigger. A portfolio that induces
nausea has failed at the thing it was demonstrating. And the non-negotiable that every interactive
element is keyboard-reachable with a visible focus indicator is genuinely hard when the interactive
elements are objects you have to *walk to*.

**`prefers-reduced-motion` must skip, not slow.** For a free-navigation build that means shipping a
second, non-continuous navigation path — a whole parallel system. **Any estimate for free
navigation that excludes building that second path is wrong**, and it is roughly what doubles the
build.

**Default to click-to-teleport between fixed stations, with orbit-and-inspect at each station.**
Discrete stations are naturally Tab-navigable, usable on a phone, and their reduced-motion variant
is a cross-fade instead of a dolly rather than a separate system. It reaches most of the ceiling
for about half the effort.

### Do you need a physics engine at all?

Usually not. A static interior with a walking player needs collision, not dynamics.

| Need | Use | Cost |
|---|---|---|
| Walk on static geometry | **`three-mesh-bvh` capsule shapecast** | ~0 — the BVH is wanted for raycasting anyway |
| Anything that falls, tips, rolls, is driven | Rapier via `@react-three/rapier` | ~500 KB WASM compressed, async init |
| Off-the-shelf third-person character | `ecctrl` (requires Rapier) | 500 KB + controller |

> Measured 2026-08-18: `three-mesh-bvh` v0.9.14, MIT, 3,396,948 downloads/week · `ecctrl` v2.0.1
> published 2026-08-17, MIT · `@dimforge/rapier3d-compat` v0.20.0 published 2026-08-08 while
> `@react-three/rapier` v2.2.0 last published 2025-11-03 — the engine is current, the React wrapper
> lags · **`cannon-es` last published 2022-08-12 — treat as dormant, do not start on it.**

---

## Rule 9 — In-world UI stays in WebGL; sound does more than shaders

**`@react-three/uikit` for in-world panels, drei `<Html>` only where real DOM is required.** uikit
renders UI as WebGL geometry with flexbox layout, so it depth-sorts against scene geometry, survives
any camera angle, and pays no per-frame DOM position sync — which is what bites `<Html>` once there
are many elements inside a 16 ms budget. Its shadcn-based preset sits on existing stack vocabulary.

> Measured: `pmndrs/uikit` LICENSE read in full · 2026-08-18 · decay: 1y — **two verbatim MIT
> grants stacked** (Copyright 2024 Bela Bohlender; Copyright 2023 Coconut Capital). Permissive,
> cleared for client work. The GitHub API reports `spdx_id: NOASSERTION` only because the file
> carries two licence blocks and the template matcher cannot resolve them to a single SPDX ID.
> See the parent skill's tooling section — `NOASSERTION` is not the same as "no licence."

**Wrap interactive geometry in drei `<Bvh>`.** Hover raycasting against a detailed interior on every
pointer move does not survive the naive raycaster; three-mesh-bvh reports 500 rays against an
80,000-polygon model at 60 fps.

**Sound is the cheapest tier upgrade available.** RESN ships **six shader programs** and
**7,619 KB of mp3**, measured. The machine-like read there is carried by audio and interaction, not
shader complexity. Two short samples — hover and commit — do more for perceived quality than a
post-processing pass, at a fraction of the bytes. Gate behind an explicit unmute control; autoplaying
audio is its own failure.

### Making a 3D panel read as clickable

Cursor change on hover (`useCursor`) is the strongest single affordance. Hover response within one
frame — emissive lift, slight scale, rim highlight; latency to feedback is a design defect. Sound on
hover and on commit. And a focus path that is not the pointer, which is far easier with discrete
stations than with objects you walk up to.

Bruno solves the same problem with `RayCursor.js` and `InteractivePoints.js` as named subsystems.
MIT, readable.

---

## Rule 10 — WebGPU: one renderer, one shader language, and never trust the fallback silently

**Use `WebGPURenderer` always.** It uses the WebGPU backend where available and falls back to a
WebGL2 backend automatically. It is not a WebGPU-only choice — it *is* the WebGL2 path too. Never
branch on backend in application code.

**Write TSL exclusively.** The node graph lowers to WGSL for the WebGPU backend and GLSL for the
WebGL2 backend at compile time. Mixing raw GLSL gives two shader codebases and forfeits the
fallback.

### The rule that prevents the expensive failure

> **Compute shaders and storage buffers silently do nothing on the WebGL2 fallback.** No error. The
> page renders, minus whatever that pass contributed.

It fails quietly, on other people's devices, in a way local development never surfaces. So:

- **Nothing load-bearing in a compute shader** unless a non-compute path exists and has been tested.
- **Force the WebGL2 backend in routine testing, from day one.** Not as a pre-launch check.
  "It works on my machine" is guaranteed here.

### Current support, and how to talk about it

| Browser | Status |
|---|---|
| Chrome / Edge | ✅ v113 desktop · ✅ Android 12+ from v121 · ✅ Linux Intel Gen12+ v144, NVIDIA+Wayland v147 · 👷 Windows ARM64 flagged |
| Safari | ✅ enabled by default in **macOS Tahoe 26, iOS 26, iPadOS 26, visionOS 26** |
| Firefox | ✅ **141 Windows** · ✅ **147 all macOS** · 👷 **Nightly only on Linux and Android** |

> Primary: gpuweb/gpuweb wiki, Implementation Status · read 2026-08-18 · **decay: 3mo** — re-read
> rather than quoting this copy.

**Never quote a global WebGPU coverage percentage.** Secondary sources surveyed on 2026-08-18
reported 70%, ~82%, 84.68%, ~87% desktop / ~71% mobile and ~95%, and disagreed on whether Firefox
ships it at all. The per-browser table is the only citable form. The two real gaps are **Firefox on
Android/Linux** and **any Apple device not on OS 26** — the latter matters most, because it is gated
on a very recent OS generation rather than a browser update.

### Post-processing

On the WebGPU path use three's **native node post-processing** — `pass()`, `bloom()`,
`gaussianBlur()` — not pmndrs `postprocessing`. drei's `EffectComposer` wraps the latter, and some
effects need WebGPU-specific versions or TSL rewrites.

**drei's README documents no WebGPU or TSL support.** Its staging components (`Sky`, `Stars`,
`Cloud`, `Sparkles`, `Environment`, `Lightformer`, `Caustics`) are WebGL-era `ShaderMaterial`
abstractions. Spot-check each one on the WebGPU backend before relying on it; treat drei as a
convenience layer here, not a foundation.

### R3F wiring

R3F v9 accepts an async `gl` prop — return an initialised `WebGPURenderer` from an async factory.
Poimandres were actively polishing WebGPU support through 2026, so **check current docs rather than
recalling the API**; this is one of the fastest-moving surfaces in the stack.

---

## Rule 11 — Cheap atmosphere beats expensive geometry

The measured lesson from the three.js reference examples, all of which are **under ~200 lines and
import no assets** apart from one water normal map:

**Fog scattering is a post-process, not a raymarch.** `webgpu_custom_fog_scattering` renders the
scene, blurs it, and mixes blurred over sharp by fog density (`densityFogFactor()`, `pass()`,
`gaussianBlur()`). Its geometry is **unlit black silhouettes** — `MeshBasicMaterial` on ~156
instanced procedural trees. No PBR, no lighting, no textures. It is the highest
fidelity-per-effort technique in this document, and it generalises: silhouetted structure receding
into scattering haze is the same shader with different geometry.

**Water is a scrolling normal map, not an FFT simulation.** three's `Water.js` addon drives
`distortionScale`, `size`, `time`, `sunDirection`, `sunColor`, `waterColor` against
`waternormals.jpg`. A real Tessendorf FFT ocean is a multi-week subsystem and is almost never
warranted — for water seen through a window or at distance, the approximation is the correct
choice, not a compromise.

**Sky is analytic and free.** `Sky` / `SkyMesh` are Preetham-family (turbidity, Rayleigh, Mie), and
feeding one through `PMREMGenerator` gives a full environment map with **no HDRI download**. On the
procedural path this replaces the Rule 1 HDRI for the common case — but Rule 1's point stands
unchanged: **it is still the lighting doing the work, not the geometry.**

**Procedural surface detail beats texture maps for structured surfaces.** The city example's
`createRoadMaterial(city.layout)` produces wet asphalt with grid-aligned lane lines from a layout
description. That technique — surface detail derived from the thing's own structure — is what
panelling, deck plating, conduit runs and hazard striping want, and it ships zero bytes of texture.

> Primary: three.js example sources read 2026-08-18 · decay: 6mo

### Particles: check the metaphor before reaching for them

The parent skill's Rule 6 is explicit — **particles argue ephemerality**. A point cloud says this
thing is made of smoke and is about to disperse. For a subject arguing permanence or engineering
precision that is an inverted metaphor, and no amount of fidelity repairs it. Dust motes in a light
shaft are atmosphere in a small dose; particles as the load-bearing visual are usually the density
mistake in a new costume.

---

## Rule 12 — Verify on the page, not in the viewer

An asset that looks superb in a GLB viewer and adds a second of LCP is not an improvement.

**Two things must be checked, and they are different checks:**

1. **Did it render?** `requestAnimationFrame` does not fire in the headless browser surfaces
   available to an agent, so a screenshot of a canvas hero is frame zero or nothing. A **dev-only
   single-frame render hook is mandatory** for this class of work. Without it the work cannot be
   looked at, and describing a rendering nobody has looked at is exactly the failure the parent
   skill's Rule 1 exists to prevent.
   > Unverified: an official Chrome-under-CDP MCP surface may lift this. Testable in ~15 min
   > against a real Three.js scene · 2026-08-18. Until tested and passed, the hook stays mandatory.
2. **What did it cost?** A performance trace on a throttled profile. LCP, INP, CLS, and the size of
   the 3D payload as delivered. Compare against the Rule 2 budget. If it is over, the asset is not
   finished.

**The fallback is the first frame, not a degraded copy.** Build the SVG or CSS version first, ship
it as first paint on all clients, and enhance to WebGL where capability allows. Same drawing, two
rendering paths. Mobile, reduced-motion and low-power clients pay zero WebGL cost and see the
correct static frame.

---

## Tooling — what to install and what to skip

The parent skill's rule applies: **prefer a CLI over an MCP for anything deterministic.** Check
`api.github.com/repos/<owner>/<repo>` for `pushed_at` and `license.spdx_id`, and
`api.npmjs.org/downloads/point/last-week/<pkg>` for adoption, before installing anything.

### Install

| Tool | Form | Why | Measured 2026-08-18 |
|---|---|---|---|
| `@gltf-transform/cli` | **CLI, in `package.json`** | The whole PROCESS step. Meshopt, KTX2, prune, dedupe, inspect | v4.4.2, MIT, published 2026-07-25 |
| `gltfjsx` | **CLI** | GLB → typed R3F component | — |
| Blender MCP (`uvx blender-mcp`) | MCP | Hub: Poly Haven + Sketchfab + generation behind one MIT server. And the only agent-accessible decimate/bake/export | 26,011 ★, pushed 2026-08-16, MIT, PyPI v1.8.3, Python ≥3.10 |
| Chrome DevTools MCP | MCP | Performance traces and Core Web Vitals in the loop — the VERIFY step | Apache-2.0, ~2.3M downloads/week, pushed 2026-08-18 |
| Context7 | MCP | Current Three.js / R3F API surface. That surface has churned hard through the TSL/WebGPU transition | ~1.17M downloads/week |

### Add at room scale only

| Tool | Form | Why | Measured 2026-08-18 |
|---|---|---|---|
| `three-mesh-bvh` | **npm** | Accelerated raycast for hover, **and** capsule collision if the player walks. Not optional at room scale | v0.9.14, MIT, 3,396,948 dl/wk |
| `@react-three/uikit` | **npm** | In-world panels as WebGL geometry, no DOM sync cost | 3,234 ★, pushed 2026-08-03, **MIT** (LICENSE read 2026-08-18; API reports NOASSERTION — see Rule 9) |
| ElevenLabs MCP | MCP | Hover and commit sounds. Cheapest tier upgrade available | Official, MIT, free tier 10,000 credits/mo |
| `@react-three/rapier` + `@dimforge/rapier3d-compat` | npm | **Only if dynamics are needed.** ~500 KB WASM | Engine v0.20.0 (2026-08-08); wrapper v2.2.0 (2025-11-03) |
| `ecctrl` | npm | **Only if a third-person character is needed.** Requires Rapier | v2.0.1 published 2026-08-17, MIT |

**Two operational constraints on Blender MCP, both real:**

- It drives a **running GUI Blender instance** over a socket addon. Blender must be open with the
  addon connected. It does not fit a fully headless background run — plan sessions around that.
- `execute_blender_code` runs **arbitrary Python inside Blender**. The project's own README says so
  and says to save first. Never point it at a `.blend` that is not disposable or committed.

### Skip, with the reason

| Skipped | Reason |
|---|---|
| `cannon-es` / `@react-three/cannon` | Last published 2022-08-12 and 2023-08-17. Dormant. Rapier is the only live physics option |
| `pmndrs/react-three-next` starter | 2,862 ★ but last pushed 2024-06-21 — over two years stale, predates current App Router practice. Read for ideas, do not scaffold from it |
| `@react-three/offscreen` | v0.0.8, last published 2023-05-11 |
| A `<Canvas>` per route | Exhausts WebGL contexts. Guaranteed failure, discovered late |
| Standalone Sketchfab MCP | 39 ★, last pushed 2025-03-09, **no licence declared**. Use Blender MCP's integration instead |
| `mcp-three` | 19 downloads/week, last pushed 2025-08-13, **no licence declared**. The capability is `gltfjsx` standalone |
| Tripo MCP | Last pushed 2025-04-14, self-described alpha |
| `threejs-devtools-mcp` | 59 tools for live scene inspection is the most interesting thing in this space — but 222 downloads/week on v0.4.1 is too young for client work. **Watch, re-check next cycle** |
| Game engine MCPs (Unity, Godot, Unreal) | Wrong runtime for a Next.js site |
| Wrapping the CLIs in MCPs | Deterministic build steps belong in `package.json` |

**An MCP with no declared licence never enters a client-work pipeline.** Without a licence grant,
default copyright applies and there is no permission to use it. This disqualifies two otherwise
plausible servers above, and it is not a technicality.

---

## Before you call it done

- [ ] Fidelity tier stated in the brief, and the signature moment named, before acquisition
- [ ] Byte budget written before acquisition, and the delivered payload measured against it
- [ ] `gltf-transform inspect` run on the raw download before any work went in
- [ ] Mesh decimated, textures baked to a single atlas, transforms applied
- [ ] Meshopt + KTX2 applied; decoder cost accounted for in the budget
- [ ] HDRI at 1K–2K, compressed — not the 24K source
- [ ] Tone mapping set; base colour sRGB, normal/roughness/metallic linear
- [ ] SVG/CSS fallback is the first paint on all clients, and is the correct frame unanimated
- [ ] `prefers-reduced-motion` **skips** the effect, does not slow it
- [ ] Rendered frame actually looked at, via the dev-only single-frame hook
- [ ] Performance trace on a throttled profile; LCP, INP, CLS recorded
- [ ] `public/models/ASSETS.md` row committed for every third-party asset
- [ ] Licence read for the **web-delivery** case specifically, not just "any engine or tool"

### Procedural / WebGPU builds only

- [ ] Asked "can this be generated?" before acquiring any environment geometry (Rule 4a)
- [ ] `WebGPURenderer` used unconditionally; no backend branching in app code
- [ ] TSL only — no raw GLSL anywhere in the build
- [ ] Nothing load-bearing in a compute shader
- [ ] **WebGL2 backend forced and the whole site walked through on it** — not a pre-launch check
- [ ] Each drei staging component in use spot-checked on the WebGPU backend
- [ ] Post-processing via three's node pipeline, not pmndrs `postprocessing`
- [ ] Seeds and generation parameters committed as data, not baked into geometry
- [ ] Bundle delta of `three.webgpu.js` measured for this app, not assumed
- [ ] Particle use checked against the metaphor it argues

### Room-scale builds only

- [ ] Kit-of-parts designed and instanced — not rooms modelled bespoke
- [ ] Exactly one WebGL context; no `<Canvas>` mounted per route
- [ ] `renderer.info.memory.{geometries,textures}` returns to baseline after leaving every room,
      asserted in a test rather than eyeballed
- [ ] Adjacency preloading in place; resident memory flat as the world grows
- [ ] Two named quality tiers exist, designed in rather than retrofitted
- [ ] Navigation mode chosen deliberately, with its accessibility consequences accepted in writing
- [ ] Reduced-motion navigation path built and tested — not "slower", genuinely different
- [ ] Every interactive point Tab-reachable with a visible focus indicator
- [ ] Interactive geometry wrapped in `<Bvh>`; hover cost measured, not assumed
- [ ] Audio gated behind an explicit unmute control

---

## Open questions

1. **Fab / Megascans web distribution.** Does the Fab Standard License permit serving an asset as
   an extractable GLB? `fab.com/eula` blocks automated fetching and the developer docs do not cover
   it. Blocks Megascans in web builds until read by hand.
2. **Hunyuan3D territorial clause.** Excludes the EU, UK and South Korea. Needs a jurisdiction
   answer before that path is usable, including indirectly via Blender MCP.
3. **Does Chrome DevTools MCP solve the rAF verification gap?** If yes, the single-frame hook
   becomes optional and a standing constraint disappears.
4. **Are the Rule 2 budget numbers right?** Proposed, not measured. Needs a repro pass.
5. ~~**What licence does `pmndrs/uikit` carry?**~~ **RESOLVED 2026-08-18** — LICENSE read in full:
   two verbatim MIT grants stacked (Bela Bohlender 2024, Coconut Capital 2023). Permissive, cleared.
   `NOASSERTION` was a classifier artifact, not a missing grant. Rule 9 unblocked.
6. **Does `@react-three/rapier`'s nine-month publish gap matter?** Only relevant if a build needs
   dynamics. Check open issues before committing.
7. **What happens to `renderer.info` across a basement.studio route transition?** The instrumentation
   captured per-route asset differences but not memory behaviour across navigation. That is the
   existence proof for the Rule 7 architecture on this exact stack, and it is one measurement.
8. **Which drei staging components work on the WebGPU backend?** Not documented. Each needs a
   spot-check; the answer determines how much of drei is usable on the procedural path.
9. **What is the `three.webgpu.js` bundle delta for a given app?** Measure per project with
   `source-map-explorer`; do not carry a general figure.
10. **Is the WebGPU performance delta real for a given workload?** Claims found ranged from modest
    to 15× with no reproducible benchmark. The concrete named win is **ClusteredLighting (Forward+),
    added in r185**, which matters for many-light interiors. Benchmark rather than quote.
11. **Is there usable TSL-specific tooling yet?** As of 2026-08-18, no TSL equivalent of GLSL Canvas
    was found. TSL is JavaScript so it debugs with JS tools, but the gap is real. Recheck.
