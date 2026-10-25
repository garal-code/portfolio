import { test } from "node:test";
import assert from "node:assert/strict";
import { growthWindow } from "../../src/lib/bonsai/chapters.ts";
import { DEATH_SPAN, segmentScale } from "../../src/lib/bonsai/growth.ts";
import { SEGMENT_KIND, generateBonsai, trunkCenterAt } from "../../src/lib/bonsai/generator.ts";
import { jobs } from "../../src/data/resume.ts";

const EPS = 1e-6;
const bonsai = generateBonsai(7);

test("generator is deterministic for a seed and differs for another seed", () => {
  assert.deepEqual(generateBonsai(7), generateBonsai(7));
  assert.notDeepEqual(generateBonsai(8).segments.end, generateBonsai(7).segments.end);
  assert.notDeepEqual(generateBonsai(8).segments.death, generateBonsai(7).segments.death);
});

test("tree is a ~45 unit tall informal-upright with soil at the origin and a ~4 unit trunk base", () => {
  const { segments } = bonsai;
  let top = -Infinity;
  let bottom = Infinity;
  for (let index = 0; index < segments.count; index += 1) {
    top = Math.max(top, segments.end[index * 3 + 1]!);
    bottom = Math.min(bottom, segments.start[index * 3 + 1]!);
  }
  assert.ok(top >= 42 && top <= 48, `height ${top}`);
  assert.equal(bottom, 0);
  assert.deepEqual([...segments.start.slice(0, 3)], [0, 0, 0]);
  assert.ok(Math.abs(segments.radiusStart[0]! * 2 - 4) < 0.5);
});

test("every birth and death lies in [0,1] with birth < death, for segments and pads", () => {
  const { segments, pads } = bonsai;
  assert.ok(segments.count > 100);
  for (let index = 0; index < segments.count; index += 1) {
    const birth = segments.birth[index]!;
    const death = segments.death[index]!;
    assert.ok(birth >= 0 && birth <= 1, `birth ${birth}`);
    assert.ok(death >= 0 && death <= 1, `death ${death}`);
    assert.ok(birth < death, `birth ${birth} < death ${death}`);
    assert.ok(birth + segments.span[index]! <= death + EPS, "fully grown before it can die");
  }
  assert.ok(pads.count > 0);
  for (let index = 0; index < pads.count; index += 1) {
    assert.ok(pads.birth[index]! >= 0 && pads.birth[index]! + pads.span[index]! <= 1 + EPS);
  }
});

test("exactly 4 career branches, born bottom-up in chronological job order inside the branches window", () => {
  const window = growthWindow("branches");
  const { segments, branches } = bonsai;
  assert.equal(branches.length, 4);
  assert.equal(branches.length, jobs.length);

  const careerIds = new Set<number>();
  for (let index = 0; index < segments.count; index += 1) {
    if (segments.kind[index] === SEGMENT_KIND.Branch) careerIds.add(segments.branchId[index]!);
  }
  assert.deepEqual([...careerIds].sort(), [1, 2, 3, 4]);

  for (let k = 0; k < 4; k += 1) {
    const branch = branches[k]!;
    assert.equal(branch.id, k + 1);
    assert.ok(branch.birthFrom >= window.from - EPS && branch.birthTo <= window.to + EPS);
    // every segment of the branch (main, twigs, pruned twigs) is born inside its slice of the window
    for (let index = 0; index < segments.count; index += 1) {
      if (segments.branchId[index] !== branch.id) continue;
      assert.ok(segments.birth[index]! >= branch.birthFrom - EPS);
      assert.ok(segments.birth[index]! + segments.span[index]! <= branch.birthTo + EPS);
    }
    if (k > 0) {
      const previous = branches[k - 1]!;
      assert.ok(branch.birthFrom >= previous.birthTo - EPS, "births do not overlap and are ordered");
      assert.ok(branch.attachY > previous.attachY, "bottom-up by height");
      assert.ok(jobs[branch.jobIndex]!.startDate > jobs[previous.jobIndex]!.startDate, "chronological jobs");
    }
  }
  assert.equal(new Set(branches.map((branch) => branch.jobIndex)).size, 4);
});

