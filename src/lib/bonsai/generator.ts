// Seeded procedural informal-upright (moyogi) bonsai.
// 1 unit = 1 cm, soil surface at the origin, Y up, ~45 units tall.
//
// The tree is generated once as its FINAL shape. Every segment carries a growth
// time (`birth`, `span`, `death`) taken from the chapter growth windows, so
// scrolling only reveals it: no wall-clock time is involved anywhere.

import { careerEntries } from "./career.ts";
import { growthWindow } from "./chapters.ts";
import { DEATH_SPAN, SPROUT_HEIGHT, TRUNK_GROW, WIRE_WINDOW } from "./growth.ts";
import { jobs as resumeJobs } from "../../data/resume.ts";

export const SEGMENT_KIND = { Trunk: 0, Branch: 1, Twig: 2, PrunedTwig: 3 } as const;

export const DEFAULT_SEED = 20260101;
export const WIRE_TURNS = 5;

export interface SegmentBuffers {
  count: number;
  /** xyz per segment: attachment point (where the segment grows from). */
  start: Float32Array;
  /** xyz per segment: tip. */
  end: Float32Array;
  radiusStart: Float32Array;
  radiusEnd: Float32Array;
  /** Growth value where the segment starts growing. */
  birth: Float32Array;
  /** Growth units the segment takes to reach full size. */
  span: Float32Array;
  /** Growth value where a pruned segment is gone; 1 = never pruned. */
  death: Float32Array;
  /** 0 = trunk, 1..4 = career branch the segment belongs to. */
  branchId: Uint8Array;
  kind: Uint8Array;
}

export interface PadBuffers {
  count: number;
  center: Float32Array;
  radius: Float32Array;
  birth: Float32Array;
  span: Float32Array;
  /** Size multiplier (>= 1) before the pruning window condenses the pad. */
  loose: Float32Array;
  branchId: Uint8Array;
}

export interface WireData {
  count: number;
  turns: number;
  radius: number;
  from: number;
  to: number;
  points: Float32Array;
  /** Reveal time per point, in path order. */
  birth: Float32Array;
}

export interface CareerBranch {
  /** 1..n, bottom-up. */
  id: number;
  /** Index into the jobs array this branch represents. */
  jobIndex: number;
  attachY: number;
  birthFrom: number;
  birthTo: number;
}

export interface BonsaiData {
  seed: number;
  height: number;
  segments: SegmentBuffers;
  pads: PadBuffers;
  wire: WireData;
  branches: CareerBranch[];
  /** Trunk centreline: xyz per node, and radius per node. */
  trunk: { nodes: Float32Array; radius: Float32Array };
}

