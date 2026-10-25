import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const page = readFileSync(new URL("../../src/pages/index.astro", import.meta.url), "utf8");
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
  assert.match(classOf("columnClass"), /md:max-w-\[40%\]/, "the column is the 40% left column");
  assert.match(panel, /md:max-h-\[(\d+)svh\]/, "bounded so a long card never leaves the viewport");
  assert.match(panel, /(^| )overflow-y-auto( |$)/, "and scrolls inside instead");
  assert.doesNotMatch(panel, /md:overflow-visible/);
  assert.match(panel, /md:p-6/);
  assert.match(classOf("frameClass"), /md:px-16/);
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

// --- three blocks of cards that flow (S15) ------------------------------------

const styles = page.match(/<style is:global>([\s\S]*)<\/style>/)?.[1] ?? "";
const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&");
  return styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
};
const block = (name: string) => page.match(new RegExp(`<div data-card-block="${name}"[\\s\\S]*?<!-- /block -->`))?.[0] ?? "";
const layerOf = (markup: string) => markup.match(/<div data-card-layer[\s\S]*?<!-- \/layer -->/)?.[0] ?? "";

test("the cards come in three blocks: intro, career and practice, in page order", () => {
  const order = [...page.matchAll(/data-card-block="(\w+)"/g)].map(([, name]) => name);
  assert.deepEqual(order, ["intro", "career", "practice"]);
  const ids = (markup: string) => [...layerOf(markup).matchAll(/<section\s+id="(\w+)"/g)].map(([, id]) => id);
  assert.deepEqual(ids(block("intro")), ["seed", "sprout", "trunk"]);
  assert.deepEqual(ids(block("career")), ["branches"]);
  assert.deepEqual(ids(block("practice")), ["pruning", "pagoda"]);
});

test("each block has one layer with one column of cards, and one stop per card", () => {
  for (const [name, cards] of [["intro", 3], ["career", 1], ["practice", 2]] as const) {
    const markup = block(name);
    assert.equal((markup.match(/data-card-layer/g) ?? []).length, 1, `${name}: one layer`);
    assert.equal((markup.match(/data-card-column/g) ?? []).length, 1, `${name}: one column`);
    assert.equal((layerOf(markup).match(/data-chapter-card/g) ?? []).length, cards, `${name}: cards in the column`);
    const stops = markup.slice(markup.indexOf("<!-- /layer -->")).match(/data-flow-stop/g) ?? [];
    assert.equal(stops.length, cards, `${name}: one stop per card (career renders one card per job)`);
  }
});

test("the video still measures the chapters: spacers keep data-chapter and the scroll heights", () => {
  const spacers = [...page.matchAll(/<div\s+data-chapter="(\w+)"([^>]*)>/g)];
  assert.deepEqual(spacers.map(([, id]) => id), ["seed", "sprout", "trunk", "branches", "pruning", "pagoda", "finished"]);
  for (const [, id, attributes] of spacers) {
    assert.match(attributes, new RegExp(`style=\\{sectionStyle\\("${id}"\\)\\}`), `${id} keeps its height`);
    assert.match(attributes, /aria-hidden="true"/, `${id} is only scroll, not content`);
  }
  assert.match(page, /data-branch-stop=\{index\}[^>]*data-flow-stop[^>]*style=\{`min-height: calc\(\$\{careerSlice\} \* 100svh\);`\}/);
  assert.match(classOf("spacerClass"), /min-h-\[var\(--chapter-height\)\]/);
  assert.match(page, /const firstExtra = "max-md:min-h-\[calc\(var\(--chapter-height\)\+100svh\)\]"/);
  assert.doesNotMatch(layerOf(block("intro")) + layerOf(block("career")) + layerOf(block("practice")), /data-chapter=|data-branch-stop/, "cards never carry the measured attributes");
});

test("with JavaScript the layer spans its block and its frame stays on screen until the block ends", () => {
  const layer = rule("html.js [data-card-layer]");
  assert.match(layer, /position:\s*absolute/);
  assert.match(layer, /inset:\s*0/, "the layer covers exactly its block, so the spacers keep the page height");
  const frame = rule("html.js [data-card-frame]");
  assert.match(frame, /position:\s*sticky/);
  assert.match(frame, /top:\s*0/);
  assert.match(frame, /height:\s*100svh/);
  assert.doesNotMatch(styles, /margin-bottom:\s*-100svh/, "a negative margin kept the frame pinned past its block");
  for (const name of ["intro", "career", "practice"]) {
    assert.match(layerOf(block(name)), /<div data-card-layer[^>]*>\s*<div data-card-frame[^>]*>/, `${name}: layer, then frame`);
  }
  assert.match(rule("html.js [data-card-column]"), /will-change:\s*transform/);
  assert.match(rule("main"), /overflow:\s*clip/, "sticky works: main clips instead of becoming a scroll container");
});

test("a script glides each column; without it every card stays in the normal flow", () => {
  assert.match(page, /<script is:inline>[^<]*classList\.add\("js"\)/, "the js class is set before the cards render");
  const script = page.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
  assert.match(script, /import \{ mountCardFlow \} from "\.\.\/lib\/bonsai\/card-flow-mount\.ts"/);
  assert.match(script, /classList\.remove\("js"\)/, "a failing script falls back to the plain flow");
  for (const [, selector] of styles.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{[^}]*position:\s*sticky/g)) {
    assert.match(selector!, /html\.js/, `${selector!.trim()} only applies with JavaScript`);
  }
});

