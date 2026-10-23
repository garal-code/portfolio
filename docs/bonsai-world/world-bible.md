# Bonsai World — World Bible

Scroll-driven Three.js world for the Garal portfolio, built with the `threejs-scroll-worlds` skill.
Status: **Gate 1 draft** (world sentence, topology and story order), pending approval. Camera, material and budget values are starting points to be proven in later gates.
Visual identity: `DESIGN.md` wins over anything here that conflicts with it.

## 1. Intake

| Field | Decision |
|---|---|
| `PURPOSE` | Personal portfolio of a Software & Agent Engineer. |
| `SUBJECT` | One bonsai in a ceramic tray, growing from a seed into a shaped, finished tree. |
| `AUDIENCE` | Recruiters, tech leads and peers. Within 30 seconds they must know who he is, what he does, where he worked and how to contact him. |
| `STORY_BEATS` | 7 chapters (section 4). |
| `WORLD_TOPOLOGY` | Layered reveal around one object: a single continuous diorama, with no cuts and no teleports. |
| `ART_DIRECTION` | **Realistic** (user decision, 2026-10-20): PBR materials, HDRI daylight shifting to lantern-lit dusk, macro lens. References: bonsai tray with moss, rocks, stone stairs and a small pagoda; glass-dome terrarium with a warmly lit pagoda; dark topographic map with thin annotation callouts (used as an annotation layer only, in gold instead of red). |
| `INTERACTION_DEPTH` | Phase 1: scroll plus subtle pointer parallax. Phase 2 (optional): inspect a branch to open job details. |
| `TARGETS` | Evergreen desktop and mobile browsers, portrait and landscape. Honors `prefers-reduced-motion`. Without WebGL, the current static page is shown. |
| `ASSETS` | None owned yet. Free candidates in section 7. |
| `BUDGET` | The skill's default envelopes (section 10). The free asset path costs no money. |

## 2. World sentence

> Descend into a ceramic bonsai tray at macro scale and watch one tree grow from a seed into a shaped, finished bonsai while window daylight turns into lantern-lit dusk.

Interaction contract:

> Scroll controls the camera and the tree's growth time; pointer movement adds a slight parallax, and every fact shown in 3D also exists as readable DOM content.

The metaphor carries the message: a bonsai is shaped deliberately over years. **Wiring** guides the trunk, as SOLID guides design. **Pruning** removes what is not needed, as refactoring does.

## 3. Visual bible

### Scale and shape

| Decision | Value | Reason |
|---|---|---|
| World units | 1 unit = 1 cm | The whole world is a ~60 cm tray; centimeters keep the numbers readable. |
| Tray | ~60 × 40 cm oval, 6 cm deep | Matches the reference proportions. |
| Finished tree | ~45 cm tall, trunk base ~4 cm diameter | Classic informal-upright (moyogi) bonsai. |
| Story scale | Pagoda ~12 cm tall, stair step 1 cm | Implies a miniature world without a literal human figure. |
| Origin | Soil surface at the tree base = `(0, 0, 0)`, Y up | Every chapter is anchored to the tree. |

### Palette roles

The DOM keeps the `DESIGN.md` tokens unchanged. The 3D world uses the same hue families, plus natural greens that realism requires.

| Role | Value | Use |
|---|---|---|
| World dark | `{colors.forest-deep}` #0b2620 | Dusk shadows and the final background. |
| Foliage dark | `{colors.forest}` #123a2f | Inner foliage and shadowed pads. |
| Foliage mid / moss | ~#4a7a45 → #7fa05a (tuned at Gate 3) | Lit foliage and moss. 3D only, never DOM text. |
| Ceramic and stone | `{colors.cream}` #f4f1ea, `{colors.sand}` #e6e1d6 | Tray glaze, stairs and pale rocks. |
| Warm practical | `{colors.gold}` ≈ #f3b94c | Lanterns, pagoda windows and annotation lines. |
| Story accent | `{colors.gold}` | The single accent, same rule as the DOM. |

Vermilion is allowed for traditional architecture in the world (pagoda, torii), as part of the aesthetic the user chose for the rendered video (2026-10-22). It stays in the background imagery: the UI accent is still gold only. Forbidden: purple, neon.

