# Bridge Scene — Asset Vetting Shortlist

Verdicts per `asset-vetter.md` standing spec. Read-only research; nothing purchased or downloaded. Ryan buys.

**Fastest path to a first Bridge render (all free, ~30 min to set up):**
Rejala's modular pack + KitBash3D Mission to Minerva + a Poly Haven Hangar HDRI — see Section 5.

**Cheapest paid path with real fidelity (transformational, one purchase):**
FattyPants *Starship Command Center High Poly PBR* on CGTrader at **$74.70** (currently 70% off, was $249) — see Section 5.

---

## Pushback on the calibration set (read this first)

Two of your four "calibration references" are the exact assets your `asset-vetter.md` spec calls out as historical rejects — the 12.8k dylanheyes bridge and the 4.1k "speed modelled" sci-fi train. A third (USS Cerritos) turns out to be 13.5k tris with a `lowpoly` tag. Only USS Theurgy (570.8k) actually represents the fidelity bar. Details in Section 1.

Practical read: the shortlist below is calibrated against USS Theurgy, not the low-poly Sketchfab embeds. If a viewscreen close-up needs to survive Cycles, the shortlist meets that; the other three refs never would have.

---

## Section 1 — Calibration references

| URL | Name | Triangles | Textures | License / IP | Verdict | Reason |
|---|---|---|---|---|---|---|
| [sketchfab.com/…/uss-theurgy-battle-bridge](https://sketchfab.com/3d-models/uss-theurgy-battle-bridge-ab1e4015bf754ee7b570d0060dc04d11) | USS Theurgy Battle Bridge | **570.8k** / 383.4k verts | Sketchfab-embed only; owner did not publish PBR maps for download | Non-downloadable. `NoAI` flag. Owner-restricted: *"may not be featured elsewhere than in the Theurgy story."* Star Trek IP + Vengeance derivative. | **FAIL** (as usable asset) — **PASS** as fidelity target | Correct fidelity bar. This is what a photoreal bridge geometry density looks like. Cannot be licensed, downloaded, or used commercially — franchise IP + owner-restricted. |
| [sketchfab.com/…/uss-cerritos-bridge](https://sketchfab.com/3d-models/california-class-uss-cerritos-bridge-8d1a7007b9414870a4cea66ee6aebd2b) | California Class U.S.S. Cerritos Bridge | **13.5k** / 7k verts | Sketchfab preview only; textures are baked (`baked version which had issues in here`) | Not downloadable. Star Trek trademarked class. Tags include `lowpoly`, `startrek`, `lowerdecks`. | **FAIL** on every axis | Lowpoly by author's own tag. IP-locked. Baked lighting per the author's own description — cannot be relit in Cycles. Beauty-shot fooled us; metadata contradicts the fidelity impression. |
| [sketchfab.com/…/sci-fi-spaceship-bridge (dylanheyes)](https://sketchfab.com/3d-models/sci-fi-spaceship-bridge-aaa5259e54e14c79936df3d127644287) | Sci-Fi Spaceship Bridge (dylanheyes) | **12.8k** / 7.1k verts | CC-BY 4.0, downloadable | Original design (no franchise) | **FAIL** | **This is one of the two assets the `asset-vetter.md` spec explicitly names as historical rejects.** 12.8k tris; author-declared "Simple Low-Poly"; tags: `lowpoly`, `low-poly`, `gameready`. Ryan already lost weeks on this one. Do not touch. |
| [sketchfab.com/…/sci-fi-train (abhayexe)](https://sketchfab.com/3d-models/sci-fi-train-40ab7e9571f940baa7681333195e1b46) | Sci-Fi Train | **4.1k** / 2.9k verts | Sketchfab Free Standard | Original | **FAIL** | **The other named historical reject.** Author's own description: *"speed modelled"* — instant auto-FAIL per verdict rules. 4.1k triangles for an interior. Ignore. |

**Net:** the fidelity bar is USS Theurgy's 570.8k tris + full PBR set + modelled bevels. Everything below is judged against that.

---

## Section 2 — PASS candidates

Grouped by role. Every one of these can go into a Bridge scene today.

### 2A. Modular kits — the composition-first path (recommended)

| URL | Name | Triangles | Textures | License | Price | Verdict | Why |
|---|---|---|---|---|---|---|---|
| [sketchfab.com/…/sci-fi-ship-interior-modular-asset-pack](https://sketchfab.com/3d-models/sci-fi-ship-interior-modular-asset-pack-50e2af8800cc4ab79add375f817b2d76) | Sci-fi Ship Interior — Modular Asset Pack (Rejala) | **356.8k** / 214.5k verts across the pack | Sketchfab download; PBR maps included per Sketchfab standard export | CC-BY 4.0 | **Free** (attribution required) | **PASS** | Genuine modular kit — walls, panels, props, spacecraft interior pieces. 356.8k tris across the pack means individual pieces are dense enough to survive close-up. Original design, no franchise. Attribution is cheap. **This is your zero-cost starting point for the octagonal bridge composition.** |
| [kitbash3d.com/products/mission-to-minerva](https://kitbash3d.com/products/mission-to-minerva) | Mission to Minerva (KitBash3D) | **19.7M** polys, 60 models, 63 PBR materials | Full PBR, native `Cycles` + `Blender` support explicitly listed | KB3D Individual/Small-Business License — free | **Free** | **PASS** | Free KB3D kit. Native Blender + Cycles support. Contains directly usable props for a bridge: `Hologram Map`, `Space Station Chair A`, `Space Station Kiosk A`, `Space Station Sofa A`, `Tower Control`, `Room Module`, `Living Central`, `Community Center`, `Communications Array`. Not a pre-built bridge; a component library that lets you compose one at any width. Individual + Small Business licenses both free — matches Vertex org size. |

**Attribution string for Rejala (site colophon + `assets/CREDITS.md`):**
> *"Sci-fi Ship Interior — Modular Asset Pack"* by Rejala (https://sketchfab.com/Rejala), licensed under CC-BY 4.0.

**KitBash3D:** no attribution required under their commercial license, but link to KitBash3D is polite and standard.

### 2B. Full bridge scenes (monolithic)

| URL | Name | Polygons | Textures | License | Price | Verdict | Why |
|---|---|---|---|---|---|---|---|
| [cgtrader.com/…/starship-command-center-high-poly-pbr](https://www.cgtrader.com/3d-models/interior/other/starship-command-center-high-poly-pbr) | Starship Command Center High Poly PBR (FattyPants) | **2,666,072** polys / 2,150,006 verts | 4K + 2K PBR (Albedo, Metal/Roughness, OpenGL Normal). Two texture sets: grunge + non-grunge. Substance Painter `.spp` source files included for retexturing. | CGTrader Royalty-Free (commercial rendered output OK) | **$74.70** (currently -70% off from $249) | **PASS** | Beats the USS Theurgy fidelity target by ~4.7× on polys. **Built and rendered in Blender 2.77a Cycles** — this is not a game asset flipped to a renderer, it was designed for Cycles from the start. Includes .blend file with post-processing nodes. Two texture variants means "clean" for the establishing shot and "grunge" for wear-and-grime hits from the Visual Acceptance Checklist. 9 buyer reviews all positive, `TOP SELLING` badge. Verified by CGTrader. |
| [cgtrader.com/…/small-starship-command-center-pbr-high-poly](https://www.cgtrader.com/3d-models/interior/other/small-starship-command-center-pbr-high-poly) | Starship Command Center PBR High Poly 2 (FattyPants) | Front_01: 1,623,805 faces / 1,692,494 verts. Front_02: 1,856,067 faces / 1,934,487 verts | 4K PBR, Substance Painter `.spp` included | Royalty-Free | **$60** (was $200, -70%) | **PASS** | Smaller/companion piece to the above. Ships with **two front sections** — curved windows OR angular windows — so the viewscreen aperture geometry is a design choice, not a lock-in. Rendered in Blender Cycles 2.78a. Includes 12500×7500 HDRI star map. Marketplace description: "designed to have some modularity" — this is the closest thing to a "widen the room by arraying" behaviour without going full KitBash. |

### 2C. Corridors + adjacent rooms (matches the material language)

For crossfade corridor dolly videos per the pipeline spec.

| URL | Name | License | Price | Verdict | Why |
|---|---|---|---|---|---|
| [cgtrader.com/…/polyguardian-cruiser-corridor](https://www.cgtrader.com/3d-models/space/spaceship/polyguardian-cruiser-corridor) | Polyguardian Cruiser Corridor (FattyPants) | Royalty-Free | **$22.50** (was $75) | **PASS** | Same author as the two Command Center bridges above — material language matches. Under the $30 auto-approve threshold. |
| [cgtrader.com/…/starship-conference-room-b](https://www.cgtrader.com/3d-models/interior/hall/starship-conference-room-b) | Starship Conference Room B (FattyPants) | Royalty-Free | **$35.70** (was $119) | **PASS** | Adjacent room in the same material language. Useful as a secondary node. |
| [cgtrader.com/…/spaceship-interior-c-hd](https://www.cgtrader.com/3d-models/space/spaceship/spaceship-interior-c-hd) | Spaceship Interior C HD (FattyPants) | Royalty-Free | **$35.70** (was $119) | **PASS** | Third node option in the same author's material language. |

### 2D. HDRIs (for Cycles environment lighting + metal reflections)

| URL | Name | License | Price | Verdict |
|---|---|---|---|---|
| [polyhaven.com/hdris/interiors](https://polyhaven.com/hdris/interiors) | Poly Haven Interior HDRI category | **CC0** | Free | **PASS — no vetting required per spec** |
| [polyhaven.com/a/hangar_interior](https://polyhaven.com/a/hangar_interior) | Hangar Interior HDRI | CC0 | Free | **PASS** — nearest analog to a sci-fi bay reflection environment. Grab first. |
| [polyhaven.com/hdris/night/indoor](https://polyhaven.com/hdris/night/indoor) | Night → Indoor HDRIs | CC0 | Free | **PASS** — Ryan's bridge scenes are dim/night-lit; night-indoor HDRIs are the correct backdrop. |

---

## Section 3 — INSPECT candidates (open the 3D viewer to judge)

| URL | Name | Triangles | Textures | License / Price | Verdict | Why inspect |
|---|---|---|---|---|---|---|
| [sketchfab.com/…/sci-fi-cockpit-bridge-6](https://sketchfab.com/3d-models/sci-fi-cockpit-bridge-6-90bb1a1285b44e779b80aa37fc80da9b) | Sci fi Cockpit Bridge 6 (VattalusAssets) | 112.8k / 64.9k verts (Sketchfab); Fab listing says 54,188 polys / 64,777 tris | 4K PBR full set: Albedo, Normal, Metallic, Roughness, AO, Emissive, Opacity (glass). Two variants: Clean and Weathered. | [Fab.com](https://www.fab.com/listings/45e2e719-2812-40cd-9b30-e1f35f9ce884) — price not extracted (SPA didn't render); Vattalus's Unity Store lists cockpits in the ~$30-50 band historically. Formats: fbx, gltf, glb, usdz, Unreal, Unity. AI-use: **No**. | **INSPECT** | Poly-count reporting is inconsistent between Sketchfab (112.8k) and the Fab listing (54.2k polys / 64.8k tris). The 4K full-PBR set with clean+weathered variants is real, but total geometry is borderline vs. Ryan's 100k threshold for interiors. Open Sketchfab's 3D viewer, look at the seat/chair silhouettes and console corners at closest zoom — if they read as bevelled at that distance, keep it. If they read as flat, drop it. |
| [cgtrader.com/…/sci-fi-command-room-with-operators-blue](https://www.cgtrader.com/3d-models/interior/other/sci-fi-command-room-with-operators-blue) | Sci Fi Command Room with Operators Blue | Not extracted | PBR (badge visible) | -35% at **$148.85** — needs case per Ryan's policy | **INSPECT** | Above $100 threshold, so needs the "clearly transformational" bar. Also comes with operator characters — could give scale to a wide shot but risks the animated-figure trap if it's rigged for game rendering. Open viewer, verify (a) polys ≥ 100k, (b) operator meshes can be hidden if desired. |
| [blenderkit.com/…/spaceship-bridge-interior (Zifir3D)](https://www.blenderkit.com/asset-gallery-detail/4c09d189-a934-44ec-858c-2eb6f845c020/) | Spaceship Bridge Interior (Zifir3D) | **929,625 polys** | PBR (Cycles + Eevee ready per BlenderKit convention) | BlenderKit Full Plan subscription $12.99/mo OR per-asset license — need to verify exact terms on the listing page | **INSPECT** | Density (929k polys) is real. Direct-into-Blender integration via the BlenderKit addon. Subscription price ($12.99/mo) is under Ryan's $30 auto-approve. The reason to inspect rather than PASS: the individual asset license terms and screenshot fidelity should be confirmed in-app since the BlenderKit page did not render clean text. |
| [superhivemarket.com/products/sci-fi-spaceship-kitbash-vol3](https://superhivemarket.com/products/sci-fi-spaceship-kitbash-vol3) | Sci-fi Spaceship Kitbash Vol.3 (Superhive / formerly Blender Market) | 250+ pieces, high poly per description | 6 PBR texture sets | Superhive standard (Blender Market equivalent — commercial OK) | **INSPECT** | Alternative kitbash source with different aesthetic language from KB3D. Worth opening the gallery to compare against Rejala's kit — pick one aesthetic, don't mix. |

---

## Section 4 — FAIL candidates (rejected with reason)

| URL | Name | Verdict reason |
|---|---|---|
| [sketchfab.com/…/sci-fi-modular-asset-pack-pbr-textured (TVdot)](https://sketchfab.com/3d-models/sci-fi-modular-asset-pack-pbr-textured-9960cfc95ff2465382a3af91c1587303) | Sci-Fi Modular Asset Pack PBR (TVdot) | 5.1k triangles across the whole pack — far below the 100k environment threshold. Free/CC-BY but density kills it. |
| Any TurboSquid "Starship Command Center" listing at $350-$450 | TurboSquid vendor listings | Same FattyPants assets are on CGTrader at 70% off. Do not pay TurboSquid retail for identical geometry that's discounted elsewhere. |
| [turbosquid.com/…/starship-startrek-bridge](https://www.turbosquid.com/Search/3D-Models/starship+bridge) (any Star Trek entries) | Starship — Startrek Bridge (various vendors, ~$350) | Franchise IP — automatic FAIL regardless of license per spec ("recognizable franchise IP regardless of license — a fan model of copyrighted production design cannot be used on a commercial site"). |
| KB3D per-kit purchase for anything except Mission to Minerva | KitBash3D non-free kits | KB3D moved to a **subscription-only** model — $59/mo yearly ($708/yr) for the full library. Per-kit pricing is no longer surfaced on the pricing page. That's above Ryan's $30/mo auto-approve and needs a case even against the `$30-50` band. Only worth it if pipeline uses ≥3 kits across multiple projects. Mission to Minerva remains free. |
| Any "captain's chair" hit under ~15k tris | Various free/cheap chair models on Sketchfab/CGTrader | Hero-prop threshold is 20k+ tris per spec. Sci-Fi Pilot's Chair (Hivrtoon, 27k verts) is on the edge but I could not retrieve the listing page to confirm PBR set. Left as gap in Section 6. |

---

## Section 5 — Recommended purchase / download sequence

### Option A — Free-first (verify the pipeline before spending)

Costs **$0**. Delivers a testable Bridge render this week. Confirms the render loop works before Ryan puts real money at risk.

1. Download **Poly Haven Hangar Interior HDRI** — CC0, ~30 seconds. First thing loaded so Cycles has an env light for the first block-in render.
2. Download **KitBash3D Mission to Minerva** — free account, Blender + Cycles native. Grab the props relevant to a bridge: `Hologram Map`, `Space Station Chair A`, `Space Station Kiosk A`, `Tower Control`, `Room Module`, `Living Central`.
3. Download **Rejala Sci-fi Ship Interior Modular Asset Pack** from Sketchfab — CC-BY 4.0. Grab the wall panels and hull sections for the octagonal shell.
4. Log the attribution line for Rejala into `assets/CREDITS.md` immediately.
5. Do the first block-in render. Judge against the Visual Acceptance Checklist. **This gates the paid step.**

### Option B — Cinematic paid path (if Option A proves the pipeline)

Total: **$132.90** for a full bridge + corridor + adjacent room, all in one author's material language.

1. **FattyPants — Starship Command Center High Poly PBR** — **$74.70** (CGTrader, currently -70%). The hero bridge. Native Blender/Cycles. 2.67M polys.
2. **FattyPants — Polyguardian Cruiser Corridor** — **$22.50**. Corridor for crossfade transitions per pipeline spec.
3. **FattyPants — Starship Conference Room B** — **$35.70**. Secondary node.
4. Keep the free KB3D + Rejala props from Option A as secondary greebles and hero-prop dressing.

### Option C — Widen-the-viewport variant (buy instead of Option B if the design brief needs the alternate front)

- **FattyPants — Starship Command Center PBR High Poly 2** — **$60**. Ships with both curved and angular front sections. Slightly smaller bridge; may match the octagonal floor plan better.

### Cost-policy check

- Option A: $0 — automatic.
- Option B: $132.90 total, avg $44/asset — three individual purchases each below Ryan's $50 case-required threshold; the aggregate is under the $150 threshold most solo devs would call "clearly transformational" for a full ship-interior asset set. Recommend.
- Option C: $60 single item — sits in the $50-100 "strong ROI story" band. The ROI: two viewport geometry options in one asset means the design choice on window shape isn't locked to a purchase.

**All CGTrader prices are the current sale price — the -70% banner shows a countdown but no expiry date extracted. Verify at click-through before purchase.**

---

## Section 6 — Gaps I could not fill

1. **Original-design sci-fi captain's chair at ≥20k tris with 4K PBR.** Hivrtoon's Sci-Fi Pilot's Chair on Sketchfab (27k verts per external summary) is a candidate but the listing page returned empty content on fetch and I could not verify PBR set or license directly. Recommend: Ryan opens the URL in a browser and confirms, OR pulls the chair from the FattyPants Command Center pack (chairs are included), OR uses KB3D Mission to Minerva's `Space Station Chair A`. The chair problem is smaller than it looked once the bridge packs include their own chairs.

2. **Standalone modular console workstations at pipeline fidelity.** Cults3D's *Free Sci-Fi Control Console 2* has 4K PBR + commercial use per external summary but I did not fetch the listing to verify polys — treat as INSPECT. Bridge packs above include consoles, so this is a "nice to have" rather than a gap that blocks the first render.

3. **A truly wide, octagonal, ceiling-included bridge at Theurgy fidelity, original design, single asset, under $150.** Does not exist in what I searched. The correct answer is the KitBash / modular path — array pieces to any width Ryan wants — which is what the pipeline document already prescribes ("Scaling a monolithic mesh to widen a room — texture stretch. Array modules instead.").

4. **VattalusAssets Cockpit Bridge 6 exact Fab price.** Fab's React SPA did not render its price string on my fetch. Vattalus's Unity/CGTrader history is ~$30-50 for cockpit assets; verify at Fab click-through.

5. **KB3D's Cyberpunk Interiors kit spec sheet.** Page fetch exceeded the token cap; I saw the pricing page (subscription-only) but not the per-kit poly count. Only relevant if Ryan later wants dense sci-fi-lab-style greebles beyond what Mission to Minerva provides — and at $59/mo it wouldn't clear Ryan's cost policy for a single-project need anyway.

---

## Verification notes

- All Sketchfab pages fetched directly and triangle counts pulled from the listing metadata (not summary text).
- CGTrader FattyPants listings fetched directly; poly counts, license, formats, and prices from the page HTML meta tags and body.
- KitBash3D Mission to Minerva fetched directly; poly count and format list from the listing body.
- Poly Haven treated as CC0 per site-wide policy — no per-asset vetting required (per the `asset-vetter.md` spec).
- BlenderKit and Superhive listings were partial fetches; those hits are in Section 3 (INSPECT) not Section 2 (PASS) because I could not verify the full license and PBR set from the page HTML.
- Fab.com's Sci Fi Cockpit Bridge 6 page rendered as a JS SPA and did not surface the license/price fields in the HTML fetch — flagged explicitly in Section 3.
- Ryan buys. Nothing on this list has been downloaded, purchased, or committed to on his behalf.
