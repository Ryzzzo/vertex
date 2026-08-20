# Skill update drafts — 2026-08-18

Two drafts for review. Nothing has been promoted into the live skill library. Source research:
`docs/capability-stack-research.md`.

| File | What it is | Action |
|---|---|---|
| `vx-elite-design-research-v1.4.md` | Full proposed new version of the existing skill. Base copied byte-for-byte from the canonical v1.3.0; every change is listed below | Review, then `save_skill` if accepted |
| `vx-3d-asset-pipeline-v1.0.md` | Proposed new companion skill | Review, then `save_skill` if accepted |

Base file for the v1.4 draft was the canonical copy at
`AppData\Roaming\Claude\...\skills\vx-elite-design-research\SKILL.md` (31,348 bytes, v1.3.0,
2026-08-15) — **not** the older 21 KB copy under `.claude\skills\`, which is a cycle behind and
lacks Rules 4a, 6a–c and 8. Worth resolving that divergence separately; two copies at different
versions is how a skill silently loses a rule.

---

## vx-elite-design-research → v1.4.0

Nine changes. Each one below states what changed, why, and what evidence backs it.

### 1. Frontmatter description — added 3D asset and byte-budget triggers

**Change:** `"sourcing imagery"` → `"sourcing imagery or 3D assets, setting an asset byte budget"`.

**Why:** the description is the trigger surface. A session about acquiring geometry or setting an
asset budget should load this skill, and on the v1.3.0 wording it might not. Two clauses, no
change to the existing triggers.

**Risk:** none. Additive.

### 2. Rule 1 corollary — the portfolio-inversion case

**Change:** added a paragraph stating that the "heavy WebGL is the wrong signal" finding inverts
when the site *is* the portfolio, with two attached conditions.

**Why:** this is the gap that produced the current `vertexapps.dev` situation. v1.3.0 says heavy
WebGL signals "we build showreels" and warns against copying it onto product sites. For Vertex's
own site that signal is the *correct* one — the thing being sold is the ability to build it.
Without this note the skill argues against the right answer in the one case that matters most to
the practice.

**Evidence:** re-states the existing 2026-08-15 15-site instrumentation finding, including the
verbatim `prefers-reduced-motion` split (declared by basement.studio, warp.dev, cursor.com,
vercel.com, linear.app, teenage.engineering; declared by none of Lusion, Active Theory, Immersive
Garden, Bruno Simon, Igloo, Arc, Rauno, Studio Freight). No new measurement, no figure moved.

**Risk:** this is the change most likely to be misapplied — it could read as permission to reach
for showreel WebGL generally. Mitigated by scoping it explicitly to "the site IS the portfolio"
and attaching both conditions inline. **Worth reading carefully before accepting.**

### 3. Rule 6b — tiers 4/5 need a supply chain, and lighting carries the tier

**Change:** two paragraphs after the tier list.

**Why:** two distinct failures, both observed. First, tiers 1–3 are reachable from primitives and
tiers 4–5 are not — a build targeting tier 5 with only `BoxGeometry` and procedural maths ceilings
at tier 2, and Rule 6a's diagnostic will then send you hunting for a concept error that is actually
a supply error. Naming it prevents that misdiagnosis. Second, the environment map does more for
perceived tier than triangle count does, and "add detail" is the wrong first instinct.

**Evidence:** the supply-chain point follows from the fidelity taxonomy already in the skill. The
lighting point is craft consensus, not measured in-stack — stated as guidance, no figure attached.

**Risk:** low. Neither claim contradicts anything in v1.3.0.

### 4. New Rule 9 — write the byte budget before acquiring the asset

**Change:** new rule between Rule 8 and Non-negotiables, with a budget block and three corollaries.

**Why:** this is the central finding of the research pass. Making better geometry one tool call away
creates a new failure mode: the asset lands, the hero looks superb locally, LCP goes to four seconds
on a mid-tier phone, and the only fix is to discard the asset — after the texturing work and after
the client has seen it. A budget written before acquisition is a filter; written after, it is a
negotiation with sunk cost.

**Evidence and honesty flag:** the specific numbers are marked `Unverified:` in the draft. They are
derived from the skill's existing ~50–80 KB gz PBR+HDRI+fog figure plus LCP arithmetic, **not from a
repro.** Per the skill's own provenance rule they cannot be stated at repro-level confidence and
they are not. The *practice* is what is being proposed; the numbers are a starting point that needs
a lab pass.

**Risk:** if the numbers get quoted without the `Unverified:` line they become a travelling figure
with a dropped condition — precisely the failure the skill's own provenance section warns about.
Either keep the marker or run the repro before promoting.

### 5. Non-negotiables — two additions on asset provenance

**Change:** two bullets. Every third-party 3D asset carries a provenance row before entering the
repo (`public/models/ASSETS.md`). And: never ship a generated or downloaded mesh without reading
its licence for the web-delivery case specifically.

**Why:** these are client legal exposure, which is the stated test for what belongs in
Non-negotiables rather than a reference file. Three concrete traps found in the research:

- Most Sketchfab free models are Creative Commons; most CC variants require crediting author and
  source. That obligation attaches to the shipped client site permanently.
- Fab's Standard License splits Personal / Professional at **"more than $100,000 USD in gross
  revenue from commercial activity in the last 12 months."**
  (Primary: dev.epicgames.com Fab licences and pricing, read 2026-08-18.)
- Hunyuan3D-2.1 defines its territory as **"the worldwide territory, excluding the territory of the
  European Union, United Kingdom and South Korea."**
  (Primary: the repo's LICENSE file, read 2026-08-18.)

The web-delivery bullet exists because serving a GLB distributes the asset in an extractable form,
and several licences that clearly permit use "in any engine or tool" do not clearly address that.
`fab.com/eula` returned HTTP 403 to automated fetching and the developer docs do not cover it, so
this is stated as an unresolved question rather than a settled restriction.

**Risk:** adds friction to every asset acquisition. That is the intent. If it proves too heavy in
practice, demote the manifest to a reference file — but the licence-reading bullet should stay in
Non-negotiables either way.

### 6. Working method — two steps and a renumber

**Change:** signature-moment naming folded into step 3; new step 4 for the byte budget; steps 5–7
renumbered to 6–8.

**Why:** ordering. Naming the signature moment *before* acquiring assets means the moment determines
what asset is needed. The reverse order — acquire something impressive, then hunt for a moment —
produces a more expensive version of pleasant, which is exactly the ceiling Rule 4a describes.

**Risk:** none beyond the renumber. Nothing else in the skill cross-references these step numbers;
worth grepping the reference files before promoting in case one does.

### 7. New subsection — verifying canvas and WebGL work

**Change:** short subsection after the working method.

**Why:** step 6 says "Verify on screen. Screenshot the result." For canvas and WebGL that
instruction silently fails — `requestAnimationFrame` does not fire in the available headless
surfaces, so the screenshot is frame zero or nothing. An instruction that appears to be followed
while producing no evidence is worse than no instruction. The dev-only single-frame render hook is
named as mandatory.

**Evidence:** established from prior sessions, not re-measured in this pass. The possibility that a
Chrome-under-CDP MCP surface lifts the constraint is marked `Unverified:` with the test that would
settle it (~15 minutes against a real Three.js scene). The hook stays mandatory until that test
passes.

**Risk:** low, and it closes a real hole.

### 8. New section — prefer a CLI over an MCP for anything deterministic

**Change:** new section before Provenance, with the two pre-install maturity checks.

**Why:** generalises well beyond 3D, and it is the practical conclusion of the whole research pass.
An MCP earns its place for exploratory surfaces; deterministic steps belong in `package.json` where
they are versioned, diffable and runnable without an agent.

**Evidence:** two commands that make maturity checkable rather than assumed:
`api.github.com/repos/<owner>/<repo>` for `pushed_at` and `license.spdx_id`, and
`api.npmjs.org/downloads/point/last-week/<pkg>`. Those checks disqualified two otherwise plausible
servers in this pass — `gregkop/sketchfab-mcp-server` (39 ★, last pushed 2025-03-09, **no licence**)
and `basementstudio/mcp-three` (19 downloads/week, last pushed 2025-08-13, **no licence**). The
"no declared licence never enters a client pipeline" line is the load-bearing part.

The 114k-vs-27k token figure for MCP versus CLI browser automation is marked `Source:` with
`decay: 1y` and explicitly flagged as single-sourced and indicative, not measured. It is
directional support, not the argument.

**Risk:** the token figure is the weakest evidence in the draft. If that bothers you, cut the
paragraph — the section stands without it.

### 9. Rule 4a — the signature moment must be reachable early

**Change:** added a paragraph stating the moment has to land in the first few seconds, and that in
an explorable build the first room is the hero.

**Why:** this is the specific way multi-room and explorable builds fail. The wow exists and it is
three minutes of walking away, so a visitor who leaves early experienced a site with no signature
moment at all. Rule 4a as written does not cover placement, only existence.

**Evidence:** reasoning from the measured reference set rather than a new measurement.
bruno-simon.com has `screensDeep: 1` and puts the drivable vehicle in the opening frame — the
moment *is* the arrival. Stated as guidance, no figure attached.

**Risk:** low. Additive, and it constrains a failure the skill currently permits.

### 10. Non-negotiables — reduced motion when motion IS the navigation

**Change:** extended the existing `prefers-reduced-motion` bullet to state that where motion is the
navigation, honouring the preference means a genuinely different non-continuous way to move — a
second navigation system — and that any estimate omitting it is wrong.

**Why:** the existing bullet says "freeze motion, drop overlays, keep the content reachable." For a
walkable 3D build, freezing the motion means the user cannot move at all, so "keep the content
reachable" silently becomes the hard part and gets discovered late. Naming it as a second system
puts the cost in the estimate rather than in the overrun.

**Risk:** it makes free-navigation builds look more expensive. They are.

### 11. Changelog entry

Standard. Notes the companion skill and the room-scale measurement sources.

---

## vx-3d-asset-pipeline v1.0.0 — new skill

**Does this warrant a separate skill?** Yes, on the skill's own promotion test: verified, and
general beyond the project that produced it.

The material is roughly 200 lines of pipeline mechanics — compression flags, colour space rules,
licence traps, tooling maturity. Putting it in `vx-elite-design-research` would inflate a file
that already loads on every dashboard and form job with content relevant to a minority of builds.
Putting it in `techniques.md` would bury it, since that file is about motion and what to build with,
not asset supply. A companion skill that loads only when a build needs geometry is the right shape,
and it matches the existing pattern where `generative.md` owns imagery sourcing.

**What it carries that the parent does not:**

- Lighting-before-geometry as the first rule, with the three colour-space and tone-mapping mistakes
- The three-link supply chain (ACQUIRE → PROCESS → VERIFY) and why PROCESS is the link with no
  substitute
- The actual compression calls, and the Meshopt-over-Draco reasoning for heroes specifically
  (decode latency lands in the critical path; Draco's better ratio does not pay for it)
- Why KTX2 matters more than geometry compression — a JPEG in a GLB decompresses to raw RGBA on the
  GPU regardless of its file size
- Source ranking by total cost of ownership rather than catalogue size
- The `ASSETS.md` provenance manifest with a worked row
- The hardware constraint, measured: **RTX 5060, 8151 MiB VRAM** on this machine versus TRELLIS.2's
  stated 24 GB and Linux-only, and Hunyuan3D-2.1's 10 GB shape / 29 GB full. All local open-weight
  generation is blocked. Hosted APIs only until hardware changes.
- Tooling install/skip table with measured maturity, and the two Blender MCP operational constraints
  (GUI instance over a socket; `execute_blender_code` is arbitrary Python)
- A "before you call it done" checklist

**Room-scale material added after the scope extension (Rules 6–9).** The companion now carries the
multi-room architecture as well as the asset supply chain, because the two are the same decision at
different volumes:

- **Rule 6 — instance the kit, don't model the rooms.** Anchored on the measurement that decides
  the whole pivot: bruno-simon.com ships its entire explorable world in **974 KB across 23 files**,
  against Active Theory's 12,496 KB and Igloo's 12,656 KB. The technique is visible in the asset
  names — `respawnsReferences-compressed.glb` at **2,836 bytes** is a transform list, not a mesh.
- **Rule 7 — one WebGL context, disposal as a build gate.** A `<Canvas>` per route exhausts GL
  contexts and fails late. `renderer.info.memory` returning to baseline is an assertable check,
  which converts a discipline problem into a test.
- **Rule 8 — navigation mode is an accessibility decision first.** Includes the trade-off table and
  the point that a reduced-motion path for free navigation is a second system, not a setting.
- **Rule 9 — in-world UI in WebGL, and sound.** RESN reaches the same perceived tier with **six
  shader programs and 7,619 KB of mp3**. That measurement is the argument for prioritising audio
  over shader work, and it is counter-intuitive enough to be worth codifying.

**Procedural / WebGPU material added after the second scope change (Rule 4a, Rules 10–11).** The
fidelity target was specified as shader-based and procedural rather than asset-imported, which
inverts the skill's own priority order. Rather than rewrite it, Rule 4a was inserted **before** the
acquisition rules so the first question is "does this asset need to exist at all":

- **Rule 4a — generate before acquiring.** `three` v0.185.1 ships `TreeGenerator` and
  `CityGenerator` as documented addons; r185 added terrain and forest generation. Decision order:
  generate → CC0 → marketplace → AI. This is the rule that most changes what future sessions do,
  and it makes Rules 1–5 apply to a much smaller set of objects.
- **Rule 10 — WebGPU discipline.** `WebGPURenderer` always (it is the WebGL2 path too), TSL only,
  and the load-bearing warning: **compute shaders and storage buffers silently no-op on the WebGL2
  fallback.** Carries the per-browser support table from the implementers' own wiki with
  `decay: 3mo`, and an explicit instruction never to quote a global coverage percentage — the
  secondary sources surveyed disagreed across a 70–95% range and on whether Firefox ships it at all.
- **Rule 11 — cheap atmosphere beats expensive geometry.** The measured lesson from the reference
  examples: fog scattering is a **post-process composite over unlit black silhouettes**, not a
  raymarch; three's `Water.js` is a **scrolling normal map, not Tessendorf**; `Sky`/`SkyMesh` →
  `PMREMGenerator` replaces an HDRI download for the common case. All three examples are under
  ~200 lines and import no assets but one water normal map.

**Note the tension this creates, deliberately left visible.** Rule 1 says lighting before geometry
and points at Poly Haven HDRIs; Rule 11 says an analytic sky through PMREM replaces that download on
the procedural path. Both are correct in their context and the underlying claim is identical — it is
the lighting doing the work. Rule 11 states the relationship explicitly rather than silently
contradicting Rule 1.

**Overlap with the parent, deliberate:** the byte budget appears in both. It is a non-negotiable-
adjacent rule in the parent and the binding constraint here. Per the storage-tier rule, **the parent
skill wins** on any conflict — the companion says so in its header.

**Weakest parts, stated plainly:**

- The budget numbers are unverified in both files. Same repro gap.
- The lighting guidance is craft consensus, not measured in-stack. No figures attached to it, which
  is the correct treatment, but it is the least evidenced section.
- The Meshopt-over-Draco call is well-supported in principle and **not measured on a Vertex build**.
  It is the highest-value candidate for a `lab/` repro — a single hero built both ways with decode
  time recorded would settle it and could be promoted with a `Repro:` line.
- The Rule 8 build-effort bands (3–5 / 5–8 / 10–16 weeks) are **estimates, not measurements**, and
  they live in the research doc rather than the skill for that reason. Do not let them migrate into
  the skill without a completed build behind them.
- **Rules 10–11 have a shorter shelf life than the rest of the skill.** TSL and WebGPU are the
  fastest-moving surfaces in the stack; the browser table carries `decay: 3mo` and the generator
  API `decay: 6mo`. That is unusually short for a skill file and it is honest. If those decay dates
  pass without a recheck, treat both rules as unverified rather than current.
- **The three.js generator API is new enough that model knowledge of it is unreliable by default.**
  That is the argument for Context7 in the loop, and it is worth stating that this research pass
  read the API docs rather than recalling them.
- `pmndrs/uikit` is recommended in Rule 9 while its licence reads `NOASSERTION`. That is
  inconsistent with the no-declared-licence rule the same drafts introduce. The draft flags it
  inline and the open-questions list carries it — but **if you promote the skill before reading that
  LICENSE file, the skill contains a recommendation its own rule forbids.** Either read it first or
  soften Rule 9 to name drei `<Html>` as the default until confirmed.

---

## Recommended order

1. **Read change 2** (portfolio inversion) first — it is the one that most changes what future
   sessions will propose, and the one most capable of being misapplied.
2. **Decide on the budget numbers.** Either accept them carrying `Unverified:`, or run the repro
   first and promote them with `Repro:`. Do not strip the marker and promote them as fact.
3. **Read the `pmndrs/uikit` LICENSE before promoting the companion**, or soften its Rule 9. See
   the weak-parts note above — as drafted, the skill would carry a recommendation its own licence
   rule forbids.
4. Accept or reject the rest as a block; changes 1, 3, 5, 6, 7, 9, 10, 11 are low-risk and additive.
5. `vx-3d-asset-pipeline` is independent — it can be promoted, deferred or rejected without
   affecting the v1.4 decision, except that the v1.4 "Load before you build" table gains two rows
   pointing at it. If the companion is rejected, remove those rows.
6. **The companion is useful at every scenario.** Rule 4a and Rules 1–5 and 12 fire on any 3D work.
   Rules 6–9 trigger only at room scale. Rules 10–11 trigger only on the WebGPU/procedural path.
   Nothing needs removing if a scenario is dropped.
7. **If only one thing is promoted, make it Rule 4a.** "Ask whether the asset needs to exist" is the
   highest-leverage line in either draft — it is the rule that would have prevented the original
   asset-first recommendation, and it applies regardless of which scenario Ryan picks.

## Not included, and why

- **No MCP maturity table in `SKILL.md`.** Star counts and download figures go stale in weeks and
  the skill's decay convention would flag it constantly. The two *commands* that produce current
  figures are in the skill; the figures themselves live in the research doc, dated.
- **No changes to any reference file.** `techniques.md`, `performance.md` and `generative.md` all
  have surfaces this research touches — particularly `performance.md` on the asset budget and
  `generative.md` on generated-asset licensing. Left alone deliberately: the brief asked for
  `SKILL.md` drafts, and reference-file edits should follow the skill decision rather than
  pre-empt it.
- **No install performed, no code touched, nothing committed.**
