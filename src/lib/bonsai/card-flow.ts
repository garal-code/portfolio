// Card flow for the home page (S15). Pure and DOM-free. Each block of cards is
// one column that glides up with the scroll: card i rests in its place (centred
// on desktop, at the bottom on mobile) exactly when its chapter is centred in
// the viewport, the moment the video shows it, and between two chapters the
// column moves linearly, so the next card arrives while the last one leaves.

/** A card measured from the top of its column, before any offset. */
export interface FlowCard {
  top: number;
  height: number;
}

export type HoldMode = "centre" | "bottom";

/** Gap kept below a resting card on mobile, in px (0.75rem). */
export const BOTTOM_INSET = 12;

/** Column offset (px) that puts each card in its resting place. */
export function holdOffsets(cards: readonly FlowCard[], viewport: number, mode: HoldMode): number[] {
  return cards.map((card) =>
    mode === "centre"
      ? (viewport - card.height) / 2 - card.top
      : viewport - BOTTOM_INSET - card.height - card.top,
  );
}

/**
 * Column offset at `scroll`. `stops` are the scroll positions (ascending) at
 * which each card's chapter is centred; `offsets` the matching resting offsets.
 * Before the first stop and after the last the column holds; between two stops
 * it interpolates linearly.
 */
export function flowOffset(scroll: number, stops: readonly number[], offsets: readonly number[]): number {
  const count = Math.min(stops.length, offsets.length);
  if (count === 0) return 0;
  const y = Number.isFinite(scroll) ? scroll : Number.NEGATIVE_INFINITY;
  if (y <= stops[0]!) return offsets[0]!;
  for (let index = 1; index < count; index += 1) {
    const from = stops[index - 1]!;
    const to = stops[index]!;
    if (y <= to) {
      const t = to > from ? (y - from) / (to - from) : 1;
      return offsets[index - 1]! + (offsets[index]! - offsets[index - 1]!) * t;
    }
  }
  return offsets[count - 1]!;
}

/**
 * Viewport top of a one-screen sticky frame (`top: 0`) inside a block that
 * spans [blockTop, blockBottom] in scroll pixels: below the viewport while the
 * block enters, pinned at 0, then carried up once the block bottom passes.
 */
export function stickyTop(scroll: number, blockTop: number, blockBottom: number, frameHeight: number): number {
  return Math.min(Math.max(blockTop - scroll, 0), blockBottom - frameHeight - scroll);
}

/**
 * Transform for a column inside a sticky frame. Between the first and the last
 * stop it cancels the frame's own position, so each card rests exactly in place
 * at its stop even when the frame is still entering or already leaving. Before
 * the first stop and after the last it holds, so the cards ride with the frame
 * and one block hands over to the next like a page.
 */
export function flowTransform(
  scroll: number,
  stops: readonly number[],
  offsets: readonly number[],
  frameTopAt: (scroll: number) => number,
): number {
  const count = Math.min(stops.length, offsets.length);
  if (count === 0) return 0;
  const first = stops[0]!;
  const last = stops[count - 1]!;
  const y = Number.isFinite(scroll) ? Math.min(last, Math.max(first, scroll)) : first;
  return flowOffset(y, stops, offsets) - frameTopAt(y);
}
