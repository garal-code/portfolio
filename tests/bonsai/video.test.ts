import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CHAPTERS, CHAPTER_IDS } from "../../src/lib/bonsai/chapters.ts";
import { careerOrder } from "../../src/lib/bonsai/career.ts";
import {
  BRANCH_VIDEO_TIMES,
  CHAPTER_VIDEO_TIME,
  VIDEO_DURATION,
  VIDEO_END,
  VIDEO_FPS,
  createVideoTimeMap,
  videoAnchors,
  type ScrollAnchor,
} from "../../src/lib/bonsai/video.ts";
import { jobs } from "../../src/data/resume.ts";

const FRAME = 1 / VIDEO_FPS;

// Synthetic page layout, like bonsai.astro: one section per chapter with height
// weight * vh, `branches` split into 4 equal job slices, and on mobile a first
// section one screen taller. Returns each anchor at the scroll position where
// its element is centred in the viewport, plus the page's maxScroll.
function layout(vh: number, mobile: boolean) {
  const centers = new Map<string, number>();
  const tops = new Map<string, number>();
  let top = 0;
  CHAPTERS.forEach((chapter, index) => {
    const height = chapter.scrollWeight * vh + (mobile && index === 0 ? vh : 0);
    centers.set(chapter.id, top + height / 2);
    tops.set(chapter.id, top);
    if (chapter.id === "branches") {
      for (let stop = 0; stop < 4; stop += 1) centers.set(`branches ${stop}`, top + (height * (stop + 0.5)) / 4);
    }
    top += height;
  });
  const anchors: ScrollAnchor[] = videoAnchors().map((anchor) => ({
    ...anchor,
    scroll: centers.get(anchor.stop === undefined ? anchor.chapter : `branches ${anchor.stop}`)! - vh / 2,
    // A chapter is the active one once its section top has crossed the viewport centre.
    ...(anchor.stop === undefined ? { enter: tops.get(anchor.chapter)! - vh / 2 } : {}),
  }));
  return { anchors, maxScroll: top - vh };
}

const LAYOUTS = [
  { name: "desktop 900", vh: 900, mobile: false },
  { name: "mobile 844 with the first-section spacer", vh: 844, mobile: true },
  { name: "short desktop 500", vh: 500, mobile: false },
];

test("the video is the 20 s, 30 fps asset", () => {
  assert.equal(VIDEO_DURATION, 20);
  assert.equal(VIDEO_FPS, 30);
});

test("anchors: one per chapter plus 4 branch stops, strictly increasing in time, inside [0, 20), in S3 order", () => {
  const anchors = videoAnchors();
  assert.equal(anchors.length, CHAPTER_IDS.length + 4);
  for (let i = 1; i < anchors.length; i += 1) {
    assert.ok(anchors[i]!.time > anchors[i - 1]!.time, `time rises at ${anchors[i]!.label}`);
  }
  for (const anchor of anchors) {
    assert.ok(anchor.time >= 0 && anchor.time < VIDEO_DURATION, `${anchor.label} is inside the video`);
  }
  const chapterOrder = anchors.filter((anchor) => anchor.stop === undefined).map((anchor) => anchor.chapter);
  assert.deepEqual(chapterOrder, [...CHAPTER_IDS]);
});

test("the 4 branch stops are one per job and sit inside the branches window of the anchor list", () => {
  const anchors = videoAnchors();
  const stops = anchors.filter((anchor) => anchor.stop !== undefined);
  assert.equal(BRANCH_VIDEO_TIMES.length, 4);
  assert.equal(BRANCH_VIDEO_TIMES.length, careerOrder(jobs).length);
  assert.deepEqual(
    stops.map((stop) => stop.stop),
    [0, 1, 2, 3],
  );
  const before = anchors.findIndex((anchor) => anchor.chapter === "trunk");
  const after = anchors.findIndex((anchor) => anchor.chapter === "pruning");
  for (const stop of stops) {
    assert.equal(stop.chapter, "branches");
    const at = anchors.indexOf(stop);
    assert.ok(at > before && at < after);
  }
});

