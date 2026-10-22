// Client glue for the /bonsai video background: scroll -> video time (video.ts,
// measured from the real section positions),
// eased and seeked by the scrubber (scrub.ts) on the idle-aware frame loop
// (loop.ts). The video is never played; it is only seeked. Every failure path
// keeps the poster on screen and none throws.

import { createFrameLoop } from "./loop.ts";
import { createScrollDriver } from "./scroll.ts";
import { createScrubber } from "./scrub.ts";
import { createVideoTimeMap, videoAnchors, type ScrollAnchor, type VideoTimeMap } from "./video.ts";

type VideoState = "loading" | "ready" | "error";

const scrollTop = () => window.scrollY || window.pageYOffset || 0;

/**
 * Reads, from the DOM, the scroll position where each chapter section and each
 * career card (`data-branch-stop`) is centred in the viewport. Chapter anchors
 * also get `enter`, where the section top crosses the viewport centre.
 */
function measure(): VideoTimeMap {
  const view = window.innerHeight;
  const y = scrollTop();
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - view);
  const anchors: ScrollAnchor[] = [];
  for (const anchor of videoAnchors()) {
    const element =
      anchor.stop === undefined
        ? document.querySelector(`[data-chapter="${anchor.chapter}"]`)
        : document.querySelector(`[data-chapter="branches"] [data-branch-stop="${anchor.stop}"]`);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const top = rect.top + y;
    anchors.push({
      ...anchor,
      scroll: top + rect.height / 2 - view / 2,
      ...(anchor.stop === undefined ? { enter: top - view / 2 } : {}),
    });
  }
  return createVideoTimeMap(anchors, maxScroll);
}

/** Mounts the scrubber on `root` (it holds one `<video>`). Returns the teardown. */
export function mountBonsaiVideo(root: HTMLElement): (() => void) | undefined {
  const video = root.querySelector("video");
  if (!video) return undefined;

  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const setState = (state: VideoState) => {
    root.dataset.state = state;
  };
  setState("loading");

  const scrubber = createScrubber(video, { reducedMotion: reducedQuery.matches });
  const loop = createFrameLoop({
    request: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
    step: (dt) => scrubber.step(dt),
  });

  let map = measure();

  function retarget() {
    // Reduced motion: one still per chapter, the anchor of the active section.
    const y = scrollTop();
    scrubber.setTarget(reducedQuery.matches ? map.stillAt(y) : map.at(y));
    loop.wake();
  }

  // Layout moves when the viewport, the fonts or the card content change.
  let widthAtMeasure = window.innerWidth;
  const remeasure = () => {
    map = measure();
    widthAtMeasure = window.innerWidth;
    retarget();
  };
  const onResize = () => {
    // Touch browsers resize the viewport height while the URL bar moves; the
    // sections are in svh, so their layout did not change.
    if (window.matchMedia("(pointer: coarse)").matches && window.innerWidth === widthAtMeasure) return;
    remeasure();
  };
  const layoutObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(remeasure) : undefined;
  layoutObserver?.observe(document.querySelector("main") ?? document.documentElement);
  void document.fonts?.ready.then(remeasure);

  const driver = createScrollDriver({ reducedMotion: reducedQuery.matches, onExactChange: retarget });

  const onMetadata = () => {
    scrubber.snap(); // reload at depth lands on the exact frame, no travel from 0
    retarget();
  };
  const onLoaded = () => {
    setState("ready");
    loop.wake();
  };
  const onError = () => {
    setState("error");
    loop.pause();
  };
  const onSeeked = () => loop.wake();
  const onVisibility = () => (document.hidden ? loop.pause() : loop.wake());
  const onReducedMotion = () => {
    scrubber.setReducedMotion(reducedQuery.matches);
    driver.setReducedMotion(reducedQuery.matches);
    retarget();
    scrubber.snap();
  };

  // iOS Safari only lets a muted video seek after a user gesture has started it:
  // one play() immediately followed by pause(), on the first touch or click.
  const unlockEvents = ["pointerdown", "touchstart"] as const;
  const unlock = () => {
    unlockEvents.forEach((name) => window.removeEventListener(name, unlock));
    try {
      const started = video.play();
      video.pause();
      started?.catch(() => {});
    } catch {
      // Nothing to unlock: the poster stays.
    }
    loop.wake();
  };

  video.addEventListener("loadedmetadata", onMetadata);
  video.addEventListener("loadeddata", onLoaded);
  video.addEventListener("seeked", onSeeked);
  video.addEventListener("error", onError);
  document.addEventListener("visibilitychange", onVisibility);
  reducedQuery.addEventListener("change", onReducedMotion);
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("load", remeasure);
  unlockEvents.forEach((name) => window.addEventListener(name, unlock, { once: true, passive: true }));

  driver.start();
  video.load();

  return () => {
    loop.stop();
    driver.stop();
    video.removeEventListener("loadedmetadata", onMetadata);
    video.removeEventListener("loadeddata", onLoaded);
    video.removeEventListener("seeked", onSeeked);
    video.removeEventListener("error", onError);
    document.removeEventListener("visibilitychange", onVisibility);
    reducedQuery.removeEventListener("change", onReducedMotion);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("load", remeasure);
    layoutObserver?.disconnect();
    unlockEvents.forEach((name) => window.removeEventListener(name, unlock));
  };
}
