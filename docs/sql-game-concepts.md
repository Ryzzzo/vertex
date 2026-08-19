# SQL game — concept pitch and recommendation

Decision document for vertexapps.dev/game. Not a build. Pick a direction; the MVP plan
follows the recommendation.

Research window: 2026-08-18. Method: fetched or searched 20+ SQL-teaching and
viral-learning games, pulled design writeups, checked what actually got shared where.

---

## TL;DR

Build **Daily Query** — a 3–7 minute daily SQL puzzle that publishes at 00:00 UTC and produces
a spoiler-free three-axis score grid (correct / bytes / cost) you paste anywhere. Wordle's share
loop applied to SQL, with Zachtronics' histogram applied to query quality. Ship it as a static
Next.js app at `vertexapps.dev/game` on DuckDB-Wasm — no backend required for MVP. First 30
puzzles authored by hand (~30 hours), first ship in 3–4 weeks solo, viable at 90 puzzles for a
public launch. This beats SQL Murder Mystery on the one axis it will never win: recurrence. The
Mystery is a one-and-done artifact; Daily Query is a habit.

The mystery/detective lane is claimed and saturated. Do not build a fourth SQL detective game.

---

## 1. Landscape scan

### SQL-teaching games in market

| Game | Format | Session | Hook | Weak point |
|---|---|---|---|---|
| **SQL Murder Mystery** (Knight Lab, 2018) | Single non-linear DB, one crime | 45–90 min | Instant narrative; open-ended DB you must map yourself | Zero replay. No score. No return visit. |
| **SQL Noir** (2024) | 6 detective cases, guided progression from SELECT → JOIN → subquery | 30–45 min each | Serialised mystery, prettier UI than Mystery | It's Mystery with more chapters and a nicer editor. Same lane, later entrant. |
| **SQL Island** (TU Kaiserslautern, 2013) | Text adventure, 30 levels, stranded on island where NPCs speak SQL | ~1 hour end-to-end | Fingerprinted-answer engine lets tasks unlock story | Feels like a 2013 CS-101 project. No share hook. |
| **SQL Police Department** | Detective missions with police-DB queries | 20–40 min | Show HN one-off from 2020 | Never went anywhere; same lane. |
| **Lost at SQL** (Robin Lord) | 20 chapters + branching endings, story mode | 2–3 hours | Full narrative arc, hint-adjusted scoring | Long onramp before you can share anything. Buried. |
| **Schemaverse** | PostgreSQL space RTS you play via raw SQL and PL/pgSQL agents | Multi-day campaigns | DEF CON tournament pedigree; you literally write DB triggers as AI | Hostile to non-experts; requires a Postgres install. Cult game, not viral. |
| **Select Star SQL** (Kao) | Interactive book on a real Texas death-row dataset | 2 hours | Actual dataset with weight; runs on sql.js | It's a book. No score. |
| **SQLZoo, SQLBolt** | Tutorial with per-lesson exercises | Open-ended | Longest-running reference, still #1 free ref | No game. Wiki UX. Zero shareability. |
| **LeetCode SQL 50** | 50-problem interview track | Weeks | The default for interview prep | Ugly. Grim. Solves for hiring, not fun. |
| **Regex Crossword** (adjacent) | Rows and columns each satisfy a regex constraint | 5–20 min per puzzle | Novel two-axis constraint puzzle | Show, don't skip — the mechanic is more elegant than any SQL game listed. |

**Observations from the SQL set:**

1. The mystery/detective lane is saturated (four games). Adding a fifth is undifferentiated.
2. No SQL game currently uses a daily-drop mechanic. Zero.
3. No SQL game currently produces a spoiler-free share grid. Zero.
4. No SQL game currently scores on query *quality* (length, plan cost). All are pass/fail. That
   leaves the entire Zachtronics-style optimization axis unused in SQL.
5. Schemaverse is the only truly novel mechanic and it's punished for requiring installation.
   Browser-native is table stakes.

### SQL Murder Mystery: why it went viral and why it stopped

- Setup fits in three sentences on the landing page. Zero signup. Zero tutorial.
- Non-linear DB: `crime_scene_report` has no foreign keys, forcing text-parsing and joining on
  found strings. That "the DB fights back" feeling *is* the puzzle.
- Single artefact: link + browser + you're playing. Perfectly linkable in a tweet.
- Repeatedly resurfaces on HN (823-upvote thread in 2019; recurring "reminds me of..." comments
  in 2020, 2023, 2025). It is the canonical example anyone links to.
- **But**: play it once, done. No return visit. No score to post. The share event is a blog
  post you write *about* it, not something the game hands you. That ceiling is exactly what a
  daily-cadence + share-grid game breaks through.

### Non-SQL viral learning games — what actually spreads

| Game | Viral mechanic | What non-players see first |
|---|---|---|
| **Wordle** | Daily puzzle + spoiler-free colored-grid share. Emoji format is instantly recognisable, reveals *how well* without revealing *what*. Each grid = free ad seen by hundreds. Artificial scarcity (one/day) is load-bearing. | A grid of green/yellow/grey squares on someone's timeline. |
| **The Password Game** (Neal Agarwal, 2023) | Escalating absurd rules → "what next" hook. 10M+ plays. Very few beat it, so completion is a genuine artefact. Screenshots of unhinged password states go viral because they're inherently funny. | Screenshots of comically insane passwords. |
| **Advent of Code** | Daily during December. Community solutions culture in 40+ languages. Leaderboard for early solvers. 1M+ registered by 2022. Repo of your solutions IS the artefact. | December GitHub commits titled "Day 07 in Rust". |
| **GeoGuessr** | Spectator sport (Rainbolt on TikTok). Multiple modes on same content (Moving / No Move / NMPZ). Screenshotable "how did they know?" moments. | A streamer identifying a country from a rock in 3 seconds. |
| **NYT Connections** | Wordle's follow-on. NYT's second-most-played game. Same daily + grid pattern; different puzzle underneath. Proof the model generalises. | A 4×4 colored grid. |
| **Balatro** (2024, 5M+ sold) | 10–30 min roguelike runs (streamer-friendly). Seed-sharing for repeatable runs. High-score chase. Visual/audio feedback makes arithmetic feel like fireworks. GOTY at GDC. | A clip of an absurd score-cascade combo. |
| **TIS-100 / EXAPUNKS** (Zachtronics) | Post-solve histogram: your cycles/size/instructions vs the community distribution. "I bet I can do it in fewer" hook. Solutions are code, so shareable as gists. | Screenshots of an optimization histogram with your bar way out on the left. |
| **The Witness** | Teaches by observation, no tutorials. Every puzzle is a lesson in a hidden rule you have to induce. | Reddit threads of "I finally got it and it changed how I see puzzles." |
| **Foldit** | Real scientific contribution. Players cracked AIDS enzyme in 3 weeks after scientists failed for a decade. Peer-reviewed *Nature* credit. | News articles: "gamers solved what scientists couldn't." |
| **Human Resource Machine** | Assembly-as-Lego. Optimization axes (size, speed). Visual satire. | Screenshots of gorgeous minimal solutions. |
| **One Million Checkboxes** (Royalty, 2024) | Collective real-time chaos. Emergent behavior. Built in 2 days. | The site itself, mid-battle. |
| **Wikiracing** | Browser-native, multiplayer via room links. Speedrun/route optimization. | Screenshots of absurd link paths from A to B. |
| **Duolingo streaks** | 60% commitment lift from streak alone. Loss aversion locks in daily habit. | Not viral — retention, not acquisition. |

### Pattern extraction — the five mechanics that actually drive viral spread in learning games

1. **Spoiler-free shareable artefact.** The single most important element. It must show *how
   well* you did without revealing *what the puzzle was*. Wordle's grid, Zachtronics' histogram,
   Balatro's end-of-run summary. This is the free advertising loop. Without it, virality relies on
   users choosing to write blog posts, which is what SQL Murder Mystery is stuck doing.
2. **Daily cadence + artificial scarcity.** One puzzle per day creates FOMO, conversation
   ("did you get today's?"), and 365 return sessions per user per year. Wordle, Connections, AoC.
   AoC alone is the proof this works for programming puzzles specifically.
3. **Multi-axis optimization scoring.** Pass/fail is a dead end. Zachtronics' cycles/size/nodes
   histogram gives you three "again" buttons per puzzle. Applied to SQL, the axes exist and are
   free: correctness, character count, rows scanned in the query plan.
4. **A hook that reaches non-players first.** The share artefact IS the hook, but the hook
   only works if a non-player seeing it thinks "I have to try this." Wordle's grid triggered
   "wait, what puzzle produces THAT?" Password Game screenshots triggered "wait, what game
   *demands* a chess move in a password?" You need one weird visible thing.
