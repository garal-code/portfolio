import { test } from "node:test";
import * as THREE from "three";
import assert from "node:assert/strict";
import { resolveProgress } from "../../src/lib/bonsai/conductor.ts";
import { segmentScale, wireExtent } from "../../src/lib/bonsai/growth.ts";
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
  assert.equal(wire.visible, true);
  assert.equal(wire.geometry.drawRange.count, total);
  tree.setGrowth(0);
  assert.equal(wire.visible, false);
  assert.equal(wire.geometry.drawRange.count, 0);
  tree.dispose();
});

test("the wire comes off during the pruning window: full before it, gone at growth = 1, back on reverse", () => {
  const tree = createTree(generateBonsai());
  const wire = tree.group.getObjectByName("bonsai-wire") as any;
  const total = wire.geometry.index.count;
  const drawn = () => (wire.visible ? wire.geometry.drawRange.count : 0);
  const forward: number[] = [];
  for (const growth of [0.4, 0.6, 0.8, 0.85, 0.9, 0.95, 0.99, 1]) {
    tree.setGrowth(growth);
    forward.push(drawn());
  }
  assert.equal(forward[0], total, "full at the end of the trunk window");
  assert.equal(forward[2], total, "still full when pruning starts");
  assert.ok(forward[3]! < total && forward[3]! > 0, "unwinding at 0.85");
  assert.ok(forward[4]! < forward[3]!, "shrinking at 0.9");
  assert.ok(forward[5]! < forward[4]!, "shrinking at 0.95");
  assert.equal(forward[7], 0, "nothing drawn at growth = 1");
  tree.setGrowth(1);
  assert.equal(wire.visible, false, "the wire mesh is hidden at growth = 1");

  const backward: number[] = [];
  for (const growth of [1, 0.99, 0.95, 0.9, 0.85, 0.8, 0.6, 0.4]) {
    tree.setGrowth(growth);
    backward.push(drawn());
  }
  assert.deepEqual(backward, [...forward].reverse(), "reverse scroll reproduces the forward sweep");
  assert.equal(wire.visible, true);
  tree.dispose();
});

test("wireExtent follows the trunk reveal, holds through branches, and unwinds across pruning", () => {
  assert.equal(wireExtent(0), 0);
  assert.equal(wireExtent(0.29), 0);
  assert.ok(wireExtent(0.35) > 0 && wireExtent(0.35) < 1);
  assert.equal(wireExtent(0.4), 1);
  assert.equal(wireExtent(0.7), 1);
  assert.equal(wireExtent(0.8), 1);
  assert.ok(Math.abs(wireExtent(0.9) - 0.5) < 1e-9);
  assert.equal(wireExtent(1), 0);
  for (let i = 0; i <= 1000; i += 1) {
    assert.equal(wireExtent(i / 1000), wireExtent(i / 1000), "pure");
    if (i >= 800 && i < 1000) assert.ok(wireExtent((i + 1) / 1000) <= wireExtent(i / 1000), "monotone inside pruning");
  }
});

test("the fully grown tree has a seamless trunk: one joint ball per segment hides the bends", () => {
  const data = generateBonsai();
  const tree = createTree(data);
  const joints = tree.group.getObjectByName("bonsai-joints") as any;
  assert.ok(joints, "joint mesh exists");
  assert.equal(joints.geometry.instanceCount, data.segments.count);
  assert.ok(joints.geometry.getAttribute("aStart") && joints.geometry.getAttribute("aEnd") && joints.geometry.getAttribute("aRadius"));
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

test("the seed reads as a seed: elongated, pointed, lighter husk with a split and a tiny root", () => {
  const graybox = createGraybox();
  const seed = graybox.group.getObjectByName("seed")!;
  const size = new THREE.Box3().setFromObject(seed).getSize(new THREE.Vector3());
  assert.ok(size.x >= 2.2 && size.x <= 3.6, `length ${size.x}`);
  assert.ok(size.x / Math.max(size.y, size.z) >= 1.5, "elongated, not a pebble");
  const husk = seed.getObjectByName("seed-husk") as THREE.Mesh;
  assert.ok(husk, "husk");
  const color = (husk.material as THREE.MeshStandardMaterial).color;
  const pebble = new THREE.Color(0x7a6f5c);
  assert.ok(color.r + color.g + color.b > pebble.r + pebble.g + pebble.b + 0.2, "lighter than the Gate 2 pebble tone");
  assert.ok(seed.getObjectByName("seed-split"), "split line");
  assert.ok(seed.getObjectByName("seed-root"), "tiny root");

  // pointed: the husk narrows towards +x (tip) much more than a sphere would
  const position = husk.geometry.getAttribute("position");
  let tipRadius = 0;
  let midRadius = 0;
  for (let i = 0; i < position.count; i += 1) {
    const radial = Math.hypot(position.getY(i), position.getZ(i));
    if (position.getX(i) > 0.95 * size.x * 0.5) tipRadius = Math.max(tipRadius, radial);
    if (Math.abs(position.getX(i)) < 0.1) midRadius = Math.max(midRadius, radial);
  }
  assert.ok(tipRadius < midRadius * 0.45, `tip ${tipRadius} vs middle ${midRadius}`);

  graybox.setGrowth(0.06);
  assert.equal(seed.visible, false);
  graybox.setGrowth(0);
  assert.equal(seed.visible, true);
  graybox.dispose();
});
