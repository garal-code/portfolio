// Graybox set dressing (Gate 2): neutral untextured materials in the DESIGN.md
// cream/sand/grey/forest tones. Realistic materials arrive at Gate 3.
// Units: 1 = 1 cm, soil surface at y = 0, tray 60 x 40 cm.

import * as THREE from "three";
import type { WorldState } from "./conductor.ts";

export interface Graybox {
  group: THREE.Group;
  lights: { key: THREE.DirectionalLight; hemisphere: THREE.HemisphereLight };
  /** Seed disappears as the sprout takes over. */
  setGrowth(growth: number): void;
  /** Applies sky colour, key light and lantern state. */
  setWorld(world: WorldState, scene: THREE.Scene): void;
  dispose(): void;
}

const COLORS = {
  cream: 0xf4f1ea,
  sand: 0xe6e1d6,
  soil: 0x5c574d,
  rock: 0x9b9a94,
  stone: 0xc9c4b8,
  roof: 0x123a2f,
  husk: 0xc2a878,
  seam: 0x4a3b28,
  root: 0xe4d8b4,
  gold: 0xf3b94c,
};

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

export function createGraybox(): Graybox {
  const group = new THREE.Group();
  group.name = "graybox";
  const material = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

  const cream = material(COLORS.cream, { roughness: 0.6, side: THREE.DoubleSide });
  const sand = material(COLORS.sand);
  const soil = material(COLORS.soil);
  const rockMaterial = material(COLORS.rock);
  const stone = material(COLORS.stone);
  const roof = material(COLORS.roof);
  const huskMaterial = material(COLORS.husk, { roughness: 0.55 });
  const seamMaterial = material(COLORS.seam);
  const rootMaterial = material(COLORS.root, { roughness: 0.7 });
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.sand,
    emissive: COLORS.gold,
    emissiveIntensity: 0,
    roughness: 0.6,
  });
  const materials = [cream, sand, soil, rockMaterial, stone, roof, huskMaterial, seamMaterial, rootMaterial, windowMaterial];

  // Windowsill under the tray.
  const sill = new THREE.Mesh(new THREE.BoxGeometry(260, 2, 160), sand);
  sill.position.y = -6.5;
  sill.name = "sill";

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

  const soilMesh = new THREE.Mesh(new THREE.CylinderGeometry(18.9, 18.9, 1, 72), soil);
  soilMesh.scale.x = 1.5;
  soilMesh.position.y = -0.5; // top face at y = 0
  soilMesh.name = "soil";

  const seed = createSeed(huskMaterial, seamMaterial, rootMaterial);

  const rocks = new THREE.Group();
  rocks.name = "rocks";
  [
    { at: [16, 1.2, 5], radius: 5, seed: 11 },
    { at: [22, 0.8, -7], radius: 4, seed: 23 },
    { at: [-24, 0.8, -9], radius: 3.5, seed: 37 },
  ].forEach(({ at, radius, seed: rockSeed }) => {
    const mesh = rock(radius, rockSeed, rockMaterial);
    mesh.position.set(at[0]!, at[1]!, at[2]!);
    rocks.add(mesh);
  });

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
  const windows: THREE.Mesh[] = [];
  tierWidth.forEach((width, tier) => {
    const base = 4 + tier * 3.5;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, 2.4, width), cream);
    body.position.y = base + 1.2;
    const eave = new THREE.Mesh(new THREE.ConeGeometry(width * 0.95, 1.1, 4), roof);
    eave.rotation.y = Math.PI / 4;
    eave.position.y = base + 2.4 + 0.55;
    const lit = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 1, 0.1), windowMaterial);
    lit.position.set(0, base + 1.2, width / 2 + 0.05);
    windows.push(lit);
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

  group.add(sill, tray, soilMesh, seed, rocks, pagoda);

  // Lights: window key + sky fill. Shadows arrive at Gate 3.
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-30, 55, 40);
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0xb8b3a6, 0.7);
  group.add(key, hemisphere);

  const color = new THREE.Color();

  return {
    group,
    lights: { key, hemisphere },
    setGrowth(growth: number) {
      const t = Math.min(1, Math.max(0, (growth - 0.02) / 0.03));
      seed.scale.setScalar(1 - t * t * (3 - 2 * t));
      seed.visible = t < 1;
    },
    setWorld(world: WorldState, scene: THREE.Scene) {
      color.setHex(world.sky);
      (scene.background as THREE.Color).copy(color);
      (scene.fog as THREE.Fog).color.copy(color);
      hemisphere.color.copy(color).lerp(new THREE.Color(0xffffff), 0.5);
      key.color.setHex(world.key);
      key.intensity = world.keyIntensity;
      windowMaterial.emissiveIntensity = world.lanterns * 1.2;
      glows.forEach((glow) => {
        glow.intensity = world.lanterns * 40;
      });
    },
    dispose() {
      group.traverse((object) => {
        if ((object as THREE.Mesh).geometry) (object as THREE.Mesh).geometry.dispose();
      });
      materials.forEach((item) => item.dispose());
    },
  };
}
