# GetLayers.ai — Read-Only Evaluation

**Date:** 2026-08-23 · **Evaluator:** Claude (research pass) · **For:** Ryan / Vertex

---

## TL;DR

| Asset | Verdict | Cost |
|---|---|---|
| **Free Next.js 16 starter** | **GRAB — as reference. Steal the hooks + design-token pattern into vertex/ConsultBase/Northstar. Do NOT adopt as-is.** | $0 (Unlicense) |
| **Unlimited $99/yr** | **DEFER.** Sign up free first (5 free layers), judge prompt quality, then decide. 3-copies/day cap is a real ceiling for VX work. | $99/yr |
| **Full Stack $139/yr** | **YES-IF you'll ship ≥3 immersive client sites/yr AND use the Next.js source drops.** Otherwise defer. | $139/yr sale (was $497) |
| **GetLayers MCP** | **DEFER — TIER TRAP.** MCP page explicitly requires *Full Stack Lifetime*, not the $139 yearly. Confirm with Textura before assuming $139 unlocks it. | Lifetime tier (higher than $139/yr — verify) |

**The one thing to steal right now, free, no signup:** the `.claude/settings.json` three-hook pattern from the starter (SessionStart / UserPromptSubmit / Stop) plus the Obsidian-vault-as-project-context convention. Both plug into your existing repos without touching Textura's stack.

**The single biggest risk:** the MCP page says *"Requires a GetLayers account with an active Full Stack Lifetime subscription."* Full Stack Lifetime is a separate SKU from Full Stack yearly ($139). If MCP is what you're actually buying it for, you are not buying $139 — you are buying whatever the lifetime toggle price is. Verify before purchase.

---

## 1. Next.js 16 Starter — The Free Asset

**Repo:** `https://github.com/textura-agency/next16-claude-starter`
**License:** Unlicense (public domain, no attribution required)
**Stats:** 98★, 38 forks, last push 2026-08-18, actively maintained
**Description (theirs):** *"AI-first Next.js 16 starter for animation-heavy sites, wired with an Obsidian vault & Claude Code hooks"*

### 1.1 Stack (from `package.json`)

```
next        16.3.1
react       19.2.8
typescript  5.9.3
tailwindcss ^4.3.3
@react-spring/web   ^10.1.2      ← all motion
lenis               ^1.3.26      ← smooth scroll
spring-text-engine  ^0.1.5       ← text animation (VERY early, v0.x)
zustand             ^5.0.15
zod                 ^4.4.3
```

**Node:** `>=20.19.0`, recommended 22.13+ / 24 LTS.
**Package manager:** yarn (yarn.lock committed, no pnpm/npm lockfile).

### 1.2 Top-level structure

```
.claude/            ← Claude Code brain (see 1.3)
  agents/           ← 4 sub-agents (motion-reviewer, section-builder, seo-auditor, vault-librarian)
  commands/         ← 8 slash commands (/cms /db /migrate-site /new-page /qa /section /seo /ship)
  rules/            ← 7 rule docs (api-env, design-tokens, engine-protected, motion, payload, routing-views, supabase)
  scripts/verify.sh ← pre-done gate
  settings.json     ← the hooks (see 1.3)
  skills/           ← 11 in-repo skills (aeo-visibility, figma-to-section, optimize-3d-scene, payload-cms, qa-verify, schema-markup, seo-audit, ship-check, site-migration, supabase-auth, supabase-db)

obsidian/           ← project docs, IS the source of truth
  architecture/     (5 notes)
  backend/          (4 notes)
  frontend/         (12 notes + components/ subfolder)
  meta/             (changelog, decisions-log/ADRs)
  templates/        (component-note, hook-note, adr-note stencils)
  workflows/        (11 playbooks: ai-agent-guide, agent-harness, figma-to-code, generic-layout-prompt, new-page, optimize-3d-scene, qa-verification, seo-aeo, ship, site-migration)

src/
  app/              ← Next router (thin)
  components/       (animation/springs/ is protected)
  hooks/animation/  (7 hooks) + hooks/smooth-scroll/
  layouts/
  lib/animation/ticker.ts, lib/springs/config.ts, lib/api/, lib/site.ts
  style/
  utils/animation/, utils/seo/
  views/            ← app/**/page.tsx delegates to here

AGENTS.md · CLAUDE.md → both point into obsidian/
```

