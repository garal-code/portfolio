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

test("a jump over 0.75 s seeks straight to the target: one seek, no damping", () => {
  const { video, writes } = fakeVideo();
  const scrubber = createScrubber(video);
  scrubber.setTarget(15.6);
  assert.equal(scrubber.step(1 / 60), true);
  assert.deepEqual(writes, [15.6]);
  for (let i = 0; i < 10; i += 1) scrubber.step(1 / 60);
  assert.deepEqual(writes, [15.6], "still one seek while it is pending");
  video.seeking = false;
  assert.equal(scrubber.step(1 / 60), false, "landed: idle");
  assert.deepEqual(writes, [15.6]);
});

test("the jump threshold is 0.75 s: just under it eases, just over it jumps", () => {
  const under = fakeVideo();
  const a = createScrubber(under.video);
  a.setTarget(0.74);
  a.step(1 / 60);
  assert.ok(under.writes[0]! < 0.74, "eased");
  const over = fakeVideo();
  const b = createScrubber(over.video);
  b.setTarget(0.76);
  b.step(1 / 60);
  assert.deepEqual(over.writes, [0.76]);
});

test("a big jump backwards also lands at once (finished to pagoda)", () => {
  const { video, writes, setTime } = fakeVideo();
  setTime(19.9);
  const scrubber = createScrubber(video);
  scrubber.setTarget(19.9);
  scrubber.snap();
  scrubber.setTarget(15.6);
  scrubber.step(1 / 60);
  assert.deepEqual(writes, [15.6]);
});

test("below the jump threshold the video settles within about 300 ms", () => {
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
