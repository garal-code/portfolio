import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, type Vec3 } from "../../src/lib/bonsai/chapters.ts";
import { chapterSpans, createCameraPath } from "../../src/lib/bonsai/conductor.ts";
import { generateBonsai } from "../../src/lib/bonsai/generator.ts";
import {
  CAMERA_CLEARANCE,
  buildObstacles,
  distanceToSurface,
  keepClear,
} from "../../src/lib/bonsai/clearance.ts";

const bonsai = generateBonsai();
const obstacles = buildObstacles(bonsai);

/** Distance from a point to the trunk centreline (the "trunk axis"). */
function trunkAxisDistance(point: Vec3): number {
  const nodes = bonsai.trunk.nodes;
  let best = Infinity;
  for (let i = 0; i < nodes.length / 3 - 1; i += 1) {
    const a = [nodes[i * 3]!, nodes[i * 3 + 1]!, nodes[i * 3 + 2]!];
    const b = [nodes[i * 3 + 3]!, nodes[i * 3 + 4]!, nodes[i * 3 + 5]!];
    const ab = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
    const ap = [point[0] - a[0]!, point[1] - a[1]!, point[2] - a[2]!];
    const t = Math.min(1, Math.max(0, (ab[0]! * ap[0]! + ab[1]! * ap[1]! + ab[2]! * ap[2]!) / (ab[0]! ** 2 + ab[1]! ** 2 + ab[2]! ** 2)));
    best = Math.min(best, Math.hypot(point[0] - a[0]! - ab[0]! * t, point[1] - a[1]! - ab[1]! * t, point[2] - a[2]! - ab[2]! * t));
  }
  return best;
}

test("keepClear leaves a position that is already clear untouched", () => {
  const far: Vec3 = [60, 20, 80];
  assert.deepEqual(keepClear(far, obstacles), far);
});

test("keepClear pushes a position inside the trunk or a foliage pad out to the clearance", () => {
  const inside: Vec3[] = [
    [bonsai.trunk.nodes[14 * 3]!, bonsai.trunk.nodes[14 * 3 + 1]!, bonsai.trunk.nodes[14 * 3 + 2]!],
    [bonsai.pads.center[0]!, bonsai.pads.center[1]!, bonsai.pads.center[2]!],
    [0.5, 30, 0.5],
  ];
  for (const point of inside) {
    assert.ok(distanceToSurface(point, obstacles) < CAMERA_CLEARANCE, "the probe starts too close");
    const pushed = keepClear(point, obstacles);
    assert.ok(distanceToSurface(pushed, obstacles) >= CAMERA_CLEARANCE - 1e-6, `pushed ${pushed} is clear`);
    assert.ok(pushed.every(Number.isFinite));
  }
});

test("the camera never goes inside or brushes the tree on a jump between any two chapters", () => {
  assert.ok(CAMERA_CLEARANCE > 6);
  const spans = chapterSpans();
  for (const mobile of [false, true]) {
    const path = createCameraPath({ mobile });
    for (let from = 0; from < CHAPTERS.length; from += 1) {
      for (let to = 0; to < CHAPTERS.length; to += 1) {
        if (from === to) continue;
        const a = (spans[from]!.start + spans[from]!.end) / 2;
        const b = (spans[to]!.start + spans[to]!.end) / 2;
        for (let step = 0; step <= 200; step += 1) {
          const progress = a + ((b - a) * step) / 200;
          const raw = path.at(progress).position;
          const guarded = keepClear(raw, obstacles);
          const label = `${mobile ? "mobile" : "desktop"} ${CHAPTERS[from]!.id} -> ${CHAPTERS[to]!.id} at ${progress.toFixed(3)}`;
          assert.ok(trunkAxisDistance(guarded) > 6, `${label}: trunk axis ${trunkAxisDistance(guarded).toFixed(1)}`);
          assert.ok(distanceToSurface(guarded, obstacles) >= CAMERA_CLEARANCE - 1e-6, label);
        }
      }
    }
  }
});

test("the authored camera path itself already clears the tree, so the guard is only a safety net", () => {
  for (const mobile of [false, true]) {
    const path = createCameraPath({ mobile });
    for (let step = 0; step <= 2000; step += 1) {
      const raw = path.at(step / 2000).position;
      assert.ok(distanceToSurface(raw, obstacles) >= CAMERA_CLEARANCE, `${mobile ? "mobile" : "desktop"} at ${step / 2000}`);
    }
  }
});