### 1.3 The three Claude Code hooks (`.claude/settings.json`)

This is the interesting part. Verbatim intent:

| Hook | Fires | Payload |
|---|---|---|
| `SessionStart` | new chat / resume | Injects: *"All project documentation lives in obsidian/, which is the single source of truth. Read obsidian/README.md and obsidian/workflows/ai-agent-guide.md before doing project work this session."* |
| `UserPromptSubmit` | every turn | Injects: *"VAULT REMINDER: consult the relevant obsidian/ guide before acting — e.g. animation-system.md for animation, new-page.md for pages, component-conventions.md for components. If your work changes code/behaviour/deps/architecture, update matching vault docs SAME TURN: catalog notes under obsidian/frontend/, meta/changelog.md, meta/decisions-log.md."* |
| `Stop` | end of every turn | Blocks ONCE with: *"Before finishing this turn: if you changed code/behaviour/deps/architecture, update the matching obsidian/ vault docs now — catalog notes, changelog, decisions-log. If the vault already reflects everything done, stop."* (uses `$TMPDIR/claude-vault-stop-<session_id>` marker file to only block once per turn) |

Plus a full **permissions matrix** (`allow` / `ask` / `deny`) covering:
- Auto-allowed: `yarn lint/build/dev`, `git status/diff/log`, `grep/rg/find/file/ls`, `.claude/scripts/verify.sh`, WebFetch to nextjs.org / payloadcms.com / supabase.com / tailwindcss.com / developer.mozilla.org / schema.org
- Ask-first: `rm`, `mv`, `chmod`, `yarn add/remove`, `npm install`, `npx`, `git push/reset/checkout/commit`, `vercel:*`, `supabase db push/reset`, `payload migrate`, `kill*`
- Denied: reads of `.env*`, `*.pem`, `*.key`

**This is the most reusable piece of the entire starter.** It is the pattern I'd steal.

### 1.4 The "spring animation system"

Not a novel library — it's a **conventions layer** around `@react-spring/web`:

