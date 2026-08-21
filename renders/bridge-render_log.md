# Bridge render log

One entry per render. Settings are recorded so any frame can be reproduced exactly, per
`render-pipeline.md`. Scripts live in `C:\DEVELOPMENT\vertex-assets\bridge-build\scripts\`
and are idempotent — the whole chain re-runs from the source GLB with no manual steps.

## Pipeline

```
blender -b --factory-startup -P build_bridge.py -- <glb> scenes/bridge_raw.blend
blender -b scenes/bridge_raw.blend -P look_bridge.py -- <pbr_dir> <hdri> scenes/bridge_lit.blend
blender -b scenes/bridge_lit.blend -P render_bridge.py -- draft|final <out_basepath>
python composite_preview.py <render.png> <composite.png>
```

`debug_views.py` renders fast EEVEE plan/section/3-quarter views of the assembly, and
`audit_stage.py` / `outliers.py` print per-object world extents. Both exist because two
scale bugs in this build were invisible from the shot camera and obvious from outside.

---

## bridge-final-v1 — 2026-08-20  ✅ SHIPPED

**Status:** FINAL. Approved from draft v2, no scene changes between the two — this is the
same `bridge_lit.blend`, rendered at full resolution and sample count.

| Setting | Value |
|---|---|
| Engine | Cycles, OptiX GPU (RTX 5060) |
| Resolution | 3840 × 2160 @ 100% |
| Samples | **512** — adaptive, threshold 0.01. Not raised to 1024; see noise check |
| Denoiser | OpenImageDenoise, RGB + Albedo + Normal |
| Max bounces | 12 (transparent 12) |
| View transform | AgX, "AgX - Base Contrast" |
| Render time | **381.1 s (6 min 21 s)** |
| Blender | 5.2.0 LTS (fbe6228777e7) |
| Scene | `bridge_lit.blend` (mtime 08:33:40, read fresh from disk by a headless process) |
| Camera node | `CAM_bridge_01` — 40 mm, f/8, eye 1.72 m, focus 7.19 m |

**Outputs**

| File | Size | Notes |
|---|---|---|
| `bridge-final-v1.exr` | **28.93 MB** | 16-bit half float, ZIP codec, RGBA — the master |
| `bridge-final-v1.png` | **41.58 MB** | 16-bit RGBA preview, carries the alpha aperture |
| `bridge-final-v1_composite.png` | 4.2 MB | review only, gas-giant placeholder behind |

**Aperture verified on the final plate.** 2652 × 948 px = **2.80:1**. 26.17% of frame fully
clear, 0.13% partial (antialiased rim). Nine connected transparent regions, not one — but
the largest is 99.96% of all transparent area, and the other eight are 40 × 32 px and
smaller. Inspected at 1.6× against the composite: they are the same viewscreen glimpsed
through real gaps in the foreground, chiefly the triangular opening under the port helm
console's hood between canopy and plinth. Physically correct and harmless to the composite,
because the web layer puts the video behind the entire plate, so every transparent region
resolves to the same source.

Note for the checker: connected-region counting cannot distinguish "one screen seen through
several gaps" from "two holes in the plate". It flagged this as a leak and was wrong. The
verdict needs an eye on the crop, not just the count.

**Noise check.** Two 1:1 crops of the darkest areas — the port colonnade and the deck
corner — show no fireflies and no residual sampling noise. 512 samples plus OIDN was
sufficient; the run was not escalated to 1024.

**Discovered at full resolution, not visible in the 1080p drafts:** the world-space box
projection reads as a single continuous brushed-metal grain running diagonally across the
whole deck. At `TEX_SCALE` 1.15 the texture repeats every ~0.87 m, but the *direction* is
uniform, so a 15 m deck looks like one milled sheet rather than laid panels. Not a defect
and not worth re-rendering for, but the fix for a future pass is to break the projection
per-module (a per-object random rotation into the mapping node) rather than to change the
scale.

---

## bridge-draft-v2 — 2026-08-20

**Status:** DRAFT, direction approved on v1, awaiting approval of this pass.
Two changes only: curved bow with a wide-cinematic aperture, and the wear/relief pass.

| Setting | Value |
|---|---|
| Engine | Cycles, OptiX GPU (RTX 5060) |
| Resolution | 1920 × 1080 @ 100% |
| Samples | 64, adaptive (0.01) · OpenImageDenoise |
| View transform | AgX, "AgX - Base Contrast" |
| Output | 16-bit RGBA PNG |
| Render time | 21.3 s |
| Scene | `bridge_lit.blend` · camera `CAM_bridge_01` |

**Bow reshaped to an elliptical apse.** The three forward octagon edges are gone; the bow
is now a half-ellipse of half-width 6.00 m and bulge 2.20 m, total arc 13.58 m, resampled
at equal ARC LENGTH rather than equal angle (equal angle bunches bays at the flanks and
stretches them across the nose). 28 bays total — 24 straight along the sides and stern
quarters, 4 flanking the aperture.

**Viewport widened to wide-cinematic.** 8.60 m of arc left open → **8.46 m chord × 3.00 m
= 2.82:1**, up from 6.72 × 3.30 = 2.04:1. Deliberately wider than the 2.5:1 brief, because
a curved screen reads narrower than its flat chord measures. Top sits under the vault rim
at 3.22 m; bottom leaves a 0.22 m sill rather than running to the deck. The holdout is now
a curved 48-segment ribbon following the same arc, inset 15 mm so it cannot z-fight the
flanking bays, and the key is three panels spread along the arc, each aimed down its own
local inward normal so the screen wraps light around the helm.

**Measured on the plate** (`measure_alpha.py`): aperture is 1326 × 474 px = 2.80:1,
26.11% of frame fully clear, 0.26% partial (the antialiased rim only), and **one connected
transparent region** — no leak. Transparency that appears split on a scanline is the vault
overhanging the top centre and the helm consoles occluding the bottom; both are foreground
geometry in front of one screen, not second holes.

**Wear and relief pass.** Every module now carries a real Bevel modifier (8 mm world,
2 segments, 32° angle limit), with the width converted through each object's own final
scale because the kit's meshes carry ~4000× coordinates against a 0.00025 parent scale.
In shading, two new masks drive the surface: **pointiness** lifts convex edges toward bare
metal (lighter, smoother) where a hand or shoulder would rub, and a local **AO cavity**
mask darkens and roughens recesses where dust and oil collect. Roughness gained a second,
much larger noise octave (scale 2.3 alongside 26.0) because one octave still reads as an
even sheen across a 12 m wall.

### Findings added this pass

5. **Lamps must not light the haze.** Volume scatter was restored at 0.0035 (down from the
   0.011 that failed in v1) to fix the atmospheric-depth failure, but the key panels sit
   directly behind the aperture and turned the air in front of the screen into a bright fog
   bank — the plate came back as noisy white. Setting `visible_volume_scatter = False` on
   every lamp keeps the volume's *extinction* (distant geometry dims and desaturates, which
   is the depth we wanted) while stopping it from glowing.
6. **The vault cannot be a mirror.** At metallic 0.90 / roughness 0.3 a 15 m ceiling sheet
   at grazing incidence mirrors the key panels and becomes the brightest thing in frame,
   out-competing the viewscreen for the eye. It now carries its own material at metallic
   0.42 / roughness 0.55–0.74 — a painted panel, not polished steel.
7. **Gate the wear mask.** Ungated, the bevelled edges are numerous enough that pointiness
   wear covers most of the surface and walks the palette from `#0a0f16` slate up to bare
   aluminium. Held at 0.55 gain with a duller worn colour.

