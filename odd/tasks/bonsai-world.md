# Bonsai World

Realistic Three.js scroll world for the Garal portfolio: a bonsai that grows and is shaped as the visitor scrolls.
Design source: `docs/bonsai-world/world-bible.md` (Gate 1 approved) and `DESIGN.md`. Branch: `feat/bonsai-world`.
Current phase: Gate 2 (graybox, camera endpoints, growth generator).

## Specs

- **S1 — Growing bonsai.** "un bonsai, crece se le da forma hasta que el resultado final es un bonito bonsai, de color verde me parece que encaja". Growth is driven by scroll and is reversible (world bible §6).
- **S2 — Realistic art direction.** "vamos con la realista" (world bible §3, §7, §8).
- **S3 — Approved scene order.** "dale vamos a ver que sale me convence el orden de las escenas". The 7 chapters of world bible §4, in that order: `seed`, `sprout`, `trunk`, `branches`, `pruning`, `pagoda`, `finished`.
- **S4 — Three.js scroll world.** "la dos me parece bien" (option 2: `threejs-scroll-worlds`, a real-time Three.js world, not pre-rendered video).
- **S6 — Camera further away.** "lo que yo me he dado cuenta sobre todo es que esta como muy cerca en todo momento me gustaria alejarlo un poco". Every chapter's camera sits further from its subject than in Gate 2.
- **S7 — Richer card content (deferred).** "el contenido en tarjetas se me queda como corto nose siento que le falta algo, pero bueno eso se puede añadir despues no?"
- **S8 — Setting sun.** "pense ayer que estaria bien tener un sol que baja tambien en un lado algo que quede bonito que vaya en conjunto con la luz". A visible sun descends on one side as the visitor scrolls, and the scene lighting follows it (world bible §3 color arc, §8).
- **S5 — Eye-catching.** "quiero una porfolio que llame la atencion y el que tengo no lo hace yo creo. Busco scroll-world o algo similar algo que llame la atencion".

## Tasks

| ID | Task | Specs | Route | Commit |
|---|---|---|---|---|
| T1 ✅ | Commit approved design docs (DESIGN.md, world bible, this file) | S3 | inline | `4575e6f` (docs slice, own commit) |
| T2 ✅ | Graybox `/bonsai` route: Three.js island, scroll conductor, 7-chapter data with camera endpoints, primitive tray/soil/rocks/stairs/pagoda, debug path overlay | S3, S4 | worker | `87ea404` (deps, own commit: risk item 5), `33dcec5`, `e6e25e2` |
| T3 ✅ | Growth generator: seeded procedural bonsai with per-segment birth/death driven by scroll (`uGrowth`), wire and pruning; generator decision recorded | S1 | worker (with T2) | `936f168` |
| T4 ✅ | Gate 2 review: per-chapter screenshots (desktop + mobile), forward and reverse scroll; user approval | S1, S3 | inline + verify | approved in L14 |
| T4a ✅ | Gate 2 corrections: pull every camera back (S6) plus the 9 approved fixes (L8 findings 1–6, L10 advisories 1–3) | S1, S3, S6 | worker | `04733cc`, `7b890e2` |
| T8 | Richer chapter card content | S7 | pending (after T5) | — |
| T5 ✅ | Gate 3: realistic materials (PBR bark, moss, rocks, ceramic, soil) proven on the trunk chapter, plus the setting-sun lighting system across all chapters | S2, S5, S8 | worker, then parent | `0eea529`, `f8c959f` (Gate 3 user approval pending) |
| T6 | Gates 4–6: transitions, mobile tier and performance budget | S2, S4 | pending | — |
| T7 | Integrate into home with semantic DOM content, reduced-motion and no-WebGL fallback | S3, S5 | pending | — |

## Log

