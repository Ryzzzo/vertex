---
name: "vx-elite-design-research"
description: "Use for any web design, UI, or visual direction work — landing pages, heroes, scroll experiences and interactive explainers, but equally dashboards, data tables, forms, filters, admin panels and internal tools. Trigger whenever a client asks for something \"modern\", \"premium\", \"impressive\" or \"wow\", and whenever building dense application UI where table density, form ergonomics, empty and loading states, keyboard paths or perceived speed matter. Also use when choosing an animation library, sourcing imagery or 3D assets, setting an asset byte budget, auditing Core Web Vitals, or reviewing finished design work. Enforces measuring real reference sites before proposing, carries a verified catalogue of techniques that make work read as expensive, and carries the elicitation methodology to use when the client can't cite a reference for what they want."
---

# Elite design research and execution

Library v1.4.0 · synced 2026-08-18 · canonical copy lives in the `vx-design-research` repo.
If this copy is more than one cycle behind, say so before relying on the reference files.

Design work fails in a specific, predictable way: describing what you *think* good looks like
instead of measuring what actually-good *does*. This skill exists to prevent that.

The failure is not a knowledge gap. Principles like density, restraint and hierarchy are well
known. The gap is verification — proposing from memory when the evidence is one command away.

Stack filter: Node, React, Next.js, TypeScript, Tailwind, plain CSS, Supabase/Postgres, Vercel.
One developer maintains all of it. Anything requiring Svelte/Vue-only APIs, Webflow, WordPress,
a proprietary platform, or a team, is out — flag it explicitly rather than quietly adapting it.

---

## Load before you build

Read the relevant file **before writing code**, not after. Each ends with a checkable list.

| Doing this | Load first |
|---|---|
| Dense app UI — tables, forms, filters, dashboards, admin | `business-ui.md` **and** `performance.md` |
| Hero, scroll experience, interactive explainer | `techniques.md` **and** `performance.md` |
| Setting direction, choosing a concept | `references.md`, then `principles.md` |
| Marketing page, pricing, signup, CTA | `conversion.md` **and** `business-ui.md` |
| Choosing a library or animation approach | `techniques.md` → what each approach costs |
| Sourcing imagery or video | `generative.md` — the decision gate first |
| **Sourcing 3D geometry, HDRIs, materials** | **`vx-3d-asset-pipeline` skill — the budget gate first** |
| **Multi-room / explorable 3D, room transitions, in-world UI** | **`vx-3d-asset-pipeline` skill — scene lifecycle and navigation rules** |
| Type scale, pairing, measure, leading | `principles.md` → typography, then `design-systems.md` |
| Colour, palette, dark mode, contrast | `principles.md` → colour, then `design-systems.md` |
| Building or extending a token system | `design-systems.md` |
| "Can I use this API yet?" | `capabilities.md` |
| **Arriving at an existing codebase** | **Run `npm run audit-repo` first**, then `antipatterns.md` |
| Auditing shipped work for compliance | `audit-repo`, then the review pass in `antipatterns.md` |
| Reviewing or auditing finished work | `antipatterns.md` |
| Running a research cycle | `scanning.md` |
| Staleness, sync, notes, portable export | `operations.md` |

---

## Rule 1 — Measure before proposing. Always.

**Never propose a design direction before inspecting the two or three best references in the
category.** Not viewing them. Inspecting them.

Capture, per reference: DOM structure of the key section (layer count is the biggest "expensive"
signal), canvas vs SVG vs video vs WebGL, computed styles on key elements (exact easing, masks,
opacity stacks), `:root` custom properties (the palette and type scale, free), element sizes and
z-index order, cursor styles (`grab`/`pointer` reveal hidden interactivity).

Run `scripts/measure-site.js <url>` — it dumps all of the above in one pass, in the format
`references.md` expects. **It needs Node, local Playwright and network access, so it runs in
Claude Code and Cowork, not in claude.ai chat.** On claude.ai, use browser tooling to inspect
manually and record the same fields, or defer the measurement to a Dispatch session rather than
proposing unmeasured.

**Report what was measured, not just the conclusion.** "Their hero runs four layered canvases at
different opacities with a radial mask" is useful. "Their hero looks premium" is not.

**Corollary — instrument the reference, don't guess at it.** Popular assumption ("that dark
cinematic hero is a WebGL shader") is often wrong. On 2026-08-15 a 15-site instrumentation pass
patched `shaderSource`, `getContext` and draw calls before page scripts ran on Vercel, Cursor,
Warp, Linear, Arc, Rauno, Studio Freight and Teenage Engineering — all shipped **zero shader
programs and zero GLSL**. Vercel's hero is a black triangle with a CSS shadow. Linear runs zero
canvas, zero video, 180 inline SVG. Heavy WebGL only appears on agency showreels (Active Theory:
248 shader programs; igloo.inc: 12.7 MB of 3D assets) because those studios *are* selling the
ability to build that site. Never copy an agency-showreel pipeline onto a product/service site
without asking whether the signal ("we build showreels") is the one you want to send.