export interface GenerateOptions {
  /** Jobs to turn into branches. Defaults to the resume jobs. */
  jobs?: readonly { startDate: string }[];
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Point = [number, number, number];

interface SegmentRecord {
  start: Point;
  end: Point;
  r0: number;
  r1: number;
  birth: number;
  span: number;
  death: number;
  branchId: number;
  kind: number;
}

const TRUNK_SEGMENTS = 28;
const BRANCH_SEGMENTS = 10;
const TWIG_NODES = [3, 5, 7, 9];
const PRUNED_NODES = [2, 4, 6, 8];
// Fractions of a branch's slice of the branches window (q).
const MAIN_SHARE = 0.45;
const TWIG_STEP_SHARE = 0.13;
const PAD_SPAN_SHARE = 0.15;
// Azimuths (rad, from +x toward +z) alternating around the trunk. The pagoda
// stands at x = -14 up to y ~ 16, so branches that reach left start above it.
const AZIMUTHS = [0.9, 3.6, 3.1, 5.5];

function trunkRadiusAt(u: number): number {
  return 0.3 + 1.7 * Math.pow(1 - u, 1.4);
}

export function generateBonsai(seed: number = DEFAULT_SEED, options: GenerateOptions = {}): BonsaiData {
  const rng = mulberry32(seed);
  const jobList = options.jobs ?? resumeJobs;
  const sprout = growthWindow("sprout");
  const trunkWindow = growthWindow("trunk");
  const branchesWindow = growthWindow("branches");
  const pruningWindow = growthWindow("pruning");
  const segments: SegmentRecord[] = [];

  // ── Trunk: S-curve centreline, tapered, grown bottom-up ────────────────
  const height = 43.5 + rng() * 2.5;
  const ampX = 4.5 + rng() * 2;
  const ampZ = 2 + rng() * 1.5;
  const phaseX = rng() * Math.PI * 2;
  const phaseZ = rng() * Math.PI * 2;
  const trunkNodes: Point[] = [];
  for (let i = 0; i <= TRUNK_SEGMENTS; i += 1) {
    const u = i / TRUNK_SEGMENTS;
    trunkNodes.push([
      ampX * (Math.sin(Math.PI * 1.8 * u + phaseX) - Math.sin(phaseX)) * (1 - 0.3 * u),
      height * u,
      ampZ * (Math.sin(Math.PI * 1.4 * u + phaseZ) - Math.sin(phaseZ)),
    ]);
  }
  const trunkRadius = trunkNodes.map((_, i) => trunkRadiusAt(i / TRUNK_SEGMENTS));

  // Segments under SPROUT_HEIGHT emerge in `sprout`; the rest grow in `trunk`.
  const sproutCount = Math.max(1, trunkNodes.filter((node, i) => i > 0 && node[1] <= SPROUT_HEIGHT).length);
  for (let i = 0; i < TRUNK_SEGMENTS; i += 1) {
    const inSprout = i < sproutCount;
    const group = inSprout ? sprout : TRUNK_GROW;
    const first = inSprout ? 0 : sproutCount;
    const count = inSprout ? sproutCount : TRUNK_SEGMENTS - sproutCount;
    const span = (group.to - group.from) / count;
    segments.push({
      start: trunkNodes[i]!,
      end: trunkNodes[i + 1]!,
      r0: trunkRadius[i]!,
      r1: trunkRadius[i + 1]!,
      birth: group.from + (i - first) * span,
      span,
      death: 1,
      branchId: 0,
      kind: SEGMENT_KIND.Trunk,
    });
  }

  // ── Career branches: one per job, chronological, bottom-up ─────────────
  const chronological = careerEntries(jobList);
  const branchCount = chronological.length;
  const slice = (branchesWindow.to - branchesWindow.from) / branchCount;

  const padList: { center: Point; radius: number; birth: number; span: number; loose: number; branchId: number }[] = [];
  const branches: CareerBranch[] = [];

  for (let k = 0; k < branchCount; k += 1) {
    const ratio = branchCount === 1 ? 0 : k / (branchCount - 1);
    const id = k + 1;
    const from = branchesWindow.from + k * slice;
    const mainStep = (slice * MAIN_SHARE) / BRANCH_SEGMENTS;
    const twigStep = slice * TWIG_STEP_SHARE;

    const attachIndex = Math.round(lerp(0.27, 0.76, ratio) * TRUNK_SEGMENTS);
    const attach = trunkNodes[attachIndex]!;
    const attachRadius = trunkRadius[attachIndex]!;
    const azimuth = AZIMUTHS[k % AZIMUTHS.length]! + (rng() - 0.5) * 0.3;
    const length = lerp(20, 11, ratio) + rng() * 2;
    const step = length / BRANCH_SEGMENTS;
    const wobble = rng() * Math.PI * 2;
    const branchRadius = (s: number) => 0.2 + (0.5 * attachRadius - 0.2) * Math.pow(1 - s, 1.1);

    branches.push({
      id,
      jobIndex: chronological[k]!.index,
      attachY: attach[1],
      birthFrom: from,
      birthTo: from + slice,
    });

    // Main branch: rises, droops, tips up.
    const nodes: Point[] = [attach];
    const yaws: number[] = [];
    for (let j = 0; j < BRANCH_SEGMENTS; j += 1) {
      const s = j / BRANCH_SEGMENTS;
      const elevation = 0.28 - 0.55 * s + 0.4 * s * s * s;
      const yaw = azimuth + 0.25 * Math.sin(j * 0.9 + wobble);
      yaws.push(yaw);
      const from3 = nodes[j]!;
      nodes.push([
        from3[0] + step * Math.cos(elevation) * Math.cos(yaw),
        from3[1] + step * Math.sin(elevation),
        from3[2] + step * Math.cos(elevation) * Math.sin(yaw),
      ]);
      segments.push({
        start: from3,
        end: nodes[j + 1]!,
        r0: branchRadius(s),
        r1: branchRadius((j + 1) / BRANCH_SEGMENTS),
        birth: from + j * mainStep,
        span: mainStep,
        death: 1,
        branchId: id,
        kind: SEGMENT_KIND.Branch,
      });
    }
    const tipBirth = from + BRANCH_SEGMENTS * mainStep;
    padList.push({
      center: [nodes[BRANCH_SEGMENTS]![0], nodes[BRANCH_SEGMENTS]![1] + 1, nodes[BRANCH_SEGMENTS]![2]],
      radius: 4.4 - 0.3 * k + rng() * 0.8,
      birth: tipBirth,
      span: slice * PAD_SPAN_SHARE,
      loose: 1.35 + rng() * 0.35,
      branchId: id,
    });

    // Twigs hang off main nodes; kept ones carry a pad, pruned ones go in `pruning`.
    const growTwig = (nodeIndex: number, side: number, count: number, stepLength: number, elevation: number, pruned: boolean) => {
      const base = nodes[nodeIndex]!;
      const parentRadius = branchRadius(nodeIndex / BRANCH_SEGMENTS);
      const yaw = yaws[nodeIndex - 1]! + side * (0.9 + rng() * 0.3);
      const birth0 = from + nodeIndex * mainStep;
      const death = pruned
        ? pruningWindow.from + DEATH_SPAN + rng() * (pruningWindow.to - pruningWindow.from - DEATH_SPAN) * 0.98
        : 1;
      let cursor: Point = base;
      let r0 = Math.max(0.14, parentRadius * 0.55);
      for (let i = 0; i < count; i += 1) {
        const bend = yaw + side * 0.2 * i;
        const lift = elevation - 0.1 * i;
        const next: Point = [
          cursor[0] + stepLength * Math.cos(lift) * Math.cos(bend),
          cursor[1] + stepLength * Math.sin(lift),
          cursor[2] + stepLength * Math.cos(lift) * Math.sin(bend),
        ];
        const r1 = Math.max(0.07, r0 * 0.6);
        segments.push({
          start: cursor,
          end: next,
          r0,
          r1,
          birth: birth0 + i * twigStep,
          span: twigStep,
          death,
          branchId: id,
          kind: pruned ? SEGMENT_KIND.PrunedTwig : SEGMENT_KIND.Twig,
        });
        cursor = next;
        r0 = r1;
      }
      if (!pruned) {
        padList.push({
          center: [cursor[0], cursor[1] + 0.8, cursor[2]],
          radius: 3.2 + rng() * 1.2,
          birth: birth0 + count * twigStep,
          span: slice * PAD_SPAN_SHARE,
          loose: 1.35 + rng() * 0.35,
          branchId: id,
        });
      }
    };

    TWIG_NODES.forEach((nodeIndex, i) => growTwig(nodeIndex, i % 2 === 0 ? 1 : -1, 3, 2.4 + rng() * 0.4, 0.25, false));
    PRUNED_NODES.forEach((nodeIndex, i) => growTwig(nodeIndex, i % 2 === 0 ? -1 : 1, 2, 2 + rng() * 0.4, 0.5, true));
  }

  // Crown pad on the trunk apex, born with the last (top) branch.
  const apex = trunkNodes[TRUNK_SEGMENTS]!;
  padList.push({
    center: [apex[0], apex[1] + 1.6, apex[2]],
    radius: 4.6,
    birth: branches[branches.length - 1]!.birthFrom,
    span: slice * PAD_SPAN_SHARE,
    loose: 1.4,
    branchId: 0,
  });

  // ── Wire: 5 turns around the trunk, revealed after the trunk has grown ─
  const wirePoints = WIRE_TURNS * 24 + 1;
  const wire: WireData = {
    count: wirePoints,
    turns: WIRE_TURNS,
    radius: 0.14,
    from: WIRE_WINDOW.from,
    to: WIRE_WINDOW.to,
    points: new Float32Array(wirePoints * 3),
    birth: new Float32Array(wirePoints),
  };
  const trunkData = { nodes: new Float32Array(trunkNodes.flat()), radius: new Float32Array(trunkRadius) };
  const wireStartU = 0.12;
  const wireEndU = 0.84;
  for (let i = 0; i < wirePoints; i += 1) {
    const s = i / (wirePoints - 1);
    const u = lerp(wireStartU, wireEndU, s);
    const centre = sampleTrunk(trunkData.nodes, u * height);
    const offset = trunkRadiusAt(u) + wire.radius * 0.6;
    const angle = s * WIRE_TURNS * Math.PI * 2;
    wire.points[i * 3] = centre[0] + Math.cos(angle) * offset;
    wire.points[i * 3 + 1] = centre[1];
    wire.points[i * 3 + 2] = centre[2] + Math.sin(angle) * offset;
    wire.birth[i] = lerp(wire.from, wire.to, s);
  }

  return {
    seed,
    height,
    segments: packSegments(segments),
    pads: packPads(padList),
    wire,
    branches,
    trunk: trunkData,
  };
}

/** Trunk centreline at a given height (cm), interpolated along the nodes. */
function sampleTrunk(nodes: Float32Array, y: number): Point {
  const count = nodes.length / 3;
  let i = 0;
  while (i < count - 2 && nodes[(i + 1) * 3 + 1]! < y) i += 1;
  const y0 = nodes[i * 3 + 1]!;
  const y1 = nodes[(i + 1) * 3 + 1]!;
  const t = y1 === y0 ? 0 : Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
  return [
    lerp(nodes[i * 3]!, nodes[(i + 1) * 3]!, t),
    y,
    lerp(nodes[i * 3 + 2]!, nodes[(i + 1) * 3 + 2]!, t),
  ];
}

export function trunkCenterAt(bonsai: BonsaiData, y: number): Point {
  return sampleTrunk(bonsai.trunk.nodes, y);
}

function packSegments(list: SegmentRecord[]): SegmentBuffers {
  const count = list.length;
  const out: SegmentBuffers = {
    count,
    start: new Float32Array(count * 3),
    end: new Float32Array(count * 3),
    radiusStart: new Float32Array(count),
    radiusEnd: new Float32Array(count),
    birth: new Float32Array(count),
    span: new Float32Array(count),
    death: new Float32Array(count),
    branchId: new Uint8Array(count),
    kind: new Uint8Array(count),
  };
  list.forEach((segment, i) => {
    out.start.set(segment.start, i * 3);
    out.end.set(segment.end, i * 3);
    out.radiusStart[i] = segment.r0;
    out.radiusEnd[i] = segment.r1;
    out.birth[i] = segment.birth;
    out.span[i] = segment.span;
    out.death[i] = segment.death;
    out.branchId[i] = segment.branchId;
    out.kind[i] = segment.kind;
  });
  return out;
}

function packPads(list: { center: Point; radius: number; birth: number; span: number; loose: number; branchId: number }[]): PadBuffers {
  const count = list.length;
  const out: PadBuffers = {
    count,
    center: new Float32Array(count * 3),
    radius: new Float32Array(count),
    birth: new Float32Array(count),
    span: new Float32Array(count),
    loose: new Float32Array(count),
    branchId: new Uint8Array(count),
  };
  list.forEach((pad, i) => {
    out.center.set(pad.center, i * 3);
    out.radius[i] = pad.radius;
    out.birth[i] = pad.birth;
    out.span[i] = pad.span;
    out.loose[i] = pad.loose;
    out.branchId[i] = pad.branchId;
  });
  return out;
}
