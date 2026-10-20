import { test } from "node:test";
import assert from "node:assert/strict";
import { createFrameLoop } from "../../src/lib/bonsai/loop.ts";

function harness(stepResults: boolean[] | ((dt: number) => boolean)) {
  const queue = new Map<number, (now: number) => void>();
  let nextId = 1;
  const dts: number[] = [];
  let calls = 0;
  const loop = createFrameLoop({
    request: (callback) => {
      queue.set(nextId, callback);
      return nextId++;
    },
    cancel: (id) => {
      queue.delete(id);
    },
    step: (dt) => {
      dts.push(dt);
      calls += 1;
      return typeof stepResults === "function" ? stepResults(dt) : (stepResults[calls - 1] ?? false);
    },
  });
  const flush = (now: number) => {
    const callbacks = [...queue.values()];
    queue.clear();
    callbacks.forEach((callback) => callback(now));
  };
  return { loop, queue, flush, dts, calls: () => calls };
}

test("the loop keeps scheduling frames while the step reports activity", () => {
  const { queue, flush, loop } = harness([true, true, false]);
  loop.wake();
  assert.equal(queue.size, 1);
  flush(16);
  assert.equal(queue.size, 1, "step 1 was active");
  flush(32);
  assert.equal(queue.size, 1, "step 2 was active");
  flush(48);
  assert.equal(queue.size, 0, "step 3 was idle: no frame is scheduled");
});

test("an idle loop stays asleep until something wakes it, and wake never double-schedules", () => {
  const { queue, flush, loop, calls } = harness([false, true, false]);
  loop.wake();
  loop.wake();
  assert.equal(queue.size, 1);
  flush(16);
  assert.equal(queue.size, 0);
  assert.equal(calls(), 1);
  assert.equal(loop.sleeping, true);
  flush(1000);
  assert.equal(calls(), 1, "no frame runs while asleep");
  loop.wake();
  assert.equal(loop.sleeping, false);
  assert.equal(queue.size, 1);
  flush(1016);
  assert.equal(queue.size, 1, "the woken step was active");
  flush(1032);
  assert.equal(queue.size, 0);
});

test("the first frame after a sleep uses a nominal dt, and dt is capped after a stall", () => {
  const { flush, loop, dts } = harness(() => true);
  loop.wake();
  flush(10_000);
  flush(10_016);
  flush(20_000);
  assert.ok(Math.abs(dts[0]! - 1 / 60) < 1e-9, "no huge dt after sleeping");
  assert.ok(Math.abs(dts[1]! - 0.016) < 1e-9);
  assert.ok(Math.abs(dts[2]! - 1 / 30) < 1e-9, "capped at 1/30 s");
  loop.pause();
  loop.wake();
  flush(30_000);
  assert.ok(Math.abs(dts[3]! - 1 / 60) < 1e-9, "pause also resets the clock");
});

test("pause cancels the pending frame and stop makes wake a no-op", () => {
  const { queue, loop, calls } = harness(() => true);
  loop.wake();
  loop.pause();
  assert.equal(queue.size, 0);
  loop.wake();
  assert.equal(queue.size, 1);
  loop.stop();
  assert.equal(queue.size, 0);
  loop.wake();
  assert.equal(queue.size, 0);
  assert.equal(calls(), 0);
});
