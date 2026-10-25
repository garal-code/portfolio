import { test } from "node:test";
import assert from "node:assert/strict";
import { flowOffset, flowTransform, holdOffsets, stickyTop, type FlowCard } from "../../src/lib/bonsai/card-flow.ts";

const VIEW = 900;
// Three cards in a column with a 24 px gap, as measured from the column top.
const cards: FlowCard[] = [
  { top: 0, height: 300 },
  { top: 324, height: 200 },
  { top: 548, height: 360 },
];

test("holdOffsets centres each card in the viewport on desktop", () => {
  const offsets = holdOffsets(cards, VIEW, "centre");
  cards.forEach((card, index) => {
    const top = card.top + offsets[index]!;
    assert.equal(top + card.height / 2, VIEW / 2, `card ${index} is centred`);
  });
});

test("holdOffsets rests each card 12 px above the bottom edge on mobile", () => {
  const offsets = holdOffsets(cards, VIEW, "bottom");
  cards.forEach((card, index) => {
    assert.equal(card.top + offsets[index]! + card.height, VIEW - 12, `card ${index} sits at the bottom`);
  });
});

const stops = [100, 1200, 2300];
const offsets = holdOffsets(cards, VIEW, "centre");

test("each card is at its resting place exactly when its chapter is centred", () => {
  stops.forEach((stop, index) => assert.equal(flowOffset(stop, stops, offsets), offsets[index]));
});

test("before the first stop and after the last the column holds its first and last card", () => {
  assert.equal(flowOffset(-500, stops, offsets), offsets[0]);
  assert.equal(flowOffset(0, stops, offsets), offsets[0]);
  assert.equal(flowOffset(9999, stops, offsets), offsets[2]);
});

test("between two stops the column glides: halfway in scroll is halfway in offset", () => {
  const middle = flowOffset(650, stops, offsets);
  assert.equal(middle, (offsets[0]! + offsets[1]!) / 2);
});

test("the column only ever moves up as you scroll down, and back the same way", () => {
  let previous = Number.POSITIVE_INFINITY;
  for (let scroll = 0; scroll <= 2400; scroll += 10) {
    const offset = flowOffset(scroll, stops, offsets);
    assert.ok(offset <= previous, `no step back at ${scroll}`);
    previous = offset;
  }
  assert.equal(flowOffset(1730, stops, offsets), flowOffset(1730, stops, offsets), "one scroll, one offset");
});

test("there is no frame where the viewport holds no card, on desktop and on mobile", () => {
  for (const mode of ["centre", "bottom"] as const) {
    const modeOffsets = holdOffsets(cards, VIEW, mode);
    for (let scroll = 0; scroll <= 2400; scroll += 5) {
      const offset = flowOffset(scroll, stops, modeOffsets);
      const visible = cards.some((card) => card.top + offset < VIEW && card.top + offset + card.height > 0);
      assert.ok(visible, `${mode}: a card is on screen at ${scroll}`);
    }
  }
});

test("between stops two neighbouring cards share the screen: the next arrives before the last leaves", () => {
  const offset = flowOffset(650, stops, offsets);
  const onScreen = cards.filter((card) => card.top + offset < VIEW && card.top + offset + card.height > 0);
  assert.equal(onScreen.length >= 2, true);
});

test("bad input never throws and never moves the column", () => {
  assert.equal(flowOffset(Number.NaN, stops, offsets), offsets[0]);
  assert.equal(flowOffset(500, [], []), 0);
  assert.equal(flowOffset(500, [400], [-40]), -40);
  assert.deepEqual(holdOffsets([], VIEW, "centre"), []);
});

// --- the frame: sticky inside its block -----------------------------------------

test("stickyTop: below the viewport while the block enters, pinned at 0, then carried away", () => {
  // Block from 1000 to 4000 px, frame one screen tall.
  assert.equal(stickyTop(400, 1000, 4000, VIEW), 600, "entering from below");
  assert.equal(stickyTop(1000, 1000, 4000, VIEW), 0, "pinned at the block top");
  assert.equal(stickyTop(2500, 1000, 4000, VIEW), 0);
  assert.equal(stickyTop(3100, 1000, 4000, VIEW), 0, "still pinned when the block bottom meets the viewport bottom");
  assert.equal(stickyTop(3400, 1000, 4000, VIEW), -300, "then carried up with the page");
});

const layerTop = (scroll: number) => stickyTop(scroll, 1000, 4000, VIEW);
const blockStops = [800, 2000, 3300]; // the first before the frame pins, the last after it leaves
const blockOffsets = holdOffsets(cards, VIEW, "centre");
const placed = (scroll: number, index: number) =>
  layerTop(scroll) + flowTransform(scroll, blockStops, blockOffsets, layerTop) + cards[index]!.top;

test("flowTransform rests each card in place at its stop even while the frame enters or leaves", () => {
  blockStops.forEach((stop, index) => {
    assert.equal(placed(stop, index) + cards[index]!.height / 2, VIEW / 2, `card ${index} centred at its stop`);
  });
});

test("outside the stops the cards ride with the frame, so blocks hand over like a page", () => {
  const before = placed(500, 0) - placed(700, 0);
  assert.equal(before, 200, "before the first stop: 200 px of scroll, 200 px of travel");
  const after = placed(3600, 2) - placed(3800, 2);
  assert.equal(after, 200, "after the last stop: carried away at scroll speed");
});

test("between stops the cards glide at most as fast as the scroll", () => {
  for (let scroll = blockStops[0]!; scroll < blockStops[2]!; scroll += 10) {
    const step = Math.abs(placed(scroll + 10, 1) - placed(scroll, 1));
    assert.ok(step <= 10.0001, `at ${scroll}: ${step}px for 10px of scroll`);
  }
});
