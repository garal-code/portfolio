import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, type Vec3 } from "../../src/lib/bonsai/chapters.ts";
import { chapterSpans, createCameraPath } from "../../src/lib/bonsai/conductor.ts";
import { projectToScreen, screenAnchor } from "../../src/lib/bonsai/framing.ts";
import { SUN_DISC_RADIUS, sunAt } from "../../src/lib/bonsai/sun.ts";

const spans = chapterSpans();
const center = (id: string) => {
  const span = spans.find((candidate) => candidate.id === id)!;
  return (span.start + span.end) / 2;
};
const steps = Array.from({ length: 1001 }, (_, i) => i / 1000);

function hue(hex: number): number {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;
  const raw = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (raw * 60 + 360) % 360;
}

test("sun elevation never rises as the scroll progresses", () => {
  let previous = Infinity;
  for (const progress of steps) {
    const { elevation } = sunAt(progress);
    assert.ok(elevation <= previous + 1e-9, `elevation rose at ${progress}`);
    previous = elevation;
  }
  assert.ok(sunAt(0).elevation > 45, "high at the start");
});

test("the sun is above the horizon in chapters 1-5, touches it at pagoda and is below it at finished", () => {
  const pruningEnd = spans.find((span) => span.id === "pruning")!.end;
  for (const progress of steps.filter((value) => value <= pruningEnd)) {
    assert.ok(sunAt(progress).elevation > 0, `above the horizon at ${progress}`);
  }
  assert.ok(Math.abs(sunAt(center("pagoda")).elevation) <= 2, "touching the horizon at pagoda");
  assert.ok(sunAt(1).elevation < 0, "just below the horizon at finished");
  assert.ok(sunAt(1).elevation > -8, "only just below it");
  assert.ok(sunAt(center("pruning")).elevation < 10, "low in pruning");
  for (const id of ["seed", "sprout", "trunk"]) assert.ok(sunAt(center(id)).elevation > 40, `${id} is high`);
});

test("the sun stays behind the tree on the right side of the story, whatever the previous progress", () => {
  for (const progress of steps) {
    const { azimuth, direction } = sunAt(progress);
    assert.ok(azimuth > -35 && azimuth < 90, `azimuth ${azimuth} at ${progress}`);
    assert.ok(direction[2] < 0, `behind the tree (-z) at ${progress}`);
    assert.ok(Math.abs(Math.hypot(...direction) - 1) < 1e-9, "unit direction");
  }
  assert.ok(sunAt(center("pagoda")).direction[0] > 0 && sunAt(1).direction[0] > 0, "right of the axis at dusk");
});

test("the same progress always returns the same sun state, forward, backward or after a jump", () => {
  const forward = steps.map((progress) => sunAt(progress));
  for (let i = steps.length - 1; i >= 0; i -= 1) assert.deepEqual(sunAt(steps[i]!), forward[i]);
  sunAt(0.93);
  sunAt(0.02);
  assert.deepEqual(sunAt(0.5), forward[500]);
  assert.deepEqual(sunAt(Number.NaN), sunAt(0));
  assert.deepEqual(sunAt(7), sunAt(1));
  assert.deepEqual(sunAt(-3), sunAt(0));
});

test("key light fades from 2.4 to 0.6 and turns from white-warm to gold, never red", () => {
  assert.equal(sunAt(0).keyIntensity, 2.4);
  assert.equal(sunAt(1).keyIntensity, 0.6);
  let previous = Infinity;
  for (const progress of steps) {
    const { keyIntensity } = sunAt(progress);
    assert.ok(keyIntensity <= previous + 1e-9, `key rose at ${progress}`);
    previous = keyIntensity;
  }
  const dusk = sunAt(1).keyColor;
  assert.ok(hue(dusk) >= 35 && hue(dusk) <= 50, `dusk key hue ${hue(dusk).toFixed(1)}`);
  const day = sunAt(0).keyColor;
  assert.ok(((day >> 16) & 0xff) > 0xe0 && (day & 0xff) > 0xc0, "day key is white-warm");
  for (const progress of steps) {
    const key = sunAt(progress).keyColor;
    const red = (key >> 16) & 0xff;
    const green = (key >> 8) & 0xff;
    assert.ok(green / red > 0.62, `never red or vermilion at ${progress}`);
  }
});