**The one case where this inverts: when the site IS the portfolio.** For a studio's own site, the
showreel signal is the *correct* signal, because the thing being sold is the ability to build that
exact site. Reaching for the Lusion / Active Theory tier there is not a category error.

Two conditions attach, and neither is optional. First, the showreel sites measured on 2026-08-15
skipped the accessibility work — `prefers-reduced-motion` is declared by basement.studio, warp.dev,
cursor.com, vercel.com, linear.app and teenage.engineering, and by **none** of Lusion, Active
Theory, Immersive Garden, Bruno Simon, Igloo, Arc, Rauno or Studio Freight. Copy the ambition, not
the omission. Second, the fallback-as-first-frame rule holds at every tier — a portfolio site that
renders nothing on a low-power client has demonstrated the opposite of competence.

## Rule 2 — Information density is the perceived-quality lever

The most common reason a visual reads as cheap is **insufficient information**, and element
count is only a proxy for it — a good proxy for interfaces, a bad one for imagery.

A seven-point wireframe reads as a diagram because seven points is a quantity a person could
have placed by hand. Fifteen hundred read as an instrument. But a single full-bleed photograph
carries more information than either, which is why editorial and photography-led work reads as
expensive with almost no elements on screen. It is not an exception to this rule; it is dense,
delivered sparsely.

So the question is never "are there enough elements." It is **"is there enough information, and
is any of it accidental."** When something feels flat, count what the viewer actually receives
before adding controls — and if the answer is "one large photograph, well chosen," you are done.

This generalises to business UI in the direction that surprises people: dashboards read as
amateur because too little is on screen, not too much. Rows visible without scrolling is a
design metric. See `business-ui.md`.

## Rule 3 — Atmosphere is layers, not effects

Depth comes from stacking, not from filters: a ghost twin of the main object at ~1.4× scale and
~20% opacity behind it; `mask-image: radial-gradient(...)` so edges dissolve into the page
instead of ending; two or three static CSS radial-gradient glow divs behind everything, free and
GPU-composited. Never `filter: blur()` or `box-shadow` inside a render loop.

Hard edges are the tell of a diagram. Dissolved edges are the tell of an environment.

## Rule 4 — Interactivity beats animation

Passive motion is wallpaper. Something the user can grab, drag or perturb reads as an instrument.
`cursor: grab` plus drag-to-rotate is worth more than any amount of autoplay. Auto-motion should
idle underneath and yield to input, then resume.

### Rule 4a — One signature moment beats general interactivity

Interactivity beats animation (Rule 4). ONE unexpected interaction beats general interactivity.
Every memorable hero has a single moment the visitor stumbles into that they didn't come looking
for — the machine that builds itself on first paint, the object that responds to cursor with real
physics, the marble that metamorphoses at each stage, the button that clicks with sound.

The bar this crosses is empirical: polished-but-generic work ceilings at "kind of cool"; the
reaction *"holy shit that is so cool"* reliably tracks with a signature moment. Identify and
design ONE per hero. Everything else is supporting choreography.

If a build tests weak, ask *"what is the signature moment?"* before asking *"is the fidelity high
enough?"* A high-fidelity site with no signature moment plateaus at pleasant.

**The moment has to be reachable in the first few seconds.** This is where explorable and
multi-room builds most often fail: the wow exists, and it is behind three minutes of walking. A
visitor who leaves before reaching it experienced a site with no signature moment at all. If the
concept requires exploration, **the first room is the hero** — put the moment there and let the
rest reward the visitors who stay. Depth is a reward for engagement, never a toll on it.

## Rule 5 — Easing carries the money, and one curve carries the site

**The law is one curve everywhere.** A site running five easing curves reads as assembled by
five people. Pick one per project, use it for every entrance, reveal and dissolve, never mix.

The curve should be a long-tail ease-out — gentle start, hard decelerate into the end. That is
most of the difference between "expensive" and "bouncy". Two verified members of the family:

- `cubic-bezier(0.32, 0.72, 0, 1)` — measured as the **only** easing curve on linear.app,
  2026-08-05. Default to this; it is the one carrying provenance.
- `cubic-bezier(.16, 1, .3, 1)` — a harder decelerate. Use where entrances want more drama.

Which one you pick matters far less than picking once. See `references.md` → linear.app.