### Still failing

Atmospheric depth is now partially addressed (extinction only, no visible shafts — godrays
are unavailable while lamps are excluded from the volume). Uniform surface and absent wear
are materially improved but not solved: the relief is all shader-side, over geometry that
still has no modelled panel breaks. That remains the asset-density argument.

---

## bridge-draft-v1 — 2026-08-20

**Status:** DRAFT, awaiting human approval before any final render.

| Setting | Value |
|---|---|
| Engine | Cycles, OptiX GPU (RTX 5060) |
| Resolution | 1920 × 1080 @ 100% |
| Samples | 64, adaptive (threshold 0.01) |
| Denoiser | OpenImageDenoise, RGB+Albedo+Normal |
| Max bounces | 8 |
| View transform | AgX, look "AgX - Base Contrast" |
| Output | 16-bit RGBA PNG |
| Render time | 15.9 s |
| Blender | 5.2.0 LTS (fbe6228777e7) |
| Scene | `bridge_lit.blend` |
| Camera node | `CAM_bridge_01` |

**Camera.** 40 mm on a 36 mm sensor, f/8, focus 7.19 m. Position (0.34, −6.55, 1.72),
aimed at (0, 7.0, 1.34). Eye height 1.72 m, inside the 1.55–1.65 band's intent but raised
slightly so the deck and the captain's position read rather than being cropped.

**Room.** Elongated octagon, 12 m wide × 14 m deep, ceiling 3.8 m, corners cut 1.5 m so no
right angle appears anywhere in the plan. Long axis runs away from camera toward the
viewport. 1 Blender unit = 1 m throughout; the kit's own 0.00025 root scale is compensated
in `place()`.

