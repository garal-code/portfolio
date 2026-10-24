import { test } from "node:test";
import assert from "node:assert/strict";
import { activeCardId, type CardZone } from "../../src/lib/bonsai/active-card.ts";

// Same shape as /bonsai on a 900px viewport: chapter heights follow the
// scrollWeight (1.2, 1.0, 1.4, 2.4, 1.2, 1.2, 1.0) and the career section is
// split into 4 equal stops.
const VIEW = 900;
const layout: Array<[string, number]> = [
  ["seed", 1.2],
  ["sprout", 1.0],
  ["trunk", 1.4],
  ["branches-0", 0.6],
  ["branches-1", 0.6],
  ["branches-2", 0.6],
  ["branches-3", 0.6],
  ["pruning", 1.2],
  ["pagoda", 1.2],
  ["finished", 1.0],
];
const document: Array<CardZone & { start: number }> = [];
let cursor = 0;
for (const [id, weight] of layout) {
  document.push({ id, start: cursor, top: 0, bottom: 0 });
  cursor += weight * VIEW;
}
const total = cursor;
const zones = (scroll: number): CardZone[] =>
  layout.map(([id, weight], index) => {
    const start = document[index].start;
    return { id, top: start - scroll, bottom: start + weight * VIEW - scroll };
  });
const at = (scroll: number) => activeCardId(zones(scroll), VIEW);
// Scroll position that puts the viewport centre at document offset `y`.
const centreAt = (y: number) => y - VIEW / 2;

test("the card whose zone contains the viewport centre is the active one", () => {
  assert.equal(at(centreAt(100)), "seed");
  assert.equal(at(centreAt(1.2 * VIEW + 100)), "sprout");
  assert.equal(at(centreAt(2.2 * VIEW + 100)), "trunk");
  assert.equal(at(centreAt(3.6 * VIEW + 100)), "branches-0");
  assert.equal(at(centreAt(4.2 * VIEW + 100)), "branches-1");
  assert.equal(at(centreAt(4.8 * VIEW + 100)), "branches-2");
  assert.equal(at(centreAt(5.4 * VIEW + 100)), "branches-3");
  assert.equal(at(centreAt(6.0 * VIEW + 100)), "pruning");
  assert.equal(at(centreAt(7.2 * VIEW + 100)), "pagoda");
  assert.equal(at(centreAt(8.4 * VIEW + 100)), "finished");
});

test("at a boundary the zone that starts there wins, so exactly one card is active", () => {
  assert.equal(at(centreAt(1.2 * VIEW - 1)), "seed");
  assert.equal(at(centreAt(1.2 * VIEW)), "sprout");
  assert.equal(at(centreAt(3.6 * VIEW)), "branches-0");
  assert.equal(at(centreAt(4.2 * VIEW - 1)), "branches-0");
  assert.equal(at(centreAt(4.2 * VIEW)), "branches-1");
  assert.equal(at(centreAt(5.4 * VIEW)), "branches-3");
  assert.equal(at(centreAt(6.0 * VIEW - 1)), "branches-3");
  assert.equal(at(centreAt(6.0 * VIEW)), "pruning");
});

test("before the first zone the first card is active, and at the very end the last one stays", () => {
  assert.equal(at(0), "seed");
  assert.equal(at(-200), "seed", "overscroll above the top");
  assert.equal(at(total - VIEW), "finished", "scrolled to the bottom");
  assert.equal(at(total + 300), "finished", "overscroll below the bottom");
  // Zones that all start below the centre (the page is shorter than the offset).
  assert.equal(activeCardId([{ id: "a", top: 700, bottom: 900 }, { id: "b", top: 900, bottom: 1200 }], VIEW), "a");
});

test("a gap between zones keeps the card that was passed last", () => {
  const gapped: CardZone[] = [
    { id: "a", top: 0, bottom: 300 },
    { id: "b", top: 500, bottom: 800 },
  ];
  assert.equal(activeCardId(gapped, VIEW), "a");
});

test("no zones means no active card", () => {
  assert.equal(activeCardId([], VIEW), undefined);
});

test("the result depends only on the scroll position, never on earlier calls", () => {
  const steps: number[] = [];
  for (let scroll = -100; scroll <= total; scroll += 37) steps.push(scroll);
  const forward = steps.map(at);
  const backward = [...steps].reverse().map(at).reverse();
  assert.deepEqual(backward, forward, "scrolling back lands on the same cards");
  assert.deepEqual(steps.map(at), forward, "calling again gives the same answers");
  const shuffled = steps.map((scroll, index) => steps[(index * 7) % steps.length]);
  assert.deepEqual(shuffled.map(at), shuffled.map((scroll) => forward[steps.indexOf(scroll)]));
});

test("walking down the page activates every card once, in document order", () => {
  const seen: string[] = [];
  for (let scroll = 0; scroll <= total - VIEW; scroll += 5) {
    const id = at(scroll)!;
    if (seen.at(-1) !== id) seen.push(id);
  }
  assert.deepEqual(seen, layout.map(([id]) => id));
});
