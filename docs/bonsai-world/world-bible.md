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

Forbidden: red or vermilion (the skill's Kage demo owns that look), purple, neon.

**Color arc:** chapters 1–4 use soft window daylight (neutral, slightly cool), chapter 5 golden hour, and chapters 6–7 dusk lit by gold practicals.

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

## 5. Camera ledger (Gate 2 corrections: pulled back, S6)

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

## 6. Growth technique (the core risk)

Static bonsai models cannot grow, so the tree is **generated in code once** (seeded) as the final shape, and scroll reveals it:

- Each branch segment carries `aBirth` and `aDeath` (0–1 growth time) and `aBranchId`.
- The vertex shader scales each segment from its parent attachment point by `smoothstep(aBirth, aBirth + span, uGrowth)`. Leaf pads fade and scale in by their own birth time.
- Pruned twigs have `aDeath < 1`. They shrink away, and an instanced falling-twig particle plays at that moment.
- The wire is a tube geometry along the trunk curve, drawn by a draw range across the trunk window and held through the branches. During `pruning` it unwinds in reverse, from the top down, and is fully gone at growth 1; reverse scroll puts it back.
- `uGrowth` derives from exact scroll progress, so growth is fully reversible and identical after a reload.

The generator is decided by a spike at Gate 2:

- **`@dgreenheck/ez-tree`**: an existing Three.js generator with bark and leaf textures, levels, taper, gnarliness and wind. It has no per-branch birth attribute and no bonsai preset, so it would need a fork or post-processing of its geometry. License still to be verified.
- **Custom generator**: full control over the bonsai silhouette (moyogi curve, foliage pads) and the growth attributes. More code to write.

## 7. Material, texture and asset ledger

Every source below is free. Licenses must be confirmed again at download time.

| Asset | Source (candidate) | License | Treatment |
|---|---|---|---|
| Bark | Poly Haven / ambientCG bark sets, or ez-tree bark (1K color, normal, roughness) | CC0 (ez-tree: to verify) | 1K atlas, KTX2 |
| Moss and mossy rocks | Poly Haven `mossy_rock` texture, `rock_moss_set_01` model | CC0 | Decimate the 34 MB source, Draco/Meshopt, KTX2 1K |
| Foliage | Leaf-card alpha atlas (ez-tree or Poly Haven) | CC0 / to verify | 1K atlas, alphaTest 0.4–0.5, 3 hue clusters |
| Ceramic tray | Procedural lathe geometry | n/a | Cream glaze, roughness ~0.35, clearcoat |
| Soil and stairs | Procedural plus Poly Haven ground texture | CC0 | Shared tiling material |
| Pagoda and lanterns | To source (CC0 GLB) or model simply | to verify | Dark tiled roof; windows and lanterns emissive gold |
| Wire | Procedural tube | n/a | Copper, metalness 1, roughness ~0.4 |
| Lighting environment | Poly Haven interior HDRI with a window | CC0 | 1K for lighting, blurred plate for the background |
| Shape references only | Polyy.AI bonsai pack (CC0, ~54k tris, 25 styles), Grab3D bonsai (CC0, 11k tris) | CC0 | Not used in the scene, because they cannot grow |

Color space: color and emissive maps in sRGB; normal, roughness and AO maps linear.

## 8. Lighting and atmosphere ledger

| System | Chapters | Intensity | Shadow | Purpose | Fallback |
|---|---|---|---|---|---|
| Window key light (directional) | all | 2.4 → 0.6 (fades at dusk) | 2048 desktop, 1024 mobile, tight frustum around the tray | Form and time of day | Baked gradient |
| HDRI environment | all | 0.5 → 0.25 | none | Reflections on glaze and wire | Hemisphere light |
| Lanterns and pagoda windows | 6–7 | Emissive ~1.8 plus 2–3 small point lights | none | Dusk warmth in gold | Emissive plus glow sprite |
| Haze / dust in the light shaft | 1–5 | Low density | n/a | Depth and atmosphere | Off on the low tier |
| Bloom | 6–7 | Restrained, only on gold emissives | n/a | Lantern glow | Off on the low tier |

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
4. **Differentiation from the Kage demo**: daylight-to-dusk instead of night, a growing tree instead of a temple, gold instead of vermilion.
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
