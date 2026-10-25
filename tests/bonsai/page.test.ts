import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../../src/pages/bonsai.astro", import.meta.url), "utf8");
const classOf = (name: string) => page.match(new RegExp(`const ${name} =\\s*"([^"]+)"`))?.[1] ?? "";

test("mobile chapter cards are compact and scroll inside when content grows", () => {
  const panel = classOf("panelClass");
  assert.doesNotMatch(panel, /(^| )(sticky|static|fixed|absolute)( |$)/, "stickiness lives in the [data-chapter-card] rule, not in utility classes");
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
  assert.match(classOf("sectionClass"), /md:items-start md:px-16/);
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

// --- cards that scroll like a page (S13) ---------------------------------------

const styles = page.match(/<style is:global>([\s\S]*)<\/style>/)?.[1] ?? "";
const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&");
  return styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
};

test("every card is a direct child of its own section or career stop", () => {
  const cards = page.match(/<(?:div|article)\b[^>]*data-chapter-card/g) ?? [];
  assert.equal(cards.length, 7, "6 chapter cards plus the one rendered per career stop");
  for (const id of ["seed", "sprout", "trunk", "pruning", "pagoda", "finished"]) {
    assert.match(page, new RegExp(`<section\\s+id="${id}"[^>]*>\\s*<div class=\\{panelClass\\} data-chapter-card>`), `${id} card sits in its section`);
  }
  assert.match(page, /data-branch-stop=\{index\}[^>]*>\s*<article class=\{panelClass\} data-chapter-card>/);
});

test("cards are sticky: at the bottom on mobile, centred from md, and move with the page between chapters", () => {
  const card = rule("[data-chapter-card]");
  assert.match(card, /position:\s*sticky/);
  assert.match(card, /bottom:\s*0\.75rem/, "mobile: held at the bottom edge");
  const desktop = styles.match(/@media \(min-width: 768px\)\s*\{\s*\[data-chapter-card\]\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(desktop, /top:\s*50svh/, "md: held at the vertical centre");
  assert.match(desktop, /translate:\s*0 -50%/);
  assert.match(desktop, /bottom:\s*auto/);
  assert.match(classOf("sectionClass"), /(^| )items-end( |$)/, "mobile: the card rides the section's bottom edge in");
  assert.match(classOf("sectionClass"), /md:items-start/, "md: the card enters with the section top");
  assert.match(page, /data-branch-stop=\{index\}[\s\S]*?class="flex items-end py-3 md:items-start md:py-10"/);
});

test("sticky works on this page: main clips instead of creating a scroll container", () => {
  assert.match(rule("main"), /overflow:\s*clip/);
});

test("no card fades or hides: no pinned layer, no active-card script", () => {
  assert.doesNotMatch(page, /data-card-pin|data-card-zone|data-active|activeCardId|html\.js|classList\.add\("js"\)/);
  assert.doesNotMatch(page, /<script>/, "the page needs no client script for the cards");
  assert.doesNotMatch(styles, /visibility:\s*hidden|opacity:\s*0\b|position:\s*fixed/);
  assert.doesNotMatch(page, /\sinert\b|aria-hidden="true">\s*<div class=\{panelClass/);
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

// --- card headings and contact icons -------------------------------------------

test("no card carries the numbered chapter eyebrow (01 · Semilla …)", () => {
  assert.doesNotMatch(page, /eyebrowClass/);
  assert.doesNotMatch(page, /\b0[1-7] · /);
  for (const name of ["Semilla", "Brote", "Tronco", "Ramas", "Poda", "Bonsai terminado"]) {
    assert.doesNotMatch(page, new RegExp(`· ${name}<`), `${name} eyebrow removed`);
  }
});

test("Hablemos shows LinkedIn, email and GitHub as labelled icons, in that order", () => {
  const card = page.match(/id="finished-title"[\s\S]*?<\/ul>/)?.[0] ?? "";
  const links = [...card.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(
    links.map(([, attributes]) => attributes.match(/href=\{(personalInfo\.links\.\w+|`mailto:)/)?.[1]),
    ["personalInfo.links.linkedin", "`mailto:", "personalInfo.links.github"],
  );
  assert.deepEqual(
    links.map(([, attributes]) => attributes.match(/aria-label="([^"]*)"/)?.[1]),
    ["LinkedIn", "Email", "GitHub"],
  );
  for (const [, , inner] of links) {
    assert.match(inner, /<svg\b[^>]*aria-hidden="true"/, "the icon is decorative; the link label names it");
    assert.equal(inner.replace(/<[^>]*>/g, "").trim(), "", "no visible text, only the icon");
  }
});
