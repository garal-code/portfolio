import { test } from "node:test";
import assert from "node:assert/strict";
import { createScrubber, type VideoLike } from "../../src/lib/bonsai/scrub.ts";

const FRAME = 1 / 30;

function fakeVideo(overrides: Partial<{ readyState: number; duration: number; error: unknown; throwOnSeek: boolean }> = {}) {
  const writes: number[] = [];
  let time = 0;
  const video = {
    seeking: false,
    readyState: overrides.readyState ?? 4,
    duration: overrides.duration ?? 20,
    error: overrides.error ?? null,
    get currentTime() {
      return time;
    },
    set currentTime(value: number) {
      if (overrides.throwOnSeek) throw new Error("seek failed");
      writes.push(value);
      time = value;
      video.seeking = true;
    },
  };
  return { video: video as VideoLike & { seeking: boolean; currentTime: number }, writes, setTime: (value: number) => (time = value) };
}

const settle = (scrubber: ReturnType<typeof createScrubber>, video: { seeking: boolean }, frames = 600) => {
  let active = true;
  for (let i = 0; i < frames && active; i += 1) {
    video.seeking = false; // the previous seek finished
    active = scrubber.step(1 / 60);
  }
  return active;
};

test("the scrubber eases towards the target and goes idle once the video is there", () => {
  const { video, writes } = fakeVideo();
  const scrubber = createScrubber(video);
  scrubber.setTarget(0.5);
  assert.equal(scrubber.step(1 / 60), true);
  assert.ok(writes[0]! > 0 && writes[0]! < 0.5, "first step is a partial move (damping)");
  assert.equal(settle(scrubber, video), false, "idle at the end");
  assert.ok(Math.abs(video.currentTime - 0.5) < FRAME / 2);
  video.seeking = false;
  assert.equal(scrubber.step(1 / 60), false);
});

test("no new seek is issued while one is pending, and the loop stays awake until it lands", () => {
  const { video, writes } = fakeVideo();
  const scrubber = createScrubber(video);
  scrubber.setTarget(0.6);
  scrubber.step(1 / 60);
  assert.equal(writes.length, 1);
  assert.equal(video.seeking, true);
  for (let i = 0; i < 20; i += 1) assert.equal(scrubber.step(1 / 60), true);
  assert.equal(writes.length, 1, "seeking blocks every further seek");
  video.seeking = false;
  scrubber.step(1 / 60);
  assert.equal(writes.length, 2, "the next seek goes out after seeked");
  assert.ok(writes[1]! > writes[0]!);
});

test("seeks smaller than half a frame are skipped", () => {
  const { video, writes, setTime } = fakeVideo();
  setTime(5);
  const scrubber = createScrubber(video);
  scrubber.setTarget(5);
  scrubber.snap();
  assert.equal(scrubber.step(1 / 60), false);
  assert.equal(writes.length, 0, "already there");
  scrubber.setTarget(5 + FRAME * 0.4);
  assert.equal(scrubber.step(1 / 60), false);
  assert.equal(writes.length, 0);
  scrubber.setTarget(5 + FRAME * 0.6);
  assert.equal(settle(scrubber, video), false);
  assert.ok(writes.length >= 1);
});

test("reduced motion jumps straight to the target with no damping", () => {
  const { video, writes } = fakeVideo();
  const scrubber = createScrubber(video, { reducedMotion: true });
  scrubber.setTarget(12.8);
  scrubber.step(1 / 60);
  assert.deepEqual(writes, [12.8]);
  scrubber.setReducedMotion(false);
  scrubber.setTarget(13.2);
  video.seeking = false;
  scrubber.step(1 / 60);
  assert.ok(writes[1]! > 12.8 && writes[1]! < 13.2, "damping is back");
});

test("snap lands on the target at once (reload at depth)", () => {
  const { video, writes } = fakeVideo();
  const scrubber = createScrubber(video);
  scrubber.setTarget(9.4);
  scrubber.snap();
  scrubber.step(1 / 60);
  assert.deepEqual(writes, [9.4]);
});

test("the target is clamped inside the video, never to its duration", () => {
  const { video, writes } = fakeVideo({ duration: 20 });
  const scrubber = createScrubber(video, { reducedMotion: true });
  scrubber.setTarget(99);
  scrubber.step(1 / 60);
  assert.ok(writes[0]! < 20 && writes[0]! >= 20 - 2 * FRAME);
  scrubber.setTarget(-4);
  video.seeking = false;
  scrubber.step(1 / 60);
  assert.equal(writes[1], 0);
});