5. **Sub-15-minute session.** Wordle 3 min, Connections 5 min, Balatro run 20 min, Password
   Game 20 min. Nothing viral takes an hour of first commitment. SQL Murder Mystery's 60-min
   session is exactly why it doesn't repeat — you can't do it on a coffee break.

### Anti-patterns (things that repeatedly fail to spread)

- Signup gate before you see the puzzle. Kills the shareable-link loop.
- Multi-hour first session. See above.
- No score to post. Blog posts are not a share mechanism at scale.
- Cutesy pixel-art or fantasy framing for a professional audience. Devs post to LinkedIn; they
  won't share screenshots that look like a Newgrounds game.
- Installation required. Schemaverse is beloved and unspread for exactly this reason.

---

## 2. Council pass — five voices

### Game designer

The strongest concepts in the SQL set have zero replay. Mystery has one puzzle. Noir has six.
That's it. Meanwhile Zachtronics games get 40+ hours per player because every puzzle is *two*
puzzles — solve it, then solve it better. SQL has that dimension built in and nobody uses it.

Session length is the second lever. Wordle is 3 minutes. That's not a target — it's an
architectural constraint that shapes everything: no tutorial, no lore drop, no schema you have
to internalise. If a puzzle can't be attempted in 90 seconds after landing, cut something.
That means the schemas need to be tiny — 3 to 6 tables, maybe 20 columns total, presented as an
ER diagram you can read in one glance.

Difficulty curve: don't ramp; *rotate*. Each daily puzzle is one specific concept (today's is
`GROUP BY HAVING`, tomorrow's is `LEFT JOIN with NULL`) rather than a linearly-increasing
gauntlet. That keeps beginners in the game past day one and gives experts something fresh even
when they already know the concept — because now the optimization axis is where the play is.

What I'd push against: any concept that requires the player to *explore* the schema before
they can attempt the query. That's a Mystery Mystery. Fine for one-off, terrible for daily.

### Viral mechanics analyst

The share artefact is not a feature — it's the product. Everything else exists to produce a
grid worth pasting. Ryan should design the grid first and build the game backwards from it.

Wordle's grid has three properties I'd force into whatever gets built: (1) instantly
recognisable format that people will decode without a caption; (2) spoiler-free so friends can
still play; (3) implies competence without stating a score. A colored bar chart against a
histogram of community solutions does all three for SQL if we get the visual right.

The failure mode I'd guard against: the "look at my clever query" screenshot. That IS the
spoiler. If the artefact leaks the answer, you kill the game's viral loop the moment someone
posts a good one. Wordle understood this. SQL Murder Mystery didn't — every blog post about it
is a walkthrough that ruins it for the next person.

Second thing: LinkedIn is Ryan's target surface, not Twitter. That audience shares
*credentials-adjacent* content. A grid that reads as "I solved this and I'm in the 90th
percentile on query cost" is directly LinkedIn-shaped. A silly narrative flourish is not.
Match the surface.

I'd also lobby for a `#001, #002, #003` puzzle number visible in the share text. That's what
made Wordle links index-able and searchable; "SQL Daily #041" becomes a scannable community
timestamp.

### SQL educator

Three blockers separate learners at different levels. Pick a game structure that lets you
address each without punishing anyone.

**Beginners** die on `JOIN` semantics. They understand `SELECT ... WHERE` fine, then hit
`JOIN` and don't grok that it's a Cartesian product filtered by an ON clause. They confuse
`INNER` and `LEFT`. They don't understand why `WHERE table.col IS NULL` after a LEFT JOIN is
the "find the missing" pattern. Any concept where a beginner has to write a join to make the
first minute work will lose them.

**Mid-level devs** who "use SQL daily" almost always mean they write `SELECT ... WHERE ...
JOIN` and stop. They don't reach for window functions when they should. They write correlated
subqueries where a CTE + JOIN is cleaner. They don't know the difference between `COUNT(*)` and
`COUNT(col)` on nullable columns. They think `GROUP BY` is for reporting only. Half the puzzles
should be things they *think* they know how to do until they see their query is 4× slower than
the community median.

**Experts** already know all this. The play for them is optimization: writing the same result
in 40 fewer bytes, or a CTE version that reads the whole table once instead of three times.
Zachtronics-style histograms are the only reason experts stay past week two of any learning
game.

What I'd push against: puzzles that reward "clever SQL" over correct SQL. Don't teach people
that `CROSS JOIN + ROW_NUMBER` is the answer when a simpler query is fine. Don't optimize
for elegance at the expense of realism — production SQL is not code golf.

The five concepts to sequence early:
1. `SELECT` with `WHERE` and boolean ops.
2. `ORDER BY` + `LIMIT`.
3. `GROUP BY` with aggregation.
4. `INNER JOIN` (two tables).
5. `LEFT JOIN` + `IS NULL` (the "missing" pattern).

Then NULL semantics, `HAVING`, subqueries, CTEs, window functions. Roughly 15 concepts covers
95% of practical SQL. If Ryan launches 30 puzzles hand-authored, that's exactly 2 per concept —
enough to cover the surface without repetition.

### Narrative designer

Story is not decoration in a puzzle game. It is the reason the player wants to write the
query. SQL Murder Mystery gets this: "there's been a murder" is a stronger prompt than "write
a query that returns rows where..." Nobody would play the second one.

But story needs to serve the mechanic, not fight it. If Ryan builds a daily puzzle, the
narrative can't be a novel — it has to be a *situation* the player enters in ten seconds:
"Payroll is off by $4,231. Find who's double-billing." That's a full narrative frame in nine
words. It's a whodunit compressed into a scenario prompt.

Where I'd push: reject the mystery-of-the-day framing entirely. Everyone is doing that.
"Yesterday's payroll ran twice" is not a mystery, it's an audit. "Something's leaking sensor
data" is not a whodunit, it's ops forensics. There's a whole vocabulary of *situations*
adjacent to detective work — incident response, compliance audits, journalism, science —
that read as grown-up and remain narratively juicy.

Weekly arcs is where I'd invest narrative craft. Each week is a five-puzzle case: Monday
introduces a suspicious transaction, Tuesday follows a shell-company thread, Wednesday joins
timesheets, Thursday hits the sensor log, Friday resolves it. That's serialised procedural
storytelling in the form of a puzzle. It reads adult, it rewards return visits, and it gives
you something to name (season titles, case files) beyond "puzzle #041".

What I'd push against: sci-fi framing. Ryan's ship-interior parent site is atmosphere for the
portfolio, not a fictional universe the game must live inside. Making the game a "ship's
computer" locks it into aesthetics that limit what a puzzle can be *about* — every dataset
becomes cargo manifests and sensor logs. That's a tiny narrative range. Better: the game is
one terminal in one room of the ship (a wrapper), but the world *inside* the terminal contains
whatever the case demands: a hospital's billing records, a city's parking enforcement, a lab's
sample tracking.

### VX brand voice

Everything twee has to die. That means no fantasy framing, no "SQL wizard" branding, no cute
mascot. If the finished game looks like it belongs in a bootcamp curriculum, we've failed. The
target surface is a senior engineer's LinkedIn feed. If it doesn't look at home next to a
Vercel case study, don't ship it.

Radical simplicity is the design brief. That doesn't mean minimal aesthetics; it means every
element earns its pixel. Linear does this. Vercel does this. Warp's landing page is a
screenshot of a terminal on a plain background — that's not lazy, that's confident. The game
should feel like a piece of infrastructure someone at a serious company built, not a hobby
project.

Push back on the retro CRT/amber terminal instinct. Ryan already called it out. It's a lazy
signifier of "programmer thing" and it makes everything read as a fan project. Nobody at
Linear ships CRT scanlines. If we want the aesthetic to *feel* like a terminal, do what modern
tools do: monospace type, high contrast, sparse UI, restrained motion. No skeuomorphism.

Where the ship-interior does need to land: the parent site frames the game. That frame can be
minimal — enter Room 04, sit at a terminal, the terminal boots up the puzzle. But once you're
in the puzzle, the ship is gone. The game inside the terminal is its own product. That way the
ship contributes atmosphere without capping the narrative range of the puzzles.

One more thing: the URL. `vertexapps.dev/game` is fine as a container, but the shared
artefact needs its own recognisable name. "SQL Daily by Vertex" or "Query Grid by Vertex" —
so when people paste the grid into Slack, the *thing* has an identity, not just a route. Buy
`querydaily.io` or `sqldaily.dev` and 301 it into place if the game becomes a franchise.

---

## 3. Concept directions — four with real distinction

Deliberately excluded a fifth: adding a mystery/detective variant would collide with SQL Noir
and SQL Murder Mystery. That lane is closed. Ranked below by viral ceiling / build cost, not
alphabetically.

---

