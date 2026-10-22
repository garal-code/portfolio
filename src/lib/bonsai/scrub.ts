// Video scrubber: eases a desired time towards the scroll target and seeks the
// video without seek storms. DOM-free (takes a `VideoLike`), so tests drive it
// with a fake. It never plays the video; the loop (loop.ts) calls `step`.
// Small moves are eased; a jump over 0.75 s is one seek straight to the target.

import { VIDEO_END, VIDEO_FPS } from "./video.ts";

/** The slice of HTMLVideoElement the scrubber needs. */
export interface VideoLike {
  currentTime: number;
  readonly seeking: boolean;
  readonly readyState: number;
  readonly duration: number;
  readonly error: unknown;
}

export interface ScrubberOptions {
  /** Easing rate in 1/s; the remaining distance shrinks by 1 - e^(-damping * dt). */
  damping?: number;
  fps?: number;
  reducedMotion?: boolean;
}

export interface Scrubber {
  setTarget(time: number): void;
  setReducedMotion(value: boolean): void;
  /** Jumps the eased time to the target (first frame, reload at depth). */
  snap(): void;
  /** Runs one frame. Returns true while the video is still travelling or a seek is pending. */
  step(dt: number): boolean;
  readonly target: number;
}

const HAVE_METADATA = 1;
/** A target further than this from the video is reached with one seek, not eased. */
const JUMP_SECONDS = 0.75;

export function createScrubber(video: VideoLike, options: ScrubberOptions = {}): Scrubber {
  const damping = options.damping ?? 14; // settles a sub-jump move in ~300 ms
  const frame = 1 / (options.fps ?? VIDEO_FPS);
  const half = frame / 2;
  let reduced = Boolean(options.reducedMotion);
  let target = 0;
  let desired = 0;

  const goal = () => {
    const last = Number.isFinite(video.duration) && video.duration > 0 ? video.duration - frame : VIDEO_END;
    return Math.min(Math.max(target, 0), last);
  };

  return {
    setTarget(time) {
      target = Number.isFinite(time) ? time : 0;
    },
    setReducedMotion(value) {
      reduced = Boolean(value);
    },
    snap() {
      desired = goal();
    },
    step(dt) {
      // Not ready (or broken): stay idle. The mount wakes the loop on load events.
      if (video.error || video.readyState < HAVE_METADATA) return false;
      const end = goal();
      if (reduced || Math.abs(end - video.currentTime) > JUMP_SECONDS) desired = end;
      else {
        desired += (end - desired) * (1 - Math.exp(-damping * dt));
        if (Math.abs(end - desired) < half) desired = end;
      }
      if (video.seeking) return true;
      if (Math.abs(desired - video.currentTime) >= half) {
        try {
          video.currentTime = desired;
        } catch {
          return false;
        }
        return true;
      }
      return desired !== end;
    },
    get target() {
      return target;
    },
  };
}
