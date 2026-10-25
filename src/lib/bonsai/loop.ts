// Animation-frame loop that sleeps. The step reports whether anything is still
// changing; when it is not, no frame is scheduled until `wake()` is called
// (scroll, resize, visibility, pointer). Scheduler injected so tests can drive it.

export interface FrameLoopOptions {
  request(callback: (now: number) => void): number;
  cancel(id: number): void;
  /** Runs one frame. Return true while the scene keeps changing. */
  step(dt: number): boolean;
  /** Longest dt handed to `step`, so a stalled tab does not jump (default 1/30 s). */
  maxDt?: number;
}

export interface FrameLoop {
  /** Schedules a frame if the loop is asleep. Safe to call from any event. */
  wake(): void;
  /** Cancels the pending frame; `wake()` resumes. */
  pause(): void;
  /** Cancels the pending frame for good: `wake()` becomes a no-op. */
  stop(): void;
  readonly sleeping: boolean;
}

const NOMINAL_DT = 1 / 60;

export function createFrameLoop(options: FrameLoopOptions): FrameLoop {
  const maxDt = options.maxDt ?? 1 / 30;
  let frame = 0;
  let last = 0;
  let stopped = false;

  function tick(now: number) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, maxDt) : NOMINAL_DT;
    last = now;
    const active = options.step(dt);
    if (active && !stopped && !frame) frame = options.request(tick);
    if (!active && !frame) last = 0;
  }

  function cancelPending() {
    if (frame) options.cancel(frame);
    frame = 0;
    last = 0;
  }

  return {
    wake() {
      if (!frame && !stopped) frame = options.request(tick);
    },
    pause: cancelPending,
    stop() {
      stopped = true;
      cancelPending();
    },
    get sleeping() {
      return frame === 0;
    },
  };
}
