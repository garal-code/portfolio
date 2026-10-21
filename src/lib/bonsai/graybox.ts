// Set dressing for the bonsai diorama (Gate 3): ceramic tray with clearcoat glaze,
// mossy soil, rocks, stone stairs, the pagoda with a dark tiled roof and gold
// lanterns, and the sun-driven key light with its shadows. Every material starts
// as a plain colour and receives its textures later (setSurface / setRocks), so
// the scene renders before any asset arrives and survives a failed download.
// Units: 1 = 1 cm, soil surface at y = 0, tray 60 x 40 cm.

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { WorldState } from "./conductor.ts";
import { mulberry32 } from "./random.ts";
import type { SunState } from "./sun.ts";

export interface SurfaceMaps {
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
}

export type SurfaceName = "ground" | "roof" | "stone";

export interface Graybox {
  group: THREE.Group;
  lights: { key: THREE.DirectionalLight; hemisphere: THREE.HemisphereLight };
  /** Seed disappears as the sprout takes over. */
  setGrowth(growth: number): void;
  /** Applies the key light (aligned with the sun), fill, fog and lantern state. */
  setWorld(world: WorldState, sun: SunState, scene: THREE.Scene): void;
  /** Applies a loaded texture set to a material family. Textures are repeated per family here. */
  setSurface(name: SurfaceName, maps: SurfaceMaps): void;
  /** Replaces the plain stand-in rocks with the loaded mossy rock model. */
  setRocks(model: THREE.Object3D): void;
  /** Reflections available: the hemisphere fill steps back. */
  setEnvironmentReady(ready: boolean): void;
  /** Shadow map resolution: 2048 on desktop, 1024 on mobile. */
  setShadowQuality(mobile: boolean): void;
  dispose(): void;
}

const COLORS = {
  cream: 0xf4f1ea,
  sand: 0xe6e1d6,
  soil: 0x4a4137,
  moss: 0x5d7d3f,
  rock: 0x8d8c84,
  stone: 0xc9c4b8,
  roof: 0x1b2b27,
  husk: 0xc2a878,
  seam: 0x4a3b28,
  root: 0xe4d8b4,
  gold: 0xf3b94c,
  sill: 0xc9b48e,
};

/** Where the key light and its shadow frustum are centred: the middle of the tree. */
const LIGHT_TARGET = new THREE.Vector3(0, 14, 0);
const LIGHT_DISTANCE = 200;
const SHADOW_HALF_SIZE = 48;
const SHADOW_MAP = { desktop: 2048, mobile: 1024 };
const SOIL_TILE = 14;
const MOSS_CLUMPS = 18;

function rock(radius: number, seed: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(radius, 2);
  const random = mulberry32(seed);
  const position = geometry.getAttribute("position");
  const cache = new Map<string, number>();
  for (let i = 0; i < position.count; i += 1) {
    const key = `${position.getX(i).toFixed(3)},${position.getY(i).toFixed(3)},${position.getZ(i).toFixed(3)}`;
    if (!cache.has(key)) cache.set(key, 0.82 + random() * 0.36);
    const factor = cache.get(key)!;
    position.setXYZ(i, position.getX(i) * factor, position.getY(i) * factor, position.getZ(i) * factor);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(1, 0.65, 0.9);
  return mesh;
}

const SEED = { length: 2.8, width: 0.9, flatten: [0.85, 0.8] as const };

/** Seed outline: round at the base, tapering to a point at +s. Radius at 0..1 along the length. */
function seedRadius(s: number): number {
  return SEED.width * Math.sin(Math.PI * Math.pow(s, 0.7));
}

/**
 * A seed lying on the soil: almond husk pointed at +x, a dark split along its
 * flank and a tiny pale root diving into the soil from the tip.
 */
function createSeed(husk: THREE.Material, seam: THREE.Material, root: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = "seed";
  const [flatY, flatZ] = SEED.flatten;
  const half = SEED.length / 2;

  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const s = i / 24;
    profile.push(new THREE.Vector2(Math.max(seedRadius(s), 0), -half + SEED.length * s));
  }
  const huskGeometry = new THREE.LatheGeometry(profile, 20).rotateZ(-Math.PI / 2).scale(1, flatY, flatZ);
  const body = new THREE.Mesh(huskGeometry, husk);
  body.name = "seed-husk";

  // Split: follows the husk surface on the upper front flank.
  const flank = 0.6;
  const seamPoints = Array.from({ length: 14 }, (_, i) => {
    const s = 0.06 + (i / 13) * 0.86;
    const r = seedRadius(s) * 1.01;
    return new THREE.Vector3(-half + SEED.length * s, r * flatY * Math.sin(flank), r * flatZ * Math.cos(flank));
  });
  const split = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPoints), 24, 0.03, 5), seam);
  split.name = "seed-split";

  const tip = new THREE.Vector3(half - 0.05, 0, 0);
  const rootCurve = new THREE.CatmullRomCurve3([
    tip,
    tip.clone().add(new THREE.Vector3(0.25, -0.2, 0.03)),
    tip.clone().add(new THREE.Vector3(0.38, -0.62, 0.08)),
  ]);
  const radicle = new THREE.Mesh(new THREE.TubeGeometry(rootCurve, 10, 0.06, 6), root);
  radicle.name = "seed-root";

  group.add(body, split, radicle);
  group.position.set(0, 0.62, 0);
  group.rotation.z = 0.1;
  return group;
}