for (const { name, vh, mobile } of LAYOUTS) {
  test(`${name}: each section's centred scroll position maps to its anchor time (within one frame)`, () => {
    const { anchors, maxScroll } = layout(vh, mobile);
    const map = createVideoTimeMap(anchors, maxScroll);
    for (const anchor of anchors) {
      const got = map.at(Math.min(Math.max(anchor.scroll, 0), maxScroll));
      assert.ok(Math.abs(got - anchor.time) <= FRAME, `${anchor.label}: ${got} vs ${anchor.time}`);
    }
  });

  test(`${name}: time is 0 at the top, the last frame at maxScroll, monotonic and identical forward and back`, () => {
    const { anchors, maxScroll } = layout(vh, mobile);
    const map = createVideoTimeMap(anchors, maxScroll);
    assert.equal(map.at(0), 0);
    const end = map.at(maxScroll);
    assert.ok(end >= 19 && end < VIDEO_DURATION, `end is ${end}`);
    assert.equal(end, VIDEO_END);
    const forward: number[] = [];
    for (let i = 0; i <= 1000; i += 1) forward.push(map.at((maxScroll * i) / 1000));
    for (let i = 1; i < forward.length; i += 1) assert.ok(forward[i]! >= forward[i - 1]!, `non-decreasing at ${i}`);
    const backward: number[] = [];
    for (let i = 1000; i >= 0; i -= 1) backward.push(map.at((maxScroll * i) / 1000));
    assert.deepEqual(backward.reverse(), forward);
    assert.ok(forward.every((time) => time >= 0 && time < VIDEO_DURATION));
  });
}

test("clamps scroll outside the page, ignores non-finite input and handles anchors clamped onto each other", () => {
  const { anchors, maxScroll } = layout(900, false);
  const map = createVideoTimeMap(anchors, maxScroll);
  assert.equal(map.at(-50), map.at(0));
  assert.equal(map.at(maxScroll + 500), map.at(maxScroll));
  assert.equal(map.at(Number.NaN), map.at(0));
  const squeezed = createVideoTimeMap(
    anchors.map((anchor) => ({ ...anchor, scroll: anchor.scroll * 0 + 10 })),
    maxScroll,
  );
  const samples = [0, 5, 10, 11, maxScroll].map((y) => squeezed.at(y));
  assert.deepEqual(samples, [...samples].sort((a, b) => a - b));
  const flat = createVideoTimeMap(anchors, 0);
  assert.ok(Number.isFinite(flat.at(0)) && flat.at(0) < VIDEO_DURATION);
});

test("reduced motion: one still per chapter, switching when its section top crosses the viewport centre", () => {
  const { anchors, maxScroll } = layout(900, false);
  const map = createVideoTimeMap(anchors, maxScroll);
  const clamp = (y: number) => Math.min(Math.max(y, 0), maxScroll);
  for (const anchor of anchors.filter((candidate) => candidate.stop === undefined)) {
    assert.equal(map.stillAt(clamp(anchor.scroll)), anchor.time, `${anchor.label} centred`);
    assert.equal(map.stillAt(clamp(anchor.enter! + 1)), anchor.time, `${anchor.label} just entered`);
  }
  const branches = anchors.find((anchor) => anchor.chapter === "branches" && anchor.stop === undefined)!;
  const pruning = anchors.find((anchor) => anchor.chapter === "pruning")!;
  for (const stop of anchors.filter((anchor) => anchor.stop !== undefined)) {
    assert.equal(map.stillAt(clamp(stop.scroll)), branches.time, "every branch stop shows the one branches still");
  }
  assert.notEqual(map.stillAt(pruning.enter! - 1), map.stillAt(pruning.enter! + 1));
  assert.equal(map.stillAt(0), anchors[0]!.time, "the top of the page is the seed still");
  assert.equal(map.stillAt(Number.NaN), map.stillAt(0));
});

test("the video story lines up with the chapters (L21)", () => {
  assert.ok(CHAPTER_VIDEO_TIME.seed <= 1.5, "seed is in the 0-1.5 s seed");
  assert.ok(Math.abs(CHAPTER_VIDEO_TIME.sprout - 2) <= 0.5, "sprout ~2 s");
  assert.ok(BRANCH_VIDEO_TIMES[0]! >= 5 && BRANCH_VIDEO_TIMES[3]! <= 10, "branches within the 5-10 s growth");
  assert.ok(CHAPTER_VIDEO_TIME.pruning >= 12 && CHAPTER_VIDEO_TIME.pruning <= 14, "torii and golden hour 12-14 s");
  assert.ok(Math.abs(CHAPTER_VIDEO_TIME.pagoda - 15.5) <= 0.5, "lit pagoda ~15.5 s");
  assert.ok(CHAPTER_VIDEO_TIME.finished >= 17, "lanterns and night");
});

