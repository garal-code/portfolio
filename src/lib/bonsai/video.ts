// Scroll -> video time for the /bonsai background (S9). Pure and DOM-free: the
// same scroll position always returns the same time, forward or backward.
//
// The client measures where each section (and each career card) is centred in
// the viewport, in real scroll pixels, and this module interpolates between
// those positions and the video times below. Nothing assumes how tall the
// sections are, so the mobile first-section spacer and fonts need no special case.
//
// The anchors follow the story of the preview render (world bible, "Video
// background"): seed 0-1.5 s, sprout ~2 s, wired trunk ~5 s, branches 6-10 s,
// torii at golden hour 12-14 s, lit pagoda ~15.5 s, lanterns ~17 s, night 19 s.

import type { ChapterId } from "./chapters.ts";

/** The only place the video file is named: the final 1080p render swaps this. */
export const VIDEO_SRC = "/bonsai/video/bonsai-720p.mp4";
export const VIDEO_POSTER = "/bonsai/video/poster.jpg";

export const VIDEO_DURATION = 20;
export const VIDEO_FPS = 30;
/** Last frame of the video: the mapping never reaches the duration itself. */
export const VIDEO_END = VIDEO_DURATION - 1 / VIDEO_FPS;

/**
 * Video time (s) shown when each career card of `branches` is centred, oldest
 * job first. The video grows its six branches bottom-up between 4.5 s and
 * 10.5 s, so the four stops walk up the trunk through that growth.
 */
export const BRANCH_VIDEO_TIMES: readonly number[] = [6.4, 7.5, 8.6, 9.6];

/**
 * Video time (s) shown when each chapter section is centred. `finished` is the
 * last section: it can never be scrolled further than centred, so it holds the
 * last frame and the page ends in the night.
 */
export const CHAPTER_VIDEO_TIME: Readonly<Record<ChapterId, number>> = {
  seed: 0.8,
  sprout: 2.2,
  trunk: 4.4,
  // Centre of `branches`: between the 2nd and 3rd career cards.
  branches: (BRANCH_VIDEO_TIMES[1]! + BRANCH_VIDEO_TIMES[2]!) / 2,
  pruning: 12.8,
  pagoda: 15.6,
  finished: VIDEO_END,
};

export interface VideoAnchor {
  chapter: ChapterId;
  /** Index of the career card, set only for the 4 `branches` sub-stops. */
  stop?: number;
  label: string;
  /** Video time in seconds. */
  time: number;
}

/** An anchor placed at a measured scroll position. */
export interface ScrollAnchor extends VideoAnchor {
  /** Scrolled pixels at which the anchor's element is centred in the viewport. */
  scroll: number;
  /** Chapter anchors only: scroll at which its section top crosses the viewport centre. */
  enter?: number;
}

export interface VideoTimeMap {
  /** Video time for a scroll position, piecewise-linear between the anchors. */
  at(scrollY: number): number;
  /** Reduced motion: the anchor time of the chapter that is active at `scrollY`. */
  stillAt(scrollY: number): number;
}

/** Chapter anchors plus the career sub-stops, in scroll order. */
export function videoAnchors(): VideoAnchor[] {
  const stop = (index: number): VideoAnchor => ({
    chapter: "branches",
    stop: index,
    label: `branches ${index + 1}/${BRANCH_VIDEO_TIMES.length}`,
    time: BRANCH_VIDEO_TIMES[index]!,
  });
  const anchors: VideoAnchor[] = [];
  for (const chapter of Object.keys(CHAPTER_VIDEO_TIME) as ChapterId[]) {
    if (chapter !== "branches") {
      anchors.push({ chapter, label: chapter, time: CHAPTER_VIDEO_TIME[chapter] });
      continue;
    }
    anchors.push(stop(0), stop(1));
    anchors.push({ chapter, label: chapter, time: CHAPTER_VIDEO_TIME[chapter] });
    anchors.push(stop(2), stop(3));
  }
  return anchors;
}

const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);

/**
 * Builds the scroll -> time mapping for one measured layout. `anchors` come in
 * scroll order; each scroll is clamped to [0, maxScroll]. The top of the page is
 * 0 s and `maxScroll` is the last frame. Anchors that clamp onto the same pixel
 * collapse to the later one, so time never goes backwards.
 */
export function createVideoTimeMap(anchors: readonly ScrollAnchor[], maxScroll: number): VideoTimeMap {
  const max = Math.max(0, finite(maxScroll));
  const clamp = (value: number) => Math.min(max, Math.max(0, finite(value)));

  const points: { scroll: number; time: number }[] = [];
  const add = (scroll: number, time: number) => {
    const last = points[points.length - 1];
    if (!last) points.push({ scroll, time });
    else if (scroll <= last.scroll) points[points.length - 1] = { scroll: last.scroll, time: Math.max(time, last.time) };
    else points.push({ scroll, time: Math.max(time, last.time) });
  };
  add(0, 0);
  for (const anchor of anchors) add(clamp(anchor.scroll), anchor.time);
  add(max, VIDEO_END);

  const chapters = anchors
    .filter((anchor) => anchor.stop === undefined)
    .map((anchor) => ({ enter: clamp(anchor.enter ?? anchor.scroll), time: anchor.time }));

  return {
    at(scrollY) {
      const y = clamp(scrollY);
      let upper = 1;
      while (upper < points.length - 1 && y > points[upper]!.scroll) upper += 1;
      const from = points[upper - 1]!;
      const to = points[upper];
      if (!to) return from.time;
      const t = Math.min(1, Math.max(0, (y - from.scroll) / (to.scroll - from.scroll)));
      return from.time + (to.time - from.time) * t;
    },
    stillAt(scrollY) {
      const y = clamp(scrollY);
      let active = chapters[0];
      for (const chapter of chapters) if (chapter.enter <= y) active = chapter;
      return active?.time ?? 0;
    },
  };
}
