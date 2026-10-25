import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS } from "../../src/lib/bonsai/chapters.ts";
import { chapterSpans, createCameraPath, resolveProgress } from "../../src/lib/bonsai/conductor.ts";

const EPS = 1e-9;

test("progress 0 is the seed chapter and progress 1 is the finished chapter", () => {
  const first = resolveProgress(0);
  assert.equal(first.id, "seed");
  assert.equal(first.index, 0);
  assert.equal(first.local, 0);
  assert.equal(first.growth, 0);

  const last = resolveProgress(1);
  assert.equal(last.id, "finished");
  assert.equal(last.index, CHAPTERS.length - 1);
  assert.equal(last.local, 1);
  assert.equal(last.growth, 1);
});

test("each chapter boundary maps to the right chapter in S3 order", () => {
  const spans = chapterSpans();
  assert.deepEqual(
    spans.map((span) => span.id),
    ["seed", "sprout", "trunk", "branches", "pruning", "pagoda", "finished"],
  );
  assert.equal(spans[0]!.start, 0);
  assert.ok(Math.abs(spans[spans.length - 1]!.end - 1) < EPS);

  spans.forEach((span, index) => {
    assert.equal(resolveProgress(span.start).id, span.id, `start of ${span.id}`);
    assert.equal(resolveProgress(span.start).local, 0);
    const middle = resolveProgress((span.start + span.end) / 2);
    assert.equal(middle.id, span.id, `middle of ${span.id}`);
    assert.ok(Math.abs(middle.local - 0.5) < 1e-6);
    if (index > 0) {
      assert.equal(resolveProgress(span.start - 1e-6).id, spans[index - 1]!.id, `just before ${span.id}`);
    }
  });
});

test("span widths are proportional to scroll weight", () => {
  const total = CHAPTERS.reduce((sum, chapter) => sum + chapter.scrollWeight, 0);
  chapterSpans().forEach((span, index) => {
    assert.ok(Math.abs(span.end - span.start - CHAPTERS[index]!.scrollWeight / total) < EPS);
  });
});

test("the same progress returns an identical state regardless of the previous progress", () => {
  const target = 0.5;
  const direct = resolveProgress(target);
  for (const previous of [0, 0.13, 0.99, 1, 0.5]) {
    resolveProgress(previous);
    assert.deepEqual(resolveProgress(target), direct);
  }

  const path = createCameraPath();
  const pose = path.at(target);
  path.at(0.9);
  path.at(0.1);
  assert.deepEqual(path.at(target), pose);
});

test("growth is monotonic in progress and maps from the chapter windows", () => {
  let previous = -1;
  for (let step = 0; step <= 2000; step += 1) {
    const { growth } = resolveProgress(step / 2000);
    assert.ok(growth >= previous - EPS);
    previous = growth;
  }
  for (const span of chapterSpans()) {
    const chapter = CHAPTERS[span.index]!;
    assert.ok(Math.abs(resolveProgress(span.start).growth - chapter.growth.from) < 1e-9, `${span.id} from`);
    assert.ok(Math.abs(resolveProgress((span.start + span.end) / 2).growth - (chapter.growth.from + chapter.growth.to) / 2) < 1e-9);
  }
});

test("out-of-range progress is clamped", () => {
  assert.deepEqual(resolveProgress(-3), resolveProgress(0));
  assert.deepEqual(resolveProgress(7), resolveProgress(1));
});

test("branches reports one sub-stop per job across its span", () => {
  const branches = chapterSpans().find((span) => span.id === "branches")!;
  const width = branches.end - branches.start;
  const stops = [0.05, 0.3, 0.55, 0.95].map((fraction) => resolveProgress(branches.start + width * fraction).stop);
  assert.deepEqual(stops, [0, 1, 2, 3]);
  assert.equal(resolveProgress(0).stop, 0);
});

test("camera path hits the first and last endpoints and is continuous", () => {
  const path = createCameraPath();
  const first = path.at(0);
  assert.deepEqual(first.position, [0, 8, 30]);
  assert.deepEqual(first.target, [0, 0.5, 0]);
  assert.equal(first.fov, 35);
  const last = path.at(1);
  assert.deepEqual(last.position, [0, 34, 128]);
  assert.equal(last.fov, 32);

  let previous = path.at(0);
  for (let step = 1; step <= 4000; step += 1) {
    const pose = path.at(step / 4000);
    const jump = Math.hypot(
      pose.position[0] - previous.position[0],
      pose.position[1] - previous.position[1],
      pose.position[2] - previous.position[2],
    );
    assert.ok(jump < 2, `position jump ${jump} at step ${step}`);
    assert.ok(Math.abs(pose.fov - previous.fov) < 0.1);
    previous = pose;
  }
});

test("camera path passes through every waypoint with its own pose", () => {
  for (const mobile of [false, true]) {
    const path = createCameraPath({ mobile });
    assert.equal(path.waypoints.length, 10);
    for (const waypoint of path.waypoints) {
      const pose = path.at(waypoint.progress);
      pose.position.forEach((value, axis) => {
        assert.ok(Math.abs(value - waypoint.pose.position[axis]!) < 1e-6, `${waypoint.label} axis ${axis}`);
      });
      assert.ok(Math.abs(pose.fov - waypoint.pose.fov) < 1e-9);
    }
  }
});

test("mobile camera path uses the mobile overrides", () => {
  const desktop = createCameraPath({ mobile: false });
  const mobile = createCameraPath({ mobile: true });
  assert.deepEqual(mobile.at(0).position, [0, 12, 40]);
  assert.equal(mobile.at(0).fov, 46);
  assert.notDeepEqual(mobile.at(0.5), desktop.at(0.5));
});
