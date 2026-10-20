import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveProgress } from "../../src/lib/bonsai/conductor.ts";
import { segmentScale } from "../../src/lib/bonsai/growth.ts";
import { SEGMENT_KIND, generateBonsai } from "../../src/lib/bonsai/generator.ts";
import { createTree } from "../../src/lib/bonsai/tree.ts";
import { createGraybox } from "../../src/lib/bonsai/graybox.ts";

test("a reverse scroll sweep reproduces the forward sweep exactly", () => {
  const forward = Array.from({ length: 1001 }, (_, i) => resolveProgress(i / 1000));
  for (let i = 1000; i >= 0; i -= 1) assert.deepEqual(resolveProgress(i / 1000), forward[i]);
});

test("pruned twigs exist during branches, start vanishing in pruning and are gone at 1", () => {
  const { segments } = generateBonsai();
  const visible = (growth: number) => {
    let count = 0;
    for (let i = 0; i < segments.count; i += 1) {
      if (
        segments.kind[i] === SEGMENT_KIND.PrunedTwig &&
        segmentScale(segments.birth[i]!, segments.span[i]!, segments.death[i]!, growth) > 0
      ) {
        count += 1;
      }
    }
    return count;
  };
  const total = [...segments.kind].filter((kind) => kind === SEGMENT_KIND.PrunedTwig).length;
  assert.equal(visible(0.8), total);
  assert.ok(visible(0.9) < total);
  assert.equal(visible(1), 0);
});

test("wire draw range is empty before its reveal, full at the end of the trunk window, and reverses", () => {
  const tree = createTree(generateBonsai());
  const wire = tree.group.getObjectByName("bonsai-wire") as any;
  const total = wire.geometry.index.count;
  tree.setGrowth(0.29);
  assert.equal(wire.visible, false);
  tree.setGrowth(0.4);
  assert.equal(wire.geometry.drawRange.count, total);
  tree.setGrowth(0);
  assert.equal(wire.visible, false);
  assert.equal(wire.geometry.drawRange.count, 0);
  tree.dispose();
});

test("the seed hides once the sprout grows and returns on reverse scroll", () => {
  const graybox = createGraybox();
  const seed = graybox.group.getObjectByName("seed")!;
  graybox.setGrowth(0.06);
  assert.equal(seed.visible, false);
  graybox.setGrowth(0);
  assert.equal(seed.visible, true);
  graybox.dispose();
});