Word-by-word text entrances with staggered `animation-delay` (~0.11s apart), each word starting
blurred and translated down, is the standard premium intro. Cheap to build, reads as bespoke.

## Rule 6 — Concept before craft

The visual must argue the product's actual position, not just look current.

Ask: *what does the competitor's visual metaphor claim, and does ours claim the opposite or the
same thing?* A connected-globe animation says "everything is linked." If the product's whole
argument is that nothing has to be, that visual is actively wrong no matter how well built.

Beautiful execution of the wrong metaphor is worse than plain execution of the right one.

### Rule 6a — Second-attempt failures usually mean the concept is wrong, not the fidelity

If a build lands weak after a full research pass AND a fidelity execution pass, treat the
concept as suspect before iterating on execution a third time.

Symptoms:
- Client reactions cluster on polite non-enthusiasm ("it's fine," "kind of cool," "not landing")
- Specific criticism does not converge on a rendering issue
- Fidelity improvements do not materially move the reaction
- The peer set the client actually surfaced (via Rule 8 elicitation) contradicts the peer set
  the concept assumed

A wrong metaphor cannot be rescued by better rendering. The dissolution metaphor of a point
cloud does not become a permanence argument at 60fps. Concepts fail in classes: metaphor
inverted (particles claiming durability), density mistaken (four low-info icons in place of one
dense object), medium wrong (diagram-you-scroll-past vs toy-you-touch). Diagnose which class
before rebuilding.

### Rule 6b — Fidelity taxonomy

Every visual has a target tier. Getting the tier right matters more than executing any single
tier well; fidelity mismatch is the most common failure mode in first-pass builds.

1. **Wireframe / technical drawing** — light lines on flat background, isometric, annotated.
   CSS/SVG or lightweight Three.js LineSegments. LOW cost, HIGH craft ceiling. Blueprints,
   watch schematics, ID drawings, patent illustrations.
2. **Rendered lit object** — material, subsurface light, real shadows, environmental context.
   Three.js with PBR materials + directional lighting. MEDIUM cost, HIGH fidelity requirement
   to avoid dated feel.
3. **Bas-relief / sculptural** — subtle depth, single sharp accent, one central object doing
   the work. Three.js displacement + baked normal maps, or pre-rendered video with alpha.
   MEDIUM cost, specialist aesthetic.
4. **Studio-showreel 3D** — chrome, glass, playful geometry, agency territory (Lusion, Active
   Theory). Full Three.js pipeline with postprocessing. HIGH cost. Wrong signal for most
   product/service sites — see Rule 1's corollary. Reserve for cases where the site IS the
   portfolio.
5. **Photoreal cinematic render** — aluminum, brushed steel, volumetric fog, monumental scale.
   NASA test equipment aesthetic. Three.js with PBR + HDRI environment map + custom fog
   shader. HIGH cost, adds ~50–80 KB gz over raw. Reads as expensive product hero (Cursor,
   Warp).

State the target tier explicitly at brief-writing time. Reference sites often mix tiers —
measure which tier is doing the load-bearing work before proposing.

**Tiers 1–3 are reachable from primitives. Tiers 4 and 5 are not.** A build that targets tier 4 or
5 with only `BoxGeometry`, `LatheGeometry` and procedural maths will ceiling at tier 2 no matter
how well executed, and the resulting gap gets misdiagnosed as a fidelity problem when it is an
asset-supply problem. When the brief names tier 4 or 5, the asset supply chain and the byte budget
are part of the brief, not an implementation detail discovered later. See `vx-3d-asset-pipeline`.

**The lighting carries more of the tier than the geometry does.** A moderately detailed mesh under
a real HDRI environment with correct tone mapping reads as tier 5. A dense mesh under three point
lights reads as a 2009 game asset. When a build is short of its target tier, check the environment
map before adding triangles — it is the cheaper lever and usually the actual defect.

### Rule 6c — One object, many states, beats many objects

When a brief calls for multiple objects (e.g. "one per capability"), first ask whether ONE
object with multiple states/layers/phases would carry the same argument better. Four separate
icons carries the density-mistake in a different costume — it reads as low information
regardless of individual icon fidelity. Four beats of one thing (states, layers, phases,
transformations) reads as more sophisticated than four separate things.

The test: can the visitor point at ONE thing and say what the site is about? If yes, the object
earns its screen. If they have to survey four things and integrate, the composition is
over-serialised.

## Rule 7 — Perceived speed is a design decision, not an engineering outcome

Linear does not feel fast because its servers are fast. It feels fast because state updates
locally before the network confirms, because there is no spinner between intent and feedback,
and because the keyboard path skips the mouse entirely.