test("pruned twigs all die inside the pruning window and none is visible at growth = 1", () => {
  const pruning = growthWindow("pruning");
  const { segments } = bonsai;
  let pruned = 0;
  for (let index = 0; index < segments.count; index += 1) {
    const death = segments.death[index]!;
    const birth = segments.birth[index]!;
    const scale = segmentScale(birth, segments.span[index]!, death, 1);
    if (segments.kind[index] === SEGMENT_KIND.PrunedTwig) {
      pruned += 1;
      assert.ok(death < 1);
      assert.ok(death <= pruning.to + EPS && death - DEATH_SPAN >= pruning.from - EPS, `death ${death}`);
      assert.equal(scale, 0);
      assert.ok(segmentScale(birth, segments.span[index]!, death, pruning.from - EPS) > 0, "visible before pruning");
    } else {
      assert.equal(death, 1);
      assert.ok(scale > 0.999, `kept segment ${index} must be fully grown at 1 (got ${scale})`);
    }
  }
  assert.ok(pruned >= 8, `expected extra twigs, got ${pruned}`);
});

test("foliage pads have their own birth, inside the branches window", () => {
  const window = growthWindow("branches");
  const { pads } = bonsai;
  assert.ok(pads.count >= 10);
  const births = new Set<number>();
  for (let index = 0; index < pads.count; index += 1) {
    births.add(pads.birth[index]!);
    assert.ok(pads.birth[index]! >= window.from - EPS && pads.birth[index]! + pads.span[index]! <= window.to + EPS);
    assert.ok(pads.loose[index]! >= 1);
  }
  assert.ok(births.size > pads.count / 2, "pads do not all share one birth");
});

test("wire spirals the trunk 5 turns and its reveal lies inside the trunk window", () => {
  const trunk = growthWindow("trunk");
  const { wire } = bonsai;
  assert.equal(wire.turns, 5);
  assert.ok(wire.from >= trunk.from - EPS && wire.to <= trunk.to + EPS && wire.from < wire.to);
  assert.equal(wire.birth.length, wire.count);
  assert.equal(wire.points.length, wire.count * 3);
  for (let index = 0; index < wire.count; index += 1) {
    assert.ok(wire.birth[index]! >= wire.from - EPS && wire.birth[index]! <= wire.to + EPS);
    if (index > 0) assert.ok(wire.birth[index]! >= wire.birth[index - 1]! - EPS, "revealed in path order");
  }

  // winding: the angle around the trunk axis advances 5 full turns
  let turned = 0;
  let previousAngle: number | null = null;
  for (let index = 0; index < wire.count; index += 1) {
    const y = wire.points[index * 3 + 1]!;
    const center = trunkCenterAt(bonsai, y);
    const angle = Math.atan2(wire.points[index * 3 + 2]! - center[2], wire.points[index * 3]! - center[0]);
    if (previousAngle !== null) {
      let delta = angle - previousAngle;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      turned += delta;
    }
    previousAngle = angle;
  }
  assert.ok(Math.abs(Math.abs(turned) / (2 * Math.PI) - 5) < 0.05, `turns ${Math.abs(turned) / (2 * Math.PI)}`);
});

test("growth time comes from chapter windows: trunk and sprout births sit in their chapters", () => {
  const sprout = growthWindow("sprout");
  const trunk = growthWindow("trunk");
  const { segments } = bonsai;
  for (let index = 0; index < segments.count; index += 1) {
    if (segments.kind[index] !== SEGMENT_KIND.Trunk) continue;
    assert.ok(segments.birth[index]! >= sprout.from - EPS);
    assert.ok(segments.birth[index]! + segments.span[index]! <= trunk.to + EPS);
  }
  assert.ok(segments.birth[0]! >= sprout.from - EPS && segments.birth[0]! + segments.span[0]! <= sprout.to + EPS, "first trunk segment is the sprout");
});
