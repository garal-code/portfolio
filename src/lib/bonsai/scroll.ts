// Native-scroll driver adapted from threejs-scroll-worlds/references/scroll-conductor.js.
// Differences: no internal RAF (the world loop calls `update`), and progress is
// scrollY / maxScroll because chapter spans already come from `scrollWeight`
// (conductor.ts), instead of measured section anchors.

export interface ScrollDriver {
  start(): void;
  stop(): void;
  /** Re-reads native scroll now (also called on scroll/resize/pageshow). */
  read(): void;
  /** Advances the damped value. Returns true while it is still moving. */
  update(dt: number): boolean;
  setReducedMotion(value: boolean): void;
  /** Exact normalized progress: drives growth, chapter state and the DOM. */
  readonly exact: number;
  /** Damped progress: drives the camera only. */
  readonly smooth: number;
  readonly direction: number;
}

export interface ScrollDriverOptions {
  damping?: number;
  reducedMotion?: boolean;
  onExactChange?: (exact: number) => void;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

export function createScrollDriver(options: ScrollDriverOptions = {}): ScrollDriver {
  const damping = options.damping ?? 5.2;
  let reduce = Boolean(options.reducedMotion);
  let exact = 0;
  let smooth = 0;
  let direction = 0;
  let previousY = 0;
  let widthAtRead = 0;
  let observer: ResizeObserver | null = null;
  let running = false;

  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const scrollY = () => window.scrollY || window.pageYOffset || 0;

  function read() {
    const y = scrollY();
    const delta = y - previousY;
    if (Math.abs(delta) > 0.25) direction = delta > 0 ? 1 : -1;
    previousY = y;
    widthAtRead = window.innerWidth;
    const next = clamp01(y / maxScroll());
    if (next !== exact) {
      exact = next;
      options.onExactChange?.(exact);
    }
  }

  function onResize() {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    // Touch browsers resize the viewport height while the URL bar moves; ignore it.
    if (coarse && window.innerWidth === widthAtRead) return;
    read();
  }

  const onScroll = () => read();

  return {
    start() {
      if (running) return;
      running = true;
      read();
      smooth = exact; // reload at depth lands on the exact state, no travel from 0
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      window.addEventListener("orientationchange", onResize, { passive: true });
      window.addEventListener("pageshow", onScroll);
      window.addEventListener("hashchange", onScroll);
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => read());
        observer.observe(document.documentElement);
      }
    },
    stop() {
      if (!running) return;
      running = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("pageshow", onScroll);
      window.removeEventListener("hashchange", onScroll);
      observer?.disconnect();
      observer = null;
    },
    read,
    update(dt: number) {
      const before = smooth;
      smooth = reduce ? exact : damp(smooth, exact, damping, dt);
      if (Math.abs(smooth - exact) < 0.0001) smooth = exact;
      return smooth !== before;
    },
    setReducedMotion(value: boolean) {
      reduce = Boolean(value);
      if (reduce) smooth = exact;
    },
    get exact() {
      return exact;
    },
    get smooth() {
      return smooth;
    },
    get direction() {
      return direction;
    },
  };
}