Every place the interface makes the user wait to learn what happened is a design defect, and it
is fixable in the client. Treat latency-to-feedback as a first-class layout concern, alongside
hierarchy and spacing. See `business-ui.md`.

## Rule 8 — When the vision has no citation, elicit it. Don't ask for an example.

Clients with strong taste often can't cite a reference for what they want. They know it when
they see it, and they can identify what is *wrong* fluently — but asking "can you send an
example?" hands the elicitation labor back to them and reliably stalls the work.

Run one of these techniques instead — each is cheap and each is designed to surface signal
without asking the client to name what they can't name.

- **Feeling words before pictures.** Ask what the visitor should FEEL, not what the design
  should look like. "Confident, quiet, precise" filters reference hunting dramatically. Feeling
  words are easier for a non-designer to pick than design adjectives.
- **Anti-references.** Ask what feels WRONG. "The current site feels X, I want the opposite of
  X." The gap between anti-references and current state is direction.
- **Adjacent-medium moodboards.** Web design has a limited vocabulary. Reach for book covers,
  album covers, industrial catalogs, architecture monographs, vintage instrument manuals,
  luxury packaging, magazine spreads, product photography. Prompts like "German engineering
  catalog aesthetic" or "Blue Note album cover mood" translate cleanly to visual language.
- **Rapid warm/cold reaction session.** Show 15–20 candidates back-to-back. Two-word reactions
  ("warm/cold, why"). Pattern emerges in 15 minutes. More accurate than any long discussion.
- **Constraint elicitation.** Sometimes the vision is a list of NOs, not a picture. "No glow.
  No gradients. Monospace only. Grayscale." Constraints define shape more clearly than
  positive references.
- **Peer-set method.** "If your site opened next to these in a browser tab row, you want to
  belong there." Pick 3–5. Extract common qualities. Warning: the client's OBVIOUS peer set
  (from their stated positioning) is often wrong. A firm positioning itself as
  editorial-restraint may actually admire product-cinema. Surface the peer set empirically,
  not by assumption — this is where the biggest concept-level miscalibrations get caught.
- **Physical-object metaphor.** "If your business were an object, what would it be? A jazz
  record? A vintage synth? A blueprint tube? A Braun kitchen scale?" Physical metaphors
  translate to visual language cleanly.
- **Concrete alternatives via generation.** Generate 3–4 wildly different interpretations of
  the same page and let the client react. See the AI image generation section below.

Pick 2–3 techniques for a single session; running all eight is a workshop, not an elicitation.
Compose the results into a written brief before proposing a build.

**The elicitation output is a brief, not a decision.** The client's picks give you the aesthetic
DNA to work from; the brief translates them into a concept the build CC can execute. Do not
skip the brief step — the picks are inputs, not deliverables.

### AI image generation in the elicitation loop

AI image tools (Midjourney, ElevenLabs image, Recraft, Nano Banana, etc.) are a first-class
step in design elicitation, not a novelty. The loop:

1. Draft 3–4 targeted prompts, each testing a specific aesthetic axis (e.g. "modern industrial,"
   "precision instrument," "cinematic dark," "stylized 3D"). Include DO and DON'T language in
   each prompt so the model has a corridor to work in.
2. Client generates 2–3 outputs per prompt (in their own tool of choice — the designer does not
   need to run the generation).
3. Client picks favorites; the designer extracts the common signature (materials, lighting,
   atmosphere, palette, camera angle, composition).
4. Iterate on the winning direction with tighter prompts. Cheap iteration is the whole point.

Two known failure modes:

- **Reference contamination.** Prompts that name another brand ("in the style of X studio")
  often get that brand's LABEL or wordmark baked into the render literally. When the client
  reacts positively, separate *"did they like the aesthetic"* from *"did they like the brand it
  invoked."* Test by regenerating without the brand name and confirming the reaction transfers.
- **The "kind of cool" ceiling.** AI stills plateau at "kind of cool." The reaction ceiling
  that opens up at "holy shit" almost always lives in MOTION and INTERACTIVITY (Rule 4a), which
  stills cannot show. When new stills stop generating new information, freeze the aesthetic
  direction and prototype the motion. Do not grind on stills past the point of diminishing
  returns.

The AI-render aesthetic is always photoreal-adjacent — that is what the models produce.
Translating to real-time WebGL means paying a bundle premium for PBR + HDRI + volumetric fog
(typically 50–80 KB gz on top of raw Three.js). Measure the cost against the design goal; the
"raw Three.js is enough" default breaks when the client's actual peer set is Cursor/Warp/
Basement rather than Linear/Rauno.

## Rule 9 — Write the byte budget before acquiring the asset