**Color arc:** chapters 1–4 use soft daylight (neutral, slightly cool), chapter 5 golden hour, and chapters 6–7 dusk lit by gold practicals.

**The setting sun** (added 2026-10-21) drives the color arc. A visible sun descends on the right side of the sky, opposite the copy column, from high and white-warm in chapters 1–3, through low gold in `pruning`, to touching the horizon in `pagoda` and just below it in `finished`, leaving a gold-to-forest afterglow. The sun disc, the sky gradient, the key light direction, its color and its shadows are one system driven by the same scroll value, so light always comes from where the sun is. The sun is gold (`{colors.gold}` family) at its lowest, never red or vermilion. The background is a procedural sky dome with a distant low silhouette line instead of an interior window, so the sun can be seen; the HDRI only provides reflections.

### Lens and composition

- Macro character: FOV 28–40° on desktop, 40–50° on mobile; low horizon.
- Tree trunk axis slightly off-center, opposite the copy column.
- Copy safe zone: left 40% on desktop, bottom 45% on mobile.
- Depth of field: post-processed bokeh, desktop tier only.
- Camera roll ≤ 1°; pointer parallax ≤ 0.4° rotation.

### Motion

| Layer | Range | Timing |
|---|---|---|
| Camera damping | 5.0–6.5 | Exponential damping constant |
| Pointer parallax | 0.1–0.4° | Immediate target, damped render |
| Foliage sway | 0.5–2° | 0.1–0.2 Hz, phase varies by pad |
| Floating dust in window light | 0.02–0.06 units/s | Seeded |
| Growth | Driven only by scroll | Fully reversible; no time-based growth |
| Word reveal | 40–90 ms per word | Once per chapter |

## 4. Chapter ledger

Copy comes from `src/data/resume.ts`; no new facts are invented.

| # | `id` | Beat | Landmark | Change from the previous chapter | Copy source | Weight |
|---|---|---|---|---|---|---|
| 1 | `seed` | Who he is | Empty tray, soil, one seed in window light | Opening state | `personalInfo.name`, `bio`, `interests` | 1.2 |
| 2 | `sprout` | Where it started | Sprout breaking the soil | First growth; camera lowers to soil level | `education` | 1.0 |
| 3 | `trunk` | The fundamentals | Trunk thickens; copper wire spirals around it in 5 turns (S, O, L, I, D) | Vertical growth; wire draws on | `skills`, `personalInfo.summary` | 1.4 |
| 4 | `branches` | The career | Four branches grow bottom-up in chronological order, each with a gold annotation callout | Camera rises along the trunk, one stop per branch | `jobs` (GMV 2018–21 · Futurespace 2021–22 · Scalian 2022–25 · Santander 2025–today) | 2.4 |
| 5 | `pruning` | How he works | Excess twigs are cut and fall; foliage pads condense into clean shapes | First subtraction; golden-hour light | `personalInfo.highlights` (Clean Code, doing things right) | 1.2 |
| 6 | `pagoda` | What he builds on his own | The pagoda beside the tree lights up; lanterns along the stairs turn on | Dusk; camera moves to the pagoda | `project` (Tu Cartera) | 1.2 |
| 7 | `finished` | Let's talk | Camera pulls back: the finished bonsai on a windowsill at dusk | Full reveal of the world | Contact links (contact band) | 1.0 |

Each annotation in chapter 4 mirrors a DOM list item, so the career is readable without WebGL.

## Video background (S9)

The page background is the user's Blender render, scrubbed by scroll, instead of the real-time world (L17, L21). Sections 5 to 8 describe the Three.js world and are **superseded by the video for `/bonsai`**; they stay for reference. Chapters, copy, cards, the 40% left copy column and the mobile bottom cards are unchanged.

**Asset.** `public/bonsai/video/bonsai-1080p.mp4`: the final Blender render (2026-10-22, Cycles, 64 samples), 1920x1080, 30 fps, 20.0 s, 600 frames, H.264 CRF 30, a keyframe every 10 frames, no audio, 8.6 MB. `poster.jpg` is frame 0 at 1280 px wide. It replaced the 720p preview. The path lives in one constant, `VIDEO_SRC` in `src/lib/bonsai/video.ts`. Seeking needs byte-range responses (`206`) from the host.

