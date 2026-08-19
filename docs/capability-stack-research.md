# Capability stack research — MCPs and tooling for cinematic 3D web work

Research pass: 2026-08-18 · Research only. Nothing installed, no code touched, nothing committed.
Scope: what would actually unblock the polygon-blocked problem on `vertexapps.dev` and on future
Vertex interactive work, ranked by impact against install cost.

**Provenance convention** follows `vx-elite-design-research`: every claim carries how it was
established. `Measured:` = pulled directly from a registry/API/machine on the date shown.
`Primary:` = read off the vendor's own documentation. `Secondary:` = trade press or aggregator,
lower trust. `Unverified:` = exists, current status not confirmed — never recommended.

Where a figure is stated, the parameter that produced it is stated in the same sentence.

---

## 0. The finding that reframes the question

Before the category sweep, one measurement changes what "install" can mean here.

```
Measured: local machine, 2026-08-18
  GPU        NVIDIA GeForce RTX 5060 — 8151 MiB VRAM (nvidia-smi, driver 610.74)
  CPU        Intel Core i9-9900K
  System RAM 63.9 GB
  Python     3.14 (C:\Python314)   uv + uvx present (C:\Users\rstac\.local\bin)
  Node       v24.12.0
  Blender    NOT INSTALLED (not on PATH, no Blender Foundation dir under Program Files)
```

8 GB of VRAM rules out the entire local-inference branch of Category A:

| Model | Stated requirement | Verdict on this machine |
|---|---|---|
| TRELLIS.2 (4B) | "An NVIDIA GPU with at least 24GB of memory is necessary"; "code is currently tested only on Linux" | **Blocked** — 3× short on VRAM, and no Windows install path |
| Hunyuan3D-2.1 | 10 GB shape / 21 GB texture / 29 GB both | **Blocked** — even shape-only exceeds 8 GB |

> Primary: github.com/microsoft/TRELLIS.2 README · read 2026-08-18
> Secondary: Hunyuan3D-2.1 VRAM figures, multiple sources · read 2026-08-18

That is the single most consequential fact in this document. It means **every AI 3D generation
option in Category A is a hosted API for Vertex, not a local model**, regardless of how good the
open weights are. Any recommendation that assumes local inference is wrong on this hardware.

Second reframing, and the one that matters more for output quality: **having a mesh is not the
bottleneck people think it is.** The polygon-blocked problem is actually two problems.

1. **Acquisition** — get a high-information mesh into the repo. Many solutions, all easy.
2. **Web-budget integration** — make that mesh render as cinematic inside a Core Web Vitals
   budget. Few solutions, and this is where builds actually die.

A 2M-triangle Sketchfab download with four 4K textures is 40–60 MB and will destroy LCP on the
hero it was meant to save. Skipping step 2 converts a polygon block into a performance block.
Rank the stack accordingly: the acquisition tools are cheap and interchangeable, the integration
tooling is the part that decides whether the work ships.

Third: **the cinematic read comes mostly from lighting, not from geometry.** A moderately detailed
mesh under a good HDRI with correct tone mapping reads as expensive. A dense mesh under three
point lights reads as a 2009 game asset. The highest-leverage single asset in this whole document
is a free CC0 HDRI, which needs no MCP, no API key and no account.

> **Direction update, 2026-08-18.** After this section was written the brief changed twice: the
> multi-room pivot was confirmed, and the fidelity target was specified as **shader-based and
> procedural** rather than asset-imported. That inverts the priority order of this document.
> **Read Categories O, P and Q and Scenario 3 first.** Categories A, B and D are retained as backup
> for specific object needs.
>
> Two of the three findings above survive the change unaltered. The hardware constraint still rules
> out local model inference. And the lighting point generalises rather than changes — on the
> procedural path the environment comes from `Sky`/`SkyMesh` → `PMREMGenerator` instead of a
> downloaded HDRI, but it is still the lighting doing the work, not the geometry.
>
> The second finding — that web-budget integration is the real bottleneck — **is the one that
> changes.** Procedurally generated geometry has no download cost, so the acquisition-and-optimise
> pipeline that dominates Scenarios 1 and 2 largely disappears in Scenario 3. The bottleneck moves
> from bytes to shader authoring.

---

## Category A — AI 3D model generation

> **Deprioritised, 2026-08-18.** The confirmed fidelity target is shader-based and procedural
> (Categories O–Q), which generates geometry from code rather than importing it. Everything below
> remains accurate and is retained as **backup for specific hero objects procedural generation
> cannot express** — not as a fidelity path. Read Category Q first.

### What was checked

Every option on the brief, plus the open-weight models that turned out to matter more than the
hosted ones.

| Option | Access route | Output | PBR | MCP? | API? | Cost | Speed | Tier |
|---|---|---|---|---|---|---|---|---|
| **Meshy** | Hosted | GLB, FBX, OBJ, 3MF, glTF | Yes, to 8K | **Official, active** | Yes, pay-as-you-go wallet | 20 credits per full text-to-3D or image-to-3D (mesh + texture stages) | Minutes | A |
| **Hyper3D Rodin** (Gen-2) | Hosted | GLB (default), USDZ, FBX, OBJ, STL | Yes — base colour, metallic, normal, roughness | Via Blender MCP; no standalone first-party MCP found | Yes, **Business plan only** | Free $0 · Creator $30/mo (~60 models) · Business $120/mo (~416 models) · PAYG $1.50/credit | Minutes | A |
| **Tripo (Tripo3D / TripoSG)** | Hosted | GLB and others | Yes | Official MCP exists but **stale** | Yes | Credit-based | Minutes | A– |
| **TRELLIS.2** (Microsoft) | Self-host | GLB with base colour, roughness, metallic, opacity | Yes | No | Self-hosted only | Free (MIT) | 3 s @512³ · 17 s @1024³ · 60 s @1536³ on H100 | A |
| **Hunyuan3D-2.1** (Tencent) | Self-host | Mesh + PBR | Yes | Via Blender MCP integration | Self-host / third-party hosts | Free weights, restricted licence | — | A– |
| **Luma Genie** | Hosted | Mesh | Claimed | No | Unclear | Claimed from $30/mo | Sub-minute claimed | **Unverified** |
| **CSM (Common Sense Machines)** | Hosted | Mesh, physics props | Claimed | No | Yes | Not confirmed | — | **Unverified** |
| **Blockade Labs Skybox AI** | Hosted | Equirect 8K/16K, 32-bit HDRI, depth mesh | N/A (environment) | No | Yes, **Business $112/mo** | Essential $20 · Standard $48 · Business $112 | Seconds | B+ for its niche |
| **Adobe Substance 3D Sampler** | Desktop app | Materials/textures, not meshes | Yes | No | Firefly Services API separate | Adobe sub | — | B (wrong category) |
| **Runway Gen-4** | Hosted | **Video and images. No 3D.** | — | — | Yes (video/image) | — | — | **Not a 3D product** |
| **Zeroverse** | — | **Not a product** | — | — | — | — | — | **Research dataset** |

### Corrections to the brief

Two items on the list are not what the brief assumed, and saying so is more useful than padding
the table:

**Runway Gen-4 3D does not exist.** Gen-4 is a video and image model family with an API for
images and video. A targeted search for 3D asset generation via the Runway API returned nothing.
If Runway ships 3D later it will be worth revisiting; today there is nothing to install.
> Primary: runway.com/research/introducing-runway-gen-4 and the Gen-4 Image API announcement ·
> read 2026-08-18 · no 3D endpoint found

**Zeroverse is a procedurally-synthesised training dataset, not a generator.** It comes from
*LRM-Zero: Training Large Reconstruction Models with Synthesized Data* (NeurIPS 2024,
arXiv:2406.09371) — primitives with random texturing, height fields, boolean differences and
wireframes, used to show that synthetic data can train a reconstruction model competitive with
Objaverse-trained ones. There is no product, no API and nothing to install. Interesting, and
irrelevant to this decision.
> Primary: desaixie.github.io/lrm-zero and arXiv:2406.09371 · read 2026-08-18

**Luma Genie could not be verified.** Every result returned was an SEO aggregator page
("Review 2026", "Pricing & Alternatives") with no primary Luma documentation confirming current
availability, pricing or API status. Luma's publicly visible momentum is in video (Dream Machine /
Ray). Marked **unverified**, not recommended — not because it is bad, but because I could not
establish what it currently is.

**CSM could not be verified either.** Cube 2.0 is real and the platform exists; current pricing
and API terms were not obtainable from primary sources in this pass. Marked **unverified**.

### Maturity, measured rather than asserted

Star counts and last-push dates decide whether an MCP is a tool or a liability. Pulled live from
the GitHub API:

```
Measured: api.github.com, 2026-08-18
  ahujasid/blender-mcp                 26,011 ★   pushed 2026-08-16   MIT
  microsoft/TRELLIS.2                  10,685 ★   pushed 2026-07-10   MIT
  Tencent-Hunyuan/Hunyuan3D-2.1         3,863 ★   pushed 2025-10-17   NOASSERTION (custom)
  VAST-AI-Research/tripo-mcp              191 ★   pushed 2025-04-14   MIT
  meshy-dev/meshy-mcp-server               35 ★   pushed 2026-08-17   MIT
```

```
Measured: registry.npmjs.org + api.npmjs.org, 2026-08-18
  @meshy-ai/meshy-mcp-server   v0.4.0   published 2026-06-24   MIT   952 downloads/week
```

The official Tripo MCP has not been pushed in **16 months** and its own README describes it as
alpha. The Meshy MCP was pushed **yesterday**. Low star count on a vendor's own server is normal
and not disqualifying; a 16-month gap is.

### Licence trap worth naming

Hunyuan3D-2.1's licence is not a standard open-source licence, which is why GitHub reports it as
`NOASSERTION`. Two clauses matter:

> "Territory shall mean the worldwide territory, excluding the territory of the European Union,
> United Kingdom and South Korea."

> "If … the monthly active users of all products or services made available by or for Licensee is
> greater than 1 million monthly active users … You must request a license from Tencent."

> Primary: raw.githubusercontent.com/Tencent-Hunyuan/Hunyuan3D-2.1/main/LICENSE · read 2026-08-18