### Concept A — Daily Query *(the recommendation, detailed later)*

**One-liner:** Wordle for SQL. One 3–7 minute puzzle per day; your solution is scored on
correctness, query length, and rows scanned; a spoiler-free three-block grid goes to your
clipboard when you're done.

**Core loop.** Land on page → see today's tiny schema (3–6 tables, ER diagram) → read prompt
("Refunds are up 40% this week. Find the top three products by refund count.") → write query
in a Monaco editor → hit Run → get back a diff of your result vs the target result → iterate
until green → see your three-axis score against community histogram → copy grid → share.

**Session:** 3–10 min typical; up to 30 for a hard puzzle if you're chasing an optimization.

**Progression:** Daily drop. Weekly arcs (five puzzles form one storyline). All-time archive
of past puzzles playable anytime but only today's counts for the daily leaderboard.

**Shareable artefact:**

```
SQL Daily #041 · Refund audit
Correct ✅
Length  ▓▓▓▓░░░░░░ P32 · 84 chars
Cost    ▓▓▓▓▓▓░░░░ P58 · 1.2k rows
Streak  🔥 12 days
vertexapps.dev/game
```

Three colored bars, percentiles, streak, puzzle number, URL. No query, no schema, no answer.

**Aesthetic:** Modern minimal. Linear/Vercel palette. Monospace where it matters (the editor,
the schema), Inter or similar for prose. Motion restrained. The terminal frame from the ship
loads the game, then quietly recedes.

