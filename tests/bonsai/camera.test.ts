import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CHAPTERS, type CameraPose, type Vec3 } from "../../src/lib/bonsai/chapters.ts";
import { generateBonsai } from "../../src/lib/bonsai/generator.ts";
import {
  SCREEN_ANCHOR,
  boxCorners,
  hasArea,
  projectPoints,
  projectToScreen,
  screenAnchor,
  viewOffsetFor,
} from "../../src/lib/bonsai/framing.ts";

// Gate 2 camera-to-target distances, taken from chapters.ts before S6 (desktop, mobile).
const GATE2_DISTANCE = {
  seed: { desktop: [22.677], mobile: [31.181] },
  sprout: { desktop: [17.916], mobile: [25.06] },
  trunk: { desktop: [26.077], mobile: [35.157] },
  branches: { desktop: [42.19, 40.89, 40.447, 40.89], mobile: [52.738, 51.113, 50.559, 51.113] },
  pruning: { desktop: [33.166], mobile: [43.359] },
  pagoda: { desktop: [26.851], mobile: [36.565] },
  finished: { desktop: [95.755], mobile: [130.981] },
} as const;

const distance = (pose: CameraPose) =>
  Math.hypot(
    pose.position[0] - pose.target[0],
    pose.position[1] - pose.target[1],
    pose.position[2] - pose.target[2],
  );

test("every chapter camera, desktop and mobile, is at least 1.3x its Gate 2 distance from its target (S6)", () => {
  for (const chapter of CHAPTERS) {
    const before = GATE2_DISTANCE[chapter.id];
    assert.equal(chapter.stops.length, before.desktop.length, `${chapter.id} desktop stop count`);
    assert.equal(chapter.mobileStops.length, before.mobile.length, `${chapter.id} mobile stop count`);
    chapter.stops.forEach((stop, index) => {
      const ratio = distance(stop) / before.desktop[index]!;
      assert.ok(ratio >= 1.3, `${chapter.id} desktop stop ${index} is ${ratio.toFixed(2)}x`);
    });
    chapter.mobileStops.forEach((stop, index) => {
      const ratio = distance(stop) / before.mobile[index]!;
      assert.ok(ratio >= 1.3, `${chapter.id} mobile stop ${index} is ${ratio.toFixed(2)}x`);
    });
  }
});

test("pulling back keeps the lens in the macro range and the target horizontally on the tree axis", () => {
  for (const chapter of CHAPTERS) {
    for (const stop of [...chapter.stops, ...chapter.mobileStops]) {
      assert.ok(stop.fov >= 28 && stop.fov <= 50, `${chapter.id} fov ${stop.fov}`);
    }
    for (const stop of chapter.stops) {
      const onAxis = chapter.id === "pagoda" ? -14 : 0;
      assert.equal(stop.target[0], onAxis, `${chapter.id} target x`);
      assert.equal(stop.target[2], 0, `${chapter.id} target z`);
    }
  }
  const branches = CHAPTERS.find((chapter) => chapter.id === "branches")!;
  assert.deepEqual(
    branches.stops.map((stop) => stop.target[1]),
    [8, 18, 28, 38],
    "the branches camera still rises along the trunk",
  );
});

test("the screen anchor draws the target in the copy-free area (left 40% desktop, bottom 45% mobile)", () => {
  assert.ok(SCREEN_ANCHOR.desktop.x >= 0.6 && SCREEN_ANCHOR.desktop.x < 0.8);
  assert.ok(SCREEN_ANCHOR.mobile.y <= 0.55 && SCREEN_ANCHOR.mobile.y > 0.15);
  assert.deepEqual(screenAnchor(false), SCREEN_ANCHOR.desktop);
  assert.deepEqual(screenAnchor(true), SCREEN_ANCHOR.mobile);
});

test("viewOffsetFor and projectToScreen agree with three.js", () => {
  for (const [width, height, mobile] of [
    [1440, 900, false],
    [390, 844, true],
  ] as const) {
    const anchor = screenAnchor(mobile);
    const pose = CHAPTERS[2]!.stops[0]!;
    const camera = new THREE.PerspectiveCamera(pose.fov, width / height, 0.1, 600);
    const shift = viewOffsetFor(width, height, anchor);
    camera.setViewOffset(width, height, shift.x, shift.y, width, height);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateMatrixWorld();
    const probes: Vec3[] = [pose.target, [3, 30, 2], [-4, 6, 5]];
    for (const point of probes) {
      const ndc = new THREE.Vector3(...point).project(camera);
      const screen = projectToScreen(pose, width / height, point, anchor)!;
      assert.ok(Math.abs((ndc.x + 1) / 2 - screen.x) < 1e-6, `x of ${point}`);
      assert.ok(Math.abs((1 - ndc.y) / 2 - screen.y) < 1e-6, `y of ${point}`);
    }
    const target = projectToScreen(pose, width / height, pose.target, anchor)!;
    assert.ok(Math.abs(target.x - anchor.x) < 1e-9 && Math.abs(target.y - anchor.y) < 1e-9);
  }
});

test("a collapsed viewport is not renderable", () => {
  assert.equal(hasArea(0, 800), false);
  assert.equal(hasArea(1200, 0), false);
  assert.equal(hasArea(Number.NaN, 800), false);
  assert.equal(hasArea(390, 844), true);
});

// ── Composition: each landmark reads in full, opposite the copy ───────────
const bonsai = generateBonsai();
const SAFE = {
  desktop: { aspect: 1440 / 900, left: 0.36, right: 0.98, top: 0.03, bottom: 0.97 },
  mobile: { aspect: 390 / 844, left: 0.02, right: 0.98, top: 0.02, bottom: 0.58 },
};