**Chapter to video time.** The mapping uses real scroll pixels, not weight-space progress, because scroll is `scrollY / (documentHeight - viewportHeight)` and the mobile first section carries an extra screen of spacer. The client measures, from the DOM, the `scrollY` at which each chapter section and each career card (`data-branch-stop`) is centred in the viewport, clamped to `[0, maxScroll]`. A pure function (`createVideoTimeMap` in `video.ts`) interpolates piecewise-linearly between those positions and the video times below: scrollTop 0 is 0 s, `maxScroll` is the last frame (19.97 s), and one scroll position always gives one time, forward or backward. It re-measures on resize (ignoring the touch URL-bar resize), on `load`, when fonts are ready, and through a `ResizeObserver` on `<main>`.

| Chapter | Video time | What the video shows |
|---|---|---|
| `seed` | 0.8 s | The seed (seed phase 0 to 1.5 s) |
| `sprout` | 2.2 s | First sprout |
| `trunk` | 4.4 s | Young tree with the pagoda, wire on the trunk (trunk grows 1.0 to 9.8 s) |
| `branches` 1 / 2 / 3 / 4 | 6.4 / 7.5 / 8.6 / 9.6 s | One stop per job, oldest first, at the middle of its slice; the 6 video branches start growing at 4.5, 5.1, 5.5, 5.9, 6.5 and 7.2 s and finish by 10.6 s |
| `branches` (middle) | 8.05 s | Between stops 2 and 3 |
| `pruning` | 12.8 s | Torii at golden hour (12 to 14 s) |
| `pagoda` | 15.6 s | Lit pagoda at sunset (lights ramp 14.6 to 16 s) |
| `finished` | 19.97 s | Lanterns (~17 s) into night (~19 s). It is the last section, so centring it is `maxScroll`: it holds the last frame |

The branch stop times come from the Blender scene: `BRANCH_DEFS` start times are `time_when_front(u0 + 0.035)` on the trunk front `T_TRUNK0..T_TRUNK1` = 1.0 to 9.8 s, each branch grows for 3.4 s, and the four stops are spread through that growth so a new job reads as a new branch.

**Scrubbing rules** (`scrub.ts`, `video-mount.ts`).
- The video never plays. Scroll sets a target time; a frame loop moves the video to it. A move over 0.75 s (a fast jump such as `finished` to `pagoda`) is one seek straight to the target; a smaller move is eased (damping 14 per second, settles in ~300 ms).
- At most one seek is in flight (`seeking` blocks the next one; `seeked` wakes the loop), and a seek smaller than half a frame (1/60 s) is skipped.
- The loop sleeps when the video has settled (`loop.ts`), and pauses while the tab is hidden.
- `video.load()` runs on mount. The first pointer or touch does one muted `play()` followed at once by `pause()` to unlock seeking on iOS Safari. Nothing else calls `play()`.
- Reloading at depth snaps to the exact time instead of travelling from 0.
- Framing: `object-fit: cover`; `object-position` 62% 50% on desktop and 60% 50% below 768px (the tree sits at ~0.58 of the frame width in the branches phase), so the right and centre (the tree) stay in view. A forest-deep gradient scrim sits behind the copy column (left on desktop, bottom on mobile); cards are cream at 92% to 95% with a backdrop blur, and body, forest and ink text keep 4.5:1 even over a black frame.

**Reduced motion and fallback.**
- `prefers-reduced-motion: reduce`: no damping and no continuous scrubbing. The video jumps to the anchor time of the active chapter (active once its section top crosses the viewport centre), so each chapter shows one still.
- The poster is the background of the container, so it shows until the first frame is decoded (`loadeddata`) and stays if the video errors, cannot load, or JavaScript is off. The scrubber never throws; errors only leave the poster on screen.

## 5. Camera ledger (Gate 2 corrections: pulled back, S6) — superseded by the video, kept for reference