test("no card fades, hides or is fixed: only the contact bar is fixed", () => {
  assert.doesNotMatch(page, /data-card-pin|data-card-zone|data-active|activeCardId/);
  assert.doesNotMatch(styles, /visibility:\s*hidden|opacity:\s*0\b/);
  const fixed = [...styles.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{[^}]*position:\s*fixed/g)].map(([, selector]) => selector.trim());
  assert.deepEqual(fixed, ["[data-contact-bar]"]);
  assert.doesNotMatch(page, /animation-timeline|view-timeline|animation-range/);
});

test("La carrera is a timeline: one dot per job, joined by a line on the left", () => {
  const career = layerOf(block("career"));
  assert.match(career, /<ol\b[^>]*data-timeline/);
  assert.match(career, /careerJobs\.map\(\(job, index\) => \(\s*<li>\s*<article class=\{panelClass\} data-chapter-card>/);
  assert.match(rule("[data-timeline] > li"), /padding-left:/, "the cards leave room for the rail");
  const dot = rule("[data-timeline] > li::before");
  assert.match(dot, /border-radius:\s*9999px/, "a round dot per card");
  assert.match(dot, /position:\s*absolute/);
  const line = rule("[data-timeline] > li:not(:last-child)::after");
  assert.match(line, /width:\s*2px/, "a thin line");
  assert.match(line, /height:\s*calc\(100% \+ var\(--timeline-gap\)\)/, "it reaches the next dot");
});

test("the practice card speaks in first person: Cómo trabajo", () => {
  assert.match(page, /<h2 id="pruning-title" class=\{titleClass\}>Cómo trabajo<\/h2>/);
  assert.doesNotMatch(page, /Cómo trabaja/);
});

// --- card headings and contact icons -------------------------------------------

test("no card carries the numbered chapter eyebrow (01 · Semilla …)", () => {
  assert.doesNotMatch(page, /eyebrowClass/);
  assert.doesNotMatch(page, /\b0[1-7] · /);
  for (const name of ["Semilla", "Brote", "Tronco", "Ramas", "Poda", "Bonsai terminado"]) {
    assert.doesNotMatch(page, new RegExp(`· ${name}<`), `${name} eyebrow removed`);
  }
});

test("Hablemos is gone, but the finished stretch keeps its scroll so the video ending plays", () => {
  assert.doesNotMatch(page, /Hablemos|finished-title/);
  const finished = page.match(/<div\s+data-chapter="finished"[^>]*><\/div>/)?.[0] ?? "";
  assert.match(finished, /style=\{sectionStyle\("finished"\)\}/);
  assert.match(finished, /aria-hidden="true"/, "an empty stretch of scroll, not a landmark");
});

const contactBar = page.match(/<nav\b[^>]*data-contact-bar[\s\S]*?<\/nav>/)?.[0] ?? "";

test("a contact bar fixed at the top right shows LinkedIn, email, GitHub and Portfolio App, in that order", () => {
  assert.match(contactBar, /^<nav\b[^>]*aria-label="Contacto"/);
  const links = [...contactBar.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  assert.deepEqual(
    links.map(([, attributes]) => attributes.match(/href=\{(personalInfo\.links\.\w+|`mailto:|project\.url)/)?.[1]),
    ["personalInfo.links.linkedin", "`mailto:", "personalInfo.links.github", "project.url"],
  );
  assert.deepEqual(
    links.slice(0, 3).map(([, attributes]) => attributes.match(/aria-label="([^"]*)"/)?.[1]),
    ["LinkedIn", "Email", "GitHub"],
  );
  for (const [, , inner] of links.slice(0, 3)) {
    assert.match(inner, /<svg\b[^>]*aria-hidden="true"/, "the icon is decorative; the link label names it");
    assert.equal(inner.replace(/<[^>]*>/g, "").trim(), "", "no visible text, only the icon");
  }
  assert.equal(links[3]?.[2].replace(/<[^>]*>/g, "").trim(), "{project.name}", "the app button shows its name");
  const bar = rule("[data-contact-bar]");
  assert.match(bar, /position:\s*fixed/, "visible during the whole scroll");
  assert.match(bar, /top:\s*[^;]+/);
  assert.match(bar, /right:\s*[^;]+/);
  assert.doesNotMatch(bar, /left:/, "top right corner, not left");
  assert.match(bar, /z-index:\s*(\d+)/);
});

test("a centred desktop card never reaches under the contact bar", () => {
  const share = Number(classOf("panelClass").match(/md:max-h-\[(\d+)svh\]/)?.[1]);
  assert.ok(share <= 80, `centred cards leave at least 10svh above them (got ${share}svh)`);
});

test("the personal project is now called Portfolio App everywhere", () => {
  const resume = readFileSync(new URL("../../src/data/resume.ts", import.meta.url), "utf8");
  assert.match(resume, /name: "Portfolio App"/);
  assert.match(resume, /url: "https:\/\/portfolio\.garal\.app"/, "the app button and links open the new domain");
  assert.doesNotMatch(resume, /tu-cartera\.garal\.app/);
  for (const path of ["src/data/resume.ts", "src/pages/index.astro"]) {
    assert.doesNotMatch(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), /Tu Cartera/, path);
  }
});

// --- the bonsai world is the home page --------------------------------------

test("the bonsai world lives at the root: index.astro, no /bonsai route, no old home sections", () => {
  const exists = (path: string) => existsSync(new URL(`../../${path}`, import.meta.url));
  assert.match(page, /<BonsaiVideo \/>/, "the home page mounts the video world");
  assert.equal(exists("src/pages/bonsai.astro"), false, "/bonsai is gone");
  for (const name of ["Hero", "Journey", "Footer"]) {
    assert.equal(exists(`src/components/${name}.astro`), false, `${name} belonged to the old home`);
    assert.doesNotMatch(page, new RegExp(`import ${name}\\b`));
  }
  assert.doesNotMatch(page, /title=\{`Bonsai/, "the home keeps the default title (name and role)");
});