Better geometry is now one tool call away, and that is exactly what makes this rule necessary. The
failure it prevents is specific and expensive: a genuinely better mesh lands, the hero looks superb
locally, LCP goes to four seconds on a mid-tier phone, and the only fix is to throw the asset away
and start again — after the texturing work, after the client has seen it.

**The budget is written into the brief alongside the fidelity tier, before anything is acquired.**
Not after the asset is chosen, because by then the budget is a negotiation with sunk cost.

```
Hero asset budget — proposed defaults, re-measure per project
  Total 3D payload (GLB + env map + decoders)  ≤ 900 KB over the wire
  Draw calls at steady state                    ≤ 30
  Triangles                                     ≤ 150k
  Textures                                      1 atlas, ≤ 1K, KTX2
  Environment                                   1 HDR, ≤ 2K, compressed
  First paint                                   SVG/CSS fallback, zero WebGL cost
```

> Unverified: budget figures derived from the ~50–80 KB gz PBR+HDRI+fog premium plus LCP
> arithmetic, not from a repro · 2026-08-18 · needs a lab pass before being stated as measured.

The numbers are provisional. **The practice is not.** Writing a budget down before acquisition
costs nothing and prevents the most expensive failure mode in asset-driven work.

Three corollaries that follow directly:

- **Never ship a third-party mesh unprocessed.** Marketplace assets are authored for offline
  rendering — millions of triangles, four 4K texture sets, unused UV channels. Straight into
  `public/` is a 40–60 MB regression wearing the costume of a quality upgrade. Run
  `gltf-transform inspect` on the raw download first; it is two minutes and it tells you whether
  the asset is viable at all before any work goes into it.
- **The environment map is the highest fidelity-per-byte asset available.** Reach for it before
  reaching for a better mesh.
- **Measure the page, not the asset.** A better hero that costs a second of LCP is not a better
  hero. Verify the trace, not the render.

---

## Non-negotiables

These fire without loading anything. Everything else is judgement.

**Anything that fails a WCAG success criterion lives here, not in a reference file** — a
reference file might not be loaded, and an accessibility failure shipped to a client is their
legal exposure, not a craft note. Criteria are cited so the exposure is checkable.

- `prefers-reduced-motion` **skips** the effect, never slows it. Freeze motion, drop overlays,
  keep the content reachable. **Where motion is the navigation** — a walkable or free-camera 3D
  build — honouring this means shipping a genuinely different, non-continuous way to move, not a
  slower camera. That is a second navigation system and roughly what doubles such a build. Any
  estimate that omits it is wrong.
- Never trap scroll. Every assist must be escapable.
- Never `scroll-snap-type: mandatory`. `proximity` only.
- **CSS scroll-driven animation ships behind `@supports (animation-timeline: view())`, and the
  unanimated state must be the correct one.** It is not Baseline — Firefox stable still has it
  behind a flag. If content is invisible or wrong without the animation, the technique is wrong.
  > Source: MDN / WebKit / Mozilla platform status · read 2026-08-05 · decay: 6mo ·
  > recheck: 2027-02-05 — Firefox is an Interop 2026 priority; verify, do not assume.
- Every interactive element reachable and operable by keyboard, with a **visible** focus
  indicator. Never `outline: none` without a replacement.
- Contrast: 4.5:1 body text, 3:1 large text and meaningful UI boundaries. **The WCAG 2 formula
  is known to be unsound for dark UI and near-black colours — but it is the legal standard, and
  there is no case where APCA or any other model justifies shipping below 4.5:1.** When the
  ratio and your eyes disagree, resolve upward. Never argue downward. See `principles.md`.
- Never bake text into image files. *(WCAG 1.4.5)*
- **Never a bare `vw` in a `clamp()` middle term.** `clamp(1.75rem, 4vw, 2.5rem)` stops
  responding to browser zoom at fixed viewport widths. Mix a `rem` term with the `vw` term:
  `clamp(1.75rem, 1.2rem + 2.5vw, 2.5rem)`. Most generators emit the broken form. *(WCAG 1.4.4 —
  text must scale to 200%.)*
- **No horizontal scrolling at 320px width** except for genuinely two-dimensional content — data
  tables and maps are the permitted exception, and they scroll inside their own container, never
  the page. *(WCAG 1.4.10)*
- Never `filter: blur()` or `box-shadow` inside a render loop.
- Never generated imagery implying reality — the client's team, premises, actual products, real
  customers, testimonial headshots.
- Never AI-generated humans on trust-dependent brands: security, legal, financial, medical,
  privacy.