/** A dozen soft moss cushions merged into one mesh: lumpy hemispheres sitting on the soil. */
function createMossClumps(): THREE.BufferGeometry {
  const random = mulberry32(5150);
  const parts: THREE.BufferGeometry[] = [];
  const merged = { position: [] as number[], normal: [] as number[], uv: [] as number[], index: [] as number[] };
  for (let n = 0; n < MOSS_CLUMPS; n += 1) {
    // inside the soil ellipse, away from the trunk and the pagoda platform
    let x = 0;
    let z = 0;
    for (let tries = 0; tries < 20; tries += 1) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * 0.88;
      x = Math.cos(angle) * radius * 28;
      z = Math.sin(angle) * radius * 18.4;
      const nearTrunk = Math.hypot(x, z) < 4.5;
      const onPlatform = x > -20 && x < -8 && z > -6 && z < 11;
      if (!nearTrunk && !onPlatform) break;
    }
    const size = 1 + random() * 1.8;
    // welded, so the cushion shades smoothly instead of in facets
    const base = new THREE.IcosahedronGeometry(size, 2);
    base.deleteAttribute("normal");
    base.deleteAttribute("uv");
    const geometry = mergeVertices(base);
    base.dispose();
    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      const bump = 0.8 + random() * 0.4;
      position.setXYZ(i, position.getX(i) * bump, Math.max(position.getY(i), -size * 0.2) * bump * 0.45, position.getZ(i) * bump);
    }
    geometry.translate(x, 0.05, z);
    geometry.computeVertexNormals();
    parts.push(geometry);
  }
  for (const geometry of parts) {
    const base = merged.position.length / 3;
    merged.position.push(...(geometry.getAttribute("position").array as Float32Array));
    merged.normal.push(...(geometry.getAttribute("normal").array as Float32Array));
    // planar world-space UVs, so the ground texture keeps one scale across clumps
    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) merged.uv.push(position.getX(i) / SOIL_TILE, position.getZ(i) / SOIL_TILE);
    const indices = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: position.count }, (_, i) => i);
    merged.index.push(...indices.map((value) => value + base));
    geometry.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(merged.position, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(merged.normal, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(merged.uv, 2));
  out.setIndex(merged.index);
  return out;
}

/** Positions of the three mossy rocks, with the world size (cm) of their widest side. */
const ROCK_PLACEMENT = [
  { at: [16, 0, 5], width: 10, mesh: 0, turn: 0.4 },
  { at: [22, 0, -7], width: 7.5, mesh: 4, turn: 2.1 },
  { at: [-24, 0, -9], width: 6.5, mesh: 2, turn: 4.0 },
] as const;

