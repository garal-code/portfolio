import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, CHAPTER_IDS, growthWindow } from "../../src/lib/bonsai/chapters.ts";

const S3_ORDER = ["seed", "sprout", "trunk", "branches", "pruning", "pagoda", "finished"];

test("chapters are the 7 approved S3 chapters in order", () => {
  assert.deepEqual([...CHAPTER_IDS], S3_ORDER);
  assert.deepEqual(
    CHAPTERS.map((chapter) => chapter.id),
    S3_ORDER,
  );
});

test("scroll weights follow the world bible ledger", () => {
  assert.deepEqual(
    CHAPTERS.map((chapter) => chapter.scrollWeight),
    [1.2, 1.0, 1.4, 2.4, 1.2, 1.2, 1.0],
  );
});

test("single-stop camera endpoints and mobile overrides match world bible section 5 (Gate 2 corrections)", () => {
  const expected = {
    seed: { position: [0, 8, 30], target: [0, 0.5, 0], fov: 35, mPos: [0, 12, 40], mFov: 46 },
    sprout: { position: [-10, 5.5, 22], target: [0, 3, 0], fov: 34, mPos: [-8, 9.5, 32], mFov: 46 },
    trunk: { position: [28, 32, 64], target: [0, 22, 0], fov: 36, mPos: [22, 30, 87], mFov: 50 },
    pruning: { position: [35, 40, 75], target: [0, 32, 0], fov: 34, mPos: [31, 50, 130], mFov: 46 },
    pagoda: { position: [-24, 12, 42.5], target: [-14, 7, 0], fov: 32, mPos: [-19.5, 11, 49], mFov: 44 },
    finished: { position: [0, 34, 128], target: [0, 18, 0], fov: 32, mPos: [0, 41, 188], mFov: 42 },
  } as const;

  for (const [id, want] of Object.entries(expected)) {
    const chapter = CHAPTERS.find((candidate) => candidate.id === id)!;
    assert.equal(chapter.stops.length, 1, `${id} has a single stop`);
    assert.deepEqual(chapter.stops[0]!.position, want.position, `${id} position`);
    assert.deepEqual(chapter.stops[0]!.target, want.target, `${id} target`);
    assert.equal(chapter.stops[0]!.fov, want.fov, `${id} fov`);
    assert.deepEqual(chapter.mobileStops[0]!.position, want.mPos, `${id} mobile position`);
    assert.equal(chapter.mobileStops[0]!.fov, want.mFov, `${id} mobile fov`);
    assert.deepEqual(chapter.mobileStops[0]!.target, want.target, `${id} mobile target is inherited`);
  }
});

test("branches expands into 4 sub-stops rising 8 to 38, with the mobile stops pulled back 40% from desktop", () => {
  const branches = CHAPTERS.find((chapter) => chapter.id === "branches")!;
  assert.equal(branches.stops.length, 4);
  assert.equal(branches.mobileStops.length, 4);
  assert.deepEqual(
    branches.stops.map((stop) => stop.target[1]),
    [8, 18, 28, 38],
  );
  assert.ok(branches.stops.every((stop) => stop.fov === 38 && stop.target[0] === 0 && stop.target[2] === 0));
  const cameraY = branches.stops.map((stop) => stop.position[1]);
  assert.deepEqual(cameraY, [...cameraY].sort((a, b) => a - b), "the camera rises with the branches");

  branches.stops.forEach((stop, index) => {
    const mobile = branches.mobileStops[index]!;
    assert.equal(mobile.fov, 46);
    for (let axis = 0; axis < 3; axis += 1) {
      const pulled = stop.target[axis]! + (stop.position[axis]! - stop.target[axis]!) * 1.4;
      assert.ok(Math.abs(mobile.position[axis]! - pulled) < 1e-9, `stop ${index} axis ${axis}`);
    }
  });
});

test("growth windows are contiguous, ordered and cover 0 to 1", () => {
  assert.equal(CHAPTERS[0]!.growth.from, 0);
  assert.equal(CHAPTERS[CHAPTERS.length - 1]!.growth.to, 1);
  for (let index = 1; index < CHAPTERS.length; index += 1) {
    assert.equal(CHAPTERS[index]!.growth.from, CHAPTERS[index - 1]!.growth.to);
  }
  for (const chapter of CHAPTERS) {
    assert.ok(chapter.growth.to >= chapter.growth.from);
    assert.deepEqual(growthWindow(chapter.id), chapter.growth);
  }
});