- **Every third-party 3D asset carries a provenance row before it enters the repo** — source URL,
  author, licence, required attribution text, date acquired, what was done to it. A committed
  `public/models/ASSETS.md`. This is a licence-compliance obligation attached to the shipped client
  site, not a housekeeping preference: Creative Commons assets carry attribution duties that
  survive into production, marketplace licences differ by the buyer's revenue tier, and at least
  one widely-used open 3D model licence carries a **territorial exclusion**. Six months later, in a
  handover or a client's legal review, "where did this come from and what are we obliged to do"
  must be answerable in seconds.
- **Never ship a generated or downloaded mesh without reading its licence for the web-delivery
  case specifically.** Serving a GLB to a browser distributes the asset in a form an end user can
  extract. Several licences that clearly permit use "in any engine or tool" do not clearly address
  that, and the ambiguity is the client's exposure. Where the terms are unclear, resolve before
  shipping — the same direction as the contrast rule: never argue downward.

### Copy: show don't tell

If the site should FEEL cutting-edge, quiet, precise, or luxurious, the visuals and typography
carry that. The COPY does not announce it. Ban the words that describe what the site is trying
to be: *"innovative," "cutting-edge," "revolutionary," "transform," "leverage," "seamless,"
"next-generation," "world-class," "best-in-class," "game-changing."*

If a client picks "cutting-edge" as a feeling adjective during Rule 8 elicitation, that maps to
a visual and interaction quality — not a headline word. Reconciling the feeling requirement
with the language ban is the writer's job. Reciting the adjective in the copy is the failure
mode.

Applies to labels, headlines, buttons, meta descriptions. A quoted testimonial from a real
customer using one of these words stays as-is — it is speech, not marketing prose.

### Mechanically checkable non-negotiables run against a codebase

**Most non-negotiables are mechanically checkable. `npm run audit-repo` runs them against a
codebase** — easing count, `clamp()` zoom, mandatory snap, focus suppression, blur in render
loops, token contrast cross-referenced against the font sizes each pairing is actually used at,
tabular figures, sticky headers. Run it when you arrive at existing work, not only at handoff.

Known audit-tool limitations (from 2026-08-15 pass):
- The auditor matches `\baccent\b` on class names, so Tailwind's `accent-[...]` utility for
  `accent-color` triggers the contrast rule as if it were a token reference. Renaming the token
  does not clear it. Fix is at the audit-script level, not the codebase.
- The token map is global with first-definition-wins, so a token defined at site scope can be
  cross-paired with a surface token defined in an embedded lab, generating false contrast
  failures. When the audit reports FAIL on an artifact that renders zero failures per element,
  believe the artifact.
- Verify at the artifact level (rendered pixels, extracted text) whenever the auditor's row
  count and the artifact's element count materially disagree.

### When a non-negotiable fails in shipped client code

**Never unilaterally change a client-approved design decision — and never silently leave a legal
exposure in place either.** Those pull in opposite directions, and the resolution is a
distinction:

**You don't need permission to fix a defect. You need permission to change a decision.** A
contrast failure inside an approved palette token is both at once, which is what makes it feel
unresolvable.

So separate them:

1. **Report within one working day.** WCAG A/AA failures are the client's legal exposure. That
   framing means they must be told promptly — not that it can wait for the next milestone.
2. **Propose the minimal change that preserves the decision.** The fix that gets approved is the
   one that doesn't ask them to revisit a settled choice. A token 3% darker and visually
   indistinguishable is a defect fix. A new palette is a decision change and will stall.
3. **Do not ship the change unilaterally**, even when it's obviously right. Approved tokens are
   the client's, and a designer who edits them without asking loses the standing to be trusted
   with the next one.
4. **If they decline, confirm in writing** — what fails, which criterion, what you proposed.
   That moves the exposure back to them explicitly, which is the honest outcome and the one that
   protects you.

Severity is not uniform. A 4.37:1 token missing 4.5:1 by 0.13 is real and fixable this week. A
keyboard trap or an unlabelled form control blocks people from completing the task now, and
warrants interrupting whatever else is scheduled.

**When the fix is bounded by geometry.** Some contrast failures cannot be fixed by moving one
value — the accent-on-white curve and the white-on-accent curve cross at ~4.5:1 each around
oklch L 0.575, so any lift that fixes text-on-accent breaks white-on-accent. The resolution is
to split the token: `--accent` keeps the approved value for fills; `--accent-text` (same hue and
chroma, higher L) takes the text-only sites. Preserves the decision, clears the defect. Applies
generally to token pairs where usage crosses the contrast-curve intersection.

## Working method

1. **Identify the two or three best references** — the category leader plus one or two from
   adjacent categories that solve the same emotional problem better.
