// Chapter ledger for the bonsai world (world bible sections 4 and 5).
// Pure data, no three.js: shared by the DOM page, the renderer and the tests.

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  fov: number;
}

/** Window of the 0..1 growth timeline owned by a chapter. */
export interface GrowthWindow {
  from: number;
  to: number;
}

/** Sky and key light of a chapter; the world interpolates between chapters. */
export interface ChapterLight {
  sky: number;
  key: number;
  keyIntensity: number;
  lanterns: number;
}

export const CHAPTER_IDS = [
  "seed",
  "sprout",
  "trunk",
  "branches",
  "pruning",
  "pagoda",
  "finished",
] as const;

export type ChapterId = (typeof CHAPTER_IDS)[number];

export interface Chapter {
  id: ChapterId;
  scrollWeight: number;
  growth: GrowthWindow;
  /** Desktop camera stops. One per chapter, except `branches` (one per job). */
  stops: readonly CameraPose[];
  /** Mobile composition of the same stops. */
  mobileStops: readonly CameraPose[];
  light: ChapterLight;
}

function pose(position: Vec3, target: Vec3, fov: number): CameraPose {
  return { position, target, fov };
}

/** Mobile override: new position and fov, target inherited from desktop. */
function mobile(base: CameraPose, position: Vec3, fov: number): CameraPose {
  return pose(position, base.target, fov);
}

/** Moves the camera away from its target by `factor` (1.25 = pull back 25%). */
function pullBack(base: CameraPose, factor: number, fov: number): CameraPose {
  const [px, py, pz] = base.position;
  const [tx, ty, tz] = base.target;
  return pose(
    [tx + (px - tx) * factor, ty + (py - ty) * factor, tz + (pz - tz) * factor],
    base.target,
    fov,
  );
}

// Gate 2 correction (S6): every camera sits 1.3x to 2.4x further from its target
// than in the first graybox, so each landmark reads in full:
//   seed/sprout 1.35x, branches 1.4x-2.1x, pagoda 1.6x (top tier in frame),
//   trunk 2.7x (trunk and wire, target raised to the middle of the trunk),
//   pruning 2.5x (the crown), finished 1.35x (the whole tree).
// The renderer draws each target inside the copy-free area (framing.ts).
const seedPose = pose([0, 8, 30], [0, 0.5, 0], 35);
const sproutPose = pose([-10, 5.5, 22], [0, 3, 0], 34);
const trunkPose = pose([28, 32, 64], [0, 22, 0], 36);
const pruningPose = pose([35, 40, 75], [0, 32, 0], 34);
const pagodaPose = pose([-24, 12, 42.5], [-14, 7, 0], 32);
const finishedPose = pose([0, 34, 128], [0, 18, 0], 32);

// Bible: target y 8 -> 38 over 4 sub-stops, one per job (bottom-up,
// chronological). The camera rises along the trunk. Gate 2 stops were at
// [-6, 20..32, 40]; each is pulled back from its own target. The first branch
// points toward the camera, so its stop looks from further left and pulls most.
const BRANCH_BASE: readonly CameraPose[] = [
  pose([-30, 18, 36], [0, 8, 0], 38),
  pose([-6, 24, 40], [0, 18, 0], 38),
  pose([-6, 28, 40], [0, 28, 0], 38),
  pose([-6, 32, 40], [0, 38, 0], 38),
];
const BRANCH_PULL = [1.6, 1.5, 1.8, 1.4] as const;
const branchStops: readonly CameraPose[] = BRANCH_BASE.map((stop, index) =>
  pullBack(stop, BRANCH_PULL[index]!, 38),
);

const DAYLIGHT = { sky: 0xdfe6df, key: 0xf2f5f7 };
const GOLDEN = { sky: 0xe8d9b4, key: 0xffd08a };
const DUSK = { sky: 0x1b3a33, key: 0x9db3c7 };

// Growth windows are contiguous. The tree is complete at the end of `pruning`,
// so `pagoda` and `finished` hold growth at 1 while the camera and light move on.
export const CHAPTERS: readonly Chapter[] = [
  {
    id: "seed",
    scrollWeight: 1.2,
    growth: { from: 0, to: 0.02 },
    stops: [seedPose],
    mobileStops: [mobile(seedPose, [0, 12, 40], 46)],
    light: { ...DAYLIGHT, keyIntensity: 2.4, lanterns: 0 },
  },
  {
    id: "sprout",
    scrollWeight: 1.0,
    growth: { from: 0.02, to: 0.14 },
    stops: [sproutPose],
    mobileStops: [mobile(sproutPose, [-8, 9.5, 32], 46)],
    light: { ...DAYLIGHT, keyIntensity: 2.4, lanterns: 0 },
  },
  {
    id: "trunk",
    scrollWeight: 1.4,
    growth: { from: 0.14, to: 0.4 },
    stops: [trunkPose],
    mobileStops: [mobile(trunkPose, [22, 30, 87], 50)],
    light: { ...DAYLIGHT, keyIntensity: 2.2, lanterns: 0 },
  },
  {
    id: "branches",
    scrollWeight: 2.4,
    growth: { from: 0.4, to: 0.8 },
    stops: branchStops,
    mobileStops: branchStops.map((stop) => pullBack(stop, 1.4, 46)),
    light: { ...DAYLIGHT, keyIntensity: 2.0, lanterns: 0 },
  },
  {
    id: "pruning",
    scrollWeight: 1.2,
    growth: { from: 0.8, to: 1 },
    stops: [pruningPose],
    mobileStops: [mobile(pruningPose, [31, 50, 130], 46)],
    light: { ...GOLDEN, keyIntensity: 1.6, lanterns: 0 },
  },
  {
    id: "pagoda",
    scrollWeight: 1.2,
    growth: { from: 1, to: 1 },
    stops: [pagodaPose],
    mobileStops: [mobile(pagodaPose, [-19.5, 11, 49], 44)],
    light: { ...DUSK, keyIntensity: 0.9, lanterns: 1 },
  },
  {
    id: "finished",
    scrollWeight: 1.0,
    growth: { from: 1, to: 1 },
    stops: [finishedPose],
    mobileStops: [mobile(finishedPose, [0, 41, 188], 42)],
    light: { sky: 0x0b2620, key: DUSK.key, keyIntensity: 0.6, lanterns: 1 },
  },
];

export function growthWindow(id: ChapterId): GrowthWindow {
  const chapter = CHAPTERS.find((candidate) => candidate.id === id);
  if (!chapter) throw new Error(`Unknown chapter: ${id}`);
  return chapter.growth;
}