- **L1** (user, original request): "estoy buscando un nuevo estilo si me parece muy basico pero dado que yo no soy una persona muy buena en el diseño busco apoyarme en skill que aporten ese pluss quiero una porfolio que llame la atencion y el que tengo no lo hace yo creo. Busco scroll-world o algo similar algo que llame la atencion"
- **L2** (user): "la dos me parece bien por ahora tenemos que buscar tematica del fondo"
- **L3** (user): "He tenido una idea que creo que me gusta un bonsai, crece se le da forma hasta que el resultado final es un bonito bonsai, de color verde me parece que encaja" (references: bonsai tray, glass-dome terrarium with pagoda, dark topographic map with annotations)
- **L4** (user): "vamos con la realista" (chosen over the recommended stylized direction)
- **L5** (user): "dale vamos a ver que sale me convence el orden de las escenas" (Gate 1 approved; start Gate 2)
- **L6** (decision): Growth generator is custom, not `@dgreenheck/ez-tree` (MIT 1.1.0). ez-tree has no per-branch growth data and no bonsai preset; growth needs per-segment birth/death attributes that a custom generator emits directly. ez-tree stays a reference for bark and leaf handling.
- **L8** (evidence, Gate 2): `node --test tests/bonsai/` 23/23 pass (re-run by parent). Screenshots of all 7 chapters at 1440×900 and 390×844 in `.playwright-mcp/bonsai-g2/` (ignored). Growth, wire, 4 branches in order and dusk pagoda render. Findings: (1) mobile chapter cards cover most of the 3D; (2) `trunk` camera too close, segment seams visible; (3) `finished` desktop crops the tree top; (4) the seed reads as a pebble; (5) the wire stays on the finished tree; (6) fast jumps make the damped camera pass close to the trunk. Native review assess unavailable: untracked skill folders block it. Independent verify launched for risk item 5 (new dependency).
- **L10** (evidence, independent verify): No blockers. S1 pass, S3 pass, S4 pass (structural; shader rendering confirmed by parent screenshots). Lock adds 8 packages from registry.npmjs.org with integrity hashes and no install scripts: three (MIT) plus 7 dev-only packages via @types/three. Scope clean, home untouched. Typecheck unavailable (no tsc or @astrojs/check installed). Advisories: career order has two sources (`bonsai.astro` reverses `jobs`, the generator sorts by `startDate`); the idle loop never sleeps; no guard for zero-height resize. Added the verifier's GPU-layer regression tests (`tests/bonsai/reversibility.test.ts`): 27/27 pass.
- **L11** (user, Gate 2 feedback): "Si lo que yo me he dado cuenta sobre todo es que esta como muy cerca en todo momento me gustaria alejarlo un poco. Si aplica tus nueve cambios
Ademas el contenido en tarjetas se me queda como corto nose siento que le falta algo, pero bueno eso se puede añadir despues no?"
- **L12** (evidence, T4a): 57/57 tests pass, and each commit passes its own tests in a detached worktree (47/47 at `04733cc`, 57/57 at `7b890e2`). Cameras sit 1.3–2.7× further away. Screenshots in `.playwright-mcp/bonsai-t4a/` show the whole tree in `finished`, a seed that reads as a seed, closed trunk seams and compact mobile cards. Remaining: on mobile the longest branch's tip is partly clipped in `branches` 1; tablet widths (768–1024px) reuse the desktop poses; the debug overlay draws the unguarded path. Finding: `Layout.astro`'s `<main class="overflow-hidden">` disables `position: sticky`. It is overridden only on `/bonsai`; T7 must fix it in the Layout. Incident: a pathspec `git stash --include-untracked` stashed the whole uncommitted T4a work. Files were restored from the stash one by one and checked identical before dropping it. Lesson: commit in slices with `git add` plus a detached worktree check, never a partial stash.
- **L13** (user, 2026-10-21): "me quedo sin token asi que no va a dar crea las PR por ahora y ya". Pushed `feat/bonsai-world` and opened draft PR #4 against `main`, because `develop` no longer exists on the remote. Used `gh`, since no GitHub MCP is available in this environment. Gate 2 approval is still pending; next is T4 approval, then T5.
- **L14** (user, 2026-10-21): "ya se ne han reiniciado los creaditos sigue con la implementacion, pero pense ayer que estaria bien tener un sol que baja tambien en un lado algo que quede bonito que vaya en conjunto con la luz". Taken as Gate 2 approval. S8 added and folded into T5, because the sun is the key light.
- **L15** (decision): The sun sets on the right side, opposite the copy column, behind the tree, so `pruning` gets a golden-hour backlight and `finished` a gold afterglow. The background becomes a procedural sky dome with a distant silhouette line instead of an interior window, so the sun is visible; the HDRI stays only for reflections.
- **L16** (evidence, T5): The worker timed out twice, both times stalling on slow software-GL screenshot scripts. It is not relaunched a third time. The parent finished inline: fixed a lilac cast (warmer hemisphere fill), the sill color (warm light oak), the blown-out pagoda (glows 40→20, bloom threshold 1.05→1.25) and lilac stripes on the stone platform (the rock atlas normal map does not fit box UVs, so stone uses roughness only). Updated world bible §7 and §8 and the CREDITS note. 71/71 tests pass; each commit passes on its own (67 at `0eea529`, 71 at `f8c959f`). Assets total 4.5 MB, all Poly Haven CC0. Perf on this Mac's GPU: desktop 60 fps, 92–106 calls, ~178k tris; mobile 60 fps, 82–92 calls, 137k–165k tris. Mobile `finished` is 2 calls over budget (T6). The long-lived Playwright MCP browser hung twice after many navigations; a fresh browser loaded the page 3/3 times with a 19 ms worst frame, so this is not reproducible in the page. It is still to watch on a real device (T6).
- **L9** (delivery): The branch holds 5 reviewable commits (~2.9k authored lines). Opening the PR(s) and how to split them stays the user's decision.
- **L7** (decision): Graybox ships on a separate `/bonsai` route so the current home stays untouched until T7. Tests use the built-in `node --test` runner (Node 26 strips TypeScript natively), so no test dependency is added.