export function createGraybox(): Graybox {
  const group = new THREE.Group();
  group.name = "graybox";
  const material = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

  // Ceramic glaze: cream, roughness ~0.35 and a clearcoat, so the sun leaves a soft highlight.
  const cream = new THREE.MeshPhysicalMaterial({
    color: COLORS.cream,
    roughness: 0.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.18,
    side: THREE.DoubleSide,
  });
  const plaster = material(COLORS.cream, { roughness: 0.8 });
  const sand = material(COLORS.sand);
  // Warm light-oak sill: a neutral sand surface turned lilac under the cool day fill.
  const sillMaterial = material(COLORS.sill, { roughness: 0.85 });
  const soil = material(COLORS.soil, { roughness: 1 });
  const moss = material(COLORS.moss, { roughness: 1 });
  const rockMaterial = material(COLORS.rock);
  const stone = material(COLORS.stone);
  const roof = material(COLORS.roof, { roughness: 0.6 });
  const huskMaterial = material(COLORS.husk, { roughness: 0.55 });
  const seamMaterial = material(COLORS.seam);
  const rootMaterial = material(COLORS.root, { roughness: 0.7 });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.sand,
    emissive: COLORS.gold,
    emissiveIntensity: 0,
    roughness: 0.6,
  });
  const materials: THREE.Material[] = [cream, plaster, sand, sillMaterial, soil, moss, rockMaterial, stone, roof, huskMaterial, seamMaterial, rootMaterial, windowMaterial];
  const extraDisposables: { dispose(): void }[] = [];

  // Windowsill under the tray.
  const sill = new THREE.Mesh(new THREE.BoxGeometry(900, 2, 900), sillMaterial); // wide enough that fog takes its far edge into the haze
  sill.position.y = -6.5;
  sill.name = "sill";
  sill.receiveShadow = true;

  // Tray: lathe profile scaled in x to a 60 x 40 oval, 6 cm deep.
  const profile = [
    [0, -5.5],
    [16, -5.5],
    [18, -5.1],
    [19.4, -3.8],
    [20, 0.2],
    [20, 1],
    [19.2, 1],
    [19, -0.6],
    [0, -0.6],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const tray = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), cream);
  tray.scale.x = 1.5;
  tray.name = "tray";
  tray.castShadow = true;
  tray.receiveShadow = true;

  const soilMesh = new THREE.Mesh(new THREE.CylinderGeometry(18.9, 18.9, 1, 72), soil);
  soilMesh.scale.x = 1.5;
  soilMesh.position.y = -0.5; // top face at y = 0
  soilMesh.name = "soil";
  soilMesh.receiveShadow = true;

  const mossMesh = new THREE.Mesh(createMossClumps(), moss);
  mossMesh.name = "moss";
  mossMesh.receiveShadow = true;
  mossMesh.castShadow = true;

  const seed = createSeed(huskMaterial, seamMaterial, rootMaterial);
  seed.traverse((object) => {
    object.castShadow = true;
  });

  // Plain stand-in rocks until the mossy model arrives (or if it never does).
  const rocks = new THREE.Group();
  rocks.name = "rocks";
  const standIns = new THREE.Group();
  [
    { at: [16, 1.2, 5], radius: 5, seed: 11 },
    { at: [22, 0.8, -7], radius: 4, seed: 23 },
    { at: [-24, 0.8, -9], radius: 3.5, seed: 37 },
  ].forEach(({ at, radius, seed: rockSeed }) => {
    const mesh = rock(radius, rockSeed, rockMaterial);
    mesh.position.set(at[0]!, at[1]!, at[2]!);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    standIns.add(mesh);
  });
  rocks.add(standIns);

  // Pagoda on a stone platform, stairs facing the camera (+z).
  const pagoda = new THREE.Group();
  pagoda.name = "pagoda";
  pagoda.position.set(-14, 0, 0);
  const platform = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 10), stone);
  platform.position.y = 2;
  pagoda.add(platform);
  for (let i = 0; i < 3; i += 1) {
    const height = i + 1;
    const step = new THREE.Mesh(new THREE.BoxGeometry(6, height, 1.6), stone);
    step.position.set(0, height / 2, 5 + 1.6 * (2 - i) + 0.8);
    step.name = `stair-${i}`;
    pagoda.add(step);
  }

  const tierWidth = [5.2, 4.2, 3.2];
  tierWidth.forEach((width, tier) => {
    const base = 4 + tier * 3.5;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, 2.4, width), plaster);
    body.position.y = base + 1.2;
    const eave = new THREE.Mesh(new THREE.ConeGeometry(width * 0.95, 1.1, 4), roof);
    eave.rotation.y = Math.PI / 4;
    eave.position.y = base + 2.4 + 0.55;
    const lit = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 1, 0.1), windowMaterial);
    lit.position.set(0, base + 1.2, width / 2 + 0.05);
    pagoda.add(body, eave, lit);
  });
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 1.5, 8), roof);
  finial.position.y = 4 + 3 * 3.5 + 0.2;
  pagoda.add(finial);

  // Lanterns: two flanking the stair foot, two on the platform front corners.
  const lantern = (x: number, y: number, z: number) => {
    const lamp = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), stone);
    post.position.y = 0.7;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), windowMaterial);
    box.position.y = 1.85;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.55, 4), roof);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = 2.575;
    lamp.add(post, box, cap);
    lamp.position.set(x, y, z);
    return lamp;
  };
  pagoda.add(lantern(-4.2, 0, 9.4), lantern(4.2, 0, 9.4), lantern(-4.2, 4, 4.2), lantern(4.2, 4, 4.2));

  const glows = [new THREE.PointLight(COLORS.gold, 0, 40, 2), new THREE.PointLight(COLORS.gold, 0, 40, 2)];
  glows[0]!.position.set(0, 2.5, 9.4);
  glows[1]!.position.set(0, 7, 3);
  pagoda.add(...glows);
  pagoda.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  group.add(sill, tray, soilMesh, mossMesh, seed, rocks, pagoda);

  // Lights: the sun is the single shadow-casting key light; the fill is a hemisphere
  // light that steps back once the environment reflections arrive.
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(SHADOW_MAP.desktop, SHADOW_MAP.desktop);
  Object.assign(key.shadow.camera, {
    left: -SHADOW_HALF_SIZE,
    right: SHADOW_HALF_SIZE,
    top: SHADOW_HALF_SIZE,
    bottom: -SHADOW_HALF_SIZE,
    near: LIGHT_DISTANCE - 90,
    far: LIGHT_DISTANCE + 90,
  });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.08;
  key.target.position.copy(LIGHT_TARGET);
  key.position.copy(LIGHT_TARGET).addScaledVector(new THREE.Vector3(-0.3, 0.8, 0.5), LIGHT_DISTANCE);
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0xb8b3a6, 0.7);
  group.add(key, key.target, hemisphere);

  const sky = new THREE.Color();
  const white = new THREE.Color(0xffffff);
  const bounce = new THREE.Color(0x6b5a3e);
  let environmentReady = false;
  let fillScale = 1;

  const surfaces: Record<SurfaceName, { materials: THREE.MeshStandardMaterial[]; repeat: [number, number]; tint: number }> = {
    ground: { materials: [soil], repeat: [(18.9 * 1.5 * 2) / SOIL_TILE, (18.9 * 2) / SOIL_TILE], tint: 0xb9ad9a },
    roof: { materials: [roof], repeat: [3, 1.4], tint: 0xb7c2bb },
    stone: { materials: [stone], repeat: [1.6, 1.6], tint: 0xd8d2c4 },
  };
  const mossTint = 0xa9bf7c;

  /** Clones a texture so each family has its own repeat while sharing the decoded image. */
  function tile(texture: THREE.Texture | null | undefined, repeat: [number, number]): THREE.Texture | null {
    if (!texture) return null;
    const clone = texture.clone();
    clone.repeat.set(repeat[0], repeat[1]);
    clone.needsUpdate = true;
    extraDisposables.push(clone);
    return clone;
  }

  return {
    group,
    lights: { key, hemisphere },
    setGrowth(growth: number) {
      const t = Math.min(1, Math.max(0, (growth - 0.02) / 0.03));
      seed.scale.setScalar(1 - t * t * (3 - 2 * t));
      seed.visible = t < 1;
    },
    setWorld(world: WorldState, sun: SunState, scene: THREE.Scene) {
      key.color.setHex(sun.keyColor);
      key.intensity = sun.keyIntensity;
      key.position.copy(LIGHT_TARGET).addScaledVector(new THREE.Vector3(...sun.lightDirection), LIGHT_DISTANCE);
      sky.setHex(sun.sky.horizon);
      (scene.fog as THREE.Fog | null)?.color.copy(sky);
      // Fill takes the warm horizon colour, not the blue zenith, so shaded cream stays cream.
      hemisphere.color.setHex(sun.sky.zenith).lerp(sky, 0.85).lerp(white, 0.15);
      hemisphere.groundColor.setHex(sun.sky.ground).lerp(bounce, 0.55); // warm bounce off the sill, never blue
      hemisphere.intensity = (environmentReady ? 0.65 : 0.7) * fillScale;
      // Reflections only (the HDRI is cool, so it stays low to keep diffuse surfaces warm): stronger by day than at dusk.
      scene.environmentIntensity = 0.07 + 0.12 * Math.min(1, Math.max(0, (sun.keyIntensity - 0.6) / 1.8));
      windowMaterial.emissiveIntensity = world.lanterns * 2.2;
      glows.forEach((glow) => {
        glow.intensity = world.lanterns * 20; // stronger glows pushed the plaster walls into bloom
      });
    },
    setSurface(name: SurfaceName, maps: SurfaceMaps) {
      const { materials: targets, repeat, tint } = surfaces[name];
      const diffuse = tile(maps.map, repeat);
      const normal = tile(maps.normalMap, repeat);
      const rough = tile(maps.roughnessMap, repeat);
      for (const target of targets) {
        target.map = diffuse;
        target.normalMap = normal;
        target.roughnessMap = rough;
        if (diffuse) target.color.setHex(tint);
        if (rough) target.roughness = 1;
        target.needsUpdate = true;
      }
      if (name === "ground") {
        // Moss clumps use the same set, brighter and greener, with world-space UVs.
        moss.map = maps.map ?? null;
        moss.normalMap = maps.normalMap ?? null;
        moss.roughnessMap = maps.roughnessMap ?? null;
        if (maps.map) moss.color.setHex(mossTint);
        moss.needsUpdate = true;
      }
    },
    setRocks(model: THREE.Object3D) {
      const meshes: THREE.Mesh[] = [];
      model.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
      });
      if (meshes.length === 0) return;
      const placed = new THREE.Group();
      for (const spec of ROCK_PLACEMENT) {
        const source = meshes[spec.mesh % meshes.length]!;
        const rockMesh = new THREE.Mesh(source.geometry, source.material);
        source.geometry.computeBoundingBox();
        const box = source.geometry.boundingBox!;
        const size = box.getSize(new THREE.Vector3());
        const scale = spec.width / Math.max(size.x, size.z);
        rockMesh.scale.setScalar(scale);
        rockMesh.rotation.y = spec.turn;
        // sink the base a little into the soil
        rockMesh.position.set(spec.at[0], -box.min.y * scale - 0.5, spec.at[2]);
        rockMesh.castShadow = true;
        rockMesh.receiveShadow = true;
        placed.add(rockMesh);
      }
      standIns.removeFromParent();
      standIns.traverse((object) => {
        if ((object as THREE.Mesh).geometry) (object as THREE.Mesh).geometry.dispose();
      });
      rocks.add(placed);
      // The model's own material also dresses the stone: its normal and roughness maps are reused below.
    },
    setEnvironmentReady(ready: boolean) {
      environmentReady = ready;
      fillScale = 1;
    },
    setShadowQuality(mobile: boolean) {
      const size = mobile ? SHADOW_MAP.mobile : SHADOW_MAP.desktop;
      if (key.shadow.mapSize.x === size) return;
      key.shadow.mapSize.set(size, size);
      key.shadow.map?.dispose();
      key.shadow.map = null;
    },
    dispose() {
      group.traverse((object) => {
        if ((object as THREE.Mesh).geometry) (object as THREE.Mesh).geometry.dispose();
      });
      materials.forEach((item) => item.dispose());
      extraDisposables.forEach((item) => item.dispose());
      key.shadow.map?.dispose();
    },
  };
}
