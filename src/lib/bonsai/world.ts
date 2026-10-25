// One renderer, one scene, one camera for the whole /bonsai page.
// Exact scroll progress drives growth and chapter state; damped progress drives
// the camera only (threejs-scroll-worlds, realtime-architecture section 5).

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { loadBonsaiAssets } from "./assets.ts";
import { buildObstacles, keepClear } from "./clearance.ts";
import { createCameraPath, resolveProgress, worldAt, type ConductorState } from "./conductor.ts";
import { createDebugOverlay, type DebugOverlay } from "./debug.ts";
import { hasArea, screenAnchor, viewOffsetFor } from "./framing.ts";
import { DEFAULT_SEED, generateBonsai } from "./generator.ts";
import { createGraybox } from "./graybox.ts";
import { createFrameLoop } from "./loop.ts";
import { createScrollDriver } from "./scroll.ts";
import { createSky } from "./sky.ts";
import { sunAt } from "./sun.ts";
import { createTree } from "./tree.ts";

export interface MountOptions {
  seed?: number;
  debug?: boolean;
}

const DPR_CAP = { mobile: 1.35, desktop: 1.75 };
const MOBILE_QUERY = "(max-width: 767px)";
// Restrained bloom, desktop tier only: it lifts the sun disc and gold emissives
// (HDR above the threshold) and grows slightly as the light fades.
const BLOOM = { threshold: 1.25, radius: 0.55, strength: [0.16, 0.5] as const };
const EXPOSURE = 1.05;

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
  renderer.toneMappingExposure = EXPOSURE;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false; // the composer renders several passes per frame; reset once per frame

  const mobileQuery = window.matchMedia(MOBILE_QUERY);
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let mobile = mobileQuery.matches;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe4eae3, 200, 480); // `finished` sits ~190 away on mobile

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 700);
  const graybox = createGraybox();
  const data = generateBonsai(options.seed ?? DEFAULT_SEED);
  const tree = createTree(data);
  const obstacles = buildObstacles(data);
  const sky = createSky();
  scene.add(sky.group, graybox.group, tree.group);
  graybox.setShadowQuality(mobile);
  tree.setLeafDetail(mobile ? 0.6 : 1);
  const assets = loadBonsaiAssets(
    { renderer, scene, tree, graybox, onChange: () => wake() },
    import.meta.env.BASE_URL,
  );

  // Desktop tier: HDR scene -> bloom -> tone mapping and sRGB output. The mobile tier renders directly.
  let composer: EffectComposer | null = null;
  let renderPass: RenderPass | null = null;
  let bloom: UnrealBloomPass | null = null;
  function syncComposer() {
    if (mobile) {
      composer?.dispose();
      composer = renderPass = bloom = null;
      return;
    }
    if (composer) return;
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    renderPass = new RenderPass(scene, camera);
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM.strength[0], BLOOM.radius, BLOOM.threshold);
    composer.addPass(renderPass);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  syncComposer();

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
      graybox.setShadowQuality(mobile);
      tree.setLeafDetail(mobile ? 0.6 : 1);
      syncComposer();
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? DPR_CAP.mobile : DPR_CAP.desktop);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer?.setPixelRatio(pixelRatio);
    composer?.setSize(width, height);
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
    const sun = sunAt(driver.exact);
    graybox.setWorld(worldAt(driver.exact), sun, scene);
    sky.setSun(sun);
    sky.follow(camera.position);
    if (state.id !== activeChapter) {
      activeChapter = state.id;
      document.documentElement.dataset.bonsaiChapter = state.id;
    }

    const viewCamera = debug ? debug.renderCamera(camera) : camera;
    renderer.info.reset();
    if (composer && renderPass && bloom) {
      renderPass.camera = viewCamera;
      const dusk = 1 - Math.min(1, Math.max(0, (sun.keyIntensity - 0.6) / 1.8));
      bloom.strength = BLOOM.strength[0] + (BLOOM.strength[1] - BLOOM.strength[0]) * dusk;
      composer.render();
    } else {
      renderer.render(scene, viewCamera);
    }
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

  if (options.debug) (window as unknown as { __bonsaiInfo?: THREE.WebGLInfo }).__bonsaiInfo = renderer.info;

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
    assets.cancel();
    composer?.dispose();
    scene.environment = null;
    sky.dispose();
    tree.dispose();
    graybox.dispose();
    renderer.dispose();
    canvas.remove();
    delete document.documentElement.dataset.bonsaiChapter;
  };
}