**Difficulty curve.**
- **Beginner** (never written a JOIN): 60% of puzzles solvable with `SELECT + WHERE + ORDER BY
  + LIMIT + GROUP BY`. Auto-provided starter template reduces first-move friction ("here's a
  `SELECT * FROM ...` shell, fill in the WHERE").
- **Mid-level:** all puzzles solvable, but their P50 will hover around P40 on the cost axis
  because they don't use CTEs or window functions.
- **Expert:** correctness is trivial; the game becomes about shaving bytes and reducing plan
  cost. Zachtronics-style. Two mode toggles: "hard mode" (no LIMIT hints, no starter template)
  and "golf mode" (bytes-only scoreboard).

**Technical scope:** small-medium. 3–4 weeks to first playable, 8 weeks to polished public
launch. Hard parts: (1) authoring 30–90 puzzles with good pedagogical spread, (2) fair scoring
across query dialects (normalize whitespace, count semantic tokens not raw bytes), (3) plan
cost extraction from DuckDB `EXPLAIN` output on the client.

**Viral hook:** the grid, posted daily by hundreds of players once you cross ~500 DAU. The
mechanism is identical to Wordle: friends see the grid, decode format, want in. The
`#041` puzzle number provides scannable community timestamps. Streaks (Duolingo mechanic) drive
retention.

**Tradeoffs vs. others:** loses on narrative depth; wins on repeat visit rate, share-loop
strength, and how well it fits LinkedIn as a surface. This is the direct Wordle bet.

**Council verdicts:**
- Game designer: 🟢 daily + optimization axis is the strongest loop in the set.
- Viral analyst: 🟢 highest ceiling. Only concept with a proven-format share artefact.
- SQL educator: 🟡 need to cover concepts intentionally; risk of being all `SELECT` no
  `WINDOW`. Manageable via authoring plan.
- Narrative designer: 🟡 sacrifices story depth; weekly arcs partially mitigate. Wants more.
- VX brand: 🟢 cleanest fit for the LinkedIn/dev surface. Doesn't require twee.

---

### Concept B — Depth (roguelike SQL descent)

**One-liner:** You descend into a procedurally-generated corporate database at "Depth 1" and
try to extract seven pieces of intel before your access is revoked; runs are 15–20 minutes,
schemas escalate in size and weirdness each floor.

**Core loop.** Start a run → get randomised schema (procedurally combined from a pool of ~50
table archetypes) → read the "brief" (seven data points you need) → write queries against the
DB, spending "clock time" (real-time timer + query cost budget) → hit Depth 2, schema mutates
(new tables, joins into old ones) → keep going until you fail or extract all seven → run
summary with your depth reached, queries used, style score.

**Session:** 15–30 min per run. Repeatable.

**Progression:** Persistent unlocks — new schema archetypes, new prompt classes, harder floors.
Meta-progression like Slay the Spire.

**Shareable artefact:** Balatro-style end-of-run screen. "Depth reached: 7. Queries used: 23.
Style: A-. Seed: 4823-KAIL." Seed sharing lets a friend replay the same run.

**Aesthetic:** Physical/tactile. In-world documents (emails, org charts, org-chart mock-ups)
that unlock as you descend. Vibe closer to *Return of the Obra Dinn* or *Her Story* than a
terminal.

**Difficulty curve.**
- Beginner: dies at Depth 2. Learns SELECT/WHERE/JOIN through repeated runs.
- Mid: reaches Depth 5–6, hits a wall on aggregation puzzles.
- Expert: chases perfect runs, seed-races friends.

**Technical scope:** large. 8–14 weeks solo. Hard part is genuinely procedural — generating
schemas that are (a) queryable, (b) narratively coherent, (c) increasing in difficulty in a
principled way. This is a research problem, not an authoring problem.

**Viral hook:** run summaries + seed sharing. Streamer-friendly (15-min runs, clear
checkpoints). "I got to Depth 8 on seed 4823-KAIL, what did you get?" is a real message people
send. Balatro proves this can spread.

**Tradeoffs:** highest replay ceiling. Highest build risk. Content authoring is replaced by
procedural generation, which is harder to get right than it sounds — a bad procgen produces
schemas nobody wants to query. Two months of prototyping before you know if it's fun.

**Council verdicts:**
- Game designer: 🟢 most replayable concept. Roguelike + query is a genuinely novel space.
- Viral analyst: 🟡 seed sharing works but slower loop than daily grid.
- SQL educator: 🟡 procedural schemas may not teach specific concepts in the right order.
- Narrative designer: 🟡 procedural narrative is famously hard to make feel authored.
- VX brand: 🟡 requires a lot of visual/audio craft to feel premium; if it lands, it *really*
  lands.

---

### Concept C — Query Golf (tournament optimization)

**One-liner:** Every week, one hard SQL puzzle drops with a starter query that works; you have
seven days to submit the shortest correct version. Leaderboard closes Sunday night. Winners get
the byline on next week's editorial writeup.

**Core loop.** New puzzle Monday → editor + reference query → iterate on optimizations → submit
your entry → live leaderboard shows byte count only (not query) → Sunday close → editorial post
Monday morning walks through top-five solutions with commentary.

**Session:** initial solve 10 min; obsessive optimization 1–3 hours across the week.

**Progression:** Weekly cadence. All-time hall of fame. Season-based standings.

**Shareable artefact:** placement graphic ("Ranked #17 of 4,203 this week"), plus the *editorial
writeup* itself is a shareable long-form artefact every Monday. This is a hybrid — a daily-ish
game plus a weekly content property.

**Aesthetic:** Editorial/cinematic. Think Stripe's engineering blog, or Every.to's product
pages. High-craft typography, sparse UI, feels like reading The Economist.

**Difficulty curve.**
- Beginner: entry-tier puzzles solvable; won't crack top 500.
- Mid: competitive middle of the pack.
- Expert: this is the game.

**Technical scope:** medium. 4–6 weeks. Hard part is the editorial content operation — someone
writes a well-crafted analysis every Monday. That's a magazine, not a game feature.

**Viral hook:** the editorial writeup is inherently shareable ("This is the best SQL essay I've
read all year"). Golf competitions spawn Discord communities. Expert-heavy audience means high
per-user reach on LinkedIn/Twitter.

**Tradeoffs:** narrow audience (skews expert). Slower viral loop than daily. Ongoing editorial
labour is the hidden cost — if Ryan personally can't write these each week, the concept dies.
Excludes beginners almost entirely.

**Council verdicts:**
- Game designer: 🟢 for the audience it targets.
- Viral analyst: 🟡 lower daily volume, higher per-post reach.
- SQL educator: 🔴 excludes beginners. Learning tool this is not.
- Narrative designer: 🟢 essay-as-content is where prestige lives.
- VX brand: 🟢 highest prestige fit; feels like Vercel or Stripe would ship this.

---

### Concept D — Newsroom (long-form investigative-journalism SQL)

**One-liner:** You're a data journalist. Each "story" is a 3–5 chapter case with a leaked
dataset; each chapter unlocks after you extract the correct finding. Ends with a shareable
finished "story" you built — findings, key queries, and a hero paragraph, all editorially laid
out.

**Core loop.** Start Chapter 1 → get a dataset + a brief ("Municipal parking tickets: are they
selectively enforced?") → write queries → find the finding → chapter unlocks → repeat 3–5
times → end with the "published story" as a shareable page.

**Session:** 20–45 min per chapter. Stories are 2–4 hours end-to-end, done over multiple
sessions.

**Progression:** Story library. Each story is one investigation, hand-authored, released
monthly. Backlog of past stories always playable.

**Shareable artefact:** the finished "story" page — your name, the finding, key queries you
wrote (auto-selected), rendered like a real longform article. Very LinkedIn-shareable. Also
very *credential*-shareable ("I completed the SHIPCORP audit").

**Aesthetic:** Editorial/cinematic. Reference: *The Pudding*, *The Markup*, Panama Papers
site. Serif type, high-contrast photojournalism-style layouts. Feels like reading a real
publication.

**Difficulty curve.**
- Beginner: intimidated by 4-hour commitment. Onramp story is friendlier.
- Mid: sweet spot. This is the target.
- Expert: probably plays once per story out of curiosity, then leaves.

**Technical scope:** medium-large. 6–10 weeks for the app + first story. Every additional story
is a hand-authored dataset + 3–5 chapters of prompts + expected results. Roughly one story per
month at steady state, so 12 stories a year.

**Viral hook:** the finished "story" is unique per player and looks professional. That's a
LinkedIn post you'd actually make. Also: real-world resonance if the fake datasets are
plausible-current (fake FTC filings, fake hospital pricing) — press could pick it up.

**Tradeoffs:** highest narrative ceiling and highest content cost. Ships slower. Ryan has to
be OK with 12 stories/year cadence, not daily. Excludes people who won't commit an evening.
Best long-term IP if the stories are memorable, but risks being niche.

**Council verdicts:**
- Game designer: 🟡 low session frequency; risks becoming an art project not a game.
- Viral analyst: 🟡 lower loop rate but very high per-post prestige.
- SQL educator: 🟢 most realistic teaching context (real messy data).
- Narrative designer: 🟢 the only concept that gives serious narrative craft room to breathe.
- VX brand: 🟢 highest prestige ceiling. Feels like something Ryan could put in a talk.

---

## 4. Recommendation — Daily Query, with weekly-arc narrative

Pick Daily Query. Not close.

**Why.** Every other concept has a build path. This one has a *distribution path*. The
question isn't "can I build a good SQL game?" (four already exist and one is great) — it's
"can I build one that spreads?" Daily Query is the only concept in this set that ships with a
built-in acquisition loop instead of relying on someone writing a blog post. Wordle's grid
mechanic is the closest thing to a growth-guaranteed pattern that game design has produced in
the last five years, and it has not been claimed for SQL. Being second to Wordle-shaped virality
in a domain is worth more than being fifth to mystery-shaped virality in the same domain.

The share loop is also load-bearing on the *type of audience* Ryan wants. Daily grids read
credentials-adjacent — "I'm in the 90th percentile on query cost today" is exactly the flex
LinkedIn rewards. Roguelike run summaries, story ledes, and golf placements are all fine on
Twitter or Reddit; none of them land on LinkedIn the way a percentile grid does.

Depth (roguelike) is the second-best concept and I'd revisit it as a v2 if Daily Query lands.
It solves the replay problem that Daily Query doesn't need to solve. Query Golf is a great
adjacent property (do it as the *Monday puzzle deep-dive* newsletter attached to Daily Query,
not as its own game). Newsroom is a beautiful concept that ships once a month and is a
different business.

The mystery-detective lane is closed. Ryan should not build a fifth entrant.

### What to cut from Daily Query to ship in reasonable time

1. **Cut multiplayer.** No friend challenges, no async duels, no leagues. Wordle didn't have
   these at launch either. Add later if the base game works. Shipping a multiplayer feature
   in v1 doubles the backend surface and adds identity/matchmaking as a hard problem.
2. **Cut streak recovery, streak freezes, all the Duolingo peripheral mechanics.** Just:
   solve today = streak +1, miss a day = streak resets. Refine later based on retention data.
3. **Cut the archive of past puzzles from v1.** Ship the daily puzzle only; add "yesterday's"
   in week 2 and "this week's" by week 4. Backfilling the archive as a feature adds
   engineering complexity for a feature most players won't touch in the first month.
4. **Cut personalized difficulty.** Everyone gets the same puzzle every day. This is a
   feature, not a bug: it's what enables the shared-grid social layer. Adaptive difficulty
   kills Wordle-style community; do not add it.
5. **Cut the plan-cost axis from launch if DuckDB EXPLAIN extraction proves fiddly.** Ship
   with correctness + character count as the two axes. Add plan cost in v1.1 once you've
   validated the format. Two axes is enough for a grid.
6. **Cut weekly arcs from the MVP.** Ship as standalone daily puzzles first. Introduce arcs at
   ~puzzle #30 once the daily habit is established. Arcs are a retention tool, not an
   acquisition one.
7. **Cut all user accounts for the first two weeks.** Anonymous play with localStorage streak
   is enough for the launch spike. Add optional accounts (email link or GitHub OAuth) in week
   3 when people are asking to sync across devices.

### What NOT to cut

- The share button. This is the entire product. If the grid isn't in the clipboard in <100ms
  after solving, kill everything else and fix this first.
- The `#041` puzzle number visible on landing and in the share text. This is what makes the
  daily conversation scannable.
- The URL in the share text (`vertexapps.dev/game`). Without it, the grid has no CTA.
- The community histogram, even if it's noisy for the first two weeks. Solve the cold-start
  by seeding with your own dogfooding runs and calling percentiles approximate.
- Zero-signup play. If you have to log in to see today's puzzle, this dies.

### What to change from the concept as pitched

- **Drop the terminal-in-a-terminal ship framing.** The parent ship-interior site can link
  to the game as a room, but once inside, the game is its own atmosphere. Don't lock the
  UI into being a ship computer — that reads as fan project when it needs to read as
  infrastructure. Ship-adjacent motion cues (a subtle door-close on load, sparse) are the
  ceiling.
- **Use "operations audit" framing, not detective framing.** Every daily prompt is a real
  business situation: refund spikes, payroll anomalies, inventory drift, ad-campaign leaks.
  Reads adult. Doesn't compete with SQL Murder Mystery / Noir. Broader dataset variety.
- **Register a name that's not `vertexapps.dev/game`.** The game needs an identity that's
  brandable when pasted into Slack. Working title: **Daily Query** or **Query Grid**. Buy
  `querygrid.io` or `dailyquery.dev` and 301 into the vertex site. The primary residence stays
  in the ship, but the share text and word-of-mouth needs its own name.

---

## 5. Pedagogical progression & curriculum design

Ryan's pushback and the SQL educator on the council both landed the same worry: if a player is
still writing only `SELECT ... WHERE` on day 60, the product failed to teach. Fix it at the
curriculum layer, not the mechanic layer — the daily-drop mechanic is right.

### 5.1. Concept ladder

Seven tiers. Each tier assumes fluency with everything below. Concepts inside a tier are peers
and can appear in any order within that tier's window.

| Tier | Days | Concepts |
|---|---|---|
| **1. Read** | 1–7 | `SELECT`, `FROM`, `WHERE`, `ORDER BY`, `LIMIT`, comparison operators (`>` `<` `=` `!=` `>=` `<=`), boolean logic (`AND`, `OR`, `NOT`) |
| **2. Filter** | 8–18 | `LIKE` + wildcards (`%`, `_`), `ILIKE`, `IN` / `NOT IN`, `BETWEEN`, `DISTINCT`, NULL handling (`IS NULL`, `IS NOT NULL`, `COALESCE`, `NULLIF`) |
| **3. Transform** | 19–28 | String functions (`UPPER`, `LOWER`, `LENGTH`, `SUBSTRING`, `CONCAT`, `TRIM`, `POSITION`), numeric (`ROUND`, `CEIL`, `FLOOR`, `ABS`, `MOD`), date/time (`NOW`, `DATE_TRUNC`, `EXTRACT`, `INTERVAL`, arithmetic), `CASE WHEN` |
| **4. Group** | 29–42 | Aggregations (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`), `GROUP BY` (single and multi-column), `HAVING` |
| **5. Join** | 43–70 | `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `FULL JOIN`, `CROSS JOIN`, self-joins |
| **6. Compose** | 71–100 | Subqueries (uncorrelated, correlated, `EXISTS`, `ANY`, `ALL`), set operations (`UNION`, `INTERSECT`, `EXCEPT`), CTEs (`WITH`, recursive) |
| **7. Advanced** | 100+ | Window functions (`ROW_NUMBER`, `RANK`, `DENSE_RANK`, `LAG`, `LEAD`, `PARTITION BY`, `OVER`), patterns (top-N per group, running totals, gaps and islands, pivot) |

**Bundling rules that matter:**
- Comparison operators and boolean logic ship together in Tier 1. Splitting them makes both
  halves useless.
- NULL handling ships in Tier 2, before joins. `LEFT JOIN ... IS NULL` is the "find the missing"
  pattern and it's meaningless without prior NULL fluency.
- Aggregations (Tier 4 open) precede `GROUP BY` by 1–3 puzzles. Show `COUNT(*)` on the whole
  table first; then bucket.
- `GROUP BY` precedes `HAVING` by ≥1 puzzle.
- Joins precede subqueries. Some subqueries can be rewritten as joins, which is only visible
  once both tools are on the bench.
- Window functions land last on purpose — they read as advanced even when they're not, and
  early introduction scares off mid-tier players still getting comfortable with joins.

**Standalone (slot anywhere post-Tier 1):** string / numeric / date functions, `CASE`,
`DISTINCT`. Useful sprinkle-in concepts with no prerequisite chain.

### 5.2. How the game teaches without feeling like homework

Five mechanisms, one job each.

**1. New-concept ribbon above the editor.** First time today's puzzle uses `LIKE`, a
single-line ribbon appears: `New today: LIKE — pattern matching in WHERE clauses. Click for a
30-second primer.` Collapsed by default; one click expands to three sentences and one example.

Why this over the alternatives:
- *Tooltip on the keyword only:* too easy to miss; player hits Run confused.
- *Pre-puzzle modal:* breaks the Wordle "just play" onramp. Modal fatigue kills conversion.
- *Post-solve reveal only:* player fights blind, consumes the hint tier to survive, learns
  the concept as a bailout rather than a tool.

The ribbon respects both audiences: beginner sees it and clicks; expert sees it and ignores it.
The "already seen this concept" flag lives in localStorage; the ribbon just doesn't reappear.

**2. Progressive hints.** Three tiers, each with a cost.
- **Hint 1 (free):** English reformulation of the prompt. Restates the ask without giving
  structure.
- **Hint 2 (–1 grid tier):** query scaffold with the tricky part blanked out.
  `SELECT product, COUNT(*) FROM refunds WHERE ___ GROUP BY product`. Reveals the shape.
- **Hint 3 (grid becomes 🟨 not 🟩, streak survives):** full solution with two-sentence
  explanation. Score locks at "solved with help."

**3. Spaced reinforcement, enforced at author time.** Every puzzle must reinforce ≥2 concepts
from the previous 30 days on top of whatever's new. Enforced by a concept-tag linter over the
puzzle metadata. Day 1 `SELECT` shows up embedded in a day 47 `LEFT JOIN` puzzle because the
join's inner query is still a `SELECT ... WHERE`. No new player-facing mechanic — just don't
author puzzles that use only new concepts.

**4. Post-solve "you just used" panel.** Optional, collapsible, appears alongside the grid.
Lists the concepts the puzzle exercised (`LEFT JOIN`, `IS NULL`, `COUNT(*)`) with one sentence
each on why it worked here. Not tutorial-length — think MDN's "see also" box. Metadata-driven;
zero handwritten copy per puzzle.

**5. Concept-seen counter, ambient.** Below the puzzle number in the share grid tail:
`Concepts today: LEFT JOIN (3rd time), IS NULL (7th time)`. Duolingo's mechanic minus the pep.
Visible in shared text so friends read "3rd time" as a subliminal difficulty signal. Optional
`/progress` page for players who want the full ledger.

### 5.3. First 30 days — concrete curriculum

Difficulty 1–5. `[NEW]` = concept being introduced; other items = reinforcement.

| Day | New | Reinforced | Diff | Puzzle |
|---|---|---|---|---|
| 1 | `SELECT`, `FROM` | — | 1 | List every product in the catalog. |
| 2 | `WHERE`, `=` | `SELECT` | 1 | Find refunds from customer #4823. |
| 3 | `>`, `<`, `!=` | `WHERE` | 1 | Refunds over $500. |
| 4 | `ORDER BY` | `SELECT`, `WHERE` | 1 | Refunds sorted by amount, descending. |
| 5 | `LIMIT` | `ORDER BY` | 1 | Three biggest refunds this month. |
| 6 | `AND`, `OR` | `WHERE`, `>` | 2 | Refunds over $500 in the last 7 days. |
| 7 | — (review) | week 1 stack | 2 | Cheapest 5 items still in stock over 10 units. |
| 8 | `LIKE`, `%` | `WHERE` | 2 | Customers whose email ends in `.edu`. |
| 9 | `IN` | `WHERE` | 2 | Orders shipped to CA, NY, or TX. |
| 10 | `BETWEEN` | `WHERE`, `AND` | 2 | Sales between $100 and $500. |
| 11 | `IS NULL` | `WHERE` | 2 | Orders with no tracking number. |
| 12 | `COALESCE` | `IS NULL` | 3 | List discount rates, showing "0%" where none set. |
| 13 | `UPPER`, `LOWER` | `WHERE`, `LIKE` | 2 | Uppercase product names for headers. |
| 14 | `EXTRACT`, `DATE_TRUNC` | `WHERE`, dates | 3 | Refunds filed in Q3. |
| 15 | `COUNT(*)` | `WHERE` | 2 | How many refunds this month? |
| 16 | `SUM`, `AVG` | `COUNT` | 2 | Total and average refund $ this week. |
| 17 | `MIN`, `MAX` | aggregates | 2 | Smallest and largest refund on record. |
| 18 | `GROUP BY` | `COUNT` | 3 | Refund count by product. |
| 19 | multi-col `GROUP BY` | `GROUP BY`, `SUM` | 3 | Refund $ by product, by month. |
| 20 | `HAVING` | `GROUP BY`, `COUNT` | 3 | Products with more than 5 refunds. |
| 21 | `CASE WHEN` | `SELECT`, comparisons | 3 | Bucket refunds into small / medium / large. |
| 22 | `INNER JOIN` | `SELECT`, `WHERE` | 3 | Match refunds to customer names. |
| 23 | — (review) | `JOIN`, `GROUP BY` | 3 | Top 5 customers by refund count. |
| 24 | `LEFT JOIN` | `INNER JOIN` | 4 | Every customer + their refund count (0 if none). |
| 25 | `LEFT JOIN` + `IS NULL` | `LEFT JOIN`, NULL | 4 | Customers who have *never* refunded. |
| 26 | self-join | `JOIN`, `WHERE` | 4 | Employees and their managers. |
| 27 | subquery in `WHERE` | `SELECT`, aggregates | 4 | Refunds above the average refund amount. |
| 28 | `EXISTS` | subqueries | 4 | Products refunded at least once. |
| 29 | — (review) | JOIN, `GROUP BY`, `HAVING` | 4 | Biggest refund category per product line. |
| 30 | `ROW_NUMBER() OVER` | JOINs, aggregation | 5 | Top-3 refunds per product (window teaser). |

Days 7, 23, and 29 are review — no new concept, deliberate breather. Not filler: on a review
day the optimization axis becomes the whole game and experts get to golf.

### 5.4. Surfacing pedagogy without turning it into a curriculum

The Wordle grid works because it communicates without spoiling. The pedagogy layer needs the
same restraint. Adopt three, defer two:

- **Adopt:** the "you just used" panel post-solve (§5.2 mechanism 4). Zero author-time cost
  (metadata-driven), zero play-time cost (collapsed by default).
- **Adopt:** concept-seen counts in the share grid tail (§5.2 mechanism 5). Doubles as a
  subliminal difficulty signal for friends who see the grid.
- **Adopt:** concept tags in every puzzle's authoring metadata — invisible to the player,
  drives the reinforcement linter. Zero UI surface, essential infra.
- **Defer to Phase 2:** weekly recap card ("you saw JOINs 4 times this week"). Needs
  cross-session state that survives longer than localStorage does reliably; belongs with
  accounts.
- **Defer to Phase 3:** explicit mastery states (Introduced / Practicing / Mastered) on a
  profile page. Ships once accounts exist. Introducing them earlier risks feeling like a
  gradebook.

### 5.5. Where the pedagogy state lives

Hybrid: localStorage in v1, server-side in Phase 2 when accounts land.

Concept-tracking as a **loose** signal is fine on localStorage. "3rd time" being off by two
across devices doesn't invalidate the message — the message is "you've seen this before, it's
in your toolkit." Wordle's streak is localStorage-only and nobody quit over it.

Costs and how to hold them:
- New device = counter reset. Frame it in-app as "starting a fresh log"; do not pretend it
  synced. Do not hide the seam.
- Phase 2 migration imports the current localStorage snapshot when the player first signs in.
  One-shot merge, then the server is source of truth.
- Concept-seen counts are approximate on purpose. Precise counts imply a grade, and grades
  break the "not a course" feel.

Rejected:
- *localStorage forever:* fine until players ask for cross-device sync, which the moment there
  are accounts they will.
- *Server from day one:* forces Supabase and auth into v1, breaks the "no backend" architecture
  win, adds a week of infra work for a feature 60% of players won't notice.

### 5.6. Impact on MVP scope

**Authoring per puzzle:** original estimate 60–120 minutes covered schema, seed data, prompt,
expected result, optimal query, difficulty tag. Add: concept tag(s) — 5 min. Post-solve
explanation copy — 15–20 min. Curriculum placement check — 5 min. **Revised: 90–150 minutes
per puzzle.** For 30 puzzles: 45–75 hours, up from 30–60.

**New one-time gate before authoring starts:** curriculum design pass. 6–10 hours to formalise
the concept ladder (§5.1), define the tag vocabulary, and stub the first 30 puzzles' concept
coverage before writing any of them. Without this gate, days 15–20 collide on aggregation
puzzles and days 21–25 skip `HAVING`. Cheap and load-bearing.

**Timeline:** original 3–4 weeks becomes **4–6 weeks**. Week 1 gains the curriculum gate and
the concept-tag linter (~4 hrs). Weeks 2–4 stretch to hold the longer per-puzzle authoring.
Week 5 (new) covers the "you just used" panel, the ribbon, and the concept-seen counter in the
share grid.

**Cuts to restore from the Phase 1 list:**
- **Pull "yesterday's puzzle" access forward to launch day**, not week 2. Pedagogy argues the
  player needs to revisit a concept the day after they saw it, while it's still fresh. The
  original plan already had this on the roadmap; move it up.
- **Restore the post-solve explanation panel to v1.** Was implicit-cut when the plan optimised
  for grid speed. Now load-bearing for the "teaches" claim. Adds ~2 days of UI work.
- **Add: concept-tag linter.** ~4 hours in week 1. Enforces the reinforcement rule at author
  time. Prevents day 40 from being all-new-concept.
- **Do NOT restore the full archive.** Yesterday-only is enough for reinforcement. Full
  archive and practice-mode replay stay Phase 2, gated on accounts.

**What stays cut:** multiplayer, streak recovery, personalized difficulty, weekly arcs, the
plan-cost axis (if EXPLAIN extraction proves fiddly). Pedagogy doesn't require any of these.

Net: +1–2 weeks calendar, +15 hours authoring, +6–10 hours curriculum gate, +2 days UI.
Without this section, the recommendation ships a Wordle clone that plateaus at week 3.

---

## 6. Two-track architecture

Two tracks share one codebase, one metadata schema, one concept counter.

- **Track 1 — Daily Query.** Unchanged from §4. One puzzle at 00:00 UTC, shareable grid, streak.
- **Track 2 — Practice.** Self-paced. Contains the archive of past dailies, the onboarding tutorial, and (from v1.5) concept packs.

Deferred to v2 — endless / procedural mode. Not designed here. Parked.

The pedagogy layer from §5 works across both tracks. Practice reinforces concepts too — same tags, same counter, same "you just used" panel. Streak is the only property Practice does not touch.

### 6.1. UI split — how a user moves between tracks

Chosen pattern: **single unified home; Daily is the hero, Practice is a secondary surface.** Rejected — two-card hub (dilutes the daily on first paint). Rejected — tabs (splits attention, wrong shape for a viral share loop).

Home page (`/`):

```
+-------------------------------------------------------+
| Query Grid                             [ practice ]   |
+-------------------------------------------------------+
|                                                       |
|   SQL Daily #041 · Refund audit                       |
|   [ ER diagram · 4 tables ]                           |
|   Prompt: Refunds are up 40% this week...             |
|   [ editor ]                                          |
|   [ Run ]                                             |
|                                                       |
|   -- scroll for more --                               |
|                                                       |
|   Missed a day?   Study a concept?   New to SQL?      |
|   [ Archive ]     [ Packs ]          [ Tutorial ]     |
+-------------------------------------------------------+
```

Casual visitor sees the daily as the entire above-the-fold. Practice is one scroll or one nav click away — nothing shoves.

Post-solve prompt for the daily player: the share grid is the primary CTA. Underneath, one line of secondary weight — "Done for today. New puzzle at 00:00 UTC — or try the archive." A link, not a card, not an upsell.

Practice player who wants today's daily: persistent top-nav badge shows the date with a red dot when today is unsolved. Click routes into the daily. That badge is the always-visible reminder that the daily is the point.

### 6.2. Onboarding flow

Trigger: cold-boot detection — first visit, no localStorage, no `daily.solved` entries. Show a dismissable banner above the daily: `New to SQL? 5-min tutorial · skip →`. Never a modal. Never blocking. Daily is playable in one click regardless of the banner.

Skippable: yes, no cost. Streak begins on the first daily attempt, tutorial or no tutorial. Friction on the landing page kills the share loop faster than beginner drop-off does.

Eight lessons, ~15 min total. Each lesson is a mini-puzzle with a starter query and a forgiving evaluator (accepts semantically-equivalent variants):

| # | Teaches | Puzzle |
|---|---|---|
| 1 | `SELECT`, `FROM`, reading a table | List every product. |
| 2 | `WHERE` + `=` | Find product #17. |
| 3 | `>`, `<`, `!=` | Products under $50. |
| 4 | `ORDER BY` + `LIMIT` | Three cheapest products. |
| 5 | `AND` / `OR` | Cheap products still in stock. |
| 6 | `COUNT(*)` | How many products total? |
| 7 | `GROUP BY` | Product count per category. |
| 8 | ER diagram + handoff | Today's daily uses two tables. Here's the diagram — ready? |

Handoff CTA: primary is `Try today's puzzle →`. Secondary is `Browse Practice →`. Default routes the tutorial grad straight into Day 1 of Daily. Reason: the daily habit is the whole product; get them there while momentum is warm.

### 6.3. Concept pack unlock rules

**Chosen: all packs free from day one; "mastery" on a pack requires seeing every concept in that pack via Daily.**

Rejected — full earned: kills the interview prepper who wants to grind `LEFT JOIN` today, and kills the tutorial grad who now wants to study a topic. Kicks the wrong user off the porch.

Rejected — full free: no gravitational pull toward Daily. Player grinds packs, never returns to the daily habit that funds the share loop.

Hybrid keeps both intact: packs are playable freely from v1.5. Mastery is cosmetic — a badge on the pack card and a highlighted concept in the "you just used" panel. Mastery only unlocks by encountering the concept in a Daily solve. Interview prepper grinds without friction and doesn't care about the badge. Learning-first user gets both.

### 6.4. Progression state schema

Single localStorage store, one root object. Splitting per track forces two writes for every event that touches the concept counter — which is every event.

```ts
interface GameState {
  version: 1;
  user: {
    theme: 'light' | 'dark';
    keyboardMode: 'default' | 'vim';
  };
  daily: {
    streak: number;
    lastSolvedDate: string | null;           // ISO YYYY-MM-DD, UTC
    solved: Record<PuzzleId, {
      date: string;
      tier: 'green' | 'yellow' | 'help';
      chars: number;
      cost: number | null;
      attempts: number;
    }>;
  };
  practice: {
    packs: Record<PackId, {
      openedAt: string;
      puzzles: Record<PuzzleId, {
        firstSolvedAt: string;
        bestChars: number;
        bestCost: number | null;
        attempts: number;
      }>;
    }>;
  };
  concepts: Record<ConceptId, {
    seenCount: number;                       // combined across tracks
    firstSeenAt: string;
    lastSeenAt: string;
    mastered: boolean;                       // true only after Daily encounter
  }>;
  tutorial: {
    completedLessons: number[];              // e.g. [1,2,3,4]
    completedAt: string | null;
  };
}
```

Read / write:
- **Daily solve** writes `daily.solved[id]`, updates `daily.streak`, and for each concept tag: `concepts[c].seenCount++`, `concepts[c].mastered = true`.
- **Practice solve** writes `practice.packs[p].puzzles[id]`, and for each concept tag: `concepts[c].seenCount++`. Does not touch `mastered`. Does not touch `streak`.
- **Tutorial lesson complete** appends to `tutorial.completedLessons`. Does not touch `concepts` — tutorial is scaffolded; concept-seen credit is reserved for real puzzles.

Puzzle played in Daily first, then again in Practice: second play increments `concepts[c].seenCount` (reinforcement is real; the counter reflects exposure) but does not touch the daily record. Same practice puzzle replayed: only `bestChars` / `bestCost` update; `attempts` increments.

`version` field is there so a future schema migration doesn't nuke everyone's streak.

### 6.5. Shared puzzle database — one pool or two?

**One pool, tagged with eligibility flags.** Each puzzle carries `dailyDate` (which date it appears as Daily, if any), `packEligible[]` (which practice packs it belongs to), `tutorialEligible` (bool). Archive is `dailyDate < today`. Practice pack view is `packEligible.includes(packId)`.

Rejected — two entirely separate pools: doubles the authoring bottleneck and prevents past dailies from feeding the archive automatically.

Rejected — "Daily is curated premium, Practice is commodity drill": implies Practice is second-class. Wrong signal. Practice reinforces the same concepts with the same craft.

Authoring implication: **one puzzle serves multiple contexts.** A puzzle designed for Daily #041 automatically graduates into the `LEFT_JOIN` pack and the archive. Tutorial puzzles are the exception — they need `starterQuery` and a forgiving evaluator, so they carry an extra `tutorial:{}` block and are almost never repurposed as Daily.

After 90 days of Daily, the archive has 90 puzzles and every pack has ~10–15 puzzles for free. Pack-specific authoring only fills gaps.

### 6.6. Puzzle metadata data model

Authoring spec. One MDX file per puzzle at `content/puzzles/<id>.mdx`, frontmatter typed against:

```ts
interface Puzzle {
  id: string;                              // "refund-audit-042"
  title: string;                           // "Refund audit"
  urlSlug: string;                         // "refund-audit-042"
  dailyDate: string | null;                // "2026-09-14" or null
  concepts: ConceptId[];                   // ["LEFT_JOIN", "IS_NULL"]
  difficulty: 1 | 2 | 3 | 4 | 5;
  worldPack: WorldId;                      // "refunds" | "payroll" | ...
  schema: {
    ref?: string;                          // "worlds/refunds/v1"
    ddl?: string;                          // inline SQL if not referenced
  };
  seedData: {
    ref?: string;                          // "worlds/refunds/seed/v1"
    inline?: Record<string, unknown>[];
  };
  prompt: string;                          // 1–2 sentences, situational framing
  expectedResult: {
    columns: string[];
    rows: unknown[][];
    orderMatters: boolean;
    columnNamesMatter: boolean;
  };
  optimalQuery: string;                    // reference solution, byte baseline
  hints: {
    nudge: string;                         // English restatement, free
    scaffold: string;                      // query with blanks, -1 grid tier
    solution: string;                      // full solution + 2-sentence explainer
  };
  explanation: string;                     // "you just used ..." post-solve copy
  packEligible: PackId[] | null;           // ["left-joins", "null-patterns"]
  tutorialEligible: boolean;
  tutorial?: {
    lessonId: number;                      // 1–8
    starterQuery: string;                  // pre-filled shell
    forgivingEval: boolean;                // accept semantic variants
  };
  authoredBy: string;
  authoredAt: string;                      // ISO
  reviewedBy: string | null;
}
```

Concept and pack IDs live in a shared enum (`content/taxonomy.ts`) so the linter can validate tags. Worlds live in `content/worlds/<id>/` with reusable schema + seed data — a puzzle in the `refunds` world doesn't redeclare tables, it references `worlds/refunds/v1`.

Guest contributor gets `content/puzzles/_template.mdx` and fills the blanks. The concept-tag linter from §5.6 runs on commit and fails the build if a puzzle's concept mix violates the reinforcement rule.

### 6.7. Updated phased MVP plan

Ryan's lean: v1 = Daily + Archive + Onboarding; packs at v1.5; endless at v2. **Backed.** Defending against the "just ship Daily-only faster" alternative:

- **Onboarding is non-negotiable at launch.** Without it, a first-time-SQL visitor hits Day 12 (`COALESCE`), doesn't know what `NULL` is, bounces forever. Onboarding cost (~20 hrs eng + ~10 hrs content) buys the largest addressable audience. Deferring it defers the beginner segment out of the launch spike.
- **Archive is cheap.** ~8 engineering hours reuses the daily engine and adds a route. It closes "missed a day → quit the streak → quit the game" — a top retention leak in daily-cadence games. Adding it later leaks streaks in the meantime.
- **Concept packs are the right thing to defer.** Each pack needs 10–15 dedicated puzzles, or heavy reuse of dailies (which requires ~60 days of daily backlog to feel populated). Ship them at v1.5 once the daily pool has fed the archive.

Push where Ryan's lean needs pushing: hold Onboarding to eight lessons flat. No progress dashboard, no learning-path screen, no gamified badges. If the tutorial creeps past ~15 min total, cut a lesson.

**Phase 1 (v1 launch, weeks 1–9):** Daily + Archive + Onboarding + Practice hub scaffolding (empty of packs; just Archive and Tutorial CTAs live). 30 daily puzzles + 8 tutorial lessons.

**Phase 1.5 (weeks 10–13):** Concept packs. Four packs at launch — Read, Filter, Join, Group. Reuse graduated dailies where they fit.

**Phase 2 (weeks 14+):** Accounts (magic link or GitHub OAuth), server-backed state migration, real-time histogram, weekly recap card, cross-device sync.

**Phase 3 (later):** Endless / procedural mode (was Ryan's v2), async multiplayer challenges, Monday deep-dive newsletter. Retention data drives which one goes first.

### 6.8. Updated timeline + authoring estimate

Section 5 baseline: 4–6 weeks + 45–75 hrs authoring (30 daily puzzles with pedagogy).

Additions for two-track v1:

| Add-on | Engineering | Authoring |
|---|---|---|
| Archive (`/archive/[date]`, playback UI, no-streak flag, month index) | 6–10 hrs | — |
| Onboarding (tutorial mode, lesson controller, starter query, forgiving eval, handoff) | 15–20 hrs | 6–12 hrs (8 lessons) |
| Practice hub (home page split, top-nav date badge, post-solve prompt) | 10–15 hrs | — |
| Metadata schema + MDX template + tag linter + taxonomy file | 4–6 hrs | — |
| **Subtotal** | **35–51 hrs** | **6–12 hrs** |

At 15 hrs/week engineering, add 2.5–3.5 weeks.

**Revised v1: 7–9 weeks. Total authoring: 51–87 hrs (30 daily puzzles + 8 tutorial lessons).**

v1.5 (concept packs): 4 packs × ~12 puzzles average × 75 min per puzzle (schema reuse from the world pool cuts per-puzzle cost) = **~60 authoring hrs + 20–30 engineering hrs for pack UI, progress states, and mastery-flag wiring.** About 3–4 additional weeks.

### 6.9. Trade-off honesty

Five risks. One is close to fatal on launch; the rest have clean mitigations.

**1. Practice on the home page dilutes the daily share moment.** Real. Any element competing with the daily on first paint can pull share intent. Mitigation: Daily gets the entire above-the-fold. Practice lives below the scroll and in a top-nav link. Kill test: share rate per Daily solve. If <20% of solves generate a share event in week 1, pull Practice off the home page onto `/practice`.

**2. Onboarding banner kills conversion for casual "just show me the puzzle" visitors.** Close to fatal if implemented badly. Mitigation: banner not modal, dismissable in one click, one line of copy. Daily playable in one click regardless. Kill test: bounce rate on landing. If bounce rises >5% vs a control cohort without the banner, cut the banner and rely on a quiet `Tutorial →` nav link plus a post-solve prompt on Day 1 for players who look confused.

**3. Concept-pack mastery-in-daily annoys pure grinders.** Small. Grinders don't care about cosmetic mastery; they care about access. All packs playable freely from v1.5. No mitigation needed beyond communicating the model plainly on the pack page.

**4. Two-track surface confuses "what is this thing?" on first impression.** Real. Wordle wins because it's obviously one thing. Two tracks reads as a "product" — heavier. Mitigation: landing copy leads with "One SQL puzzle a day. Share your grid." Practice is a sub-headline: "Or work at your own pace." Read to five devs before launch; if any of them describe the site as "a SQL learning platform" instead of "a daily SQL puzzle," rewrite until they don't.

**5. Archive as spoiler for missed days.** Small. Archive shows the puzzle, editor, three-axis histogram — never a solution walkthrough or shared community solutions. Playing yesterday's puzzle today is practice, not a spoiler. No solution content in the archive for ≥90 days (matches the Monday deep-dive newsletter parked in Phase 3, which is where solution commentary lives).

Fatal candidate: #2. Every other risk is a knob. If bounce rate on the landing spikes in week 1, the banner comes out same-day and Onboarding moves entirely into `/tutorial`, linked from the nav and a Day 1 post-solve prompt. Not a launch-blocker, but the highest-priority week-1 metric.

The point of two tracks isn't a bigger product. It's making sure a curious visitor on day 45 still has a foothold if they missed the first six weeks. Without Practice + Archive + Onboarding, the daily loop is a moving train with no doors.

---

## 7. MVP plan — Daily Query

### Minimum lovable version

A visitor lands on `vertexapps.dev/game`. They see today's puzzle: a 4-table schema (ER
diagram), a prompt in 1–2 sentences, and a query editor. They write SQL. They hit Run. They
see a diff between their result and the target result. When both match, they see a two-axis
score (correctness ✅, character count with community percentile) and a "Share grid" button.
Click share → grid on clipboard → paste anywhere. Their streak +1 next day if they come back.

That's the whole thing. Everything else is v2.

### Phase 1 — Ship the daily loop (weeks 1–4)

**Stack:**
- Next.js 15 static build, hosted on Vercel (matches Ryan's ecosystem, free tier is fine).
- **DuckDB-Wasm** for the SQL engine. Runs entirely in-browser, no backend query surface,
  supports Postgres-flavor SQL well enough for teaching. Alternative: sql.js (SQLite), but
  DuckDB has richer analytics functions and better EXPLAIN output for v1.1's plan-cost axis.
- **CodeMirror 6** for the editor (lighter than Monaco, easier to theme). SQL syntax mode is
  fine out of the box.
- No backend for v1. Puzzle-of-the-day is a static JSON per day, prefetched on load. Streak
  and preferences in `localStorage`. Community histogram fetched from a static JSON blob that
  updates hourly (a serverless function writes to Vercel Blob; front-end reads it directly).

**What ships:**
- 30 hand-authored puzzles for the first month.
- Daily puzzle at midnight UTC. Yesterday's puzzle accessible for one day after.
- Score = correctness (green/red) + character count percentile (grid bar).
- Share grid: two colored bars, puzzle number, URL, streak.
- Anonymous play. Streak in localStorage.
- Minimal UI. Monospace editor, sans-serif prompt, ER diagram, one Run button, one Share
  button.

**Risk in Phase 1 (in decreasing order):**
1. **Puzzle authoring quality and volume.** 30 puzzles hand-authored is 30–60 hours of Ryan
   time. Each needs: schema design, seed data (200–2000 rows), prompt writing, expected-result
   generation, optimal query, difficulty tag. A weak first week kills word-of-mouth. Budget
   for this to take longer than estimated. This is the actual bottleneck.
2. **DuckDB-Wasm bundle size.** ~7 MB gzipped for the full engine. First-load performance
   matters for a viral share loop where visitors bounce fast. Mitigations: preload on hover
   of the game link, show puzzle prompt immediately while engine loads in background, use a
   trimmed build if possible.
3. **Character-count scoring fairness.** Formatting differences (whitespace, keyword case,
   comment stripping) shouldn't punish players. Solution: normalize before counting — strip
   comments, collapse whitespace to single spaces, uppercase keywords. Document the rule
   openly.
4. **Puzzle correctness edge cases.** Comparing result sets is trickier than it looks —
   ordering, duplicates, column names, type coercion. Solution: canonical result comparison
   (sorted rows, ignore column names if the prompt allows). Test extensively.
5. **Cheating via view-source.** All data is in the browser; a determined player can just
   read the expected result. Accept it. Wordle isn't cheat-proof either. Streak integrity
   is a v2 concern.

**Timeline (solo, part-time-serious ~15 hrs/week):**
- Week 1: DuckDB-Wasm integration, editor, run-query flow. First puzzle end-to-end.
- Week 2: Score computation, grid rendering, share-to-clipboard. First 10 puzzles authored.
- Week 3: Landing page, ER diagram component, streak logic, "yesterday's puzzle" access.
  Puzzles 11–20 authored.
- Week 4: Puzzles 21–30 authored, polish pass, launch prep. Community histogram (static JSON
  updated hourly by cron).

Ship at end of week 4 with 30 puzzles in the pipeline (one live per day). Post to HN,
LinkedIn, r/dataengineering, r/SQL. Watch the daily-puzzle mechanic do or not do the work
Wordle's did.

### Phase 2 — Retention and community (weeks 5–8)

**What ships:**
- Optional accounts (GitHub OAuth or magic link). Sync streak across devices.
- Puzzle archive: play any past puzzle for practice (doesn't count toward daily streak).
- Weekly arcs: five puzzles per week share a narrative thread ("The refund case", "Ops week").
- Community histogram becomes real-time via a lightweight Supabase Postgres (correctness,
  char count, timestamp per solve). Not more than that.
- Third scoring axis: query plan cost from DuckDB EXPLAIN, added as a third bar in the grid.

**Risks:**
- Backend for accounts + histogram introduces the first real infra cost. Supabase free tier is
  probably fine for months.
- Weekly arcs require narrative consistency across 5 puzzles — more authoring skill than
  isolated puzzles.

### Phase 3 — Growth and depth (weeks 9+)

**What ships (pick 2–3):**
- Async multiplayer challenges: send a friend "beat my grid on puzzle #041". Compare grids
  side by side.
- Puzzle submission form: community submits puzzles, curated release.
- Monday deep-dive newsletter: editorial writeup of previous week's puzzles, top 5
  solutions, community stats. This is Query Golf as an appendage rather than its own game.
- Themed seasons (a "Payroll Season" of 15 audit-themed puzzles) with completion badges.

Do not add these before Phase 2 lands. Retention data drives which one goes first.

### Content plan

**Steady-state authoring:** 3 puzzles per week to keep the daily cadence with a small buffer
= ~156 puzzles/year. Each puzzle at steady state should take 60–90 minutes to author once
templates exist. Ryan can do that solo initially; guest authors (SQL folks with a following)
become a natural early growth channel.

**Puzzle taxonomy for first 30:**
- 6 × basic SELECT/WHERE (M–T early weeks)
- 6 × ORDER BY / LIMIT / DISTINCT
- 4 × GROUP BY / aggregate
- 4 × INNER JOIN (two tables)
- 3 × LEFT JOIN + NULL patterns
- 3 × HAVING / GROUP BY refinement
- 2 × subqueries
- 2 × CTE
- 0 × window functions (save for post-launch; strong week-4 anchor)

**Schema pool:** 6–8 reusable "worlds" so players don't relearn a new schema every day:
Refunds (e-com), Payroll (HR), Sensor logs (ops), Inventory (retail), Tickets (support),
Rides (transport), Sales (B2B), Ad spend (marketing). Rotate through them.

### Success signals

- **Week 1:** 500+ unique players day 1. Share grids appear on LinkedIn without prompting.
- **Week 4:** 1,000+ daily active. Median streak ≥3. HN front page (this is realistic; SQL
  Murder Mystery has done it multiple times and Daily Query has a stronger hook).
- **Week 8:** 3,000+ daily active. 10+ inbound "guest author" requests. Community histogram
  distinct enough per puzzle to matter (300+ solves per daily average).
- **Month 6:** enough MRR-worthy audience to justify a monetization pass — the answer is
  probably "SQL Daily Pro" with unlimited archive access and puzzle explanations, not ads.

If Phase 1 hits <200 DAU by week 4, the diagnosis is puzzle quality, not mechanic. Iterate on
authoring, not features.

---

## Sources

Games and design writeups referenced:
- SQL Murder Mystery — https://mystery.knightlab.com/
- SQL Noir — https://www.sqlnoir.com/
- SQL Island — https://sql-island.informatik.uni-kl.de/
- Schemaverse — https://schemaverse.com/
- Select Star SQL — https://selectstarsql.com/
- SQLZoo — https://sqlzoo.net/, SQLBolt — https://sqlbolt.com/
- Lost at SQL — https://lost-at-sql.therobinlord.com/
- LeetCode SQL 50 — https://leetcode.com/studyplan/top-sql-50/
- Regex Crossword — https://regexcrossword.com/
- Wordle share-loop analysis — Webflow Blog, "How Wordle won the internet"
- Advent of Code — creator writeups, participation stats via Grokipedia
- The Password Game — Wikipedia, Neal Agarwal's own writeup
- GeoGuessr design critique — Bootcamp / Medium, "Design critique: GeoGuessr as an
  educational game"
- Balatro end-run + seed-sharing — Solopreneurs, Goomba Stomp
- Human Resource Machine + Zachtronics histograms — Game Developer, Thinky Games
- The Witness teaching-by-observation — GameSpot 10th anniversary retrospective, SUPERJUMP
- Foldit real-world contribution — HHMI, ScienceDaily on the AIDS enzyme
- One Million Checkboxes — Wikipedia, CoRecursive Podcast interview with Nolen Royalty
- Wikiracing — Wikipedia, Wikimania 2023 tournament writeups
- NYT Connections adoption — TechCrunch, "Connections is the NYT's most-played game after
  Wordle"
- DuckDB-Wasm — MotherDuck, DuckDB team's 2021 launch post
- SQL Golf — MotherDuck's Quackmas 2025 SQL Golf post, KiBeHa "SQL Tuning Golf"

Ryan can walk these back per section if he wants source-by-claim. Nothing above is inferred
without a linked reference.