The MAU threshold is irrelevant at Vertex's scale. **The territorial exclusion may not be.** If
Vertex operates from the UK or EU, that clause needs a lawyer's read before Hunyuan3D output goes
into a client deliverable — including via the Blender MCP integration, which exposes Hunyuan3D as
one of its generation backends. Tencent does disclaim ownership of outputs ("Tencent claims no
rights in Outputs You generate"), which helps, but the territorial restriction is on the licence
to *use the model*, and that is upstream of output ownership.

Flagging this as a **blocker to confirm, not a blocker**. It is one question to a solicitor, and
until it is answered the safe move is to leave the Hunyuan3D checkbox off in Blender MCP and use
Meshy or Rodin instead. Both are hosted services with ordinary commercial terms and no territorial
carve-out.

### Table — Category A ranked

| Rank | Option | Why |
|---|---|---|
| 1 | **Meshy** | Only first-party MCP in this category under active maintenance (pushed 2026-08-17). Pay-as-you-go API wallet with no monthly floor. 24 tools including remesh, retexture, rig, animate — the post-processing tools matter as much as generation. Auto-saves to a local `meshy_output/` tree with metadata, which is exactly the provenance trail client work needs. |
| 2 | **Hyper3D Rodin (Gen-2)** | Output quality is at the top of the category and PBR is proper four-map. But API access gates behind the **$120/mo Business plan** — Free and Creator tiers do not include API access. Reachable without that subscription *through Blender MCP*, which is the sane way in. |
| 3 | **TRELLIS.2** | Best open-weight option, MIT, PBR, fast on adequate hardware. Ranked third only because **it cannot run here** — 24 GB VRAM and Linux-only. Worth re-ranking to #1 the day a 24 GB card or a Linux box exists. |

**Not recommended:**

- **Tripo MCP** — official server stale 16 months and self-described alpha. The API is live; the
  agent integration is not maintained. Skip until it moves.
- **Hunyuan3D-2.1** — hardware-blocked locally, and the territorial licence clause is unresolved.
- **Blockade Labs Skybox AI** — good at its job, wrong economics here. $112/mo for API access to
  generate environment maps, when Poly Haven gives away 980 CC0 HDRIs including 24K EXR for free.
  Only justified if a build needs a *stylised* environment that no photographic HDRI can supply.
- **Adobe Substance 3D Sampler** — a materials authoring tool, not a mesh generator. Real value,
  but it is a human-driven desktop app with no agent surface. Miscategorised in the brief.
- **Runway Gen-4 3D, Zeroverse, Luma Genie, CSM** — see corrections above.

---

## Category B — Pre-made 3D asset libraries

> **Deprioritised, 2026-08-18** — same reason as Category A. Poly Haven's **HDRIs** stay relevant
> even on the procedural path, since an analytic sky is not always the right environment. The
> **model** libraries drop to backup.

| Source | Catalogue | Licence | Commercial-safe for web? | MCP | API | Cost |
|---|---|---|---|---|---|---|
| **Poly Haven** | ~2,300 assets: ~980 HDRIs, ~780 textures, ~520 models | **CC0** | **Yes, unconditionally** | Yes, **inside Blender MCP** | Yes, public, **no key required** | Free |
| **ambientCG** | 2,000+ PBR materials, HDRIs, some models | **CC0** | **Yes** | No | Yes | Free |
| **Sketchfab** | 1M+ free models | Creative Commons, mostly commercial-OK, **attribution required** | Yes, with attribution discipline | Yes, **inside Blender MCP**; standalone server exists but see below | Download API — glTF, GLB, USDZ | Free tier |
| **Fab.com** (Epic; absorbed Quixel Megascans + the Sketchfab store) | Very large | Fab Standard License, Personal / Professional tiers | Yes, tier depends on revenue | No | No public asset API found | Personal tier below the revenue threshold; paid above |
| **BlenderKit** | Large | Mixed, CC0 subset | Depends per asset | Blender addon, not MCP | Yes | Free tier + subscription |
| **KitBash3D / Cargo** | 30,000+ models and materials; 480+ free with a free account | Commercial licence | Yes | No (Cargo is a desktop asset manager) | No public API | Free tier + paid |
| **CGTrader** | Large | Per-asset royalty-free | Yes | No | **Yes — documented developer API** | Per asset |
| **TurboSquid** | Large | Per-asset royalty-free | Yes | No | Not confirmed | Per asset |
| **Adobe Stock 3D** | Moderate | Adobe stock licence | Yes | No | Adobe APIs | Subscription |

### Findings that change the ranking

**Poly Haven is the correct default and it is not close.** CC0 means no attribution obligation, no
per-project licence tracking, no client indemnity conversation. The API needs no key. It is
already wired into Blender MCP as a first-class integration. For HDRIs specifically — the single
highest-leverage asset class for cinematic read — it is the best free source on the web, up to 24K
EXR/HDR.

One courtesy obligation, worth honouring:

> "If you use the live API in your product, website, or service, make it clear to your users that
> the assets came from Poly Haven, with clear credit such as labelling it in your interface or a
> small 'Powered by Poly Haven' credit."
> — Primary: polyhaven.com/our-api · read 2026-08-18

That applies to *live API use inside a shipped product*. Downloading an HDRI at build time and
baking it into a static site is not live API use. Credit anyway; it costs a line in a colophon.

**The standalone Sketchfab MCP is not safe to install.** Measured on 2026-08-18:
`gregkop/sketchfab-mcp-server` — 39 stars, **last pushed 2025-03-09** (17 months), and the GitHub
API reports **no licence**. An unlicensed dependency in a client-work pipeline is a real problem,
not a pedantic one: without a licence grant, default copyright applies and there is no permission
to use it. Sketchfab access should come **through Blender MCP**, which carries MIT and is actively
maintained.

**Sketchfab's attribution burden is the hidden cost.** Most of the 1M free models are Creative
Commons, and most CC variants require crediting author and source. That is an ongoing obligation
attached to a shipped client site, and it has to survive into the repo — which is why the asset
manifest pattern in Category I is not bureaucracy.

**Fab's licence terms could not be fully verified.** `fab.com/eula` returned HTTP 403 to automated
fetching, and the Epic developer documentation covers tier pricing without covering permitted
uses. What was established: the Professional tier is required for buyers who "generated more than
$100,000 USD in gross revenue from commercial activity in the last 12 months", and Standard
licence assets including Megascans are usable "in any game engine or tool you want."
> Primary: dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab · read 2026-08-18

What was **not** established: whether the Fab Standard License permits distributing the asset in a
form an end user could extract — which is exactly what serving a GLB to a browser does. That is a
material open question for web delivery specifically, and it is unresolved. **Read the EULA by
hand before shipping a Megascans asset in a web build.** Do not treat "free for all engines and
tools" as settled for the web case.

### Table — Category B ranked

| Rank | Source | Why |
|---|---|---|
| 1 | **Poly Haven** | CC0, no key, no attribution obligation, best free HDRI library, already integrated in Blender MCP. Zero licensing overhead is worth more than catalogue size on client work. |
| 2 | **ambientCG** | Second CC0 source, materials-heavy. Fills gaps Poly Haven does not cover. No MCP, but a plain HTTPS download in a build script is not a hardship. |
| 3 | **Sketchfab, via Blender MCP only** | The catalogue is unmatched for specific objects. Costs attribution discipline. Never via the standalone unlicensed MCP. |

**Not recommended:** standalone Sketchfab MCP (stale, unlicensed); TurboSquid and Adobe Stock 3D
(no agent surface, no advantage over the above); KitBash3D (built for film/game kitbashing at
polycounts that are wrong for web, and no API); BlenderKit (in-Blender addon, redundant once
Blender MCP is present). **Fab: hold** pending a manual EULA read for the web-distribution case.

---

## Category C — 3D modelling automation

| Tool | Agent-drivable? | MCP maturity | Relevance to web work |
|---|---|---|---|
| **Blender** via `ahujasid/blender-mcp` | **Yes** | 26,011 ★, pushed 2026-08-16, MIT, PyPI `blender-mcp` v1.8.3, Python ≥3.10 | **High** — and not for the reason people assume |
| **Godot** | Yes — several servers, one with 95+ tools | Community | Low — wrong runtime for a Next.js site |
| **Unity** | Yes — first-party server shipped; `CoplayDev/unity-mcp` ~5,800 ★ | Mature | Low — wrong runtime |
| **Unreal** | Yes — experimental first-party plugin in UE 5.8 | Emerging | Low — wrong runtime |
| **Cinema 4D** | Python/C++ scripting exists; no credible MCP found | — | Low |
| **Houdini** | Strong Python API; no credible MCP found in this pass | **Unverified** | Low for web |
| **Rhino / Grasshopper** | Scriptable; no credible MCP found | **Unverified** | Low |
| **Spline** | Browser-based authoring, exports React / vanilla JS, `@splinetool/react-spline` | No MCP | Medium — human-driven, not agent-driven |

### The Blender MCP argument, stated properly

The naive case for Blender MCP is "now the agent can model things." That is the weakest part of
its value. Agent-driven modelling from primitives in Blender produces roughly what agent-driven
modelling from primitives in Three.js produces — it moves the problem, it does not solve it.

The real case is that **Blender MCP is a hub and a compiler**, and both halves matter.

As a hub, one install exposes Poly Haven, Sketchfab, Hyper3D Rodin and Hunyuan3D behind a single
server with a single MIT licence and a single maintained codebase. That collapses four separate
integrations — three of which have maturity or licensing problems standalone — into one.

As a compiler, it is the only tool in this entire document that can take a 2M-triangle marketplace
download and turn it into something a browser should receive: decimate, retopologise, bake four
4K maps down to one 1K atlas, strip unused UV sets, apply transforms, export GLB. **That step is
mandatory and there is no agent-accessible alternative.** Without it, Category A and Category B
produce assets that cannot ship.

Two operational constraints, stated because they are real:

- **It drives a running GUI Blender instance over a socket addon.** Blender has to be open with
  the addon connected. This is an interactive-session tool; it does not fit a fully headless
  background run. Plan builds around that.
- **`execute_blender_code` runs arbitrary Python inside Blender.** The project's own README says
  so and says to save first. Treat it as what it is — a code-execution surface — and never point
  it at a `.blend` that is not disposable or committed.

> Primary: github.com/ahujasid/blender-mcp README · read 2026-08-18
> Measured: PyPI `blender-mcp` v1.8.3, `requires_python >=3.10` · 2026-08-18

**Install cost is genuinely non-trivial and the brief should say so:** Blender is not installed on
this machine. That is a ~1 GB download, an addon install, and a working session before the first
useful call. `uv` and `uvx` are already present, and Python 3.14 satisfies the ≥3.10 requirement,
so the MCP half is minutes. Budget 30–45 minutes end to end including a first successful
round-trip.

### Table — Category C ranked

| Rank | Tool | Why |
|---|---|---|
| 1 | **Blender MCP** | The only agent-accessible path from "asset exists somewhere" to "GLB a browser should download." Hub + compiler. 26k stars, pushed two days ago, MIT. |
| 2 | **Spline** | Worth knowing about, not installing. Browser-based 3D authoring that exports React components directly — from $9/mo as of May 2026. Genuinely fast for simple interactive scenes. It is a *human* tool with no MCP, and it produces work that looks like Spline work. Use it for speed, never for a signature moment. |

**Not recommended:** Godot, Unity and Unreal MCPs — all real, several mature, all the wrong runtime
for a Next.js site. Installing a game-engine MCP to build a website is a category error that costs
context window and gains nothing. Cinema 4D, Houdini, Rhino/Grasshopper — **unverified**, no
credible MCP surfaced in this pass; revisit only if a project specifically needs parametric or
procedural geometry that Blender cannot express.

---

## Category D — HDRI, texture and material libraries

| Source | Content | Licence | Cost | Access |
|---|---|---|---|---|
| **Poly Haven** | ~980 HDRIs to 24K EXR/HDR · ~780 textures to 8K · ~520 models with blend/FBX/glTF/USD | CC0 | Free | Public API, no key; Blender MCP integration |
| **ambientCG** | 2,000+ PBR materials, HDRIs, some models, to 8K | CC0 | Free | Direct download; API |
| **Quixel Megascans** (now on Fab) | Very large scanned library | Fab Standard License | Free tier historically; paid since 2025 | Fab account |
| **Poliigon** | PBR textures, models, HDRIs | Commercial | Paid | Account |
| **Substance 3D Assets** | Parametric `.sbsar` materials | Adobe licence | Adobe sub | Adobe apps |
| **HDRI Haven** | — | — | — | **Merged into Poly Haven.** Not a separate source. |

The brief lists HDRI Haven and CC0 Textures separately from Poly Haven. Both were folded into
Poly Haven years ago; there is nothing separate to evaluate. Listing them as options would be
padding.

### Table — Category D ranked

| Rank | Source | Why |
|---|---|---|
| 1 | **Poly Haven** | The HDRI library is the point. One 2K HDR at ~1–3 MB, converted to a compressed environment map, does more for cinematic read than any mesh upgrade. CC0. Free. Already in Blender MCP. |
| 2 | **ambientCG** | CC0 second source for materials. No integration needed; a `curl` in a build script is fine. |

**Not recommended:** Poliigon and Substance 3D Assets — paid, and CC0 sources already cover the
need at this scale. Megascans — **hold**, same unresolved web-distribution licence question as the
rest of Fab.

**Sizing note, because it is where HDRI use goes wrong:** do not ship a 24K EXR. For an
environment map driving reflections and IBL on a web hero, 1K–2K is the working range, converted
to a compressed format at build time. The 24K files exist for offline rendering. Shipping one to a
browser is a 100 MB mistake wearing the costume of "using the best available asset."

---

## Category E — Design-to-code MCPs

| Tool | Status | Notes |
|---|---|---|
| **Figma** | **Official, two servers.** Remote (hosted endpoint, all seats and plans, broadest feature set) and Desktop/Dev Mode (`http://127.0.0.1:3845/mcp`, Dev or Full seat on paid plans) | Claude Code explicitly supported and documented |
| **Penpot** | **Official.** The standalone `penpot/penpot-mcp` repo was archived 2026-02-03 and folded into the main Penpot repo under `/mcp` | Open source, MPL-2.0 parent repo, 58,847 ★, pushed 2026-08-18. Read *and write* — design-to-code and code-to-design |
| **Framer** | Exists; one of the few design MCPs that writes back to design | **Unverified** — no primary Framer documentation read in this pass |
| **Sketch** | macOS only | Irrelevant on Windows. Flagging as the brief asked: not applicable |
| **Canva, Webflow** | Exist per aggregator listings | **Unverified**, and off-stack |

> Primary: developers.figma.com/docs/figma-mcp-server and help.figma.com Claude Code article ·
> read 2026-08-18
> Primary: help.penpot.app/mcp and github.com/penpot/penpot · read 2026-08-18
> Measured: api.github.com penpot/penpot — 58,847 ★, pushed 2026-08-18 · 2026-08-18

### Table — Category E ranked

| Rank | Tool | Why |
|---|---|---|
| 1 | **Figma remote MCP** | Only if Figma is actually in the workflow. Official, documented for Claude Code, works on all seats and plans. |
| — | Everything else | No ranking, because the honest answer is below. |

**Not recommended right now — and this is a scope call, not a quality call.** Vertex's stated
method builds in code, not static comps: *"Build in code, not static comps. A prototype the client
can drag and click beats a frame they can only look at."* A design-to-code MCP converts comps into
code. If there are no comps, it converts nothing. Installing Figma MCP for the `vertexapps.dev`
build would be installing a bridge to a place nobody is standing.

Revisit the moment a client arrives with an existing Figma file — at which point the remote server
is a five-minute install and clearly the right one. Penpot is the pick if an open-source,
self-hostable design tool ever enters the stack; its write-back capability is genuinely more
interesting than Figma's read-only surface, but adopting a design tool to justify an MCP is
backwards.

---

## Category F — Image generation for textures and references

| Tool | MCP | API | Notes |
|---|---|---|---|
| **fal.ai** | Multiple community servers; one exposes 600+ models | Yes | No single canonical first-party MCP identified — the field is fragmented across `enescanguven/fal-mcp`, `luminarylane/fal-mcp-server`, PyPI `fal-mcp-server` and others |
| **Replicate** | Community servers, incl. a streamable one scoped to image gen/edit | Yes | Same fragmentation |
| **Adobe Firefly Services** | No | Yes | Commercially indemnified output — the differentiator for client work |
| **Runway** | No | Yes (Gen-4 image + video) | Official Python and Node SDKs |
| **Midjourney** | No | **No public API** | Best-in-class stills, human-in-the-loop only |
| **Kling** | No | Yes | Video |

### Where this category actually fits

The skill already carries the licensing analysis for generated imagery in `generative.md`, and its
conclusion is the operative one: **generated imagery for client deliverables is a licensing
decision before it is a creative one.** Nothing found in this pass changes that.

What is worth separating is **reference generation** from **shipped assets**, because the two have
completely different risk profiles:

- **Reference and elicitation** — generating 3–4 aesthetic directions for a client to react to, per
  the skill's Rule 8 loop. Output never ships. Licensing barely matters. Any of these tools works,
  and the client can run them in their own tool of choice, as the skill already prescribes.
- **Shipped textures** — a generated texture baked into a GLB that ships on a client site. This is
  a real asset with real provenance requirements, and it lands squarely in `generative.md`'s
  indemnification analysis.

The fragmentation across fal.ai and Replicate community MCPs is a genuine reason to hold off. There
is no single obviously-correct server, several are thin wrappers around one model, and installing
an unmaintained wrapper to reach an API that a 15-line fetch could reach is bad economics.

### Table — Category F ranked

| Rank | Tool | Why |
|---|---|---|
| 1 | **Direct API call, no MCP** | fal.ai and Replicate both have clean HTTP APIs. A small script in the repo beats a community MCP of unknown maintenance for a call made a handful of times per project. |
| 2 | **Adobe Firefly Services API** | The only option here with commercial indemnification, which is the thing that matters when output ships to a client. Reach for it when generated texture is going into a deliverable. |

**Not recommended:** every fal.ai and Replicate community MCP surveyed — fragmented, redundant,
unverified maintenance. Midjourney — no API, so not automatable; still the right tool for a human
running an elicitation session, which is what `generative.md` already says.

---

## Category G — Rendering, shader and Three.js-adjacent tooling

This category turned up the most genuinely new information in the sweep.

| Tool | What it does | Maturity (measured 2026-08-18) | Verdict |
|---|---|---|---|
| **`chrome-devtools-mcp`** | Official Google server: performance traces, Core Web Vitals insights, network, console with source-mapped stacks, screenshots | v1.7.0 published 2026-08-10 · Apache-2.0 · **2,322,781 downloads/week** · 49,367 ★ · pushed today | **Install** |
| **`@upstash/context7-mcp`** | Version-specific, current library documentation on demand | **1,169,818 downloads/week** | **Install** |
| **`@playwright/mcp`** | Microsoft official browser automation via accessibility tree | **4,819,822 downloads/week** | Already covered |
| **`threejs-devtools-mcp`** | 59 tools: inspect and edit a live Three.js scene — objects, materials, shaders, textures, animations, perf and memory | v0.4.1 published 2026-03-23 · MIT · **222 downloads/week** · 85 ★ · pushed 2026-04-07 | **Watch** |
| **`mcp-three`** (basement studio) | `gltfjsx` + `get-model-structure` — GLB → R3F JSX components with TS types, instancing, texture optimisation | v0.1.4 published 2025-07-12 · **no licence field** · **19 downloads/week** · 24 ★ · pushed 2025-08-13 | **Skip the MCP, use the CLI** |
| **React Three Fiber docs MCP** | pmndrs docs over MCP at `docs.pmnd.rs/api/sse`; `llms.txt` published | First-party | Useful, low cost |
| **Spector.js** | WebGL/WebGL2/WebGPU frame capture, decompiled shaders, per-draw-call state | Babylon.js project, long-standing | Browser extension; an MCP is claimed but **unverified** |
| **Needle Inspector** | Three.js frame/shader inspection incl. TSL node materials | Commercial | **Unverified** |
| Godot / Bevy MCPs | Game engines | Real | Wrong runtime |

### Two things worth saying plainly

**`chrome-devtools-mcp` is the highest-confidence install in this entire document, and it is not a
3D tool.** 2.3M downloads a week, official Google, Apache-2.0, pushed today. The skill treats Core
Web Vitals as a release gate on conversion-critical pages. This server turns that gate from a
manual step into something the agent can run and read. For WebGL work specifically — where the
failure mode is a beautiful hero that costs 4 seconds of LCP — having trace-level feedback inside
the loop is worth more than another asset source.

It also partly addresses the known verification gap. The standing problem is that `requestAnimationFrame`
does not fire in the available headless browser surfaces, so canvas work cannot be looked at
without a dev-only single-frame hook. A real Chrome under CDP with performance tracing is a
different instrument, and worth testing against that specific failure before assuming the hook is
still mandatory. **Stated as a hypothesis to test, not a fix.**

**`threejs-devtools-mcp` is the most interesting thing found and should not be installed yet.**
59 tools for live scene inspection is exactly the missing capability — being able to ask "what is
actually in this scene, what does this material resolve to, where is the memory going" instead of
inferring from source. But 222 downloads/week and 85 stars on a 0.4.x release is a young project,
and last push was 2026-04-07, four months ago. Watch it. Re-check in a cycle. Do not put it in a
client pipeline on current evidence.

**`mcp-three` from basement studio is dormant** — 12 months since last push, 19 downloads/week, no
licence declared. Notable because basement studio is already in the skill's measured reference set,
so the temptation to trust the name is real. The underlying capability — GLB to R3F JSX — is
genuinely needed, and it is available as the standalone `gltfjsx` CLI without the MCP wrapper or
the licence ambiguity. Take the capability, leave the server.

### Table — Category G ranked

| Rank | Tool | Why |
|---|---|---|
| 1 | **`chrome-devtools-mcp`** | Official, Apache-2.0, 2.3M downloads/week, pushed today. Turns the Core Web Vitals release gate into an in-loop instrument. Zero cost. |
| 2 | **`@upstash/context7-mcp`** | Three.js moves fast and its API surface has churned hard through the TSL/WebGPU transition. Current docs on demand is the cheapest available defence against confidently-wrong r1xx API calls. |
| 3 | **R3F docs via `llms.txt` / pmndrs MCP** | First-party, near-zero cost, same drift problem. |

**Not recommended yet:** `threejs-devtools-mcp` (watch), `mcp-three` (dormant and unlicensed —
use `gltfjsx` CLI instead), Spector.js MCP and Needle Inspector (**unverified**), Godot/Bevy
(wrong runtime).

---

## Category H — Web performance and asset optimisation

No MCPs here, and that is the correct answer rather than a gap. These are CLI tools that belong in
`package.json` scripts, where they are versioned, reproducible and reviewable.

| Tool | Role | Status (measured 2026-08-18) |
|---|---|---|
| **`@gltf-transform/cli`** | Inspect, optimise, convert glTF/GLB. Draco, Meshopt, KTX2/Basis (UASTC and ETC1S), texture resize, dedupe, prune | **v4.4.2 published 2026-07-25 · MIT · first published 2018-12-19** — mature and actively maintained |
| **`gltfpack`** (meshoptimizer) | Aggressive mesh optimisation + Meshopt encoding | Long-standing |
| **Draco** | Geometry compression, best ratios, heavier decoder | Via gltf-transform |
| **Meshopt** | Comparable ratios to Draco with gzip, much faster decode, lighter client | Via gltf-transform |
| **KTX2 / Basis Universal** | GPU-native compressed textures — cuts both download size and VRAM | Via gltf-transform |
| **`sharp` / `squoosh`** | WebP/AVIF for reference and fallback imagery | Standard |
| **FFmpeg** | Video encode, only if video survives the skill's default-to-no gate | Standard |
| **`@next/bundle-analyzer`** | Bundle composition | Standard |

### The one non-obvious call

**Prefer Meshopt over Draco for web heroes.** Draco reaches slightly better raw compression ratios,
but its decoder is heavier and decode is slower — and on a hero, decode time lands directly in the
critical path between first paint and the scene appearing. Meshopt combined with gzip gets to
comparable ratios with materially faster decode and a lighter client-side decoder. On a page where
the whole argument is that it feels expensive and immediate, decode latency is a design defect, not
an engineering detail.

**KTX2 is the bigger win and the more commonly skipped one.** Textures are usually the heaviest
part of a model, and KTX2/Basis cuts download size *and* GPU memory, where a JPEG in a GLB gets
decompressed to raw RGBA on the GPU. A build that Draco-compresses geometry and ships JPEG textures
has optimised the smaller half.

### Table — Category H ranked

| Rank | Tool | Why |
|---|---|---|
| 1 | **`@gltf-transform/cli`** | Single dependency covering geometry compression, texture transcoding, dedupe and prune. MIT, maintained since 2018, published three weeks ago. The most load-bearing tool in this document. |
| 2 | **`gltfpack`** | Reach for it when gltf-transform's Meshopt pass is not aggressive enough. |
| 3 | **`sharp`** | Reference imagery and fallback frames. |

**Not recommended:** wrapping any of these in an MCP. They are deterministic CLI steps that belong
in a build script, and turning them into tool calls makes them less reproducible, not more.

---

## Category I — Non-MCP capability boosters

This is where the largest quality delta sits, and it costs nothing to install.

### I.1 — The asset budget is a hard gate, stated in the brief

The failure this prevents: a genuinely better mesh lands, the hero looks superb locally, LCP goes
to 4.2 s on a mid-tier phone, and the fix is to throw the asset away and start again.

State the budget **before** acquiring the asset, in the brief, alongside the fidelity tier:

```
Hero asset budget
  Total 3D payload (GLB + env map + decoders)  ≤ 900 KB over the wire
  Draw calls at steady state                    ≤ 30
  Triangles                                     ≤ 150k
  Textures                                      1 atlas, ≤ 1K, KTX2
  Environment                                   1 HDR, ≤ 2K, compressed
  First paint                                   SVG/CSS fallback — zero WebGL cost
```

Those specific numbers are a **starting proposal, not measured** — they are derived from the
skill's existing figure that photoreal PBR + HDRI + fog adds ~50–80 KB gz over raw Three.js, plus
ordinary LCP arithmetic. They need a repro pass before they enter the skill as fact. What is not
provisional is the *practice* of writing a budget down before acquiring, which costs nothing and
prevents the most expensive failure in this pipeline.

### I.2 — Never ship a third-party mesh unprocessed

Every asset from Categories A, B or D passes through the same pipeline before it enters `public/`:

```
acquire → inspect → decimate/retopo → bake to single atlas → export GLB
        → gltf-transform (meshopt + KTX2 + prune + dedupe) → measure → commit
```

`gltf-transform inspect` on the raw download, before anything else, is the two-minute step that
tells you whether the asset is viable at all. Most marketplace assets are not, and finding that out
first is worth more than finding it out after texturing work.

### I.3 — The asset provenance manifest

A committed `public/models/ASSETS.md`, one row per third-party asset: source URL, author, licence,
attribution text required, date acquired, and what was done to it.

This is not bureaucracy. Sketchfab's CC licences carry attribution obligations that attach to the
shipped client site; Fab's terms differ by revenue tier; Hunyuan3D's carry a territorial
restriction; Poly Haven's CC0 carries none. Six months later, in a handover or a client's legal
review, "where did this model come from and what are we obliged to do" must be answerable in
seconds. The skill already takes the position that a client's legal exposure is reported promptly
and in writing — this is the same principle applied upstream, where it is cheap.

### I.4 — Signature moment before fidelity, restated for asset-driven builds

The skill's Rule 4a says one signature moment beats general interactivity, and Rule 6a says
second-attempt failures usually indicate a wrong concept rather than insufficient fidelity.

Better assets make it *easier* to mistake fidelity for the problem, because there is now a visible
lever to pull. A photoreal mesh with no signature moment is a more expensive version of pleasant.
Name the signature moment in the brief, before acquiring any asset, and let it determine what asset
is needed — rather than acquiring an impressive asset and hunting for a moment afterwards.

### I.5 — The verification pattern stays mandatory until proven otherwise

Canvas and WebGL work cannot be verified by screenshot in the available headless surfaces because
`requestAnimationFrame` does not fire there. The established workaround is a dev-only single-frame
render hook. `chrome-devtools-mcp` may change this. Until that is tested against a real Three.js
scene and confirmed, **the hook stays mandatory**. Never describe a rendering nobody has looked at.

### Table — Category I ranked

| Rank | Practice | Cost | Impact |
|---|---|---|---|
| 1 | Asset budget in the brief, before acquisition | 0 | Prevents the most expensive failure mode in the pipeline |
| 2 | Mandatory optimisation pipeline, no exceptions | 0 | Difference between shippable and not |
| 3 | `ASSETS.md` provenance manifest | ~2 min/asset | Client legal exposure, handover quality |
| 4 | Signature moment named before asset acquisition | 0 | Decides whether the asset was the right one |

---

## Category J — Adjacent capability worth naming

| Tool | Category | Status | Relevance |
|---|---|---|---|
| **`chrome-devtools-mcp`** | Perf / debug | Official, 2.3M/wk | **Highest-value install in this document** |
| **`@playwright/mcp`** | Browser automation | Official Microsoft, 4.8M/wk | Accessibility-tree-based; overlaps existing browser tooling. Note the measured token economics below |
| **ElevenLabs MCP** | Sound | Official server; MIT; free tier 10,000 credits/mo; SFX to 30 s, seamless looping, 48 kHz; royalty-free commercial on paid plans | **Genuinely underrated.** A single well-made interaction sound is a signature moment for near-zero bytes |
| **Rive** | Motion | Mature; ~200 KB gz web runtime incl. WASM vs lottie-web ~60 KB | Interactive state machines with data binding. Real, and the runtime cost is real |
| **Lottie / dotLottie** | Motion | Mature; state machines added late 2025 | Lighter runtime, less capable |
| **Context7** | Docs currency | 1.17M/wk | Defence against API drift |

**One measured note on Playwright MCP worth carrying forward:** a typical browser automation task
consumes roughly **114,000 tokens via MCP versus 27,000 via the `@playwright/cli` companion** — a
~4× difference. On long interactive sessions that is a material context cost, and it is a good
general argument for preferring a CLI over an MCP whenever the interaction is deterministic.
> Secondary: multiple 2026 Playwright MCP write-ups · read 2026-08-18 · single-sourced figure,
> treat as indicative rather than measured

**The ElevenLabs case, since it is the least obvious item here.** The skill's Rule 4a lists "the
button that clicks with sound" among the canonical signature moments. Sound is the cheapest
signature moment available by an enormous margin — a 40 KB audio file against a 900 KB asset
budget — and almost nobody does it, which is exactly what makes it register. Free tier covers the
handful of generations a hero needs. Gate it behind an explicit unmute control; autoplaying audio
is its own non-negotiable failure.

---

## Category K — Multi-scene and room-transition architectures

### The finding that decides this category

**The "portfolio IS the game" archetype does not use URL routing at all.** Measured on
bruno-simon.com, 2026-08-18: nineteen anchors on the page, **all nineteen external** — three.js,
Rapier, Howler, the source repo, font specimens, Discord. Zero internal routes. `screensDeep: 1`.
One canvas. It is a single persistent world with an internal zone system, not a router with scenes
behind it.

That matters because the obvious Next.js instinct — one App Router route per room, a `<Canvas>` in
each — is the architecture that fails hardest, and it fails for a mechanical reason:

> "Recreating WebGLRenderer on every route change or canvas mount/remount leaks GPU contexts unless
> explicitly released via `renderer.dispose()`. `scene.clear()` removes objects from the graph but
> doesn't dispose memory."

Browsers cap live WebGL contexts (commonly around 16). A route-per-room app that mounts a new
`<Canvas>` per navigation exhausts them, and the failure presents as "context lost" several rooms
in — after the build looks finished.

> Source: three.js manual "How to dispose of objects" + three.js forum disposal threads ·
> read 2026-08-18 · decay: 2y

### The two viable architectures

| | **A — Persistent canvas, swapped contents** | **B — Single world, internal zones** |
|---|---|---|
| Canvas | One, mounted above the router, never unmounts | One, no router involved |
| Navigation | App Router route drives which scene graph is mounted | Camera/player moves through one continuous world |
| URL | Real URLs per room, shareable, SEO-addressable | Single URL (or hash/`pushState` for deep links) |
| Asset loading | Per-route chunk, `useGLTF.preload` on hover/adjacency | Zone-based streaming with a shared shell |
| Disposal | **Mandatory and explicit** on every transition | Rarely — assets stay resident, quality tiers instead |
| Reference | **basement.studio** (three + next, measured) | **bruno-simon.com** (three only, measured) |
| Fits Vertex stack | Yes — Next App Router native | Yes, but Next becomes a shell around a non-React app |

**Measured evidence for A.** basement.studio runs `three` + `next` with **2 canvases**, and its 3D
payload differs by route: home ships **31 3D files / 2,909 KB**, `/showcase` ships **49 files /
5,605 KB**, with shared models (`contactPhone-bee96b6d.glb`) appearing on both. Filenames are
content-hashed, which means a real build pipeline emits them. That is per-route asset splitting
with a shared cache, in production, on Ryan's exact stack.

**Measured evidence for B.** bruno-simon.com ships **23 3D files totalling 974 KB** for an entire
drivable world. The source is public and MIT: `github.com/brunosimon/folio-2025`. Its
`sources/Game/` directory contains `Zones.js`, `Map.js`, `InstancedGroup.js`, `ResourcesLoader.js`,
`Quality.js`, `RayCursor.js`, `InteractivePoints.js`, plus `Physics/`, `Audio.js` and `Noises.js`.
Vite, vanilla Three.js, Rapier for physics, Howler for audio, TSL shading (the instrumentation
recorded `Three.js r183 - Node System` in the shader headers).

> Measured: bruno-simon.com and basement.studio · `docs/whole-page-narrative-refs/` instrumentation
> dumps dated 2026-08-17 · architecture read from the MIT source 2026-08-18

### The number that should decide the pivot

**974 KB.** That is Bruno's entire explorable world — 23 files, measured.

Compare: Active Theory ships **12,496 KB of 3D** (50 files) and **187,139 KB of video**. Immersive
Garden ships **9,926 KB of 3D**. Igloo ships **12,656 KB**.

The gap is not quality, it is **instancing**. Bruno's asset filenames give it away:
`respawns/respawnsReferences-compressed.glb` is **2,836 bytes**;
`bushes/bushesReferences-compressed.glb` is **25,588 bytes**. Those are not meshes — they are
*reference* files carrying instance transforms, consumed by `InstancedGroup.js`. One bush mesh,
placed a thousand times, costs one mesh plus a transform list.

**A multi-room ship is the ideal case for this.** Ship interiors are overwhelmingly repeated
geometry: the same panel, the same conduit, the same crate, the same light fitting, rotated and
placed. Modelled as instanced kit-of-parts, a six-room ship is plausibly *smaller* than one
bespoke hero object modelled as a single dense mesh.

That single finding is what makes the pivot technically viable rather than reckless.

### Lazy loading and disposal — the mechanics

**Loading.** `useGLTF.preload(url)` warms an asset before it is needed; drei's `<Preload all />`
precompiles shaders via `gl.compile()` so the first frame after a transition is not a stutter.
Known conflict, documented: **`<Preload>` and `useGLTF.preload()` used together can leave GLTF
shaders un-precompiled** (pmndrs/drei issue #1985). Pick one path and verify shader compile
actually happened.

Practical pattern for rooms: preload the *adjacent* rooms only. On entering room 3, warm 2 and 4,
dispose 1 and 5. Adjacency is cheap to compute and keeps resident memory flat regardless of ship
size.

**Disposal.** `scene.clear()` is not enough. The sequence that actually frees GPU memory:

```
traverse the departing subtree
  → geometry.dispose()
  → material.dispose()   (and every texture the material references)
  → texture.dispose()
  → for GLTF ImageBitmap textures also: texture.source.data.close?.()
never renderer.dispose() unless the canvas itself is going away
verify with renderer.info.memory.{geometries,textures} and .programs
```

`renderer.info` is the leak detector. If geometry and texture counts do not return to baseline
after leaving a room, the disposal is incomplete — and that check is trivially automatable, which
makes it a build gate rather than a hope.

### drei `<View>` — the third option worth naming

drei's `<View>` uses `gl.scissor` to cut one canvas into segments, each tied to a tracking DOM
element that controls its position and bounds. Multiple independent scenes, one canvas, one
context, DOM-driven layout.

For a ship this is not the room system — it is the right tool for a **room-selection screen**: a
deck plan where each compartment is a live 3D thumbnail, laid out by CSS grid, without paying for
six WebGL contexts.

### Table — Category K

| Pattern | Contexts | Disposal burden | URL/SEO | Best for |
|---|---|---|---|---|
| Persistent canvas + route-swap | 1 | **High, explicit** | Real URLs | Multi-room with shareable rooms |
| Single world + internal zones | 1 | Low | One URL | Continuous explorable space |
| Canvas per route | **N — fails** | Fatal | Real URLs | **Nothing. Do not.** |
| drei `<View>` scissor | 1 | Low | N/A | Multi-thumbnail selection screens |

**Ranked recommendation:** **persistent canvas above the App Router, route-driven scene swap, with
explicit disposal and adjacency preloading.** It keeps real URLs (a portfolio needs shareable
deep links), keeps one GL context, and matches the pattern basement.studio is already running in
production on `three` + `next`. Borrow Bruno's *instancing and zone* thinking for asset structure
without borrowing his no-router architecture.

**Not recommended:** a `<Canvas>` per route (context exhaustion, guaranteed); `pmndrs/react-three-next`
as a starter — **2,862 ★ but last pushed 2024-06-21**, over two years stale and predating current
App Router practice. Read it for ideas, do not scaffold from it.

---

## Category L — Free navigation, character controllers and physics

### Measured maturity

```
Measured: registry.npmjs.org + api.npmjs.org + api.github.com · 2026-08-18

  three-mesh-bvh          v0.9.14  pub 2026-08-01  MIT   3,396,948 dl/wk   3,451 ★  pushed 2026-08-10
  @dimforge/rapier3d-compat v0.20.0 pub 2026-08-08 Apache-2.0 5,672,326 dl/wk        (engine)
  @react-three/rapier     v2.2.0   pub 2025-11-03  MIT      99,835 dl/wk   1,423 ★  pushed 2025-11-03
  ecctrl                  v2.0.1   pub 2026-08-17  MIT       2,703 dl/wk     777 ★  pushed 2026-08-17
  pmndrs/BVHEcctrl                                 MIT                       139 ★  pushed 2025-08-14
  cannon-es               v0.20.0  pub 2022-08-12  MIT      72,243 dl/wk   2,051 ★  pushed 2024-01-06
  @react-three/cannon     v6.6.0   pub 2023-08-17  MIT      13,871 dl/wk
```

### Three findings that settle the choices

**cannon-es is effectively dead.** Last npm publish **2022-08-12** — four years. Repo last pushed
2024-01-06. `@react-three/cannon` last published 2023-08-17. It still gets 72k downloads a week
through inertia and old tutorials. Rapier is the only live option, and Bruno's 2025 portfolio
credits Rapier explicitly.

**Rapier's React wrapper lags the engine badly.** `@dimforge/rapier3d-compat` publishes on a
current cadence (2026-08-08, 5.7M downloads/week). `@react-three/rapier` last published
**2025-11-03** — nine months. Not dead, but the wrapper is where the risk sits, not the engine.
Worth knowing before betting a build on it.

**`ecctrl` 2.0 is genuinely current** — v2.0.1 published **2026-08-17**, one day before this pass,
777 stars, MIT. It covers character, vehicle, drone and custom-gravity controllers with touch
controls and runtime animation states. It is the only maintained off-the-shelf R3F character
controller found.

### The trade-off that actually matters: do you need a physics engine at all?

**A ship interior is static geometry and the player walks on it.** No falling crates, no
ragdolls, no vehicle dynamics. For that case a full rigid-body solver is 500 KB of WASM buying
almost nothing.

`three-mesh-bvh` does capsule-vs-mesh `shapecast` collision directly against the level geometry —
which is exactly how its own character-controller example works, and what `pmndrs/BVHEcctrl` wraps.
At 3.4M downloads/week and MIT it is far more proven than any controller wrapper.

| Need | Use | Cost |
|---|---|---|
| Walk on static ship geometry, no dynamics | **`three-mesh-bvh` capsule shapecast** | ~0 extra (BVH already wanted for raycast) |
| Anything that falls, tips, rolls, or is driven | **Rapier** via `@react-three/rapier` | ~500 KB WASM compressed, async init |
| Off-the-shelf third-person character | `ecctrl` (requires Rapier) | 500 KB + controller |

**The BVH is wanted anyway** for hover raycasting on detailed geometry (Category M), so using it
for collision too is close to free. That is the recommendation for a walkable ship: **BVH
collision, no physics engine**, unless the design specifically calls for dynamics.

### Navigation modes — the trade-off analysis Ryan asked for

| Mode | Wow ceiling | Mobile | Accessibility | Build effort | Motion-sickness risk |
|---|---|---|---|---|---|
| **First-person WASD** | Highest | **Poor** — twin-stick on glass is bad | **Worst** — see below | High | **High** |
| **Third-person follow** | High (Bruno) | Fair with touch controls | Poor–fair | High | Moderate |
| **Click-to-teleport** | Moderate–high | **Good** | **Good** — discrete, keyboardable | Moderate | **Low** |
| **Orbit-per-room** | Moderate | **Good** | **Good** | **Low** | **Lowest** |

**The accessibility problem with free navigation is real and the skill's non-negotiables do not
wave it away.** Continuous first-person camera motion driven by pointer movement is a known
vestibular trigger; a portfolio that induces nausea has failed at the thing it was demonstrating.
And "every interactive element reachable and operable by keyboard, with a visible focus indicator"
is genuinely hard to satisfy when the interactive elements are objects in a 3D world reached by
walking. `prefers-reduced-motion` must **skip** the effect, not slow it — which for a free-nav
build means shipping a completely different, non-continuous navigation path for those users.

**That second path is not optional, and it is a substantial part of the build cost.** Any estimate
for free navigation that does not include building the reduced-motion alternative is wrong.

**Recommendation: click-to-teleport between fixed camera stations, with orbit-and-inspect within
each station.** It reaches most of the wow of free navigation, it is discrete (so keyboard
navigation is natural — Tab between stations, Enter to travel), it is genuinely usable on a phone,
its reduced-motion variant is a cross-fade instead of a dolly rather than a separate system, and it
is roughly half the build of full free-nav. If the brief insists on free walking, budget the second
navigation path explicitly.

**Not recommended:** cannon-es and `@react-three/cannon` (dormant); full first-person WASD as the
*only* navigation path (accessibility and mobile exposure); `@react-three/offscreen`
(v0.0.8, last published 2023-05-11).

---

## Category M — Interactive objects, hover and in-scene UI

| Approach | Renders as | Cost | Best for |
|---|---|---|---|
| **drei `<Html>`** | Real DOM over the canvas | DOM sync per frame; `occlude="blending"` to hide behind geometry | A handful of labels, links, real text inputs |
| **`@react-three/uikit`** | **WebGL geometry** — flexbox layout inside the scene | No DOM sync; scales to many elements | **Ship computer terminals, in-world panels** |
| **drei `<Hud>`** | Separate scene, rendered over | Cheap | Fixed overlays that must ignore world camera |
| **CSS3DRenderer hybrid** | DOM in 3D transform space | Two render paths, no depth interaction with WebGL | Legacy; rarely the right call now |
| **drei `<Bvh>`** | — | Wraps a subgraph, computes `boundsTree`, assigns `acceleratedRaycast` | **Mandatory** for hover on detailed geometry |
| **drei `useCursor`** | — | Trivial | `cursor: pointer` feedback on hover |

### The call

**`@react-three/uikit` for in-world panels, `drei <Html>` only where real DOM is required.**

uikit renders UI as WebGL geometry with flexbox layout, and ships pre-styled component sets
(`@react-three/uikit-default`, based on shadcn — which sits directly on Ryan's existing stack
vocabulary). Because it never touches the DOM, it survives arbitrary camera angles, depth-sorts
correctly against ship geometry, and does not pay the per-frame position-sync cost that bites
`<Html>` at scale — the documented failure being that updating hundreds of HTML element positions
inside a 16 ms budget adds real overhead.

**One flag, and it is a real one: `pmndrs/uikit` reports its licence as `NOASSERTION` on the GitHub
API** (measured 2026-08-18, 3,234 ★, pushed 2026-08-03). A LICENSE file exists but the terms were
not machine-readable in this pass. Per the licence rule in the skill draft, **read that file by
hand before it enters client work.** Almost certainly MIT like the rest of pmndrs, but "almost
certainly" is not a licence grant.

**`<Bvh>` is not optional.** Hover states on a detailed ship interior mean raycasting against
hundreds of thousands of triangles every pointer move. three-mesh-bvh reports casting 500 rays
against an 80,000-polygon model at 60 fps; the naive raycaster does not survive that. Wrap the
interactive subtree in `<Bvh>` and the problem disappears.

### Making a 3D panel feel like clickable UI

The failure mode is a panel that is visually beautiful and reads as scenery. Four things fix it,
all cheap:

**Cursor change on hover** (`useCursor`) — the single strongest affordance signal, and the skill
already treats `cursor: grab` as worth more than any autoplay. **Hover response within one frame**
— emissive lift, slight scale, a rim highlight. Latency to feedback is a design defect (Rule 7).
**Sound on hover and on commit** — two different short samples. This is where ElevenLabs earns its
place; RESN ships **7,619 KB of mp3**, measured, and it is a large part of why that site reads as a
machine rather than a page. **A focus path that is not the pointer** — interactive points need to
be Tab-reachable with a visible indicator, which is far easier when they are discrete stations
(Category L) than when they are objects you walk up to.

Bruno solves the same problem with `RayCursor.js` and `InteractivePoints.js` as named subsystems —
worth reading, it is MIT.

---

## Category N — Portfolio-as-game reference architectures

All figures measured. Site instrumentation from `docs/whole-page-narrative-refs/` (dumps dated
2026-08-17); architecture from public source where available, read 2026-08-18.

| Site | Shader programs | GLSL chars | 3D payload | Total wire | Stack | Nav pattern |
|---|---|---|---|---|---|---|
| **bruno-simon.com** | 78 | 498,072 | **23 files / 974 KB** | 7,044 KB | three r183 **TSL**, Rapier, Howler, Vite. **No React** | Drive a vehicle, continuous world, zones |
| **activetheory.net** | 124 | 754,339 | 50 files / 12,496 KB | **205,580 KB** (187,139 KB video) | Custom engine, no three detected | Curated camera, video-led |
| **basement.studio** | 37 | 484,393 | 31 files / 2,909 KB (home) · 49 / 5,605 KB (showcase) | 12,382 KB | **three + next** | Scroll, route-split 3D |
| **immersive-g.com** | 46 | 553,385 | 46 files / 9,926 KB | 60,577 KB (37,980 KB video) | three + **nuxt** | Curated camera |
| **resn.co.nz** | 6 | 58,407 | `.obj`, 188 KB | 27,831 KB (**7,619 KB mp3**) | three + gsap | Interactive toy, 1 DOM interactive element |
| **igloo.inc** | 90 | 1,042,176 | 50 files / 12,656 KB | 15,690 KB | three, **all KTX2** incl. fonts as datatextures | Scroll |
| **60fps.fr** | 3 | 9,772 | 49 KB glb | 13,331 KB (12,234 KB mp4) | three + **svelte** | Scroll + video |

### What each one teaches

**bruno-simon.com — the archetype, and the cheapest of them all.** 974 KB of geometry for a whole
world, via instancing (`InstancedGroup.js`, `*References-compressed.glb` transform files at 2.8 KB
and 25.6 KB). Zone-partitioned (`Zones.js`, `Map.js`), quality-tiered (`Quality.js`), streamed
(`ResourcesLoader.js`). Textures compressed with `etc1s --quality 255`. Physics via Rapier because
it is a *vehicle*. Audio via Howler with CC0 music. **Vanilla Three.js on Vite — not React.**
`loadMs` 12,419 and `screensDeep` 1: it is an application, not a page, and it does not pretend
otherwise. **MIT licensed and readable: `github.com/brunosimon/folio-2025`.**

**basement.studio — the one that matches Ryan's stack.** `three` + `next`, 2 canvases, real routes,
content-hashed 3D filenames, per-route asset splitting with shared models across routes. If
Scenario 2 goes ahead, this is the architecture to measure again in detail, because it is the
existence proof that route-driven 3D works on Next without context exhaustion. Note also 37 shader
programs against Bruno's 78 — half the shader complexity, and it still reads as elite.

**activetheory.net — the cautionary one.** 205 MB of wire traffic, 187 MB of it video, canvas
supersampled to 2160×1350 on a 1440×900 viewport. Only 94 DOM elements and 15 interactive — the
DOM is essentially empty. This is the highest-production-value site in the set and it is
economically unreproducible solo. The `assets/geometry/tree_room/structure.bin` path shows
room-partitioned geometry in a custom binary format, which is the one transferable idea.

**resn.co.nz — the sound lesson.** Six shader programs. Six. And 7.6 MB of mp3. The
"expensive machine" read there is carried by audio and interaction, not by shader complexity.
Cheapest wow-per-effort ratio in the entire set, and the most directly copyable.

**immersive-g.com — the LOD lesson.** Filenames state it outright: `bg_ultralow_draco.glb`,
`textures/ktx2/ultralow/normal_05.ktx2`. An explicit `ultralow` tier plus Draco plus KTX2. Note
one KTX2 normal map is still **2,301,978 bytes** — even a disciplined studio ships a 2.3 MB
texture, so treat "they must have optimised it" as an assumption to check, not a given.

**igloo.inc — the everything-is-a-texture lesson.** All assets KTX2, *including fonts*
(`IBMPlexMono-Medium-datatexture.ktx2`, 110,330 bytes). 27 DOM elements total. 1,042,176 GLSL chars.
Beautiful, and a maintenance surface no solo practice should sign up for.

### Awwwards context

Awwwards Site of the Year 2025 went to **Messenger** — a WebGL planet with a delivery character,
GPU-driven physics and lighting. Bruno Simon's 2025 portfolio took Site of the Month in January
2026, with spatialised audio and a drivable handcrafted world.
> Secondary: Awwwards listings and 2026 roundups · read 2026-08-18 · aggregator-sourced, treat the
> award attributions as indicative and verify on awwwards.com before citing to a client.

### Build effort, honestly estimated

Solo, at a quality that survives comparison with the table above. These are **estimates, not
measurements** — they assume the asset pipeline from Scenario 1 is already in place.

| Deliverable | Estimate | What drives it |
|---|---|---|
| Scroll narrative hero (current direction) | **1–2 weeks** | One hero object, HDRI, entrance choreography |
| 4 rooms, orbit-per-room, no walking | **3–5 weeks** | Room modelling and instancing kit, transitions, in-world UI |
| 4–6 rooms, click-to-teleport + orbit | **5–8 weeks** | Above, plus station graph, camera choreography, reduced-motion path |
| Full third-person walkable ship | **10–16 weeks** | Above, plus controller, collision tuning, character, animation, mobile controls, **and a second navigation path for reduced-motion/keyboard** |

The step from teleport to free-walking roughly doubles the build and adds the accessibility
obligation. That is the decision point, not the room count.

---

## Category O — Shader-based and procedural environment libraries

### The finding that collapses most of this category

**three.js r185 ships the generators natively, as documented addons.** `TreeGenerator` and
`CityGenerator` have official docs pages at `threejs.org/docs/pages/`. r185 added the procedural
city generator (PR #33817) and improved `webgpu_custom_fog` with terrain and forest generators
(PR #33873).

That means the exact machinery behind two of Ryan's three reference examples is **already inside
the `three` dependency** — no third-party library, no asset download, no licence question.

- `TreeGenerator` — grows a deterministic tree skeleton from a seed (trunk, branches, twigs swept
  as tapered tubes), bakes to **one non-indexed BufferGeometry, position and normal only, ready to
  instance into a forest.** Fluent `set<Param>()` builder.
- `CityGenerator` — lays out a grid of blocks, fills each lot with a `SkyscraperGenerator` tower of
  its own seed, height and footprint, optional raised curbs. Returns a `THREE.Group`, accepts a
  building material.

> Primary: threejs.org/docs/pages/TreeGenerator.html, CityGenerator.html, and the r185 release
> notes · read 2026-08-18 · decay: 6mo — this API is new and moving.

Current `three` on npm is **v0.185.1, published 2026-07-01**, so r185 is shipping today.

### The rest of the category

| Library | Version / maturity (measured 2026-08-18) | Verdict |
|---|---|---|
| **three.js addons** — TreeGenerator, CityGenerator, SkyscraperGenerator, terrain/forest, `Sky`, `SkyMesh`, `Water` | In `three` v0.185.1 | **Primary. Use these first** |
| `@react-three/drei` staging — `Sky`, `Stars`, `Cloud`, `Sparkles`, `Environment`, `Lightformer`, `Caustics`, `ContactShadows`, `AccumulativeShadows` | v10.7.8, MIT, 3.19M dl/wk | Useful — **but see the WebGPU caveat below** |
| `simplex-noise` | v4.0.3, **published 2024-07-26**, MIT, 291,455 dl/wk | Fine. Stable rather than stale — noise does not change |
| `glsl-noise` | **v0.0.0, published 2013-09-27**, MIT, 1,273,710 dl/wk | Ancient and ubiquitous. Works, but TSL has noise built in |
| `postprocessing` (pmndrs) | v6.39.4, 2026-07-27, Zlib, 696,137 dl/wk | **WebGL-oriented.** On the WebGPU path use three's native node post-processing instead |
| `@react-three/postprocessing` | v3.0.5, 2026-08-09, MIT, 574,808 dl/wk | Same caveat |
| `@takram/three-clouds` | v0.7.6, 2026-05-06, MIT, 10,398 dl/wk | Volumetric clouds. Niche, low adoption, real |
| `three-custom-shader-material` | v6.4.0, 2025-10-12, MIT, 61,056 dl/wk | Patch built-in materials with custom GLSL. Largely superseded by TSL |
| `three-nebula` | v12.1.0, 2026-08-09, MIT, **1,551 dl/wk** | Maintained but very low adoption. **And see the metaphor warning below** |
| `lamina` | v1.2.2, 2025-06-21, MIT, 2,032 dl/wk | Layered materials. Superseded by TSL node composition |
| `vite-plugin-glsl` | v1.6.1, 2026-07-25, MIT, 87,661 dl/wk | GLSL imports with `#include`. Only needed if writing raw GLSL rather than TSL |
| `three-volumetric-pass` (Ameobea) | Raymarched screen-space volumetrics, pmndrs-postprocessing compatible | WebGL path only. **Unverified** maturity |

### Three corrections and one warning

**Water: the brief calls example 2 "Tessendorf ocean simulation." It is not.** three.js's `Water.js`
addon is a **normal-map-scrolling approximation** — it loads `textures/waternormals.jpg` with repeat
wrapping and drives `distortionScale`, `size`, `time`, `sunDirection`, `sunColor`, `waterColor`. No
FFT, no spectrum, no Tessendorf.

That is good news twice over. It is dramatically cheaper than a real FFT ocean, and for a ship seen
through a viewport it is *the correct choice* rather than a compromise — nobody is inspecting wave
spectra through a porthole. Real FFT ocean implementations exist and are a multi-week subsystem;
they are not warranted here.

One consequence worth noting: `waternormals.jpg` is **the only asset dependency in the entire
reference set.** An otherwise asset-free direction needs exactly one texture.

**Sky: three.js `Sky.js` is a Preetham-family analytic sky** — turbidity, Rayleigh, Mie
coefficients. `SkyMesh` is the node/TSL variant used by the city example. Hosek-Wilkie is more
physically accurate and is not in three core; it is not worth hand-porting for this brief, because
the Preetham model is what both reference examples actually use and they are the fidelity target.

**drei has no Water or Ocean component**, and its README documents no WebGPU or TSL support. Its
staging components are WebGL-era abstractions built on `ShaderMaterial`. That is a real fork in the
road for Scenario 3 — covered in Category P.

**Warning on `three-nebula` specifically, and it is a concept warning rather than a technical one.**
The skill's Rule 6 is explicit: *particles argue ephemerality.* A point cloud says this thing is
made of smoke and is about to disperse. A ship interior arguing permanence and engineering
precision is the wrong subject for a particle system, and the 2026-08-15 worked example in the
skill is exactly this mistake. Use particles for dust motes in a light shaft — atmosphere, small
dose — and never as the load-bearing visual.

### Table — Category O ranked

| Rank | Choice | Why |
|---|---|---|
| 1 | **three.js built-in generators + Sky/SkyMesh + Water addon** | Already in the dependency. Documented. Zero download cost for geometry. Exactly what the reference examples use |
| 2 | **TSL node composition** for procedural materials | One source, both backends. Replaces `lamina`, most of `three-custom-shader-material`, and most raw-GLSL workflows |
| 3 | `simplex-noise` where CPU-side noise is needed | Layout seeds, placement jitter, terrain heightfields computed once |

**Not recommended:** `three-nebula` (low adoption, and the metaphor is wrong for this brief);
`lamina` (superseded); `glsl-noise` (TSL has noise); raw-GLSL toolchains including `vite-plugin-glsl`
**if** the build commits to TSL — pick one shader authoring path, not two.

---

## Category P — WebGPU adoption and the browser-compatibility matrix

### The authoritative status

Secondary sources disagree badly on this — coverage figures found in this pass ranged from
**70% to 95%**, with at least one claiming Firefox still has WebGPU disabled by default while
another reported it shipping. Rather than pick the flattering number, here is the implementers'
own status table:

| Browser | Status |
|---|---|
| **Chrome / Edge** | ✅ v113 on Mac, Windows x86/x64, ChromeOS · ✅ Android 12+ from v121 · ✅ Linux Intel Gen12+ from v144, NVIDIA+Wayland from v147 · 👷 Windows ARM64 behind a flag |
| **Safari** | ✅ "In macOS Tahoe 26, iOS 26, iPadOS 26, and visionOS 26, WebGPU is supported and enabled by default" |
| **Firefox** | ✅ **141 on Windows** · ✅ **147 on all macOS** · 👷 **Nightly only on Linux and Android**; "Mozilla expects to ship on Linux in 2026" |

> Primary: gpuweb/gpuweb wiki, Implementation Status · read 2026-08-18 · decay: 3mo — this table
> moves fast; re-read it rather than quoting this copy.

**The two real gaps for a portfolio audience:** Firefox on Android and Linux (Nightly only), and
**any Apple device not upgraded to OS 26.** The second one matters more than it looks — Safari's
WebGPU is gated on a very recent OS generation, so older iPhones and iPads have no WebGPU at all
regardless of Safari version.

**Do not quote a single global coverage percentage to a client.** The sources contradict each
other, and the number is not what the decision hinges on anyway.

### Why the coverage number mostly does not matter

**TSL neutralises the question.** Write the shader once as a node graph; the renderer lowers it to
WGSL for the WebGPU backend and GLSL for the WebGL2 backend at compile time. `WebGPURenderer` uses
WebGPU by default and **falls back to a WebGL2 backend automatically** when WebGPU is unavailable.
One source, two backends, no branching in the design.

So the decision is not *"can we use WebGPU."* It is **"which techniques degrade acceptably on the
WebGL2 backend."** That is a concrete, checkable question rather than a percentage argument.

### The hard rule that follows

> **Compute shaders and storage buffers silently do nothing on the WebGL2 fallback.** The page does
> not error. It renders, minus whatever the compute pass was contributing.

That is the single most dangerous property of the auto-fallback: it fails quietly, on other
people's devices, in a way local development never reveals. Two consequences for this build:

1. **Anything load-bearing must not live in a compute shader** unless a non-compute path exists and
   has been tested by forcing the WebGL2 backend.
2. **Force the WebGL2 backend in testing, deliberately and routinely.** "It works on my machine" is
   guaranteed here — the machine measured for this pass is an RTX 5060 on Chrome.

**None of Ryan's three reference examples appear to require compute.** Example 1 is a post-process
composite, example 2 is WebGL already, example 3 is generated geometry with TSL materials and
bloom. That is a favourable starting point and should be preserved as a constraint, not discovered
later as a limit.

### Performance delta — honestly

The brief states WebGPU can be 2–5× on complex scenes. **I could not verify that figure.** Claims
found ranged from modest to 15×, all from secondary sources, none with a reproducible benchmark on
a comparable scene. Marked **unverified** — do not quote it.

What *is* concrete from the r185 release notes: **ClusteredLighting (Forward+ clustered shading)
was added to WebGPURenderer** (PR #33406). Many-light scenes are precisely where forward renderers
fall over, and a ship interior with per-room practical lighting is a many-light scene. That is a
specific, named reason the WebGPU path helps this brief — better than a generic multiplier.

### Table — Category P

| Decision | Call |
|---|---|
| Renderer | **`WebGPURenderer`, always** — it is the WebGL2 path too |
| Shader authoring | **TSL, exclusively.** Do not mix raw GLSL |
| Compute shaders | **Avoid for anything load-bearing.** Silent no-op on fallback |
| Progressive enhancement | Automatic via the backend fallback — but **test it by forcing WebGL2** |
| Post-processing | three's **native node post-processing** (`pass()`, `bloom()`), not pmndrs `postprocessing` |
| drei staging components | **Verify each one** on the WebGPU backend before relying on it |

**Not recommended:** forcing WebGPU and blocking WebGL2 users; quoting a coverage percentage;
building anything essential on compute.

---

## Category Q — The three reference examples, dissected

Read from source on 2026-08-18. Line counts are approximate script length, not bundle size.

### 1. `webgpu_custom_fog_scattering` — foggy woods

| | |
|---|---|
| **Technique** | **Post-processing composite, not raymarching.** Renders the scene, blurs it, mixes blurred over sharp by fog density |
| **Imports** | `three/webgpu`, `three/tsl`, addons: `FirstPersonControls`, `TreeGenerator`, `Inspector`, `GaussianBlurNode` |
| **Node functions** | `densityFogFactor()`, `pass()`, `gaussianBlur()`, `mix()`, `uniform()`, `reference()` |
| **Geometry** | Procedural Scots pines — **6 variants via `TreeGenerator`, ~156 instanced trees in a 13×12 grid**, 2 hero trees near camera, 600×600 ground plane |
| **Materials** | **`MeshBasicMaterial` — unlit black silhouettes** |
| **Uniforms** | `density` (0.025–0.16), `scattering` (0–5), `scatteringEnabled` |
| **Script** | ~190 lines |
| **Assets** | **None** |

**This is the most important of the three, and the cheapest.** The entire atmospheric read comes
from unlit black silhouettes plus a depth-driven blur composite. No PBR, no lighting, no textures,
no imported geometry. It is the highest fidelity-per-effort technique found in this entire research
pass, and it maps directly onto a ship: a corridor of silhouetted structure receding into
scattering haze is the same shader with different geometry.

**Port to R3F: easy.** The node graph is renderer-level, not example-level. `Inspector` and the GUI
are development scaffolding and do not port. Estimate: **half a day to a working R3F equivalent.**

### 2. `webgl_shaders_ocean` — the ocean

| | |
|---|---|
| **Technique** | **Normal-map scrolling, NOT Tessendorf FFT** |
| **Renderer** | **WebGL**, `THREE.WebGLRenderer` with `HalfFloatType` output |
| **Imports** | `three/addons/objects/Water.js`, `three/addons/objects/Sky.js`, `three/addons/postprocessing/UnrealBloomPass.js`, `OrbitControls` |
| **Uniforms** | `distortionScale`, `size`, `time`, `sunDirection`, `sunColor`, `waterColor` |
| **Environment** | `Sky` (Preetham-family: turbidity, Rayleigh, Mie) → `PMREMGenerator` |
| **Script** | ~200 lines |
| **Assets** | **`textures/waternormals.jpg`** — the only asset in the reference set |

**Port to R3F: easiest of the three.** drei has no Water component, but the addon is available via
`three-stdlib` (v2.36.1, 3.19M dl/wk) or directly from `three/addons`. `UnrealBloomPass` is the
WebGL post path — on the WebGPU path substitute the node `bloom()`. Estimate: **half a day.**

**Correct the brief here.** Calling it Tessendorf sets an expectation of a multi-week FFT
subsystem. It is a scrolling normal map, and for water seen through a viewport that is the right
answer, not a lesser one.

### 3. `webgpu_generator_city` — procedural city

| | |
|---|---|
| **Technique** | Runtime procedural geometry + TSL procedural materials |
| **Imports** | `three/webgpu`, `CityGenerator`, `createBuildingMaterial`, `createRoadMaterial`, `FirstPersonControls`, `SkyMesh`, `bloom` |
| **Generation** | `generateCity()` → `new CityGenerator(seed)` → `city.build(materials)` |
| **Materials** | TSL procedural — `createRoadMaterial(city.layout)` produces wet asphalt with grid-aligned lane lines; `createBuildingMaterial()` builds façades from TSL patterns |
| **Post** | `bloom(scenePassColor, 0.05, 0.0, 0.0)` |
| **Environment** | `SkyMesh` → `PMREMGenerator`, dynamic sun driving both lighting and env map |
| **Compute** | **None** |
| **Script** | ~200 lines |
| **Assets** | **None** |

**Port to R3F: moderate.** `CityGenerator` returns a plain `THREE.Group`, so it drops into R3F via
`<primitive>`. The transferable part is not the city — it is **`createRoadMaterial` and
`createBuildingMaterial`**, which demonstrate grid-aligned procedural surface detail from a layout
description. That is precisely the technique a ship interior needs for panelling, deck plating,
conduit runs and hazard striping. Estimate: **one to two days**, most of it studying the material
functions rather than porting the scene.

### What all three have in common

Every one is **under ~200 lines**, uses **`FirstPersonControls`**, and — apart from one water
normal map — **imports no assets at all.** Two of three generate their geometry at runtime from a
seed.

That last point is the strategic finding of this entire scope change, and it deserves stating
plainly: **procedural generation dissolves the polygon-blocked problem rather than solving it.**
Geometry generated from a seed is arbitrarily dense at **zero download cost** and zero licence
exposure. `TreeGenerator` bakes to a single instanceable BufferGeometry; `CityGenerator` returns a
whole city from an integer.

Compared to the asset path — where Bruno's world costs 974 KB and needs a provenance manifest,
optimisation pipeline and licence review per asset — the procedural path costs kilobytes of code
and nothing else.

### Bundle size — not measured, and here is how to measure it

I did **not** measure bundle sizes for these examples, and will not estimate them. The `three.webgpu.js`
build is larger than `three.module.js`, and the delta is the number that matters for the decision.
Measure it directly rather than trusting anyone's figure:

```powershell
npx vite build ; npx source-map-explorer dist/assets/*.js
# or
npx @gltf-transform/cli --version ; npx esbuild --bundle --minify --analyze
```

That is a fifteen-minute experiment and it settles the question for this project specifically,
which is worth more than a general figure.

### Table — Category Q

| Example | Cost to port | Reusability for a ship | Asset dependency |
|---|---|---|---|
| **Fog scattering** | **~½ day** | **Highest** — silhouette + depth fog is a corridor | None |
| Ocean | ~½ day | Moderate — viewport view only | 1 texture |
| City generator | 1–2 days | High — **the material functions, not the city** | None |

---

## Recommended stack — three scenarios

Scenario 1 is the original direction. Scenario 2 is the confirmed multi-room pivot built from
imported assets. Scenario 3 is the same pivot built from shaders and procedural generation, which
is Ryan's stated fidelity target.

**Scenarios 2 and 3 are not exclusive.** The realistic build is mostly 3 with a little 2 — procedural
environments, and imported assets only for the handful of hero objects procedural generation cannot
express. The scenarios are separated here so the trade-offs are visible, not because the choice is
binary.

### The correction to my earlier recommendation

I previously proposed Blender MCP + Hyper3D Rodin + Sketchfab. Ryan was right that it was
under-researched, and two of the three change on evidence:

**Rodin → Meshy.** Rodin's API gates behind a **$120/mo Business plan**; Free and Creator tiers do
not include API access. Meshy is pay-as-you-go with no monthly floor, and its first-party MCP was
pushed 2026-08-17 while no first-party Rodin MCP was found at all. Rodin's output quality is still
top of category, and it remains reachable through Blender MCP's built-in integration without the
subscription — which is the right way to use it. But as a standalone install, Meshy is the better
call for a solo practice with spiky project-driven usage.

**Sketchfab standalone → Sketchfab via Blender MCP.** The standalone server is 17 months stale with
**no licence declared**. Blender MCP provides the same access under MIT with active maintenance.

Blender MCP survives, but for a different reason than I gave: it is the optimisation and
integration hub, not the modelling tool.

## Scenario 1 — Scroll narrative, single page (**superseded**)

**Status: superseded by the confirmed multi-room pivot.** Retained because its three installs are
the shared base for Scenarios 2 and 3, and because the analysis holds if the direction reverts.

**Asset gap:** one to three hero objects and an environment map. That is the whole shortfall.
Small, and closable this week.

### Install now — three servers, £0 recurring

| # | Install | Cost | Time | What it unblocks |
|---|---|---|---|---|
| 1 | **`chrome-devtools-mcp`** | Free | 5 min | Core Web Vitals as an in-loop instrument. Makes every subsequent 3D decision measurable. Highest confidence in this document: official, Apache-2.0, 2.3M downloads/week, pushed today. |
| 2 | **Blender MCP** (`uvx blender-mcp`) + Blender | Free | 30–45 min, incl. ~1 GB Blender download | The whole pipeline. Poly Haven + Sketchfab + Rodin behind one MIT server, plus decimate/bake/export — the mandatory step with no alternative. |
| 3 | **`@upstash/context7-mcp`** | Free tier | 5 min | Current Three.js and R3F API surface. Cheap defence against confidently-wrong API calls after the TSL/WebGPU churn. |

### Install when a build needs generated geometry

| # | Install | Cost | Time |
|---|---|---|---|
| 4 | **Meshy MCP** (`@meshy-ai/meshy-mcp-server`) | Meshy Pro for the API key; 20 credits per full generation | 10 min |

Do not install this speculatively. Try Poly Haven and Sketchfab first — for a sci-fi console hero,
a good CC0 model plus a good HDRI plus proper materials will very often beat a generated mesh, and
costs nothing.

### Add to the repo, not as MCPs

| Tool | Cost | Why not an MCP |
|---|---|---|
| **`@gltf-transform/cli`** | Free, MIT | Deterministic build step. Belongs in `package.json`, versioned and reproducible. |
| **`gltfjsx`** | Free | Same. Gets GLB → R3F JSX without the dormant, unlicensed `mcp-three` wrapper. |

### Defer, with the reason

| Deferred | Reason |
|---|---|
| Hyper3D Rodin standalone | $120/mo API gate. Reachable via Blender MCP. |
| Sketchfab standalone MCP | 17 months stale, no licence declared. |
| Tripo MCP | 16 months stale, self-described alpha. |
| TRELLIS.2 local | 24 GB VRAM required, 8 GB available; Linux-only. Re-rank to #1 on new hardware. |
| Hunyuan3D-2.1 | Hardware-blocked, plus unresolved EU/UK territorial licence clause. |
| `threejs-devtools-mcp` | Most interesting find here; 222 downloads/week on 0.4.1 is too young for client work. Re-check next cycle. |
| Figma / Penpot / Framer MCPs | No comps in the workflow. Five-minute install the day a client brings a Figma file. |
| fal.ai / Replicate MCPs | Fragmented community wrappers around clean HTTP APIs. Call the API. |
| Blockade Labs | $112/mo for API access against Poly Haven's free 980 CC0 HDRIs. |
| Godot / Unity / Unreal MCPs | Wrong runtime. |
| ElevenLabs MCP | Worth it, but only when a build has a named signature moment that wants sound. |

### Effect on the polygon-blocked problem, specifically

| Install | Effect |
|---|---|
| Blender MCP | **Direct fix.** Removes the primitives-only ceiling in both directions — access to real geometry, *and* the ability to reduce it to something a browser should receive. Without the second half the first half is a performance regression. |
| Poly Haven HDRI (free, via Blender MCP) | **Largest fidelity-per-byte gain available.** Moves Tier 2 to Tier 5 territory without adding a single triangle. Do this before reaching for a better mesh. |
| `@gltf-transform/cli` | **Makes the fix shippable.** Converts "we have a great asset" into "we have a great asset under 900 KB." |
| `chrome-devtools-mcp` | **Proves it.** Confirms the asset improved the page rather than trading a visual win for an LCP loss. |
| Meshy | Fills gaps the libraries cannot — a specific object no CC0 library has. Genuinely useful, and the last piece, not the first. |
| Context7 | Removes a different block: wrong API calls against a moved Three.js surface. |

### One thing that should change in the brief, not the toolchain

The skill's Rule 1 corollary establishes that heavy WebGL is the wrong signal for product and
service sites — eight of the most-cited premium product sites ship **zero** shader programs, and
heavy WebGL lives on agency showreels because those studios are selling the ability to build that
exact site.

**`vertexapps.dev` is the case where that inverts.** It *is* the portfolio. The showreel signal is
the correct signal, because the thing being sold is the ability to build it. This is the one
context where reaching for the Lusion/Active Theory tier is not a category error.

Two conditions attached, and they are not optional. The showreel sites measured on 2026-08-15
skipped the accessibility work — `prefers-reduced-motion` is declared by basement.studio, warp.dev,
cursor.com, vercel.com, linear.app and teenage.engineering, and by **none** of Lusion, Active
Theory, Immersive Garden, Bruno Simon, Igloo, Arc, Rauno or Studio Freight. Copy the ambition,
not the omission. And the fallback-as-first-frame rule holds regardless of tier.

### Rough cost

| Item | One-off | Recurring |
|---|---|---|
| chrome-devtools-mcp | 5 min | £0 |
| Blender + Blender MCP | 30–45 min, ~1 GB disk | £0 |
| Context7 | 5 min | £0 free tier |
| gltf-transform + gltfjsx | 5 min | £0 |
| **Subtotal to unblock** | **~1 hour** | **£0** |
| Meshy Pro (when needed) | 10 min | ~$20/mo, cancellable |
| ElevenLabs (when needed) | 10 min | £0 free tier |

The entire recommended unblock is about an hour of setup at zero recurring cost. That is a
materially different proposition from the multi-subscription stack the first recommendation
implied, and it is the direct result of Ryan pushing back on unresearched advice.

---

## Scenario 2 — Multi-room interactive exploration (potential pivot)

**Everything in Scenario 1 first.** The pivot does not change the toolchain, it raises the volume
and adds a runtime layer. If the asset pipeline is not working for one hero object, it will not
work for forty.

### What changes, and what does not

**Does not change:** the three MCP installs, `gltf-transform`, the optimisation pipeline, the
provenance manifest, the fallback-as-first-frame rule. All of it applies identically, just more
often.

**Changes materially:**

| | Scenario 1 | Scenario 2 |
|---|---|---|
| Asset count | 1–3 objects + 1 HDRI | **Kit of ~20–40 parts**, instanced, + 1–2 HDRIs |
| Byte budget shape | One 900 KB hero | **Shared shell + per-room delta**, adjacency-preloaded |
| Total 3D target | ≤ 900 KB | **≤ 3 MB resident**, informed by Bruno's measured 974 KB |
| Blender MCP role | Occasional | **Constant** — batch decimate/bake/atlas across the kit |
| AI generation | Rarely needed | **Likely** — a ship needs props no CC0 library has |
| Runtime libraries | R3F + drei | + `three-mesh-bvh`, + `uikit`, ± Rapier, ± `ecctrl` |
| Audio | Optional garnish | **Structural** — see RESN's measured 7,619 KB of mp3 |
| New failure modes | LCP | **GPU context leaks, disposal, raycast cost, motion sickness** |

### Additional installs — Scenario 2 only

| # | Install | Cost | Time | Why |
|---|---|---|---|---|
| 5 | **`three-mesh-bvh`** | Free, MIT | 5 min | Accelerated raycast for hover on detailed geometry **and** capsule collision if the player walks. 3.4M downloads/week. Not optional at room scale |
| 6 | **`@react-three/uikit`** | Free (**licence unread — see flag**) | 15 min | In-world ship terminals as WebGL geometry, no per-frame DOM sync. shadcn-based preset sits on existing stack vocabulary |
| 7 | **ElevenLabs MCP** | Free tier, 10,000 credits/mo | 10 min | Moves from optional to recommended. RESN ships 7.6 MB of audio against **six** shader programs — the machine-like read is carried by sound |
| 8 | **Meshy MCP** | ~$20/mo when active | 10 min | Promoted from "when needed" to "probably needed". A ship kit has props no CC0 library carries |

**Only if the design needs dynamics or a walking character:**

| # | Install | Cost | Why |
|---|---|---|---|
| 9a | `@react-three/rapier` + `@dimforge/rapier3d-compat` | ~500 KB WASM compressed | Anything that falls, tips, rolls or is driven. Wrapper last published 2025-11-03 — engine is current, wrapper lags |
| 9b | `ecctrl` v2.0.1 | Requires Rapier | Off-the-shelf third-person controller. Published 2026-08-17, MIT, actively maintained |

**Skip 9a and 9b if the ship interior is static and navigation is teleport-or-orbit** — which is the
recommendation. `three-mesh-bvh` covers collision for a walking player on static geometry, and the
BVH is wanted anyway for raycasting. That saves 500 KB of WASM and an async init step.

### Architecture decisions to make before building

1. **Persistent canvas above the App Router, route-driven scene swap.** One GL context, real URLs.
   Never a `<Canvas>` per route.
2. **Explicit disposal on every room transition**, verified against `renderer.info.memory`. Make it
   a build gate — if geometry and texture counts do not return to baseline, the transition leaks.
3. **Instanced kit-of-parts, not bespoke rooms.** This is the finding that makes the pivot viable:
   Bruno ships a whole world in 974 KB because repeated geometry is instanced from transform
   reference files. Ship interiors are the ideal case for this.
4. **Adjacency preloading** — warm rooms N±1, dispose N±2. Resident memory stays flat regardless of
   ship size.
5. **Click-to-teleport between stations, orbit within a station.** Most of the wow, half the build
   of free-walking, and the reduced-motion variant is a cross-fade rather than a second navigation
   system.
6. **Two named quality tiers from day one**, following `Quality.js` and `ultralow` in the measured
   references. Retrofitting LOD is far more expensive than designing for it.

### Skill file changes Scenario 2 requires

The drafts already written cover Scenario 1 fully. Scenario 2 adds material to
`vx-3d-asset-pipeline` — a scene-lifecycle rule (disposal, context budget, adjacency preloading),
the instanced-kit approach with Bruno's measured 974 KB as the anchor figure, the navigation-mode
accessibility analysis, and per-room budgeting. Those additions are drafted into the companion
skill rather than the parent, because they only fire on room-scale builds.

### Effect on the polygon-blocked problem

Scenario 2 does not make the polygon block worse — **it makes the same fix pay off far more.** One
Blender MCP session that produces a reusable instanced kit serves forty placements instead of one
hero. The asset pipeline investment amortises across the whole ship rather than a single object.

The new risk is not polygons. It is **GPU context and memory lifecycle**, which is a discipline
problem rather than a tooling problem, and the disposal check is the mitigation.

### Rough cost — Scenario 2

| Item | One-off | Recurring |
|---|---|---|
| Everything in Scenario 1 | ~1 hour | £0 |
| `three-mesh-bvh` + `uikit` | 20 min | £0 |
| ElevenLabs | 10 min | £0 free tier |
| Meshy Pro | 10 min | ~$20/mo while active |
| Rapier + ecctrl (only if walking) | 30 min | £0 |
| **Build effort** | **3–16 weeks** depending on navigation mode — see Category N | — |

**The honest framing: tooling is not the constraint on this pivot, build time is.** The stack
additions are about an hour and roughly $20/month. The build is three to sixteen weeks, and the
navigation mode is what moves it across that range. Decide navigation before anything else.

### The pushback

If the pivot is on the table, the recommendation is **orbit-per-room or click-to-teleport, four to
five rooms, no physics engine, heavy instancing, strong audio.** That lands in the 3–8 week band,
carries a defensible accessibility story, works on a phone, and — on the measured evidence — reaches
the same perceived tier. RESN gets there with **six shader programs and a sound budget.** Bruno
gets there with **974 KB of geometry.** Neither result came from scale.

Full third-person free-walking is the version that doubles the build, adds a mandatory second
navigation path for reduced-motion and keyboard users, and puts a vestibular-trigger risk on the
site that is meant to demonstrate craft. It is achievable. It is just the most expensive way to
reach a ceiling the cheaper options already reach.

---

## Scenario 3 — Multi-room exploration, shader-based procedural environments

**Ryan's stated target.** This is the scenario the three reference examples describe, and it
inverts most of the earlier recommendation.

### What changes from Scenario 2

| | Scenario 2 (imported assets) | Scenario 3 (procedural) |
|---|---|---|
| Geometry source | Downloaded, optimised, committed | **Generated at runtime from a seed** |
| 3D payload | ~3 MB resident target | **Approaching zero** — code, not meshes |
| Asset licences | Manifest per asset, per-licence review | **None to review** for generated content |
| Blender MCP | Constant use | **Backup only** — hero objects procedural code cannot express |
| Meshy / Rodin / Sketchfab | Likely needed | **Deprioritised to backup** |
| Poly Haven HDRI | Primary lighting source | Partly replaced by **`Sky`/`SkyMesh` → PMREM** |
| Renderer | `WebGLRenderer` fine | **`WebGPURenderer`, always** (it is the WebGL2 path too) |
| Shader authoring | Rarely | **Central. TSL, exclusively** |
| Post-processing | pmndrs `postprocessing` | **three native node post** (`pass()`, `bloom()`) |
| Main risk | LCP, memory lifecycle | **Silent WebGL2 fallback; shader debugging; TSL API churn** |
| CC's weak spot | Asset access | **Current TSL API knowledge** |

### The inversion, stated plainly

**Procedural generation dissolves the polygon-blocked problem rather than solving it.** The block
was "the agent can only build from primitives, so it cannot reach tier 4–5." Procedural generation
answers that directly: `TreeGenerator` and `CityGenerator` produce arbitrarily dense, well-formed
geometry from an integer seed, at zero download cost and zero licence exposure — and they ship
inside `three` v0.185.1 today.

Writing code that generates geometry is exactly what an agent is good at. Sourcing, licensing and
optimising binary assets is exactly what it is bad at. **Scenario 3 plays to the strength and
retires the weakness.**

The cost is that it substitutes a different hard problem: **shader authoring and debugging**, where
feedback is visual, errors are silent, and the API is new enough that any model's built-in
knowledge is likely stale. That is a real trade, not a free win — but it is a trade in the
direction of things that can be verified in a browser rather than negotiated with a licence.

### Installs — Scenario 3

| # | Install | Cost | Time | Why |
|---|---|---|---|---|
| 1 | **`chrome-devtools-mcp`** | Free | 5 min | Even more important here. WebGPU performance is the whole point; measure it |
| 2 | **`@upstash/context7-mcp`** | Free tier | 5 min | **Promoted to critical.** TSL is new, r185 changed it, and model knowledge of it is stale by default |
| 3 | `three@^0.185` + `@react-three/fiber@^9` | Free | — | R3F v9 accepts an async `gl` prop; return an initialised `WebGPURenderer` from it |
| 4 | **`three-mesh-bvh`** | Free, MIT | 5 min | Collision and hover raycast. Unchanged from Scenario 2 |
| 5 | **ElevenLabs MCP** | Free tier | 10 min | Unchanged. RESN's six shader programs and 7,619 KB of mp3 remain the argument |
| 6 | **Blender MCP** | Free | 30–45 min | **Demoted to backup.** Install when a hero object needs modelling, not before |

**Dropped from the critical path:** Meshy, Rodin, Sketchfab, Fab, Poly Haven models. All become
"backup for a specific object need." Poly Haven HDRIs stay useful — an analytic sky is not always
the right environment — but `Sky`/`SkyMesh` → `PMREMGenerator` covers the common case with no
download.

**That is a materially cheaper stack than Scenario 2**, and it is the direct consequence of the
fidelity target being shader-based rather than asset-based.

### Elevated: shader development workflow

This is the capability gap Scenario 3 actually creates, and it is not an MCP.

| Need | Tool | Status |
|---|---|---|
| Syntax, validation, symbols for GLSL/WGSL | `shader-validator` (VS Code, Rust language server) | Real, actively developed |
| Shader preview and hot reload | GLSL Canvas / Shader Studio (VS Code) | Real; **Shadertoy-style fragment shaders**, not TSL |
| Debug and preview HLSL/GLSL with recompile on save | SHADERed VS Code extension | Real |
| **TSL specifically** | **No dedicated tooling found** | **Gap** |
| WebGL/WebGPU frame capture, decompiled shaders | Spector.js | Mature; MCP claimed but **unverified** |

**The honest finding: TSL has no mature dedicated tooling.** It is JavaScript, so it debugs with
JavaScript tools and `console.log` on node graphs — which is better than debugging GLSL strings,
but there is no TSL equivalent of GLSL Canvas. The practical loop is Vite HMR plus the three.js
examples as a reference corpus, and the examples are genuinely good: ~190–200 lines each, readable,
and directly on target.

**Workflow recommendation, no install required:** keep the three reference examples checked out
locally as a reading corpus, and build each room's look as a standalone example-shaped file first
before integrating it into the app. That is how the three.js examples are written, it keeps the
iteration loop tight, and it isolates shader debugging from React lifecycle debugging — two hard
problems that should never be diagnosed simultaneously.

### Architecture decisions — Scenario 3

Everything from Scenario 2 still applies (one canvas, explicit disposal, adjacency preloading,
navigation mode, instanced kit). Additions:

1. **`WebGPURenderer` always; never branch on backend in application code.** Let the fallback
   handle it.
2. **TSL exclusively. No raw GLSL.** Mixing gives two shader codebases and forfeits the fallback.
3. **Nothing load-bearing in a compute shader.** Silent no-op on WebGL2.
4. **Force the WebGL2 backend in routine testing.** The development machine is an RTX 5060 on
   Chrome; it will never surface the fallback path by accident.
5. **Verify each drei staging component on the WebGPU backend before relying on it.** drei's README
   documents no WebGPU/TSL support, and its `EffectComposer` wraps pmndrs `postprocessing`, which
   needs WebGPU-specific versions or TSL rewrites for some effects. Use three's node post-processing
   instead and treat drei as a convenience layer to spot-check, not a foundation.
6. **Seeds are content.** A room's look is a seed plus parameters. Commit them as data, and the
   room becomes reproducible, diffable and art-directable without touching geometry.

### Effect on the polygon-blocked problem

**It largely stops being a problem.** Geometry comes from code. The remaining asset needs are one
water normal map, optional HDRIs, and any hero object that is genuinely bespoke — which is where
Blender MCP earns its place as a backup rather than a foundation.

The new constraint is not polygons. It is **whether the shader work lands**, and that is verified in
a browser rather than negotiated with a marketplace.

### Rough cost — Scenario 3

| Item | One-off | Recurring |
|---|---|---|
| chrome-devtools-mcp + Context7 | 10 min | £0 |
| `three-mesh-bvh`, R3F v9, three r185 | 15 min | £0 |
| ElevenLabs | 10 min | £0 free tier |
| Blender MCP (backup) | 30–45 min | £0 |
| VS Code shader extensions | 10 min | £0 |
| **Build effort** | **see below** | — |

| Deliverable | Estimate |
|---|---|
| Port fog-scattering technique to R3F | **~½ day** |
| Port ocean technique to R3F | **~½ day** |
| Port/adapt city material functions | **1–2 days** |
| 4–5 procedural rooms, teleport nav, in-world UI, audio | **4–7 weeks** |
| Same with full free-walking navigation | **9–14 weeks** |

**Scenario 3 is cheaper than Scenario 2 at the same room count** — roughly a week less — because
the asset acquisition, optimisation and licensing pipeline largely disappears. That is not the
usual direction for a more technically ambitious option, and it is the strongest argument for it.

### The pushback on Scenario 3

Two genuine risks, neither fatal:

**Shader debugging is where solo builds stall.** Asset pipelines fail loudly and predictably;
shaders fail visually and silently, and there is no TSL debugger. Mitigate by building each look as
a standalone example file before integration, and by keeping Context7 in the loop for API currency.

**The silent WebGL2 fallback is the highest-risk property of this direction.** A build that looks
correct on the development machine can be quietly degraded for a meaningful share of visitors —
disproportionately Apple users on pre-OS-26 devices and Firefox-on-Android users. That is not a
reason to avoid WebGPU; it is a reason to make forced-WebGL2 testing routine from day one rather
than a pre-launch check.

**What I would not change from the earlier advice:** navigation mode still dominates the estimate,
teleport-plus-orbit is still the recommendation, and the reduced-motion path is still mandatory and
still roughly what doubles a free-walking build. The rendering direction changed; those conclusions
did not.

---

## Open questions — answer before the relevant build, not now

1. **Fab / Megascans web distribution.** Does the Fab Standard License permit serving an asset as a
   GLB a browser can extract? `fab.com/eula` blocks automated fetching; the developer docs do not
   cover it. One manual read. Blocks Megascans in web builds until answered.
2. **Hunyuan3D territorial clause.** The licence excludes the EU, UK and South Korea. If Vertex
   operates from an excluded territory, that path closes — including via Blender MCP's integration.
   One question to a solicitor. Leave the checkbox off meanwhile.
3. **Does `chrome-devtools-mcp` solve the rAF verification gap?** Testable in fifteen minutes
   against a real Three.js scene. If yes, the dev-only single-frame hook becomes optional and a
   standing constraint disappears. Hypothesis, not a claim.
4. **Are the Category I asset budget numbers right?** Proposed, not measured. They need a repro
   pass before they enter the skill as fact.
5. **What licence does `pmndrs/uikit` actually carry?** The GitHub API reports `NOASSERTION`
   (measured 2026-08-18). A LICENSE file exists. One manual read. Blocks uikit in client work until
   answered — and uikit is the Scenario 2 recommendation for in-world UI.
6. **Does `@react-three/rapier`'s nine-month publish gap matter?** Engine current (2026-08-08),
   wrapper last published 2025-11-03. Only relevant if Scenario 2 needs dynamics. Check open issues
   before committing.
7. **Which navigation mode?** This is Ryan's call, not a research question, and it moves the build
   estimate from 3 weeks to 16. Decide it before any other Scenario 2 work.
8. **Re-measure basement.studio's route transition specifically.** The instrumentation captured
   per-route asset differences but not what happens to `renderer.info` across a navigation. That is
   the single most useful additional measurement if Scenario 2 goes ahead — it is the existence
   proof for the whole architecture, on Ryan's exact stack.

### Scenario 3 additions

9. **What is the actual bundle delta of `three.webgpu.js` versus `three.module.js` for this app?**
   Not measured. Fifteen minutes with `source-map-explorer` settles it for this project, which is
   worth more than any general figure.
10. **Which drei staging components actually work on the WebGPU backend?** drei's README documents
    no WebGPU/TSL support and its `EffectComposer` wraps pmndrs `postprocessing`. `Sky`, `Stars`,
    `Cloud`, `Sparkles`, `Environment` and `Lightformer` each need a spot-check. An afternoon, and
    it determines how much of drei is usable.
11. **Is the WebGPU performance delta real for this workload?** The brief's 2–5× could not be
    verified; found claims ranged from modest to 15×, none reproducible. The concrete, named win is
    **ClusteredLighting (Forward+), added in r185** — which matters specifically for many-light
    interiors. Benchmark one room both ways rather than trusting a multiplier.
12. **Does the fog-scattering technique hold up on the WebGL2 fallback?** It is a post-process
    composite with no compute, so it should. Confirm by forcing the backend before designing four
    rooms around it.
13. **Re-read the gpuweb Implementation Status before quoting any of it.** Marked `decay: 3mo`. The
    Firefox Linux/Android lines in particular are expected to move during 2026.

---

## Sources

Primary documentation:
[github.com/ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp) ·
[github.com/microsoft/TRELLIS.2](https://github.com/microsoft/TRELLIS.2) ·
[Hunyuan3D-2.1 LICENSE](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE) ·
[github.com/meshy-dev/meshy-mcp-server](https://github.com/meshy-dev/meshy-mcp-server) ·
[github.com/basementstudio/mcp-three](https://github.com/basementstudio/mcp-three) ·
[Poly Haven API](https://polyhaven.com/our-api) · [Poly Haven License](https://polyhaven.com/license) ·
[Sketchfab Download API](https://sketchfab.com/developers/download-api) ·
[Hyper3D pricing](https://hyper3d.ai/pricing) ·
[Hyper3D Gen-2 API docs](https://developer.hyper3d.ai/api-specification/rodin-generation-gen2) ·
[Fab licences and pricing](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab) ·
[Figma MCP developer docs](https://developers.figma.com/docs/figma-mcp-server/) ·
[Claude Code and Figma MCP setup](https://help.figma.com/hc/en-us/articles/39888612464151-Claude-Code-and-Figma-Set-up-the-MCP-server) ·
[Penpot MCP](https://help.penpot.app/mcp/) ·
[Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp) ·
[glTF Transform](https://gltf-transform.dev/) · [gltfpack](https://meshoptimizer.org/gltf/) ·
[LRM-Zero / Zeroverse](https://desaixie.github.io/lrm-zero/) ·
[Runway Gen-4](https://runway.com/research/introducing-runway-gen-4) ·
[Spector.js](https://github.com/BabylonJS/Spector.js/) ·
[React Three Fiber](https://r3f.docs.pmnd.rs/) ·
[Blockade Labs plans](https://skybox.blockadelabs.com/plans) ·
[ambientCG](https://ambientcg.com/) · [CGTrader developer API](https://www.cgtrader.com/developers) ·
[KitBash3D Cargo](https://kitbash3d.com/pages/cargo) · [Spline](https://spline.design/3d-design) ·
[threejs-devtools-mcp](https://github.com/DmitriyGolub/threejs-devtools-mcp)

Categories K–N:
[brunosimon/folio-2025 (MIT source)](https://github.com/brunosimon/folio-2025) ·
[pmndrs/ecctrl](https://github.com/pmndrs/ecctrl) ·
[pmndrs/BVHEcctrl](https://github.com/pmndrs/BVHEcctrl) ·
[gkjohnson/three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) ·
[pmndrs/react-three-rapier](https://github.com/pmndrs/react-three-rapier) ·
[pmndrs/uikit](https://github.com/pmndrs/uikit) ·
[drei useCursor](http://drei.docs.pmnd.rs/misc/use-cursor) ·
[drei Preload](http://drei.docs.pmnd.rs/performances/preload) ·
[drei issue #1985 — Preload vs useGLTF.preload](https://github.com/pmndrs/drei/issues/1985) ·
[R3F discussion #3221 — routing to different canvases](https://github.com/pmndrs/react-three-fiber/discussions/3221) ·
[pmndrs/react-three-next (stale starter)](https://github.com/pmndrs/react-three-next) ·
[three.js — How to dispose of objects](https://threejs.org/manual/en/how-to-dispose-of-objects.html) ·
[rapier.rs](https://rapier.rs) · [howlerjs.com](https://howlerjs.com) ·
[Awwwards portfolio winners](https://www.awwwards.com/websites/winner_category_portfolio/)

Categories O–Q:
[three.js r185 release notes](https://github.com/mrdoob/three.js/releases/tag/r185) ·
[TreeGenerator docs](https://threejs.org/docs/pages/TreeGenerator.html) ·
[CityGenerator docs](https://threejs.org/docs/pages/CityGenerator.html) ·
[WebGPURenderer manual](https://threejs.org/manual/en/webgpurenderer.html) ·
[gpuweb Implementation Status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status) ·
[webgpu_custom_fog_scattering source](https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_custom_fog_scattering.html) ·
[webgl_shaders_ocean source](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_shaders_ocean.html) ·
[webgpu_generator_city source](https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_generator_city.html) ·
[webgpu_volume_lighting example](https://threejs.org/examples/webgpu_volume_lighting.html) ·
[webgpu_volume_cloud example](https://threejs.org/examples/webgpu_volume_cloud.html) ·
[drei Sparkles](https://drei.docs.pmnd.rs/staging/sparkles) ·
[Ameobea/three-volumetric-pass](https://github.com/Ameobea/three-volumetric-pass) ·
[shader-validator (VS Code)](https://github.com/antaalt/shader-validator) ·
[SHADERed](https://github.com/dfranx/vscode-shadered)

**On WebGPU coverage figures.** Secondary sources found in this pass reported global support as
70%, ~82%, 84.68%, ~87% desktop / ~71% mobile, and ~95%, and disagreed on whether Firefox ships it
by default. None of those numbers are quoted as fact in this document. The per-browser table in
Category P comes from the implementers' own status wiki, which is the only source here worth
citing to a client.

Site instrumentation for Categories K and N is Ryan's own prior measurement pass, read from
`docs/whole-page-narrative-refs/*.json` (dumps dated 2026-08-17): bruno-simon, active-theory,
basement-studio, basement-work, immersive-garden, resn, igloo-inc, 60fps, lusion, nk-studio-work.
bruno-simon.com credits and anchor structure re-checked live 2026-08-18 via browser instrumentation.
**Screenshots were not obtainable this session** — the browser pane does not composite frames
headlessly, which is the same rAF constraint noted in Category I.5. Architecture is described from
the MIT source rather than from images.

Live registry queries, 2026-08-18: `api.github.com`, `registry.npmjs.org`, `api.npmjs.org`,
`pypi.org/pypi/blender-mcp/json`. Local hardware: `nvidia-smi`, `Win32_ComputerSystem`.
