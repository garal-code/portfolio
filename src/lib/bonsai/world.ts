// One renderer, one scene, one camera for the whole /bonsai page.
// Exact scroll progress drives growth and chapter state; damped progress drives
// the camera only (threejs-scroll-worlds, realtime-architecture section 5).

import * as THREE from "three";
import { buildObstacles, keepClear } from "./clearance.ts";
import { createCameraPath, resolveProgress, worldAt, type ConductorState } from "./conductor.ts";
import { createDebugOverlay, type DebugOverlay } from "./debug.ts";
import { hasArea, screenAnchor, viewOffsetFor } from "./framing.ts";
import { DEFAULT_SEED, generateBonsai } from "./generator.ts";
import { createGraybox } from "./graybox.ts";
import { createFrameLoop } from "./loop.ts";
import { createScrollDriver } from "./scroll.ts";
import { createTree } from "./tree.ts";

export interface MountOptions {
  seed?: number;
  debug?: boolean;
}

const DPR_CAP = { mobile: 1.35, desktop: 1.75 };
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Mounts the world. Returns a teardown function, or null when WebGL is
 * unavailable (the canvas is never inserted and the DOM stays as is).
 */
export function mountBonsaiWorld(options: MountOptions = {}): (() => void) | null {
  if (typeof window === "undefined") return null;

  const canvas = document.createElement("canvas");
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }

  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.bonsaiCanvas = "";
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block";
  document.body.prepend(canvas);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const mobileQuery = window.matchMedia(MOBILE_QUERY);
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let mobile = mobileQuery.matches;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe6df);
  scene.fog = new THREE.Fog(0xdfe6df, 200, 480); // `finished` sits ~190 away on mobile

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 700);
  const graybox = createGraybox();
  const data = generateBonsai(options.seed ?? DEFAULT_SEED);
  const tree = createTree(data);
  const obstacles = buildObstacles(data);
  scene.add(graybox.group, tree.group);

  let path = createCameraPath({ mobile });
  const debug: DebugOverlay | null = options.debug ? createDebugOverlay(scene, path) : null;

  let activeChapter = "";
  let state: ConductorState = resolveProgress(0);
  let dirty = true;
  const driver = createScrollDriver({
    reducedMotion: reducedQuery.matches,
    onExactChange: () => wake(),
  });
  let width = 0;
  let height = 0;

  // The loop sleeps when nothing changes: no scroll, camera settled, no debug.
  const loop = createFrameLoop({
    request: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
    step,
  });

  function wake() {
    dirty = true;
    loop.wake();
  }

  function resize() {
    const nextWidth = window.innerWidth;
    const nextHeight = window.innerHeight;
    // A hidden or collapsed viewport reports 0: keep the last good size.
    if (!hasArea(nextWidth, nextHeight)) return;
    const nextMobile = mobileQuery.matches;
    if (nextWidth === width && nextHeight === height && nextMobile === mobile) return;
    width = nextWidth;
    height = nextHeight;
    if (nextMobile !== mobile) {
      mobile = nextMobile;
      path = createCameraPath({ mobile });
      debug?.setPath(path);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? DPR_CAP.mobile : DPR_CAP.desktop));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Lens shift: draw the look-at point in the copy-free area (framing.ts).
    const shift = viewOffsetFor(width, height, screenAnchor(mobile));
    camera.setViewOffset(width, height, shift.x, shift.y, width, height);
    debug?.resize(camera.aspect);
    wake();
  }

  function render() {
    if (!hasArea(width, height)) return;
    const pose = path.at(driver.smooth);
    // Safety net for fast jumps: never sweep through the grown tree.
    camera.position.set(...keepClear(pose.position, obstacles));
    camera.lookAt(...pose.target);
    if (camera.fov !== pose.fov) camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    state = resolveProgress(driver.exact);
    tree.setGrowth(state.growth);
    graybox.setGrowth(state.growth);
    graybox.setWorld(worldAt(driver.exact), scene);
    if (state.id !== activeChapter) {
      activeChapter = state.id;
      document.documentElement.dataset.bonsaiChapter = state.id;
    }

    renderer.render(scene, debug ? debug.renderCamera(camera) : camera);
    debug?.update(state, camera, renderer.info);
  }

  /** One frame. Returns true while the scene keeps changing. */
  function step(dt: number): boolean {
    const moving = driver.update(dt);
    if (moving) dirty = true;
    if (dirty || debug) {
      dirty = false;
      render();
    }
    return moving || Boolean(debug);
  }

  const onVisibility = () => {
    if (document.hidden) {
      loop.pause();
      return;
    }
    driver.read();
    wake();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    loop.pause();
  };
  const onContextRestored = () => wake();
  const onReducedMotion = () => {
    driver.setReducedMotion(reducedQuery.matches);
    wake();
  };
  const onPointer = () => loop.wake();

  resize();
  driver.start();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  reducedQuery.addEventListener("change", onReducedMotion);
  loop.wake();

  return function dispose() {
    loop.stop();
    driver.stop();
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointer);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
    reducedQuery.removeEventListener("change", onReducedMotion);
    debug?.dispose();
    tree.dispose();
    graybox.dispose();
    renderer.dispose();
    canvas.remove();
    delete document.documentElement.dataset.bonsaiChapter;
  };
}