test("without metadata or with a media error the scrubber never seeks and never throws", () => {
  for (const overrides of [{ readyState: 0 }, { error: { code: 4 } }, { throwOnSeek: true }]) {
    const { video, writes } = fakeVideo(overrides);
    const scrubber = createScrubber(video, { reducedMotion: true });
    scrubber.setTarget(7);
    assert.doesNotThrow(() => scrubber.step(1 / 60));
    assert.equal(scrubber.step(1 / 60), false, "idle: wake() resumes when the video is ready");
    assert.equal(writes.length, 0);
  }
});

test("a 10 s jump is eased: the first step moves part of the way and never overshoots", () => {
  const { video, writes } = fakeVideo();
  const scrubber = createScrubber(video);
  scrubber.setTarget(10);
  assert.equal(scrubber.step(1 / 60), true);
  assert.equal(writes.length, 1);
  assert.ok(writes[0]! > 0.5 && writes[0]! < 10, `first step is a partial move (${writes[0]})`);
  for (let i = 0; i < 120; i += 1) {
    video.seeking = false;
    scrubber.step(1 / 60);
  }
  assert.ok(writes.length > 5, "a fast scroll travels through intermediate frames");
  for (let i = 1; i < writes.length; i += 1) assert.ok(writes[i]! >= writes[i - 1]!, "monotonic");
  assert.ok(writes.every((time) => time <= 10), "never overshoots the target");
  assert.ok(writes.slice(0, -1).every((time) => time < 10), "only the last seek lands on the target");
});

test("there is no distance at which the scrubber jumps straight to the target", () => {
  for (const distance of [0.76, 3, 10, 19]) {
    const { video, writes } = fakeVideo();
    const scrubber = createScrubber(video);
    scrubber.setTarget(distance);
    scrubber.step(1 / 60);
    assert.equal(writes.length, 1);
    assert.ok(writes[0]! < distance, `${distance} s: first seek is short of the target`);
  }
});

test("a 10 s jump settles on the target within about 0.6 s of 60 Hz steps", () => {
  const { video } = fakeVideo();
  const scrubber = createScrubber(video);
  scrubber.setTarget(10);
  let frames = 0;
  let active = true;
  while (active && frames < 600) {
    video.seeking = false;
    active = scrubber.step(1 / 60);
    frames += 1;
  }
  assert.equal(active, false);
  assert.ok(frames <= 36, `settled in ${frames} frames (${Math.round((frames * 1000) / 60)} ms)`);
  assert.ok(Math.abs(video.currentTime - 10) < FRAME / 2);
});

test("a 10 s jump backwards is eased and settles just as fast", () => {
  const { video, writes, setTime } = fakeVideo();
  setTime(19.9);
  const scrubber = createScrubber(video);
  scrubber.setTarget(19.9);
  scrubber.snap();
  scrubber.setTarget(9.9);
  assert.equal(scrubber.step(1 / 60), true);
  assert.equal(writes.length, 1);
  assert.ok(writes[0]! < 19.9 && writes[0]! > 9.9, `first step is a partial move back (${writes[0]})`);
  let frames = 1;
  let active = true;
  while (active && frames < 600) {
    video.seeking = false;
    active = scrubber.step(1 / 60);
    frames += 1;
  }
  assert.equal(active, false);
  assert.ok(frames <= 36, `settled in ${frames} frames`);
  assert.ok(writes.every((time) => time >= 9.9), "never overshoots");
  for (let i = 1; i < writes.length; i += 1) assert.ok(writes[i]! <= writes[i - 1]!, "monotonic");
  assert.ok(Math.abs(video.currentTime - 9.9) < FRAME / 2);
});

test("the next seek goes out on the very next step after a seek lands, even mid-travel", () => {
  const { video, writes } = fakeVideo();
  const scrubber = createScrubber(video);
  scrubber.setTarget(10);
  scrubber.step(1 / 60);
  assert.equal(writes.length, 1);
  video.seeking = false; // `seeked` fired; the mount wakes the loop
  assert.equal(scrubber.step(1 / 60), true);
  assert.equal(writes.length, 2);
  assert.ok(writes[1]! > writes[0]!);
});

test("a move under one second also settles within about 300 ms", () => {
  const { video } = fakeVideo();
  const scrubber = createScrubber(video);
  scrubber.setTarget(0.7);
  let frames = 0;
  let active = true;
  while (active && frames < 120) {
    video.seeking = false;
    active = scrubber.step(1 / 60);
    frames += 1;
  }
  assert.equal(active, false);
  assert.ok(frames <= 20, `settled in ${frames} frames (${Math.round((frames * 1000) / 60)} ms)`);
  assert.ok(Math.abs(video.currentTime - 0.7) < FRAME / 2);
});
