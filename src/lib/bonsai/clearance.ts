// Camera clearance around the grown tree. The damped camera follows the path by
// progress, so after a fast jump it can sweep through places no chapter looks
// from. `keepClear` pushes any such position out of the tree's envelope.
// Pure (no three.js): shared by the renderer and the tests.

import type { Vec3 } from "./chapters.ts";
import { SEGMENT_KIND, type BonsaiData } from "./generator.ts";

/** Minimum gap (cm) between the camera and the trunk, branches or foliage. */
export const CAMERA_CLEARANCE = 8;

/** A capsule: segment `a`-`b` thickened by `radius` (a sphere when a == b). */
export interface Obstacle {
  a: Vec3;
  b: Vec3;
  radius: number;
}

const MAX_PASSES = 24;

/** Final-shape envelope of the tree: trunk, main branches and loose foliage pads. */
export function buildObstacles(data: BonsaiData): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const { nodes, radius } = data.trunk;
  for (let i = 0; i < nodes.length / 3 - 1; i += 1) {
    obstacles.push({
      a: [nodes[i * 3]!, nodes[i * 3 + 1]!, nodes[i * 3 + 2]!],
      b: [nodes[i * 3 + 3]!, nodes[i * 3 + 4]!, nodes[i * 3 + 5]!],
      radius: Math.max(radius[i]!, radius[i + 1]!),
    });
  }
  const { segments, pads } = data;
  for (let i = 0; i < segments.count; i += 1) {
    if (segments.kind[i] !== SEGMENT_KIND.Branch) continue;
    obstacles.push({
      a: [segments.start[i * 3]!, segments.start[i * 3 + 1]!, segments.start[i * 3 + 2]!],
      b: [segments.end[i * 3]!, segments.end[i * 3 + 1]!, segments.end[i * 3 + 2]!],
      radius: Math.max(segments.radiusStart[i]!, segments.radiusEnd[i]!),
    });
  }
  for (let i = 0; i < pads.count; i += 1) {
    const center: Vec3 = [pads.center[i * 3]!, pads.center[i * 3 + 1]!, pads.center[i * 3 + 2]!];
    obstacles.push({ a: center, b: center, radius: pads.radius[i]! * pads.loose[i]! });
  }
  return obstacles;
}

function closestPoint(point: Vec3, obstacle: Obstacle): Vec3 {
  const { a, b } = obstacle;
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const abz = b[2] - a[2];
  const lengthSquared = abx * abx + aby * aby + abz * abz;
  if (lengthSquared < 1e-12) return a;
  const t = Math.min(
    1,
    Math.max(0, ((point[0] - a[0]) * abx + (point[1] - a[1]) * aby + (point[2] - a[2]) * abz) / lengthSquared),
  );
  return [a[0] + abx * t, a[1] + aby * t, a[2] + abz * t];
}

/** Gap between a point and the nearest obstacle surface (negative when inside). */
export function distanceToSurface(point: Vec3, obstacles: readonly Obstacle[]): number {
  let best = Infinity;
  for (const obstacle of obstacles) {
    const closest = closestPoint(point, obstacle);
    const gap = Math.hypot(point[0] - closest[0], point[1] - closest[1], point[2] - closest[2]) - obstacle.radius;
    if (gap < best) best = gap;
  }
  return best;
}

/** Returns `position`, or the nearest position at least `margin` away from every obstacle. */
export function keepClear(position: Vec3, obstacles: readonly Obstacle[], margin: number = CAMERA_CLEARANCE): Vec3 {
  let current: Vec3 = position;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let worstGap = margin;
    let worst: { obstacle: Obstacle; closest: Vec3; distance: number } | null = null;
    for (const obstacle of obstacles) {
      const closest = closestPoint(current, obstacle);
      const distance = Math.hypot(current[0] - closest[0], current[1] - closest[1], current[2] - closest[2]);
      const gap = distance - obstacle.radius;
      if (gap < worstGap) {
        worstGap = gap;
        worst = { obstacle, closest, distance };
      }
    }
    if (!worst) return current;
    const { obstacle, closest, distance } = worst;
    // Dead centre on a core line: leave sideways, away from the tree axis.
    const sideways = Math.hypot(current[0], current[2]);
    const direction: Vec3 =
      distance > 1e-6
        ? [(current[0] - closest[0]) / distance, (current[1] - closest[1]) / distance, (current[2] - closest[2]) / distance]
        : sideways > 1e-6
          ? [current[0] / sideways, 0, current[2] / sideways]
          : [0, 0, 1];
    const reach = obstacle.radius + margin;
    current = [closest[0] + direction[0] * reach, closest[1] + direction[1] * reach, closest[2] + direction[2] * reach];
  }
  // Overlapping foliage can trap the local push: walk straight out from the tree axis.
  const sideways = Math.hypot(current[0], current[2]);
  const outward: Vec3 = sideways > 1e-6 ? [current[0] / sideways, 0, current[2] / sideways] : [0, 0, 1];
  for (let step = 0; step < 400 && distanceToSurface(current, obstacles) < margin; step += 1) {
    current = [current[0] + outward[0], current[1], current[2] + outward[2]];
  }
  return current;
}
