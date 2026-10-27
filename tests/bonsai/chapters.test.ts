import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, CHAPTER_IDS } from "../../src/lib/bonsai/chapters.ts";

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