test("the key light is a usable direction: never below the horizon, aligned with the sun while it is up", () => {
  for (const progress of steps) {
    const sun = sunAt(progress);
    assert.ok(sun.lightDirection[1] > 0, `light shines from above at ${progress}`);
    if (sun.elevation >= 6) assert.deepEqual(sun.lightDirection, sun.direction);
  }
  assert.ok(sunAt(1).lightDirection[1] < sunAt(0).lightDirection[1]);
});

test("sky: light neutral by day, gold at the horizon in the golden hour, forest-deep above at dusk", () => {
  const day = sunAt(0).sky;
  assert.ok(((day.horizon >> 16) & 0xff) > 0xd0 && ((day.horizon >> 8) & 0xff) > 0xd0, "light day horizon");
  const golden = sunAt(center("pruning")).sky;
  assert.ok(hue(golden.horizon) >= 35 && hue(golden.horizon) <= 50, `golden horizon hue ${hue(golden.horizon).toFixed(1)}`);
  const dusk = sunAt(1).sky;
  assert.equal(dusk.zenith, 0x0b2620);
  assert.ok(hue(dusk.horizon) >= 35 && hue(dusk.horizon) <= 50, `dusk horizon hue ${hue(dusk.horizon).toFixed(1)}`);
  for (const progress of steps) {
    const { sky } = sunAt(progress);
    for (const color of [sky.zenith, sky.horizon, sky.ground]) {
      const red = (color >> 16) & 0xff;
      const green = (color >> 8) & 0xff;
      const blue = color & 0xff;
      assert.ok(!(red > green * 1.45 && red > blue * 1.8), `no red or vermilion sky at ${progress}`);
    }
  }
});

// ── The sun is in frame where the story needs it (approved camera poses) ──
const VIEWPORTS = [
  { label: "desktop 1440x900", mobile: false, aspect: 1440 / 900 },
  { label: "mobile 390x844", mobile: true, aspect: 390 / 844 },
] as const;

function sunOnScreen(id: "pruning" | "pagoda" | "finished", mobile: boolean, aspect: number) {
  const path = createCameraPath({ mobile });
  const index = CHAPTERS.findIndex((chapter) => chapter.id === id);
  const waypoint = path.waypoints.find((candidate) => candidate.chapterIndex === index)!;
  const sun = sunAt(waypoint.progress);
  // The dome follows the camera, so the sun sits at infinity along its direction.
  const far: Vec3 = [
    waypoint.pose.position[0] + sun.direction[0] * 1000,
    waypoint.pose.position[1] + sun.direction[1] * 1000,
    waypoint.pose.position[2] + sun.direction[2] * 1000,
  ];
  return projectToScreen(waypoint.pose, aspect, far, screenAnchor(mobile));
}

test("the sun is inside the frame in pruning, pagoda and finished at 1440x900 and 390x844", () => {
  for (const viewport of VIEWPORTS) {
    for (const id of ["pruning", "pagoda", "finished"] as const) {
      const point = sunOnScreen(id, viewport.mobile, viewport.aspect);
      assert.ok(point, `${id} ${viewport.label}: in front of the camera`);
      const where = `${id} ${viewport.label}: ${point.x.toFixed(2)},${point.y.toFixed(2)}`;
      assert.ok(point.x > 0.03 && point.x < 0.97, `x in frame, ${where}`);
      assert.ok(point.y > 0.03 && point.y < 0.97, `y in frame, ${where}`);
      if (viewport.mobile) assert.ok(point.y < 0.5, `above the bottom card, ${where}`);
    }
  }
});

test("on desktop the sun sits in the right half, opposite the copy column", () => {
  for (const id of ["pruning", "pagoda", "finished"] as const) {
    const point = sunOnScreen(id, false, 1440 / 900)!;
    assert.ok(point.x > 0.5, `${id}: x ${point.x.toFixed(2)}`);
  }
});

test("the visible disc has a sensible angular size", () => {
  assert.ok(SUN_DISC_RADIUS > 1 && SUN_DISC_RADIUS < 4, "degrees");
});
