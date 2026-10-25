// Screen composition of the bonsai camera: where the look-at point lands on the
// screen so the subject sits opposite the copy (world bible section 3), and a
// pure projection used by the renderer and by the framing tests. No three.js.

import type { CameraPose, Vec3 } from "./chapters.ts";

/** Screen position (0..1 from the top-left) where the camera target is drawn. */
export interface ScreenAnchor {
  x: number;
  y: number;
}

/**
 * Copy sits in the left 40% on desktop and in the bottom 45% on mobile, so the
 * target is drawn in the middle of the free area: right 60% / top 55%.
 */
export const SCREEN_ANCHOR: { desktop: ScreenAnchor; mobile: ScreenAnchor } = {
  desktop: { x: 0.66, y: 0.5 },
  mobile: { x: 0.5, y: 0.275 },
};

export function screenAnchor(mobile: boolean): ScreenAnchor {
  return mobile ? SCREEN_ANCHOR.mobile : SCREEN_ANCHOR.desktop;
}

/** False for a collapsed viewport (hidden tab, zero-height iframe): skip resizing. */
export function hasArea(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}

/**
 * Lens shift in pixels for `camera.setViewOffset(w, h, x, y, w, h)` so the
 * look-at point is drawn at `anchor` instead of the screen centre.
 */
export function viewOffsetFor(width: number, height: number, anchor: ScreenAnchor): { x: number; y: number } {
  return { x: -(anchor.x * 2 - 1) * width * 0.5, y: (1 - anchor.y * 2) * height * 0.5 };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

/**
 * Projects a world point through a look-at camera. Returns screen fractions
 * (0..1 from the top-left), or null when the point is behind the camera. The
 * pose target lands on `anchor` (the lens shift applied by the renderer).
 */
export function projectToScreen(
  pose: CameraPose,
  aspect: number,
  point: Vec3,
  anchor: ScreenAnchor = { x: 0.5, y: 0.5 },
): { x: number; y: number } | null {
  const forward = normalize(sub(pose.target, pose.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const relative = sub(point, pose.position);
  const depth = dot(relative, forward);
  if (depth <= 1e-6) return null;
  const tan = Math.tan((pose.fov * Math.PI) / 360);
  const ndcX = dot(relative, right) / (depth * tan * aspect) + (anchor.x * 2 - 1);
  const ndcY = dot(relative, up) / (depth * tan) + (1 - anchor.y * 2);
  return { x: (ndcX + 1) / 2, y: (1 - ndcY) / 2 };
}

export interface ScreenRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Screen rectangle covered by world points, or null if any point is behind the camera. */
export function projectPoints(
  pose: CameraPose,
  aspect: number,
  points: readonly Vec3[],
  anchor?: ScreenAnchor,
): ScreenRect | null {
  const rect = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  for (const point of points) {
    const screen = projectToScreen(pose, aspect, point, anchor);
    if (!screen) return null;
    rect.left = Math.min(rect.left, screen.x);
    rect.right = Math.max(rect.right, screen.x);
    rect.top = Math.min(rect.top, screen.y);
    rect.bottom = Math.max(rect.bottom, screen.y);
  }
  return rect;
}

/** The 8 corners of an axis-aligned world box. */
export function boxCorners(min: Vec3, max: Vec3): Vec3[] {
  const corners: Vec3[] = [];
  for (const x of [min[0], max[0]]) {
    for (const y of [min[1], max[1]]) {
      for (const z of [min[2], max[2]]) corners.push([x, y, z]);
    }
  }
  return corners;
}