// --- page wiring ---------------------------------------------------------

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : [path];
  });
}

test("the page mounts BonsaiVideo and no longer mounts BonsaiWorld", () => {
  const page = read("src/pages/bonsai.astro");
  assert.match(page, /import BonsaiVideo from "\.\.\/components\/bonsai\/BonsaiVideo\.astro"/);
  assert.match(page, /<BonsaiVideo \/>/);
  assert.doesNotMatch(page, /BonsaiWorld/);
});

test("the video file name is written once in src, as a constant", () => {
  const root = new URL("../../src/", import.meta.url).pathname;
  const hits = sources(root).filter((path) => readFileSync(path, "utf8").includes("bonsai-720p.mp4"));
  assert.deepEqual(
    hits.map((path) => path.slice(root.length)),
    ["lib/bonsai/video.ts"],
  );
  const constants = read("src/lib/bonsai/video.ts").match(/^export const VIDEO_SRC\b.*$/gm) ?? [];
  assert.equal(constants.length, 1);
});

test("the island renders a muted inline poster video behind the sections, cropped towards the subject", () => {
  const island = read("src/components/bonsai/BonsaiVideo.astro");
  const tag = island.match(/<video[\s\S]*?>/)?.[0] ?? "";
  for (const attribute of ["muted", "playsinline", 'preload="auto"', "disablepictureinpicture", "poster="]) {
    assert.ok(tag.includes(attribute), `video has ${attribute}`);
  }
  assert.doesNotMatch(tag, /\bautoplay\b|\bloop\b|\bcontrols\b/);
  assert.match(island, /VIDEO_SRC/);
  assert.match(island, /VIDEO_POSTER/);
  assert.match(island, /object-fit:\s*cover/);
  assert.match(island, /object-position:\s*62% 50%/, "desktop keeps 62%");
  assert.match(island, /@media \(max-width: 767px\)[\s\S]*object-position:\s*60% 50%/, "mobile crops at 60%");
  assert.doesNotMatch(island, /70% 50%/);
  assert.match(island, /prefers-reduced-motion/, "reduced motion is handled");
  assert.match(island, /data-bonsai-video-scrim/);
  assert.match(island, /--color-forest-deep/, "the scrim uses a DESIGN.md token");
});

test("every branch card carries its stop index so the client can measure where it is centred", () => {
  const page = read("src/pages/bonsai.astro");
  assert.match(page, /data-branch-stop=\{index\}/);
  const mount = read("src/lib/bonsai/video-mount.ts");
  assert.match(mount, /data-branch-stop/);
  assert.match(mount, /ResizeObserver/);
  assert.match(mount, /getBoundingClientRect/);
});

test("play() is never called by the scrubber, only once for the iOS unlock", () => {
  assert.doesNotMatch(read("src/lib/bonsai/scrub.ts"), /\.play\(/);
  const mount = read("src/lib/bonsai/video-mount.ts");
  assert.equal((mount.match(/\.play\(/g) ?? []).length, 1);
  assert.match(mount, /\.pause\(/);
  assert.match(mount, /\.load\(/);
});

// --- readability ---------------------------------------------------------

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

test("translucent cards keep body and heading text at 4.5:1 even over a black frame", () => {
  const page = read("src/pages/bonsai.astro");
  const panel = page.match(/const panelClass =\s*"([^"]+)"/)?.[1] ?? "";
  const alphas = [...panel.matchAll(/(?:^| |md:)bg-cream\/(\d+)/g)].map((match) => Number(match[1]) / 100);
  assert.ok(alphas.length >= 1, "the card keeps a cream background");
  const cream = 0xf4f1ea;
  for (const alpha of alphas) {
    const over = (shift: number) => Math.round(((cream >> shift) & 255) * alpha);
    const background = (over(16) << 16) | (over(8) << 8) | over(0);
    const lum = luminance(`#${background.toString(16).padStart(6, "0")}`);
    for (const [name, color] of [
      ["body", "#3d554c"],
      ["forest", "#123a2f"],
      ["ink", "#10231d"],
    ] as const) {
      assert.ok(contrast(lum, luminance(color)) >= 4.5, `${name} on cream/${alpha * 100} over black`);
    }
  }
});