2. **Measure them.** Rule 1. Record findings into `references.md` with a date.
3. **State the concept before the craft.** What does this visual argue, and how does it differ
   from what the leader's visual argues? State the target fidelity tier (Rule 6b) explicitly.
   Name the signature moment (Rule 4a) here, not later — it determines what assets the build
   actually needs, and acquiring an impressive asset first and hunting for a moment afterwards is
   the wrong order.
4. **Write the byte budget** (Rule 9) if the build uses 3D, video or heavy imagery. Before
   acquiring anything.
5. **Build in code, not static comps.** A prototype the client can drag and click beats a frame
   they can only look at, and it proves the thing actually runs.
6. **Verify on screen.** Screenshot the result. Never describe a rendering nobody has looked at.
   For canvas and WebGL, screenshotting is not sufficient on its own — see the verification note
   below.
7. **Offer contrasting directions**, not variations of one. Two genuinely different arguments
   give a real choice; two tints of the same idea give none.
8. **Name the concept before proposing it.** "The Machine," "The Console," "The Terminal" is
   the argument in shorthand; warm/cold reaction is only possible against a named alternative.
   Generic "here's another option" is not a real choice.

### Verifying canvas and WebGL work

`requestAnimationFrame` does not fire in the headless browser surfaces available to an agent, so a
screenshot of a canvas hero is a screenshot of frame zero, or of nothing. **A dev-only single-frame
render hook is mandatory for this class of work** — without it, the work cannot be looked at, and
describing a rendering nobody has looked at is the failure Rule 1 exists to prevent.

> Unverified: an official Chrome-under-CDP MCP surface may lift this constraint. Testable in about
> fifteen minutes against a real Three.js scene · 2026-08-18. Until that test is run and passes,
> the hook stays mandatory.

### The fallback IS the first frame — don't build them twice

For any hero that uses WebGL / Three.js / canvas: build the SVG (or CSS) fallback FIRST, use it
as the first paint on ALL clients, then progressively enhance to WebGL where capabilities allow.
Same drawing, so the fallback is not a degraded copy — it is the opening scene. Mobile /
reduced-motion / low-power clients pay zero WebGL cost and see the correct static frame; capable
clients see the same frame come to life. One design system, one asset, two rendering paths.

## When the client can't articulate what they want

Common and normal. They know it when they see it.

For **pre-build elicitation** — before you have committed to a concept and have nothing yet for
them to react to — see **Rule 8** above. Feeling words, anti-references, peer sets, physical-
object metaphors, AI image generation loops. All designed to surface signal without asking the
client to name what they can't name.