The Gate 2 graybox sat too close to its subject in every chapter. Every camera is now 1.3x to 2.7x further from its target (desktop and mobile), and the table below is the new set of endpoints. Pull-back per chapter: `seed` and `sprout` 1.35x; `branches` 1.4x to 1.8x (1.4x extra on mobile); `pagoda` 1.6x desktop, 1.35x mobile (top tier in frame); `trunk` 2.7x desktop, 2.6x mobile (the whole trunk and its wire in frame, target raised to y 22); `pruning` 2.5x desktop, 3.1x mobile (the crown); `finished` 1.35x desktop, 1.45x mobile (the whole tree in frame).

| Chapter | Position | Target | FOV | Mobile override | Failure risk |
|---|---|---|---:|---|---|
| `seed` | `[0, 8, 30]` | `[0, 0.5, 0]` | 35 | `[0, 12, 40]`, 46 | Seed too small to read |
| `sprout` | `[-10, 5.5, 22]` | `[0, 3, 0]` | 34 | `[-8, 9.5, 32]`, 46 | Near-plane clipping on moss |
| `trunk` | `[28, 32, 64]` | `[0, 22, 0]` | 36 | `[22, 30, 87]`, 50 | Wire hidden behind trunk |
| `branches` | 4 sub-stops: `[-48, 24, 57.6]`, `[-9, 27, 60]`, `[-10.8, 28, 72]`, `[-8.4, 29.6, 56]` | `[0, 8 → 38, 0]` | 38 | `[-67.2, 30.4, 80.6]`, `[-12.6, 30.6, 84]`, `[-15.1, 28, 100.8]`, `[-11.8, 26.2, 78.4]`, 46 | Callouts overlap foliage; the first branch points at the camera |
| `pruning` | `[35, 40, 75]` | `[0, 32, 0]` | 34 | `[31, 50, 130]`, 46 | Falling twigs read as glitches |
| `pagoda` | `[-24, 12, 42.5]` | `[-14, 7, 0]` | 32 | `[-19.5, 11, 49]`, 44 | Pagoda off-frame on tall screens |
| `finished` | `[0, 34, 128]` | `[0, 18, 0]` | 32 | `[0, 41, 188]`, 42 | Empty space on wide screens |

Gate 2 values, for reference: `seed` `[0, 6, 22]`, `sprout` `[-8, 4, 16]`, `trunk` `[10, 14, 24]` to `[0, 12, 0]`, `branches` `[-6, 20 → 32, 40]`, `pruning` `[14, 34, 30]`, `pagoda` `[-20, 8, 26]` to `[-14, 5, 0]`, `finished` `[0, 30, 95]`.

Composition: the renderer shifts the lens (`setViewOffset`) so each target is drawn inside the copy-free area, at 66% of the width on desktop (the copy owns the left 40%) and at 27.5% of the height on mobile (the copy owns the bottom 45%). The fit tests check each landmark against that area at 1440x900 and 390x844.

Path: Catmull-Rom position and target curves between endpoints, with FOV interpolated per segment. A clearance guard keeps the damped camera at least 8 units from the trunk, branches and foliage after fast jumps. A debug route draws the path, frustums and chapter labels.

## 6. Growth technique (the core risk) — superseded by the video, kept for reference

Static bonsai models cannot grow, so the tree is **generated in code once** (seeded) as the final shape, and scroll reveals it:

- Each branch segment carries `aBirth` and `aDeath` (0–1 growth time) and `aBranchId`.
- The vertex shader scales each segment from its parent attachment point by `smoothstep(aBirth, aBirth + span, uGrowth)`. Leaf pads fade and scale in by their own birth time.
- Pruned twigs have `aDeath < 1`. They shrink away, and an instanced falling-twig particle plays at that moment.
- The wire is a tube geometry along the trunk curve, drawn by a draw range across the trunk window and held through the branches. During `pruning` it unwinds in reverse, from the top down, and is fully gone at growth 1; reverse scroll puts it back.
- `uGrowth` derives from exact scroll progress, so growth is fully reversible and identical after a reload.

The generator is decided by a spike at Gate 2:

- **`@dgreenheck/ez-tree`**: an existing Three.js generator with bark and leaf textures, levels, taper, gnarliness and wind. It has no per-branch birth attribute and no bonsai preset, so it would need a fork or post-processing of its geometry. License still to be verified.
- **Custom generator**: full control over the bonsai silhouette (moyogi curve, foliage pads) and the growth attributes. More code to write.

## 7. Material, texture and asset ledger — superseded by the video, kept for reference

Assets in use (Gate 3, downloaded 2026-10-21). Every file is listed with author, license and source in `public/bonsai/CREDITS.md`. Total: 4.5 MB.

| Asset | Source | License | Treatment |
|---|---|---|---|
| Bark (trunk and branches) | Poly Haven `japanese_zelkova_bark` | CC0 | 1K diffuse, normal and roughness as re-encoded JPEG; UV repeat follows limb radius (`surfaces.ts`) |
| Soil and moss clumps | Poly Haven `forrest_ground_01` | CC0 | 1K diffuse, 512 normal and roughness; the moss clumps reuse it with a green tint and world-space UVs |
| Mossy rocks | Poly Haven `rock_moss_set_01` (glTF 1K) | CC0 | Unmodified model; its roughness map also textures the stone platform, stairs and lanterns (its normal map does not, because it tilted box faces toward the sky) |
| Pagoda roof | Poly Haven `grey_roof_tiles_02` | CC0 | 512 maps. `ceramic_roof_01` was rejected because its terracotta red breaks the palette |
| Reflections | Poly Haven `belfast_sunset_puresky` (1K HDR) | CC0 | `scene.environment` only, never the background |
| Foliage | Procedural leaf clusters | n/a | Natural greens from §3 |
| Ceramic tray | Procedural lathe geometry | n/a | Cream glaze, roughness 0.35, clearcoat 0.6 |
| Windowsill | Procedural box | n/a | Warm light oak `#c9b48e`, roughness 0.85 |
| Pagoda walls and lanterns | Procedural | n/a | Plaster and stone; windows emissive gold |
| Wire | Procedural tube | n/a | Copper, metalness 1, roughness ~0.4 |
| Shape references only | Polyy.AI bonsai pack, Grab3D bonsai (both CC0) | CC0 | Not used in the scene, because they cannot grow |

KTX2 and Draco compression are deferred to T6, because no encoder is installed.

Color space: color and emissive maps in sRGB; normal, roughness and AO maps linear.

## 8. Lighting and atmosphere ledger — superseded by the video, kept for reference

| System | Chapters | Intensity | Shadow | Purpose | Fallback |
|---|---|---|---|---|---|
| Sun key light (directional, aligned with the visible sun) | all | 2.4 → 0.6 (fades at dusk); color `#fff1de` → `#eeae3c` | 2048 desktop, 1024 mobile, tight frustum around the tray; light elevation never below 6°, so it does not graze the tray | Form, time of day, backlight at golden hour | Baked gradient |
| Sun disc and sky dome | all | Disc radius 2.2° plus soft glow; zenith, horizon and ground colors per chapter (`chapters.ts`) | none | The visible setting sun, over soft hill silhouettes | Static gradient |
| Hemisphere fill | all | 0.65–0.7; sky color is the zenith pulled 85% toward the warm horizon | none | Shade fill without a lilac cast | — |
| HDRI environment | all | 0.07 → 0.19, following key intensity | none | Reflections on glaze and wire | Hemisphere light |
| Lanterns and pagoda windows | 6–7 | Windows emissive 2.2; point glows 20 | none | Dusk warmth in gold | Emissive plus glow sprite |
| Tone mapping | all | ACES Filmic, exposure 1.05 | n/a | Palette reads under HDR | — |
| Bloom | all, grows at dusk | Desktop only; threshold 1.25, radius 0.55, strength 0.16 → 0.5 | n/a | Sun disc and lantern glow, without washing out the walls | Off on mobile |