function treePoints(filter: (branchId: number, y: number) => boolean, withPads = true): Vec3[] {
  const points: Vec3[] = [];
  const { segments, pads } = bonsai;
  for (let i = 0; i < segments.count; i += 1) {
    const radius = Math.max(segments.radiusStart[i]!, segments.radiusEnd[i]!);
    for (const buffer of [segments.start, segments.end]) {
      const y = buffer[i * 3 + 1]!;
      if (!filter(segments.branchId[i]!, y)) continue;
      for (const dx of [-radius, radius]) {
        for (const dz of [-radius, radius]) points.push([buffer[i * 3]! + dx, y, buffer[i * 3 + 2]! + dz]);
      }
    }
  }
  if (!withPads) return points;
  for (let i = 0; i < pads.count; i += 1) {
    const [cx, cy, cz] = [pads.center[i * 3]!, pads.center[i * 3 + 1]!, pads.center[i * 3 + 2]!];
    if (!filter(pads.branchId[i]!, cy)) continue;
    const r = pads.radius[i]!;
    for (const [dx, dy, dz] of [[r, 0, 0], [-r, 0, 0], [0, 0, r], [0, 0, -r], [0, r / 2, 0], [0, -r / 2, 0]] as const) {
      points.push([cx + dx, cy + dy, cz + dz]);
    }
  }
  return points;
}

function assertFits(id: string, mobile: boolean, stopIndex: number, points: readonly Vec3[], slack = 0) {
  const zone = mobile ? SAFE.mobile : SAFE.desktop;
  const chapter = CHAPTERS.find((candidate) => candidate.id === id)!;
  const stop = (mobile ? chapter.mobileStops : chapter.stops)[stopIndex]!;
  const rect = projectPoints(stop, zone.aspect, points, screenAnchor(mobile));
  const label = `${id} ${mobile ? "mobile 390x844" : "desktop 1440x900"}`;
  assert.ok(rect, `${label}: subject is in front of the camera`);
  const detail = JSON.stringify(rect, (_key, value) => (typeof value === "number" ? Number(value.toFixed(2)) : value));
  assert.ok(rect.left >= zone.left - slack, `${label}: left ${detail}`);
  assert.ok(rect.right <= zone.right + slack, `${label}: right ${detail}`);
  assert.ok(rect.top >= zone.top - slack, `${label}: top ${detail}`);
  assert.ok(rect.bottom <= zone.bottom + slack, `${label}: bottom ${detail}`);
}

test("finished: the whole tree fits at 1440x900 and 390x844 (top never cropped)", () => {
  const whole = treePoints(() => true);
  assertFits("finished", false, 0, whole);
  assertFits("finished", true, 0, whole);
});

test("pagoda: the full pagoda including its top tier is in frame", () => {
  // platform x -19..-9, tiers up to the finial at y ~ 15.5, stairs reach z ~ 10
  const pagoda = boxCorners([-19.5, 0, -5.5], [-8.5, 15.6, 10.5]);
  assertFits("pagoda", false, 0, pagoda);
  assertFits("pagoda", true, 0, pagoda);
});

test("trunk: the whole trunk and its wire are in frame", () => {
  const trunk = treePoints((id, y) => id === 0 && y >= 4 && y <= 42, false);
  assertFits("trunk", false, 0, trunk);
  assertFits("trunk", true, 0, trunk);
});

test("seed and sprout stay in frame opposite the copy", () => {
  assertFits("seed", false, 0, boxCorners([-1.4, 0, -1], [1.4, 1.8, 1]));
  assertFits("seed", true, 0, boxCorners([-1.4, 0, -1], [1.4, 1.8, 1]));
  assertFits("sprout", false, 0, boxCorners([-3, 0, -3], [3, 7, 3]));
  assertFits("sprout", true, 0, boxCorners([-3, 0, -3], [3, 7, 3]));
});

test("the seed is still large enough on screen to read as a seed", () => {
  const seed = CHAPTERS[0]!.stops[0]!;
  const length = 2.6;
  const left = projectToScreen(seed, SAFE.desktop.aspect, [-length / 2, 0.8, 0], screenAnchor(false))!;
  const right = projectToScreen(seed, SAFE.desktop.aspect, [length / 2, 0.8, 0], screenAnchor(false))!;
  assert.ok(right.x - left.x >= 0.06, `seed spans ${(right.x - left.x).toFixed(3)} of the width`);
});

test("pruning: the crown stays almost entirely in frame", () => {
  const crown = treePoints((_id, y) => y >= 12);
  assertFits("pruning", false, 0, crown, 0.16);
  assertFits("pruning", true, 0, crown, 0.16);
});

test("branches: each sub-stop frames the base of its own branch", () => {
  const branches = CHAPTERS.find((chapter) => chapter.id === "branches")!;
  branches.stops.forEach((stop, index) => {
    const attach = bonsai.branches[index]!.attachY;
    const point = projectToScreen(stop, SAFE.desktop.aspect, [0, attach, 0], screenAnchor(false))!;
    assert.ok(point.x > 0.3 && point.x < 0.95 && point.y > 0.05 && point.y < 0.95, `desktop stop ${index}`);
    const mobile = projectToScreen(branches.mobileStops[index]!, SAFE.mobile.aspect, [0, attach, 0], screenAnchor(true))!;
    assert.ok(mobile.x > 0.05 && mobile.x < 0.95 && mobile.y > 0.02 && mobile.y < 0.58, `mobile stop ${index}`);
  });
});
