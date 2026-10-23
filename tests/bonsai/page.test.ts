import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../../src/pages/bonsai.astro", import.meta.url), "utf8");
const classOf = (name: string) => page.match(new RegExp(`const ${name} =\\s*"([^"]+)"`))?.[1] ?? "";

test("mobile chapter cards are compact, bottom-anchored and scroll inside when content grows", () => {
  const panel = classOf("panelClass");
  assert.match(panel, /(^| )sticky( |$)/, "pinned while the chapter is on screen");
  assert.match(panel, /(^| )bottom-\d/, "anchored to the bottom");
  assert.match(panel, /(^| )max-h-\[(\d+)svh\]/, "bounded height on mobile");
  const share = Number(panel.match(/max-h-\[(\d+)svh\]/)?.[1]);
  assert.ok(share <= 45, `card takes at most the bottom 45% (got ${share}svh)`);
  assert.match(panel, /(^| )overflow-y-auto( |$)/, "internal scroll");
  assert.match(panel, /(^| )p-4( |$)/, "compact padding on mobile");
});

test("desktop cards keep the 40% left column", () => {
  const panel = classOf("panelClass");
  assert.match(panel, /md:max-w-\[40%\]/);
  assert.match(panel, /md:static/);
  assert.match(panel, /md:max-h-none/);
  assert.match(panel, /md:p-6/);
  assert.match(classOf("sectionClass"), /md:items-center md:px-16/);
});

test("chapter cards, chips and the call to action use the bubble surface with depth", () => {
  assert.match(classOf("panelClass"), /(^| )bubble-card( |$)/);
  assert.match(classOf("chipClass"), /(^| )bubble-chip( |$)/);
  const card = page.match(/\.bubble-card\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(card, /border-radius:\s*(2[4-9]|3\d)px/, "large rounded corners");
  const shadow = card.match(/box-shadow:([^;]+);/)?.[1] ?? "";
  assert.match(shadow, /inset/, "inner highlight gives the rim of a bubble");
  assert.ok((shadow.match(/rgb\(/g) ?? []).length >= 4, "layered shadows give depth");
  assert.match(page, /prefers-reduced-motion:\s*reduce[\s\S]*bubble-card/, "the hover lift respects reduced motion");
});
