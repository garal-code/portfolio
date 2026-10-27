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
  const page = read("src/pages/index.astro");
  assert.match(page, /import BonsaiVideo from "\.\.\/components\/bonsai\/BonsaiVideo\.astro"/);
  assert.match(page, /<BonsaiVideo \/>/);
  assert.doesNotMatch(page, /BonsaiWorld/);
});

test("the Three.js world is gone: no three dependency, no module imports it, no 3D assets", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.dependencies?.three, undefined);
  assert.equal(pkg.devDependencies?.["@types/three"], undefined);
  const root = new URL("../../", import.meta.url).pathname;
  const importers = [...sources(join(root, "src")), ...sources(join(root, "tests"))]
    .filter((path) => /from "three["/]/.test(readFileSync(path, "utf8")))
    .map((path) => path.slice(root.length));
  assert.deepEqual(importers, []);
  assert.deepEqual(readdirSync(join(root, "public/bonsai")), ["video"]);
});

test("the video file name is written once in src, as a constant", () => {
  const root = new URL("../../src/", import.meta.url).pathname;
  const file = read("src/lib/bonsai/video.ts").match(/VIDEO_SRC = "[^"]*\/([^"\/]+\.mp4)"/)?.[1] ?? "";
  assert.match(file, /\.mp4$/);
  const hits = sources(root).filter((path) => readFileSync(path, "utf8").includes(file));
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
  for (const attribute of ["muted", "playsinline", 'preload="none"', "disablepictureinpicture", "poster=", "data-src="]) {
    assert.ok(tag.includes(attribute), `video has ${attribute}`);
  }
  assert.doesNotMatch(tag, /\bautoplay\b|\bloop\b|\bcontrols\b/);
  assert.doesNotMatch(tag, /\ssrc=/, "the element must not download the file itself; the mount fetches the blob");
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
  const page = read("src/pages/index.astro");
  assert.match(page, /data-branch-stop=\{index\}/);
  const mount = read("src/lib/bonsai/video-mount.ts");
  assert.match(mount, /data-branch-stop/);
  assert.match(mount, /ResizeObserver/);
  assert.match(mount, /getBoundingClientRect/);
});

test("the scrubber never plays; the mount plays only to prime or unlock, each play followed by pause", () => {
  assert.doesNotMatch(read("src/lib/bonsai/scrub.ts"), /\.play\(/);
  const mount = read("src/lib/bonsai/video-mount.ts");
  assert.match(mount, /\.load\(/);
  const plays = mount.match(/\.play\(/g) ?? [];
  assert.ok(plays.length >= 1);
  assert.equal((mount.match(/\.pause\(/g) ?? []).length - (mount.match(/loop\.pause\(/g) ?? []).length, plays.length);
});

// --- mount behaviour (fake DOM) ------------------------------------------

type Listener = (event?: unknown) => void;

class FakeTarget {
  listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }
  fire(type: string) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener({ type });
  }
  count(type: string) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class FakeVideo extends FakeTarget {
  srcWrites: string[] = [];
  calls: string[] = [];
  timeWrites: number[] = [];
  seeking = false;
  readyState = 0;
  duration = 20;
  error: unknown = null;
  preload = "none";
  dataset: Record<string, string> = {};
  playRejects = false;
  set currentTime(value: number) {
    this.timeWrites.push(value);
    this.seeking = true;
  }
  get currentTime() {
    return this.timeWrites.at(-1) ?? 0;
  }
  set src(value: string) {
    this.srcWrites.push(value);
  }
  get src() {
    return this.srcWrites.at(-1) ?? "";
  }
  getAttribute(name: string) {
    return name === "src" ? null : (this.dataset[name.replace(/^data-/, "")] ?? null);
  }
  load() {
    this.calls.push("load");
  }
  play() {
    this.calls.push("play");
    return this.playRejects ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve();
  }
  pause() {
    this.calls.push("pause");
  }
}

const SRC = "/bonsai/video/bonsai-1080p.mp4";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function harness(options: { fetch?: (url: string) => Promise<unknown>; saveData?: boolean; dataSrc?: boolean } = {}) {
  const g = globalThis as Record<string, unknown>;
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const define = (name: string, value: unknown) => {
    if (!saved.has(name)) saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  };

  const frames: Array<(now: number) => void> = [];
  const win = Object.assign(new FakeTarget(), { scrollY: 0, pageYOffset: 0, innerHeight: 900, innerWidth: 1440 });
  const reducedQuery = Object.assign(new FakeTarget(), { matches: false });
  Object.assign(win, {
    matchMedia: (query: string) => (query.includes("reduced-motion") ? reducedQuery : Object.assign(new FakeTarget(), { matches: false })),
    requestAnimationFrame: (callback: (now: number) => void) => frames.push(callback),
    cancelAnimationFrame: () => {},
  });
  const doc = Object.assign(new FakeTarget(), {
    hidden: false,
    documentElement: { scrollHeight: 5400 },
    fonts: undefined,
    querySelector: () => null,
  });
  const created: string[] = [];
  const revoked: string[] = [];
  const fetched: string[] = [];
  define("window", win);
  define("document", doc);
  define("requestAnimationFrame", win.requestAnimationFrame);
  define("cancelAnimationFrame", win.cancelAnimationFrame);
  define("navigator", { connection: { saveData: Boolean(options.saveData) } });
  define("ResizeObserver", undefined);
  define("fetch", async (url: string) => {
    fetched.push(url);
    return (options.fetch ?? (async () => ({ ok: true, blob: async () => ({ size: 8_600_000 }) })))(url);
  });
  const urlStatics = {
    createObjectURL: () => {
      const url = `blob:fake/${created.length}`;
      created.push(url);
      return url;
    },
    revokeObjectURL: (url: string) => revoked.push(url),
  };
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = urlStatics.createObjectURL as typeof URL.createObjectURL;
  URL.revokeObjectURL = urlStatics.revokeObjectURL;

  const video = new FakeVideo();
  if (options.dataSrc !== false) video.dataset.src = SRC;
  const root = {
    dataset: {} as Record<string, string>,
    querySelector: (selector: string) => (selector === "video" ? video : null),
  };
  const { mountBonsaiVideo } = await import("../../src/lib/bonsai/video-mount.ts");
  const dispose = mountBonsaiVideo(root as unknown as HTMLElement);

  const restore = () => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete g[name];
    }
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  };
  return { video, root, win, doc, dispose, created, revoked, fetched, frames, restore };
}

test("mount: fetches the whole clip once and hands the blob URL to the video; the poster stays until loadeddata", async () => {
  const h = await harness();
  try {
    assert.deepEqual(h.fetched, [SRC]);
    assert.deepEqual(h.video.srcWrites, [], "the plain URL is never assigned when the blob works");
    assert.equal(h.root.dataset.state, "loading");
    await flush();
    assert.deepEqual(h.created.length, 1);
    assert.deepEqual(h.video.srcWrites, [h.created[0]]);
    assert.equal(h.video.preload, "auto");
    assert.ok(h.video.calls.includes("load"));
    assert.equal(h.root.dataset.state, "loading", "still the poster: no frame decoded yet");
    h.video.fire("loadeddata");
    assert.equal(h.root.dataset.state, "ready");
  } finally {
    h.dispose?.();
    h.restore();
  }
});

test("mount: falls back to the plain URL when fetch rejects or answers an error status", async () => {
  for (const failing of [
    async () => {
      throw new Error("network");
    },
    async () => ({ ok: false, status: 404, blob: async () => ({}) }),
  ]) {
    const h = await harness({ fetch: failing });
    try {
      await flush();
      assert.deepEqual(h.created, []);
      assert.deepEqual(h.video.srcWrites, [SRC]);
      assert.ok(h.video.calls.includes("load"));
      assert.equal(h.root.dataset.state, "loading");
    } finally {
      h.dispose?.();
      h.restore();
    }
  }
});

test("mount: saveData skips the blob fetch and keeps the plain src", async () => {
  const h = await harness({ saveData: true });
  try {
    await flush();
    assert.deepEqual(h.fetched, []);
    assert.deepEqual(h.created, []);
    assert.deepEqual(h.video.srcWrites, [SRC]);
  } finally {
    h.dispose?.();
    h.restore();
  }
});

test("mount: dispose revokes the object URL, and a fetch that lands after dispose is revoked too", async () => {
  const h = await harness();
  await flush();
  h.dispose?.();
  assert.deepEqual(h.revoked, h.created);
  assert.equal(h.revoked.length, 1);
  h.restore();

  let release: (value: unknown) => void = () => {};
  const late = await harness({ fetch: () => new Promise((resolve) => (release = resolve)) });
  late.dispose?.();
  release({ ok: true, blob: async () => ({}) });
  await flush();
  assert.deepEqual(late.video.srcWrites, [], "a disposed mount never touches the video");
  assert.deepEqual(late.revoked, late.created, "nothing leaks");
  late.restore();
});

test("mount: loadeddata primes once with play() immediately followed by pause(), and a rejected play() is caught", async () => {
  const h = await harness();
  try {
    await flush();
    h.video.playRejects = true;
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", onRejection);
    const before = h.video.calls.length;
    h.video.fire("loadeddata");
    assert.deepEqual(h.video.calls.slice(before), ["play", "pause"]);
    await flush();
    process.off("unhandledRejection", onRejection);
    assert.deepEqual(rejections, []);
    h.video.fire("loadeddata");
    assert.deepEqual(h.video.calls.slice(before), ["play", "pause"], "primed only once");
  } finally {
    h.dispose?.();
    h.restore();
  }
});

test("mount: the first gesture still unlocks with play() then pause(), once, and the listeners are gone after", async () => {
  const h = await harness();
  try {
    await flush();
    const before = h.video.calls.length;
    h.win.fire("pointerdown");
    assert.deepEqual(h.video.calls.slice(before), ["play", "pause"]);
    h.win.fire("touchstart");
    h.win.fire("pointerdown");
    assert.deepEqual(h.video.calls.slice(before), ["play", "pause"]);
  } finally {
    h.dispose?.();
    h.restore();
  }
});

test("mount: no seek while one is pending; after seeked the next seek goes out on the very next frame; a media error keeps the error state", async () => {
  const h = await harness();
  try {
    await flush();
    h.video.readyState = 4;
    h.video.fire("loadedmetadata");
    h.video.fire("loadeddata");
    const runFrame = (now: number) => h.frames.splice(0).forEach((callback) => callback(now));
    h.win.scrollY = 3000;
    h.win.fire("scroll");
    runFrame(1000);
    assert.equal(h.video.timeWrites.length, 1, "first seek");
    assert.ok(h.video.seeking);
    runFrame(1016);
    runFrame(1032);
    assert.equal(h.video.timeWrites.length, 1, "no new seek while seeking");
    h.video.seeking = false;
    h.video.fire("seeked");
    assert.ok(h.frames.length >= 1, "seeked keeps a frame scheduled");
    runFrame(1048);
    assert.equal(h.video.timeWrites.length, 2, "the next seek goes out on the very next frame");
    assert.ok(h.video.timeWrites[1]! > h.video.timeWrites[0]!);
    h.video.fire("error");
    assert.equal(h.root.dataset.state, "error");
  } finally {
    h.dispose?.();
    h.restore();
  }
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

test("cards are solid palette cream: no translucency, no white sheen, text at 4.5:1", () => {
  const page = read("src/pages/index.astro");
  const panel = page.match(/const panelClass =\s*"([^"]+)"/)?.[1] ?? "";
  assert.match(panel, /(^| )bg-cream( |$)/, "the card fill is the palette cream");
  assert.doesNotMatch(panel, /bg-cream\/|bg-white/, "opaque: the video never lightens or darkens it");
  const card = page.match(/\.bubble-card\s*\{([^}]+)\}/)?.[1] ?? "";
  const fill = card.match(/background-image:([^;]+);/)?.[1] ?? "";
  assert.doesNotMatch(fill, /255 255 255/, "no white sheen washes the cream out");
  assert.doesNotMatch(card, /backdrop-filter/, "nothing shows through an opaque card, so no blur");
  const cream = luminance("#f4f1ea");
  for (const [name, color] of [
    ["body", "#3d554c"],
    ["forest", "#123a2f"],
    ["ink", "#10231d"],
  ] as const) {
    assert.ok(contrast(cream, luminance(color)) >= 4.5, `${name} on cream`);
  }
});
