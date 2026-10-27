// Client glue for the card flow (S15): measures each block's cards and chapter
// stops from the DOM, then moves every column on scroll with the pure mapping
// in card-flow.ts. Measured again on resize, fonts, load and layout changes.

import { flowTransform, holdOffsets, peekGap, stickyTop, type HoldMode } from "./card-flow.ts";

/** Below this width cards rest at the bottom of the viewport; above, centred. */
const MOBILE_BREAKPOINT = 768;
/** Space shown below the second card's title in a `data-flow-peek` column, in px. */
const PEEK_MARGIN = 16;

interface FlowBlock {
  block: HTMLElement;
  frame: HTMLElement;
  column: HTMLElement;
  cards: HTMLElement[];
  stopElements: HTMLElement[];
  stops: number[];
  offsets: number[];
  /** Block bounds in scroll pixels and frame height, for `stickyTop`. */
  top: number;
  bottom: number;
  frameHeight: number;
  applied: number;
}

const scrollTop = () => window.scrollY || window.pageYOffset || 0;

/** Mounts the flow on every `[data-card-block]` under `root`. Returns the teardown. */
export function mountCardFlow(root: ParentNode = document): () => void {
  const blocks: FlowBlock[] = [];
  for (const element of root.querySelectorAll<HTMLElement>("[data-card-block]")) {
    const frame = element.querySelector<HTMLElement>("[data-card-frame]");
    const column = element.querySelector<HTMLElement>("[data-card-column]");
    if (!frame || !column) continue;
    const cards = Array.from(column.querySelectorAll<HTMLElement>("[data-chapter-card]"));
    const stopElements = Array.from(element.querySelectorAll<HTMLElement>("[data-flow-stop]"));
    if (cards.length === 0 || cards.length !== stopElements.length) continue;
    blocks.push({ block: element, frame, column, cards, stopElements, stops: [], offsets: [], top: 0, bottom: 0, frameHeight: 0, applied: 0 });
  }

  function update() {
    const y = scrollTop();
    for (const block of blocks) {
      const frameTopAt = (scroll: number) => stickyTop(scroll, block.top, block.bottom, block.frameHeight);
      const offset = flowTransform(y, block.stops, block.offsets, frameTopAt);
      if (offset === block.applied) continue;
      block.applied = offset;
      block.column.style.transform = `translate3d(0, ${offset}px, 0)`;
    }
  }

  /**
   * A `data-flow-peek` column (S16) spaces its cards so that, while the first
   * one rests centred, only the second card's title shows below it. Mobile
   * cards rest at the bottom, where nothing peeks, so they keep the CSS gap.
   */
  function spaceForPeek(block: FlowBlock, mode: HoldMode) {
    if (!block.column.hasAttribute("data-flow-peek")) return;
    const [first, second] = block.cards;
    const title = second?.querySelector("h2, h3");
    if (mode !== "centre" || !first || !second || !title) {
      block.column.style.rowGap = "";
      return;
    }
    const peek = title.getBoundingClientRect().bottom - second.getBoundingClientRect().top + PEEK_MARGIN;
    const minGap = Number.parseFloat(getComputedStyle(block.column).columnGap) || 0;
    const frameHeight = block.frame.clientHeight || window.innerHeight;
    block.column.style.rowGap = `${peekGap(frameHeight, first.getBoundingClientRect().height, peek, minGap)}px`;
  }

  function measure() {
    const view = window.innerHeight;
    const y = scrollTop();
    const mode: HoldMode = window.innerWidth < MOBILE_BREAKPOINT ? "bottom" : "centre";
    for (const block of blocks) {
      spaceForPeek(block, mode);
      const bounds = block.block.getBoundingClientRect();
      block.top = bounds.top + y;
      block.bottom = bounds.bottom + y;
      block.frameHeight = block.frame.clientHeight || view;
      const frameTop = block.frame.getBoundingClientRect().top;
      // The applied transform moves every card alike; take it out to get the resting layout.
      const cards = block.cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return { top: rect.top - frameTop - block.applied, height: rect.height };
      });
      block.offsets = holdOffsets(cards, block.frameHeight, mode);
      block.stops = block.stopElements.map((stop) => {
        const rect = stop.getBoundingClientRect();
        return rect.top + y + rect.height / 2 - view / 2;
      });
    }
    update();
  }

  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : undefined;
  for (const block of blocks) observer?.observe(block.column);
  const main = document.querySelector("main");
  if (main) observer?.observe(main);

  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("load", measure);
  void document.fonts?.ready.then(measure);

  return () => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", measure);
    window.removeEventListener("load", measure);
    for (const block of blocks) block.column.style.transform = "";
  };
}