For **post-build iteration** — once you have an artifact to react to — build the strongest
opinion quickly, show it, and read the reaction. Specific criticism of a real artifact ("the
animation isn't landing as cool", "make the building taller") is far more informative than any
amount of upfront questioning. Iterate on evidence. Read enthusiasm calibration as signal:
"kind of cool" and "holy shit that is so cool" are different data points, not synonyms for yes.

Push back with reasoning when a direction is wrong, and say what to do instead. Deference
produces safe work, and safe work is what the client could have got anywhere.

## Tooling — prefer a CLI over an MCP for anything deterministic

An MCP earns its place when the agent needs to *explore* a surface — search a catalogue, inspect a
live scene, drive an application whose state it cannot predict. It does not earn its place for a
step that runs the same way every time.

Deterministic steps belong in `package.json`, where they are versioned, reproducible, reviewable in
a diff and runnable by a human without an agent in the loop. Asset compression, image conversion,
codegen and bundle analysis are all in this class. Wrapping them in tool calls makes the build less
reproducible, not more.

There is a measured cost argument too: a typical browser-automation task has been reported at
roughly **114,000 tokens through an MCP versus 27,000 through the equivalent CLI**, about 4×.

> Source: multiple 2026 Playwright MCP write-ups · read 2026-08-18 · decay: 1y · single-sourced,
> treat as indicative rather than measured.

On a long session that difference is context that could have held the actual work. Before
installing any MCP, ask whether the interaction is genuinely exploratory. If it is not, it is a
script.

**Two maturity checks before any MCP install, both one command:**

```
Measured: api.github.com/repos/<owner>/<repo>   → stars, pushed_at, license.spdx_id
Measured: api.npmjs.org/downloads/point/last-week/<pkg>   → weekly downloads
```

A stale `pushed_at` and a missing `license` are the two disqualifiers that matter. **An MCP with no
declared licence must never enter a client-work pipeline** — without a licence grant, default
copyright applies and there is no permission to use it. Low download counts on a *vendor's own*
server are normal and not disqualifying; a year of silence is.

**`spdx_id: NOASSERTION` is not the same as "no licence" — it is "not machine-classifiable," and
the difference is a permissive library wrongly disqualified.** GitHub's classifier matches the
LICENSE file against known templates; anything it cannot resolve to a single SPDX ID returns
NOASSERTION, including files that carry a perfectly good grant. **Always open the file before
disqualifying on this field.** The reverse error does not exist: a positive SPDX ID is reliable.

> Measured: `pmndrs/uikit` · 2026-08-18 · decay: 1y — API returns `spdx_id: NOASSERTION`; the
> LICENSE file is **two verbatim MIT grants stacked** (Bela Bohlender 2024, Coconut Capital 2023).
> The classifier failed on the concatenation, not on the terms. Two files' worth of licence, read
> as none.

## Provenance — no unsourced assertions

Every entry in every reference file carries one line:

```
> Measured:   linear.app/homepage · 2026-08-05 · decay: 2y
> Repro:      lab/business-ui/table-density · 2026-08-05 · decay: 2y
> Source:     NN/g, "Form validation timing" · read 2026-08-05 · decay: 2y
> Unverified: claimed in release notes, not yet built · 2026-08-05
```

A technique needs `Repro:` before it enters `techniques.md` or `business-ui.md`. Published
evidence that can't be reproduced in-stack carries `Source:` with a named publication, and never
gets stated with repro-level confidence. `Unverified:` is allowed and must be labelled.
**Undated entries are untrusted — treat them as absent.**

### A figure carries its conditions, every time it is written

A date says when it was measured. It does not say **what it was measured against**, and that is
what goes stale first.

> **Never write a measured number without the parameter that produced it — in the same sentence,
> in every copy.** `18.6% unfixable` is not a fact. `18.6% unfixable with dark text at #1F2937`
> is. The first reads as a property of the world; the second is checkable, and stops being quoted
> the moment the constant changes.

This is the failure mode that survives dating, because the number stays arithmetically correct
while becoming irrelevant. It cost three separate errors in one session on 2026-08-08 —
`operations.md` has the worked example.

**When you change a constant, every figure derived from it is now unverified.** Not suspect —
unverified. Re-measure or delete; do not reason about whether it probably still holds. `npm run
audit` lists figures stated in more than one place under TRAVELLING FIGURES, which is where a
condition most often gets dropped in transit.

## Storage tiers

This skill is canonical. Where a fact exists in both the skill and a note, **the skill wins.**

The skill must work with zero access to basic-memory. If knowledge is needed to do the work, it
belongs in a reference file, never in a note. Notes are archive: raw measurement dumps, research
cycle logs including what was rejected and why, per-client decisions and preferences.

A finding is promoted from notes into the skill only once it is **verified** and **general beyond
the project that produced it**. Project-specific findings stay in notes. See `operations.md` for
the namespace convention and the sync workflow.

## Research cycles

Invoke with `research cycle: [topic]`. See `scanning.md` for source tiers, cadence, the
verification bar, and the rejection log. The point of a cycle is techniques we don't yet know
exist — not confirmation of what we already believe.

## IP note for client work

A generic design method, utility or research process developed independently of any client
project is Pre-Existing Material and stays yours. The same thing written for the first time
inside a client deliverable is arguably their work product.

Build reusable tooling in your own space first, then bring it in. Never the reverse. This is why
repros live in `vx-design-lab` and not in a client repo.

---

## Changelog

- **v1.4.0 · 2026-08-18** — Added Rule 9 (byte budget before asset acquisition), the
  portfolio-inversion case to Rule 1's corollary, the tier-4/5 asset-supply and lighting notes to
  Rule 6b, the reachability clause to Rule 4a, two asset-provenance non-negotiables, the
  reduced-motion-as-navigation clause, the canvas/WebGL verification note, and a tooling section on
  preferring CLIs over MCPs with the two pre-install maturity checks. Working method renumbered to
  eight steps. New companion skill `vx-3d-asset-pipeline` carries the asset supply chain, scene
  lifecycle and navigation rules. Sourced from the 2026-08-18 capability-stack research pass,
  including a room-scale architecture sweep measured against bruno-simon.com, basement.studio,
  activetheory.net, immersive-g.com, resn.co.nz and igloo.inc.
- **v1.3.0 · 2026-08-15** — Added Rule 4a (signature moment), Rule 6a/b/c (concept diagnostic,
  fidelity taxonomy, one-object-many-states), Rule 8 (elicitation methodology for uncited
  vision), AI image generation section, show-don't-tell copy non-negotiable, audit-tool
  limitations, geometry-bounded contrast fixes, working-method additions (name the concept,
  fallback-as-first-frame). Sourced from the 2026-08-15 Vertex hero rebuild pass and the 15-site
  measurement instrumentation run.
- **v1.2.1 · 2026-08-09** — Earlier baseline.

