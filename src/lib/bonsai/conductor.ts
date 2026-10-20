// Pure scroll-progress model: maps normalized progress (0..1) to chapter state,
// growth, world light and camera pose. No DOM, no three.js, no hidden state, so
// the same progress always returns the same result, forward or backward.

import { CHAPTERS, type CameraPose, type Chapter, type ChapterId, type Vec3 } from "./chapters.ts";

export interface ChapterSpan {
  id: ChapterId;
  index: number;
  start: number;
  end: number;
}

export interface ConductorState {
  progress: number;
  index: number;
  id: ChapterId;
  /** 0..1 inside the active chapter. */
  local: number;
  /** Camera sub-stop inside the active chapter (0 unless it has several). */
  stop: number;
  /** 0..1 growth timeline value, mapped from the chapter growth windows. */
  growth: number;
}

export interface WorldState {
  sky: number;
  key: number;
  keyIntensity: number;
  lanterns: number;
}

export interface Waypoint {
  progress: number;
  pose: CameraPose;
  chapterIndex: number;
  label: string;
}

export interface CameraPath {
  waypoints: readonly Waypoint[];
  at(progress: number): CameraPose;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

const spanCache = new WeakMap<readonly Chapter[], ChapterSpan[]>();

/** Chapter spans over 0..1, proportional to `scrollWeight`. */
export function chapterSpans(chapters: readonly Chapter[] = CHAPTERS): ChapterSpan[] {
  const cached = spanCache.get(chapters);
  if (cached) return cached;
  const total = chapters.reduce((sum, chapter) => sum + chapter.scrollWeight, 0);
  let cumulative = 0;
  const spans = chapters.map((chapter, index) => {
    const start = cumulative / total;
    cumulative += chapter.scrollWeight;
    const end = index === chapters.length - 1 ? 1 : cumulative / total;
    return { id: chapter.id, index, start, end };
  });
  spanCache.set(chapters, spans);
  return spans;
}

export function resolveProgress(rawProgress: number, chapters: readonly Chapter[] = CHAPTERS): ConductorState {
  const progress = clamp01(Number.isFinite(rawProgress) ? rawProgress : 0);
  const spans = chapterSpans(chapters);
  let index = spans.length - 1;
  for (let candidate = 0; candidate < spans.length; candidate += 1) {
    if (progress < spans[candidate]!.end) {
      index = candidate;
      break;
    }
  }
  const span = spans[index]!;
  const chapter = chapters[index]!;
  const local = progress >= 1 ? 1 : clamp01((progress - span.start) / (span.end - span.start));
  const stop = Math.min(chapter.stops.length - 1, Math.floor(local * chapter.stops.length));
  const growth = lerp(chapter.growth.from, chapter.growth.to, local);
  return { progress, index, id: chapter.id, local, stop, growth };
}

export function growthAt(progress: number, chapters: readonly Chapter[] = CHAPTERS): number {
  return resolveProgress(progress, chapters).growth;
}

/** Progress where a chapter's camera stop `stop` is reached. */
function stopAnchor(span: ChapterSpan, stop: number, count: number, chapters: number): number {
  if (count === 1) {
    if (span.index === 0) return span.start;
    if (span.index === chapters - 1) return span.end;
    return (span.start + span.end) / 2;
  }
  return span.start + ((span.end - span.start) * (stop + 0.5)) / count;
}

function waypointsFor(chapters: readonly Chapter[], mobile: boolean): Waypoint[] {
  const spans = chapterSpans(chapters);
  const waypoints: Waypoint[] = [];
  chapters.forEach((chapter, chapterIndex) => {
    const stops = mobile ? chapter.mobileStops : chapter.stops;
    stops.forEach((pose, stop) => {
      waypoints.push({
        progress: stopAnchor(spans[chapterIndex]!, stop, stops.length, chapters.length),
        pose,
        chapterIndex,
        label: stops.length > 1 ? `${chapter.id} ${stop + 1}/${stops.length}` : chapter.id,
      });
    });
  });
  return waypoints;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.max(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), 1e-4);
}

function reflect(a: Vec3, b: Vec3): Vec3 {
  return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
}