Sun path per chapter (azimuth in degrees from −z toward +x, elevation in degrees): `seed` 22 / 62, `sprout` 20 / 58, `trunk` 15 / 48, `branches` 4 / 24, `pruning` −14 / 2.5, `pagoda` 8 / 0.8, `finished` 7 / −3.5. Azimuth is tuned per camera so the disc lands on the right of the frame; tests in `tests/bonsai/sun.test.ts` enforce it.

Measured on a desktop GPU at 1440×900 (Gate 3): 60 fps, 92–106 draw calls, ~178k triangles, 31 textures. At 390×844: 60 fps, 82–92 draw calls, 137k–165k triangles, 19 textures. Mobile `finished` is 2 calls over the 90 budget; T6 handles it, and a real-device check is still pending.

## 9. Interaction matrix

| Id | Object | Chapters | Feedback | Activation | DOM proxy |
|---|---|---|---|---|---|
| `branch-note` (phase 2) | Each career branch | 4 | Callout brightens, rim light +10% | Opens job details | Matching `<button>` in the chapter's DOM list |

Phase 1 ships scroll and parallax only.

## 10. Asset loading and performance budget

| Group | Content | Target size (mobile) | Prefetch at |
|---|---|---:|---|
| critical | Tray, soil, seed, 1K HDRI, bark, generator code | ≤ 4 MB | page load |
| growth | Foliage atlas, moss, rocks | ≤ 6 MB | progress 0.1 |
| dusk | Pagoda, lanterns, stairs | ≤ 5 MB | progress 0.55 |

```yaml
minimum_device: iPhone 12 class / integrated laptop GPU
target_fps: 60
fallback_fps: 40
critical_transfer_mobile_mb: 4
total_transfer_mobile_mb: 15
dpr_mobile: 1.35
dpr_desktop: 1.75
visible_triangles_mobile: 240000
visible_triangles_desktop: 850000
draw_calls_mobile: 75
draw_calls_desktop: 135
shadowed_lights_mobile: 1
shadowed_lights_desktop: 2
```

Realism tiers: desktop gets depth of field, bloom, haze and 2K hero textures. Mobile keeps **the same composition and landmarks** with lower DPR, 1K textures, a lighter foliage level of detail, and no depth of field.

Quality cuts, in order: DPR, then depth of field and haze, then shadow resolution, then foliage level of detail, then texture tier.

## 11. Accessibility and fallback

- All content stays semantic DOM fed by `resume.ts`; the canvas is decorative (`aria-hidden`).
- With `prefers-reduced-motion`, there is no camera travel: each chapter shows its final still, with crossfades only.
- Without WebGL, or on load failure, the current static design (Hero, Journey, Footer) renders as is.
- Contact and links are always reachable without scrolling through the whole world (fixed nav).

## 12. Integration notes (Astro)

- Three.js as an npm dependency, pinned together with its loaders (KTX2, Draco/Meshopt).
- One client-side island owns the renderer, the scroll conductor (`.agents/skills/threejs-scroll-worlds/references/scroll-conductor.js`) and teardown.
- Chapter data lives in one module (camera, world state, copy keys) shared by the DOM and the renderer.

## 13. Open decisions and risks

1. **Generator**: ez-tree fork or custom generator (Gate 2 spike).
2. **Pagoda source**: a CC0 model with an acceptable license and quality, or a simple custom model.
3. **Realism on mobile**: proven at Gate 6 on a real device; if it fails the budget, mobile drops a tier before losing landmarks.
4. **Differentiation from the Kage demo**: day-to-night over a lake with a growing bonsai as the protagonist, instead of a night temple; vermilion appears only on the architecture.
5. **Chapter copy**: short Spanish copy per chapter, written from `resume.ts`.

## 14. Approval gates

| # | Gate | Status |
|---|---|---|
| 1 | World sentence, topology and story order | **Pending review** |
| 2 | Graybox silhouettes, every camera endpoint, generator spike | Not started |
| 3 | One finished material and lighting slice (trunk chapter) proving realism | Not started |
| 4 | Chapter 1 → 2 transition, including reverse scroll | Not started |
| 5 | Interaction prototype with DOM proxy (phase 2) | Not started |
| 6 | Mobile composition and performance tier on a real device | Not started |
| 7 | Complete journey before final polish | Not started |
