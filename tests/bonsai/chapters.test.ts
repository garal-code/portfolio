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

test("single-stop camera endpoints and mobile overrides match world bible section 5", () => {
  const expected = {
    seed: { position: [0, 6, 22], target: [0, 0.5, 0], fov: 35, mPos: [0, 9, 30], mFov: 46 },
    sprout: { position: [-8, 4, 16], target: [0, 3, 0], fov: 34, mPos: [-6, 7, 24], mFov: 46 },
    trunk: { position: [10, 14, 24], target: [0, 12, 0], fov: 36, mPos: [8, 16, 34], mFov: 48 },
    pruning: { position: [14, 34, 30], target: [0, 32, 0], fov: 34, mPos: [10, 36, 42], mFov: 46 },
    pagoda: { position: [-20, 8, 26], target: [-14, 5, 0], fov: 32, mPos: [-18, 10, 36], mFov: 44 },
    finished: { position: [0, 30, 95], target: [0, 18, 0], fov: 32, mPos: [0, 34, 130], mFov: 42 },
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

test("branches expands into 4 sub-stops rising 8 to 38 with a 25% mobile pull back", () => {
  const branches = CHAPTERS.find((chapter) => chapter.id === "branches")!;
  assert.equal(branches.stops.length, 4);
  assert.equal(branches.mobileStops.length, 4);
  assert.deepEqual(
    branches.stops.map((stop) => stop.target[1]),
    [8, 18, 28, 38],
  );
  assert.ok(branches.stops.every((stop) => stop.fov === 38 && stop.position[0] === -6 && stop.position[2] === 40));
  const meanY = branches.stops.reduce((sum, stop) => sum + stop.position[1], 0) / 4;
  assert.equal(meanY, 26);

  branches.stops.forEach((stop, index) => {
    const mobile = branches.mobileStops[index]!;
    for (let axis = 0; axis < 3; axis += 1) {
      const pulled = stop.target[axis]! + (stop.position[axis]! - stop.target[axis]!) * 1.25;
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