- `src/lib/springs/config.ts` — global mobile-disable toggles per animation type (`hover`, `inview`, `spring`, `springtrigger`) with a 768px breakpoint
- `src/hooks/animation/` — 7 wrapped hooks: `use-dynamic-in-view`, `use-in-view-ref`, `use-loop-in-view`, `use-progress-trigger`, `use-render-loop`, `use-spring-trigger`, `user-resize-loop` (sic — "user-" typo in filename)
- `src/lib/animation/ticker.ts` — single-source RAF ticker
- `src/components/animation/springs/` — protected component wrappers (Hard Rule #2 in `AGENTS.md`: don't modify without sign-off)
- **Text animation** = `spring-text-engine` package (0.1.5 — Textura's own npm, very early version, single upstream)

**Rule (from `AGENTS.md`):** *"All motion is spring-based. No CSS keyframes, no framer-motion. One exception: CSS `transition-*` allowed for simple discrete state changes with token-backed timing."*

### 1.5 The Obsidian docs system

Not a plugin — it's a **file convention**. `obsidian/` is a plain folder of `.md` files with `[[wikilinks]]` between them. Open it in the Obsidian app and it becomes a linked knowledge graph. Open it in VS Code and it's just markdown.

**Structure:**
- `README.md` = Map of Content (entry point)
- `architecture/` = system-overview, tech-stack, data-flow, folder-structure, environment-variables
- `frontend/` = animation-system, design-system, component-conventions, hooks, routing, seo-metadata, smooth-scroll, text-engine, utils + `components/` catalog
- `workflows/` = 11 playbooks named for slash commands (`/new-page` → `new-page.md`)
- `meta/` = changelog + decisions-log (ADR format)
- `templates/` = stencils for new ADRs / components / hooks

The `Stop` hook enforces the docs-code sync loop — you cannot ship a change and forget to update the vault.

### 1.6 Comparison to your workflow (vertex / ConsultBase / Northstar / SQL game)

| You already have | Starter adds | Worth stealing? |
|---|---|---|
| Next.js 16 fluency | Next 16.3.1 pinned + `AGENTS.md` self-regenerating block awareness | Nothing new — but the self-regenerating block from `next dev` is a Next 16 gotcha to know about |
| Claude Code CLAUDE.md | Full 3-hook `.claude/settings.json` pattern | **YES — biggest steal.** Copy the hooks pattern into vertex/ConsultBase directly. Adapt Stop hook to PowerShell (currently bash + jq) |
| Design tokens (probably) | Explicit 3-tier convention: `--raw-*` primitive → semantic role → `@theme` binding | **YES if not already.** Documented in `obsidian/frontend/design-system.md` |
| Some motion approach | react-spring lock-in + spring-text-engine 0.1.5 (Textura's own) | **NO.** Motion stack is a strong bet on Textura's tooling. Fine for their starter, risky for your existing repos |
| Ad-hoc docs | Obsidian-vault-as-source-of-truth + wikilinks + ADR templates | **YES for greenfield.** Retrofitting into existing repos is a lot of work for less payoff |
| Own commands | 8 slash commands (`/new-page`, `/section`, `/qa`, `/ship`, `/cms`, `/db`, `/seo`, `/migrate-site`) | **Study the shapes**, don't copy verbatim — they assume Payload + Supabase |
| Own agents/skills | 4 sub-agents + 11 project skills including `figma-to-section`, `optimize-3d-scene`, `seo-audit`, `schema-markup` | **Read `optimize-3d-scene/references/patterns.md` if you do any 3D work.** Others are Payload/Supabase-flavored |

### 1.7 Costs the README calls out

*"This starter is **token-intensive by design**. Every prompt fans out into the vault (architecture, conventions, the relevant topic note), and the hooks re-inject context on every turn. That bought-clean code costs tokens. Minimum recommended plan: Claude Max (5×)."*

They are not lying. Three hooks × vault reads × every-turn re-injection will burn Sonnet quota fast. Budget accordingly.

### 1.8 Windows/PowerShell gotcha

The `Stop` hook is written for bash: `M="${TMPDIR:-/tmp}/claude-vault-stop-$(jq -r .session_id 2>/dev/null)"`. On Windows without WSL you need a PowerShell equivalent using `$env:TEMP` and `ConvertFrom-Json`. Trivial rewrite, but it doesn't ship working on Windows.

### 1.9 Verdict on the starter

**GRAB — as reference and steal-list.**

- Clone it once to `C:\DEVELOPMENT\_reference\next16-claude-starter\` (do NOT init as your project)
- Copy `.claude/settings.json` hook pattern → adapt Stop hook to PowerShell → drop into vertex/ConsultBase/Northstar (test in one first)
- Copy the design-token 3-tier convention if you don't already have it
- Study `AGENTS.md` hard-rules format — the numbered, "hard rule" phrasing is worth adopting for your own CLAUDE.md
- Study `obsidian/workflows/*` as a shape for your own workflow docs

**Do NOT:**
- Adopt as-is into existing repos (motion stack lock-in)
- Use for the *next* greenfield unless it's genuinely animation-heavy (overkill for a normal Vertex CRUD-app client site)
- Depend on `spring-text-engine` 0.1.5 for anything you can't refactor away later

**Time to steal-list:** ~2 hours to read + adapt + integrate hooks into one repo.

---

## 2. GetLayers MCP

**Endpoint:** `https://mcp.getlayers.ai/mcp` (HTTP transport — confirmed 401 without auth, custom scheme, no WWW-Authenticate header)
**Public skill:** `https://storage.getlayers.ai/skill/getlayers/SKILL.md` (11,294 bytes — no auth required)

### 2.1 Install paths (three, ranked)

| Path | Command | Includes |
|---|---|---|
| **1. Plugin (recommended)** | `/plugin marketplace add textura-agency/getlayers-plugin` then `/plugin install getlayers@getlayers` | Server + skill together |
| **2. Server only** | `claude mcp add --transport http getlayers https://mcp.getlayers.ai/mcp` | Server; download SKILL.md separately |
| **3. Skill only (no server)** | `curl https://storage.getlayers.ai/skill/getlayers/SKILL.md → .claude/skills/getlayers/SKILL.md` | Skill only — teaches Claude the library's design vocabulary without live API access |

Path 3 is free, requires no account, and gives you an 11KB well-written skill file to study or use as a prompt-engineering template. Recommended first action regardless of buy decision.

### 2.2 The tier lock (**READ CAREFULLY**)

MCP page, verbatim: *"Requires: A GetLayers account with an active **Full Stack Lifetime** subscription — see plans & pricing."*

Pricing page shows Full Stack as:
- Yearly: $497 → **$139** (sale)
- Lifetime (Best Value): higher one-time (toggle exists, price not shown in raw HTML)

**The MCP page specifies Lifetime, not yearly.** This means:
- $99 Unlimited → does NOT unlock MCP
- $139 Full Stack yearly → **likely does NOT unlock MCP** (contradicts MCP page)
- Full Stack Lifetime (higher one-time) → unlocks MCP

Two possibilities:
1. The MCP page is imprecise and any Full Stack subscription (yearly or lifetime) unlocks it → cheap to buy $139 and test
2. MCP really is Lifetime-only → you're looking at hundreds of dollars one-time for MCP, not $139

**Do not assume #1 without emailing `team@getlayers.ai` first.** Marketing copy that gates a feature on a specific SKU has usually been vetted.

### 2.3 Tool surface (inferred from public SKILL.md)

Tools referenced in the skill:
- `getlayers_start` — MUST be called first every session; returns 5 modes + guide + vocab + env info
- `getlayers_search` — semantic search (their language, no strict tag filtering)
- `getlayers_browse` — browse category
- `getlayers_explore` — full-library browse
- `getlayers_compositions` — skeleton layouts by role (hero/features/pricing/etc)
- `getlayers_scene_lab` — synthesize a new 3D scene from references
- `getlayers_materialize` — fetch source for a picked asset (targets: `starter` | `next` | portable HTML)
- `getlayers_source` — pull specific file from a template's tree
- `getlayers_palettes` — colour ramp lookups
- `getlayers_fonts` — typefaces with CSS stacks + Google/Fontshare URLs

**Quota surfaces observed:**
- Templates via `downloadProject` (full zip) — **3 different templates per day** (Full Stack tier)
- Fallback: `getlayers_source` per-file (no cap)
- State persistence: reads/writes `getlayers.json` in project to hold Style/palette/font choices across a build

### 2.4 Does it work with free-tier prompts?

Unclear from public sources. The SKILL.md speaks entirely in terms of the paid library. The pricing FAQ says: *"Free unlocks a curated set of prompts, open to everyone."* So free-tier assets exist and are presumably queryable, but the MCP is not marketed to free users — it's marketed as the way Full Stack subscribers avoid copy-pasting.

### 2.5 Auth model

- Server returns HTTP 401 without a token, no WWW-Authenticate header
- The plugin install (`/plugin install getlayers@getlayers`) presumably runs an OAuth flow that mints a token bound to your GetLayers account
- Server-only install (`claude mcp add`) will require a session token or key you provide — Ryan should NOT run this until he knows where the token comes from

### 2.6 Integration story with your existing Claude Code MCP setup

Clean — it's a plain HTTP MCP registered via `claude mcp add` or the plugin marketplace. Won't collide with existing MCPs. But: the plugin marketplace add pulls a Textura-controlled registry — normal supply-chain caveat.

### 2.7 Verdict on MCP

**DEFER until tier lock is confirmed.**

If Textura confirms Full Stack yearly ($139) unlocks it → revisit alongside Full Stack decision.
If Lifetime-only → almost certainly not worth several hundred one-time for something the prompt library already delivers via copy-paste.

**Regardless of buy decision:** install the free public SKILL.md into `.claude/skills/getlayers/SKILL.md` on your machine — costs nothing, and studying it is worth an hour. It's a genuinely well-authored agent skill (see §3).

**Install trap flagged:** the recommended prompt on their MCP page includes *"allow the server when prompted"* — Ryan should read the OAuth scope carefully before approving.

---

## 3. Sample Prompt Quality

### 3.1 What could NOT be verified

**Free prompts are NOT publicly readable.** Even the "Free" tier layers (Lumora, Soda, Baseline, Laocoon, Loopstack) require an account sign-in to view the prompt body. The `/layer/{slug}` public page shows preview + upgrade CTAs (*"Stop ⌘C-ing teasers"*, *"Skip the redaction"*, *"Free shows you the layer. Unlimited hands you the prompt and the build."*) but not the prompt itself.

**Nothing in the initial HTML** carries the prompt text — it's fetched client-side against an auth-required API (`api.getlayers.ai` returns 401 on `/health`, 404 on `/projects` etc.).

**Conclusion:** cannot audit prompt quality directly from public sources. Anyone wanting to see even one full prompt must sign up for a free account first.

### 3.2 Proxy signal — the public SKILL.md (which IS readable)

The GetLayers `SKILL.md` (`https://storage.getlayers.ai/skill/getlayers/SKILL.md`, 11,294 bytes) is authored to a **high standard** — comparable to Anthropic's own published skills. Direct quotes and observations:

**Uses trigger-sentence description pattern:**
> *"Use this WHENEVER the user wants to build or design something with GetLayers ... or whenever they mention GetLayers, 'getlayers', or the getlayers MCP. It drives the GetLayers MCP through its correct end-to-end flow so the result actually uses the library ... instead of generic output. Load it BEFORE calling any getlayers_* tool."*

**Names the failure mode explicitly (not just what to do — what breaks):**
> *"The failure mode this skill prevents: jumping straight to writing generic code, skipping the library."*

**Step-0-first pattern with rationale:**
> *"Before you discuss layouts, pick assets, or write a line of UI, call `getlayers_start`. It returns the five things GetLayers can do plus the guide, vocabulary, and environment info. Do this even if the user's request seems obvious."*

**Numbered non-negotiables ("this is where agents go wrong"):**
> *"Never strict-filter. Selection is not tag-matching. Use `getlayers_search` with the user's own language, or `getlayers_explore` for the whole library, and JUDGE fit by reading descriptions and vibes."*
> *"Compositions are the layout layer under everything — use them. A page is compositions + a Style + assets. Building a section unique? Call `getlayers_compositions` (by role), pick a skeleton, pour the Style + assets in — NEVER a generic centered stack (the single most common failure)."*
> *"Tint scenes through CONFIG, never the shader. `materialize` hands you a `tint` map; apply it to the scene's CONFIG. Editing shader colour produces garbage."*

**Quota-aware branching:**
> *"The zip is capped at 3 different templates per day — it's the fast lane, not the browsing lane. Re-taking one you already took today is free. If you see `downloadProjectUnavailable` instead, the cap is spent: nothing is lost, take the template the per-file way below..."*

**State persistence discipline:**
> *"Keep state. Read `getlayers.json` before each section, write it after, so a long build doesn't drift from what was chosen."*

**Mode-specific reminders + brief-gathering discipline:**
> *"Gather the brief before building. For a website, a browse, and ESPECIALLY a 3D scene, first ask for as much detail as you can — purpose, audience, mood, references. For a scene, explicitly ask for **picture/video references**; they beat adjectives."*

### 3.3 Inference (not verification)

If Textura's *public* skill file — the one they don't charge for — is written to this standard, the paid prompts behind the sign-in wall are very likely of similar craft. **This is not proof, and Ryan should not buy on inference alone.** But the sign-up-for-free path (5 layers visible) is a cheap check.

### 3.4 Is Textura teaching Ryan something new?

**Yes, on two axes:**

1. **Motion + 3D vocabulary.** Textura is an agency shop — their design language (particle vortices, glassy pricing sections, editorial hero motion, cinematic backgrounds) is agency-tier and specific. Not the average AI-slop centered hero.
2. **Composition-first thinking.** The "page = compositions + a Style + assets" framing is a genuine pedagogical layer over the usual component-catalog approach — worth internalizing even if you never buy.

**Not new:**
- Trigger-sentence skill descriptions (common Anthropic pattern)
- Step-0-first invocation (standard for tool-heavy skills)
- ADR-style rules with named failure modes (standard for high-craft engineering docs)

### 3.5 Verdict on prompt quality

**Cannot verify directly. Inference is positive.** Sign up for free (no card) to see 5 prompts, judge quality yourself, decide. Do not buy on my inference alone.

---

## 4. Pricing Reality (Verified 2026-08-23)

| Tier | Yearly | Lifetime | Includes |
|---|---|---|---|
| **Free** | $0 | $0 | 5 free layers (Lumora, Soda, Baseline, Laocoon, Loopstack). Sign-in required to view prompts. |
| **Unlimited** | **$99/yr** | Higher (toggle) | Full prompt library, commercial license. Fair use: **3 premium prompt copies/day** (free layers unlimited). |
| **Full Stack** | **$497 → $139/yr** (on sale) | Higher (toggle) | Everything in Unlimited + source code, animated backgrounds, 3D scenes, private Discord. Fair use: **3 prompt copies + 3 source downloads + 3 video downloads / day**. |
| **Full Stack Lifetime** | — | one-time payment | Everything in Full Stack + **MCP access** per MCP page |

**Commercial license:** included on all Premium tiers. No attribution required on client work.
**Cancellation:** anytime, no mid-cycle refund, access to end of period.
**New layers:** shipped weekly, up to 20/week per pricing FAQ.

---

## 5. Verdicts (with confidence)

### 5.1 Free Next.js 16 Starter — **GRAB** (high confidence)

- Clone to a reference directory, not as a project
- Adopt the 3-hook `.claude/settings.json` pattern into one existing repo first (test), then roll out
- Adopt the design-token 3-tier convention if not already
- Study `AGENTS.md` rules format and `obsidian/workflows/` shapes
- Skip: motion stack, spring-text-engine 0.1.5, Payload/Supabase assumptions

### 5.2 Unlimited $99/yr — **DEFER** (high confidence)

- Sign up free account first (no card)
- View the 5 free prompts to judge writing quality
- If quality holds → buy
- If not → skip and use the public SKILL.md as prompt-writing pattern reference

### 5.3 Full Stack $139/yr — **DEPENDS** (medium confidence)

**Buy if:** you'll ship ≥3 immersive client sites/yr AND want the Next.js source drops (bypasses AI drift, matches preview exactly, faster to ship). Payback: one saved dev-day on one client project.

**Skip if:** most Vertex client work is not immersive/motion-heavy, OR you're on non-Next.js stacks for most clients (source is Next-only for templates).

### 5.4 GetLayers MCP — **DEFER (tier lock)** (high confidence)

- Email `team@getlayers.ai` and ask: *"Does the Full Stack Yearly plan ($139) unlock the MCP, or is it Full Stack Lifetime only?"*
- If yearly unlocks it → revisit with §5.3 decision
- If Lifetime only → almost certainly skip (the prompt library already ships value; MCP is a convenience layer)
- Regardless: install the free public SKILL.md into `.claude/skills/getlayers/` — costs $0, teaches you their skill-authoring style

---

## 6. Risks / Traps Flagged

1. **MCP tier trap** (biggest). MCP page specifies Full Stack **Lifetime**. Do not assume $139 yearly buys MCP.
2. **Prompt preview wall.** Even "Free" prompts require account sign-up to read. No true anonymous try-before-buy.
3. **Motion stack lock-in in starter.** `spring-text-engine` is at 0.1.5 and is Textura's own npm package — single upstream, very early. If it stalls, the starter's text motion breaks.
4. **Bash-only hooks in starter.** `.claude/settings.json` Stop hook uses `${TMPDIR:-/tmp}` and `jq` — needs PowerShell rewrite on Windows.
5. **Token cost is real.** Hooks re-inject vault context on every turn. Their own README recommends Claude Max 5× ($200/mo) minimum.
6. **`next dev` writes to AGENTS.md.** Next.js 16 auto-regenerates an agent-rules block on dev start. Commit it or it comes back every run. This is a Next 16 gotcha, not a starter bug — but worth knowing before diffs look chaotic.
7. **Fair-use ceiling.** 3 prompt copies + 3 source + 3 video downloads / day / premium. For a burst of VX client work, this WILL bind.
8. **Source ≠ your stack.** Full Stack template source is Next.js only. 3D scenes are standalone HTML. Backgrounds are video files. If a client is on Astro/WordPress/Vue, the source doesn't drop in cleanly — prompt path is still the path.
9. **Plugin marketplace supply chain.** `/plugin install getlayers@getlayers` pulls from a Textura-controlled registry. Normal MCP supply-chain caveat.
10. **OAuth scope on MCP install.** Read what the plugin asks for before approving.

---

## 7. Honest Downside — What NOT Buying Loses You

**Nothing critical. What you actually lose:**

- Access to Textura's specific motion/3D design vocabulary (which IS genuinely agency-tier — this is Textura's actual craft advantage)
- Faster time-to-cinematic on VX client work vs. starting from a blank Figma
- The MCP's `getlayers_start` → 5-mode routing convenience for design-led builds

**You do NOT lose:**

- Design capability — you already build design-led sites
- Next.js 16 fluency — you're already there
- Claude Code integration — you already have that
- Motion/animation know-how — react-spring docs are public and excellent, Lenis is MIT, Three.js patterns are documented everywhere

**The buy is essentially:** pay Textura to skip the design-and-prototype phase on immersive marketing sites. Worth it if you'll do that class of work at volume. Not needed for capability.

---

## 8. Recommended Next Actions (in order)

1. **Now (5 min):** Clone `github.com/textura-agency/next16-claude-starter` to `C:\DEVELOPMENT\_reference\` for read-only reference.
2. **Now (0 min):** Download the public SKILL.md from `https://storage.getlayers.ai/skill/getlayers/SKILL.md` to `.claude/skills/getlayers/SKILL.md` in one Vertex repo. Free, no signup.
3. **Today (20 min):** Sign up for free GetLayers account (no card required). View 5 free prompts. Form your own opinion on prompt quality.
4. **Today (2 min):** Email `team@getlayers.ai` — *"Does Full Stack Yearly ($139) unlock the MCP, or is it Full Stack Lifetime only?"*
5. **After 3+4:** Decide on Unlimited / Full Stack / MCP with real information instead of marketing claims.
6. **This week (~2 hr):** Steal the `.claude/settings.json` hooks pattern from the starter, adapt Stop hook to PowerShell, drop into one repo (recommend ConsultBase since it's most active). Measure token burn before rolling out to others.

---

## Appendix: Files Referenced

- Repo: `github.com/textura-agency/next16-claude-starter` (Unlicense, 98★, 38 forks, last push 2026-08-18)
- Repo files inspected: `README.md`, `package.json`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `src/lib/springs/config.ts`, full recursive tree at depth 2
- GetLayers pages: `/mcp`, `/pricing`, `/docs`, `/layer/lumora`
- Public skill: `storage.getlayers.ai/skill/getlayers/SKILL.md` (11,294 bytes)
- API probe: `api.getlayers.ai/*` (401 on `/health`, 404 on public read paths — auth required)
- MCP probe: `mcp.getlayers.ai/mcp` (401 without token, no WWW-Authenticate header — custom auth)
