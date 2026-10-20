# Bonsai World

Realistic Three.js scroll world for the Garal portfolio: a bonsai that grows and is shaped as the visitor scrolls.
Design source: `docs/bonsai-world/world-bible.md` (Gate 1 approved) and `DESIGN.md`. Branch: `feat/bonsai-world`.
Current phase: Gate 2 (graybox, camera endpoints, growth generator).

## Specs

- **S1 — Growing bonsai.** "un bonsai, crece se le da forma hasta que el resultado final es un bonito bonsai, de color verde me parece que encaja". Growth is driven by scroll and is reversible (world bible §6).
- **S2 — Realistic art direction.** "vamos con la realista" (world bible §3, §7, §8).
- **S3 — Approved scene order.** "dale vamos a ver que sale me convence el orden de las escenas". The 7 chapters of world bible §4, in that order: `seed`, `sprout`, `trunk`, `branches`, `pruning`, `pagoda`, `finished`.
- **S4 — Three.js scroll world.** "la dos me parece bien" (option 2: `threejs-scroll-worlds`, a real-time Three.js world, not pre-rendered video).
- **S5 — Eye-catching.** "quiero una porfolio que llame la atencion y el que tengo no lo hace yo creo. Busco scroll-world o algo similar algo que llame la atencion".

## Tasks

| ID | Task | Specs | Route | Commit |
|---|---|---|---|---|
| T1 | Commit approved design docs (DESIGN.md, world bible, this file) | S3 | inline | — |
| T2 | Graybox `/bonsai` route: Three.js island, scroll conductor, 7-chapter data with camera endpoints, primitive tray/soil/rocks/stairs/pagoda, debug path overlay | S3, S4 | worker | — |
| T3 | Growth generator: seeded procedural bonsai with per-segment birth/death driven by scroll (`uGrowth`), wire and pruning; generator decision recorded | S1 | worker (with T2) | — |
| T4 | Gate 2 review: per-chapter screenshots (desktop + mobile), forward and reverse scroll; user approval | S1, S3 | inline + verify | — |
| T5 | Gate 3: material and lighting slice on the trunk chapter (PBR bark, moss, HDRI) | S2, S5 | pending | — |
| T6 | Gates 4–6: transitions, mobile tier and performance budget | S2, S4 | pending | — |
| T7 | Integrate into home with semantic DOM content, reduced-motion and no-WebGL fallback | S3, S5 | pending | — |

## Log

- **L1** (user, original request): "estoy buscando un nuevo estilo si me parece muy basico pero dado que yo no soy una persona muy buena en el diseño busco apoyarme en skill que aporten ese pluss quiero una porfolio que llame la atencion y el que tengo no lo hace yo creo. Busco scroll-world o algo similar algo que llame la atencion"
- **L2** (user): "la dos me parece bien por ahora tenemos que buscar tematica del fondo"
- **L3** (user): "He tenido una idea que creo que me gusta un bonsai, crece se le da forma hasta que el resultado final es un bonito bonsai, de color verde me parece que encaja" (references: bonsai tray, glass-dome terrarium with pagoda, dark topographic map with annotations)
- **L4** (user): "vamos con la realista" (chosen over the recommended stylized direction)
- **L5** (user): "dale vamos a ver que sale me convence el orden de las escenas" (Gate 1 approved; start Gate 2)
- **L6** (decision): Growth generator is custom, not `@dgreenheck/ez-tree` (MIT 1.1.0). ez-tree has no per-branch growth data and no bonsai preset; growth needs per-segment birth/death attributes that a custom generator emits directly. ez-tree stays a reference for bark and leaf handling.
- **L7** (decision): Graybox ships on a separate `/bonsai` route so the current home stays untouched until T7. Tests use the built-in `node --test` runner (Node 26 strips TypeScript natively), so no test dependency is added.