/** Centripetal Catmull-Rom (Barry-Goldman) between p1 and p2, t in 0..1. */
function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  if (t <= 0) return p1;
  if (t >= 1) return p2;
  const t0 = 0;
  const t1 = t0 + Math.sqrt(distance(p0, p1));
  const t2 = t1 + Math.sqrt(distance(p1, p2));
  const t3 = t2 + Math.sqrt(distance(p2, p3));
  const time = lerp(t1, t2, t);
  const out: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    const a = p0[axis]!;
    const b = p1[axis]!;
    const c = p2[axis]!;
    const d = p3[axis]!;
    const a1 = ((t1 - time) / (t1 - t0)) * a + ((time - t0) / (t1 - t0)) * b;
    const a2 = ((t2 - time) / (t2 - t1)) * b + ((time - t1) / (t2 - t1)) * c;
    const a3 = ((t3 - time) / (t3 - t2)) * c + ((time - t2) / (t3 - t2)) * d;
    const b1 = ((t2 - time) / (t2 - t0)) * a1 + ((time - t0) / (t2 - t0)) * a2;
    const b2 = ((t3 - time) / (t3 - t1)) * a2 + ((time - t1) / (t3 - t1)) * a3;
    out[axis] = ((t2 - time) / (t2 - t1)) * b1 + ((time - t1) / (t2 - t1)) * b2;
  }
  return out;
}

/**
 * Camera path: centripetal Catmull-Rom through the waypoint positions and
 * targets, FOV eased per segment. Waypoint progress comes from chapter spans,
 * so `scrollWeight` sets the dwell time and the path is parameterized by
 * progress, not by arc length.
 */
export function createCameraPath(
  options: { mobile?: boolean; chapters?: readonly Chapter[] } = {},
): CameraPath {
  const chapters = options.chapters ?? CHAPTERS;
  const waypoints = waypointsFor(chapters, Boolean(options.mobile));
  const last = waypoints.length - 1;

  const positions = waypoints.map((waypoint) => waypoint.pose.position);
  const targets = waypoints.map((waypoint) => waypoint.pose.target);

  const control = (points: readonly Vec3[], index: number): Vec3 => {
    if (index < 0) return reflect(points[0]!, points[1]!);
    if (index > last) return reflect(points[last]!, points[last - 1]!);
    return points[index]!;
  };

  function at(rawProgress: number): CameraPose {
    const progress = clamp01(rawProgress);
    if (progress <= waypoints[0]!.progress) return waypoints[0]!.pose;
    if (progress >= waypoints[last]!.progress) return waypoints[last]!.pose;

    let segment = 0;
    while (segment < last - 1 && progress >= waypoints[segment + 1]!.progress) segment += 1;
    const from = waypoints[segment]!;
    const to = waypoints[segment + 1]!;
    const t = (progress - from.progress) / (to.progress - from.progress);

    return {
      position: catmullRom(
        control(positions, segment - 1),
        control(positions, segment),
        control(positions, segment + 1),
        control(positions, segment + 2),
        t,
      ),
      target: catmullRom(
        control(targets, segment - 1),
        control(targets, segment),
        control(targets, segment + 1),
        control(targets, segment + 2),
        t,
      ),
      fov: lerp(from.pose.fov, to.pose.fov, smooth(t)),
    };
  }

  return { waypoints, at };
}

function lerpHex(a: number, b: number, t: number): number {
  const channel = (shift: number) =>
    Math.round(lerp((a >> shift) & 0xff, (b >> shift) & 0xff, t)) << shift;
  return channel(16) | channel(8) | channel(0);
}

/** Sky, key light and lantern state, interpolated between chapter centres. */
export function worldAt(rawProgress: number, chapters: readonly Chapter[] = CHAPTERS): WorldState {
  const progress = clamp01(rawProgress);
  const spans = chapterSpans(chapters);
  const anchors = spans.map((span, index) =>
    index === 0 ? 0 : index === spans.length - 1 ? 1 : (span.start + span.end) / 2,
  );
  let index = 0;
  while (index < anchors.length - 2 && progress >= anchors[index + 1]!) index += 1;
  const a = chapters[index]!.light;
  const b = chapters[index + 1]!.light;
  const t = smooth(clamp01((progress - anchors[index]!) / (anchors[index + 1]! - anchors[index]!)));
  return {
    sky: lerpHex(a.sky, b.sky, t),
    key: lerpHex(a.key, b.key, t),
    keyIntensity: lerp(a.keyIntensity, b.keyIntensity, t),
    lanterns: lerp(a.lanterns, b.lanterns, t),
  };
}
