import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../../src/pages/bonsai.astro", import.meta.url), "utf8");
const classOf = (name: string) => page.match(new RegExp(`const ${name} =\\s*"([^"]+)"`))?.[1] ?? "";

test("mobile chapter cards are compact and scroll inside when content grows", () => {
  const panel = classOf("panelClass");
  assert.doesNotMatch(panel, /(^| )(sticky|static|fixed|absolute)( |$)/, "the wrapper pins the card, the card itself stays in the wrapper");
  assert.match(panel, /(^| )max-h-\[(\d+)svh\]/, "bounded height on mobile");
  const share = Number(panel.match(/max-h-\[(\d+)svh\]/)?.[1]);
  assert.ok(share <= 45, `card takes at most the bottom 45% (got ${share}svh)`);
  assert.match(panel, /(^| )overflow-y-auto( |$)/, "internal scroll");
  assert.match(panel, /(^| )p-4( |$)/, "compact padding on mobile");
});

test("desktop cards keep the 40% left column", () => {
  const panel = classOf("panelClass");
  assert.match(panel, /md:max-w-\[40%\]/);
  assert.match(panel, /md:max-h-\[(\d+)svh\]/, "bounded so a long card never leaves the viewport");
  assert.match(panel, /(^| )overflow-y-auto( |$)/, "and scrolls inside instead");
  assert.doesNotMatch(panel, /md:overflow-visible/);
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

// --- pinned cards that crossfade (S11a) ---------------------------------------

const styles = page.match(/<style is:global>([\s\S]*)<\/style>/)?.[1] ?? "";
const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&");
  return styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
};
const script = page.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";

test("every card sits in its own pinned wrapper, inside its own section or career stop", () => {
  const cards = page.match(/<(?:div|article)\b[^>]*data-chapter-card/g) ?? [];
  const pinned = page.match(/<div[^>]*data-card-pin[^>]*>\s*<(?:div|article)[^>]*data-chapter-card/g) ?? [];
  assert.equal(cards.length, 7, "6 chapter cards plus the one rendered per career stop");
  assert.equal(pinned.length, cards.length, "one wrapper per card");
  const zones = page.match(/<(?:section|li)\b[^>]*data-card-zone=/g) ?? [];
  assert.equal(zones.length, 7, "6 sections plus the career stop");
  for (const id of ["seed", "sprout", "trunk", "pruning", "pagoda", "finished"]) {
    assert.match(page, new RegExp(`id="${id}"\\s+data-chapter="${id}"[\\s\\S]*?data-card-zone="${id}"`));
  }
  assert.match(page, /data-branch-stop=\{index\}[\s\S]*?data-card-zone=\{`branches-\$\{index\}`\}/);
});

test("the wrapper holds one viewport position per breakpoint: bottom on mobile, centred on md and up", () => {
  const pin = rule("html.js [data-card-pin]");
  assert.match(pin, /position:\s*fixed/, "does not move with the page");
  assert.match(pin, /top:\s*0/);
  assert.match(pin, /height:\s*100svh/);
  assert.match(pin, /align-items:\s*flex-end/, "mobile: bottom of the viewport");
  assert.match(pin, /pointer-events:\s*none/, "the empty wrapper never blocks the page");
  assert.match(styles, /@media \(min-width: 768px\)\s*\{\s*html\.js \[data-card-pin\]\s*\{[^}]*align-items:\s*center/, "md: vertically centred");
  assert.match(rule("html.js [data-chapter-card]"), /pointer-events:\s*auto/);
});

test("inactive cards fade out and rise 8px; the active one fades in over 350ms", () => {
  const card = rule("html.js [data-chapter-card]");
  assert.match(card, /opacity:\s*0/);
  assert.match(card, /translate:\s*0 8px/);
  assert.match(card, /visibility:\s*hidden/, "hidden cards leave focus and pointer");
  assert.match(card, /transition:[^;]*opacity 350ms/);
  assert.match(card, /transition:[^;]*translate 350ms/);
  assert.match(card, /transition:[^;]*visibility 0s linear 350ms/, "hidden only after the fade ends");
  const active = rule("html.js [data-card-pin][data-active] [data-chapter-card]");
  assert.match(active, /opacity:\s*1/);
  assert.match(active, /translate:\s*none/);
  assert.match(active, /visibility:\s*visible/);
  assert.match(active, /transition:[^;]*visibility 0s/, "visible at once when fading in");
  assert.match(card, /transition:[^;]*transform 280ms/, "the hover lift keeps its transition");
});

test("reduced motion switches cards instantly", () => {
  const reduced = styles.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\n  \})/)?.[1] ?? "";
  assert.match(reduced, /html\.js \[data-chapter-card\]/);
  assert.match(reduced, /transition:\s*none/);
  assert.match(reduced, /translate:\s*none/);
});

test("inactive cards are inert and aria-hidden, set from a script that only reads the scroll position", () => {
  assert.match(script, /import \{ activeCardId \} from "\.\.\/lib\/bonsai\/active-card\.ts"/);
  assert.match(script, /data-card-zone/);
  assert.match(script, /getBoundingClientRect/);
  assert.match(script, /toggleAttribute\("data-active"/);
  assert.match(script, /toggleAttribute\("inert"/);
  assert.match(script, /setAttribute\("aria-hidden"/);
  assert.match(script, /"scroll"/);
  assert.match(script, /"resize"/);
});

test("without JavaScript every card stays visible in the document flow", () => {
  assert.match(page, /<script is:inline>[^<]*classList\.add\("js"\)/, "the js class is set before the sections render");
  assert.match(script, /classList\.remove\("js"\)/, "a failing script falls back to the plain layout");
  for (const selector of styles.matchAll(/([^{}]+)\{[^}]*(?:position:\s*fixed|visibility:\s*hidden|opacity:\s*0\b)/g)) {
    assert.match(selector[1], /html\.js/, `${selector[1].trim()} only applies with JavaScript`);
  }
  assert.match(rule("[data-card-pin]"), /display:\s*contents/, "no wrapper box without JavaScript");
  assert.doesNotMatch(page, /<div[^>]*data-card-pin[^>]*\s(inert|aria-hidden)/, "the markup never ships hidden cards");
});

test("the scroll-driven exit animation of the old mobile cards is gone", () => {
  assert.doesNotMatch(page, /animation-timeline|view-timeline|bonsai-card-exit|animation-range/);
});

test("sections keep their ids, labels and scroll heights for the background player", () => {
  assert.equal((page.match(/data-chapter="/g) ?? []).length, 7);
  assert.equal((page.match(/aria-labelledby="/g) ?? []).length, 7);
  assert.match(page, /style=\{sectionStyle\("seed"\)\}/);
  assert.match(page, /style=\{`min-height: calc\(\$\{careerSlice\} \* 100svh\);`\}/);
  assert.match(classOf("sectionClass"), /min-h-\[var\(--chapter-height\)\]/);
  assert.match(page, /const firstExtra = "max-md:min-h-\[calc\(var\(--chapter-height\)\+100svh\)\]"/);
});