**Assembly.** 98 modules / 241 meshes, all linked duplicates sharing mesh data.
- Walls: 30 bays of `Reactor_Panels`, uniform scale ×1.178 to reach 3.8 m, with ±6%
  height jitter and a randomised standoff so the colonnade does not read as instanced.
- Shell: the `Hangar` octagon used twice — once as a vault (Z flattened to a 1.0 m rise)
  and once, oversized ×1.34, as the deck plate.
- Stations: 6 on an arc plus a forward helm pair, each kitbashed from a `CrateDefaultCube`
  plinth carrying a `Bridge` hooded wedge at 1.5 m wide.
- Floor: 8 `Catwalk_Floor` grating tiles as a centre runway, cyan-emissive.
- Greebles: 40 `ReactorPart*` / cable pieces on the upper walls at random scales.

**Materials.** Kit albedo is used *only* as an emission mask (gain 8.0) so the painted
white panels become real light sources. Every physical channel comes from Poly Haven CC0
`metal_plate_02`: albedo tinted to `#0a0f16`/`#141a24` via large-scale noise, metallic
0.90, roughness remapped to 0.28–0.44 with a 26-scale noise overlay, normal at 0.38
strength feeding a Bevel node (radius 0.012) so hard kit edges catch a specular line.
All textures are world-space box-projected, which is why the non-uniform shell scaling
does not stretch anything.

**Lighting.** Key is a 6.45 × 2.84 m area light at 780 W sitting just inside the far wall
firing back down the room, hidden from camera — the viewscreen motivates it. Two 1.2 ×
10.5 m wall washes at 260 W rake the colonnade from just under the vault rim. Three
practicals at 55/44/38 W in irregular positions. HDRI `boiler_room_4k` (CC0) at 0.55,
multiplied to a cold cast and switched to near-black for camera rays only.

**Aperture.** 6.72 × 3.30 m holdout plane at y = 6.98, `is_holdout = True`, with shadow,
diffuse, glossy, transmission and volume visibility all disabled so it cuts camera rays
only and does not block the key. Verified: the alpha channel contains exactly one
rectangle, narrowing at the bottom only where the helm consoles legitimately occlude it.

### Findings that changed the pipeline

1. **`film_transparent` must be OFF, not on.** `render-pipeline.md` pairs it with the
   holdout, but they do different jobs. `is_holdout` cuts alpha by itself;
   `film_transparent` additionally makes the *world* transparent, so every hairline gap
   between kit modules punched a second ragged hole under the screen. Off + holdout +
   a camera-ray-black world gives exactly one aperture.
2. **A scene-wide Volume Scatter is incompatible with the alpha aperture.** Composition
   rule 6 wants volumetric shafts from a bright aperture, but the volume also sits between
   camera and holdout, so camera rays scatter before reaching it and the aperture fills
   with lit fog — it rendered opaque white. Haze belongs in the web composite, over the
   video layer, not in the plate.
3. **Area lights emit along local −Z.** Facing −Y needs −90° about X. At +90° the key lit
   the wall behind itself and the room came out black. Cost one full iteration.
4. **The kit's root chain carries a 0.00025 scale.** Object `location` lives in that tiny
   parent space, so subtracting a world-space pivot from it scaled every module by ~40×.
   Fixed by writing `matrix_basis` directly and re-parenting with an identity inverse.

### Visual Acceptance Checklist — judged on the frame

| Item | Verdict |
|---|---|
| Contact shadows ground every object | PASS |
| No uniform surface; highlights break along seams | **FAIL** — metal reads smooth and even |
| Atmospheric depth, far plane hazier | **FAIL** — no haze (removed; see finding 2) |
| Blacks not pure #000 | **FAIL** — upper walls crush to 0 |
| Specular highlights describe geometry | PARTIAL — Bevel node helps; no real bevels exist |
| Wear and grime at touch points | **FAIL** — kit has none, none authored |
| Exactly one moving element | PASS — the viewscreen video |
| No hard right angle in the periphery | PASS — octagonal plan |
| Three planes of depth | PASS — captain's console / stations / aperture |

Four of nine fail. Three of those four trace to the source asset rather than to the
lighting or the camera, and are addressed in the asset assessment below.

### Assets used

- Rejala "Sci-fi Ship interior - Modular asset pack", CC-BY 4.0 — see `docs/credits.md`
- Poly Haven `metal_plate_02` (CC0) — Diffuse, nor_gl, Rough, Metal, AO @ 2K
- Poly Haven `boiler_room` HDRI (CC0) @ 4K
- Poly Haven `blue_metal_plate`, `metal_plate` (CC0) — downloaded, not used in v1
