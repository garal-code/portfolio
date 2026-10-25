// GPU layer for the generated bonsai. The whole tree is a handful of instanced
// draw calls (segments, joints, pad cores, leaf cards) plus a wire tube. Growth
// never touches the CPU per frame: the vertex shaders scale every instance from
// `uGrowth`, using the same rules as growth.ts (segmentScale, trunkThickness,
// padScale). Realistic surfaces (Gate 3): textured bark with UVs along each limb,
// leaf cards over a dark canopy core, copper wire. Every material renders with
// plain fallback colours first; textures arrive later through setBark.

import * as THREE from "three";
import type { BonsaiData } from "./generator.ts";
import { CONDENSE_WINDOW, DEATH_SPAN, TRUNK_GROW, TRUNK_MIN_THICKNESS, wireExtent } from "./growth.ts";
import { mulberry32 } from "./random.ts";
import { BARK_TILE } from "./surfaces.ts";

export interface BarkMaps {
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
}

export interface Tree {
  group: THREE.Group;
  setGrowth(growth: number): void;
  /** Applies the bark texture set (sRGB colour, linear normal and roughness). */
  setBark(maps: BarkMaps): void;
  /** Copper needs reflections: metallic once the environment map exists. */
  setEnvironmentReady(ready: boolean): void;
  /** Fraction (0..1) of the leaf cards drawn; the cards are shuffled, so any fraction is an even sample. */
  setLeafDetail(fraction: number): void;
  dispose(): void;
}

// Fallback colours (no textures yet): brown bark, natural greens (world bible section 3).
const TREE_COLORS = { bark: 0x6a5440, barkTextured: 0xcfc0a8, core: 0x2c5232, wire: 0xb87333 };
const LEAF_CARDS_PER_PAD = 380;
const LEAF_SIZE = 1.7;
const CORE_SCALE = 0.85;

const SEGMENT_PRELUDE = /* glsl */ `
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec2 aRadius;
attribute vec3 aLife; // birth, span, death
attribute float aKind;
uniform float uGrowth;
uniform float uDeathSpan;
uniform vec2 uTrunkGrow;
uniform float uTrunkMin;
uniform float uBarkTile;
`;

const SEGMENT_FRAME = /* glsl */ `
vec3 segAxis = aEnd - aStart;
float segLen = length(segAxis);
vec3 segY = segAxis / max(segLen, 1e-5);
vec3 segHelper = abs(segY.y) < 0.98 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
vec3 segX = normalize(cross(segHelper, segY));
vec3 segZ = cross(segY, segX);
`;

const SEGMENT_NORMAL = /* glsl */ `
${SEGMENT_FRAME}
vec3 objectNormal = normalize(segX * normal.x + segZ * normal.z);
`;

// Mirrors segmentScale() and trunkThickness() in growth.ts.
const SEGMENT_SCALE = /* glsl */ `
float segGrown = smoothstep(aLife.x, aLife.x + aLife.y, uGrowth);
float segCut = aLife.z < 1.0 ? smoothstep(aLife.z - uDeathSpan, aLife.z, uGrowth) : 0.0;
float segScale = segGrown * (1.0 - segCut);
float segThickness = aKind < 0.5 ? mix(uTrunkMin, 1.0, smoothstep(uTrunkGrow.x, uTrunkGrow.y, uGrowth)) : 1.0;
`;

// Bark UVs (mirrors barkRepeat() in surfaces.ts): u wraps the circumference in
// whole turns so the seam closes, v runs along the limb in tile units, measured
// from the world so consecutive segments line up. The final radius is used, so
// the pattern grows with the limb instead of swimming while it thickens.
const BARK_UV_ASSIGN = /* glsl */ `
#ifdef USE_MAP
  vMapUv = barkUv;
#endif
#ifdef USE_NORMALMAP
  vNormalMapUv = barkUv;
#endif
#ifdef USE_ROUGHNESSMAP
  vRoughnessMapUv = barkUv;
#endif
`;

const SEGMENT_POSITION = /* glsl */ `
${SEGMENT_SCALE}
float segRadius = mix(aRadius.x, aRadius.y, position.y) * segThickness;
vec3 transformed = aStart + segScale * (segY * (position.y * segLen) + (segX * position.x + segZ * position.z) * segRadius);
float barkTurns = max(1.0, floor(3.14159265 * (aRadius.x + aRadius.y) / uBarkTile + 0.5));
float barkPhase = fract(sin(dot(aStart, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
vec2 barkUv = vec2(uv.x * barkTurns + barkPhase, (dot(aStart, segY) + position.y * segLen) / uBarkTile);
${BARK_UV_ASSIGN}
`;

// Joint ball at the tip of every segment: consecutive segments meet at a bend
// with different axes, and the ball closes the crack so the limb reads as one form.
const JOINT_NORMAL = /* glsl */ `
vec3 objectNormal = normalize(normal);
`;

// Slightly inside the 12-sided limb so the ball only shows where the limb has a gap.
const JOINT_FIT = "0.94";

const JOINT_POSITION = /* glsl */ `
${SEGMENT_SCALE}
vec3 transformed = (aStart + segScale * (aEnd - aStart)) + position * (aRadius.y * ${JOINT_FIT}) * segThickness * segScale;
float jointR = aRadius.y * ${JOINT_FIT};
float barkTurns = max(1.0, floor(6.2831853 * jointR / uBarkTile + 0.5));
float barkPhase = fract(sin(dot(aStart, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
vec2 barkUv = vec2(uv.x * barkTurns + barkPhase, uv.y * 3.14159265 * jointR / uBarkTile);
${BARK_UV_ASSIGN}
`;

const PAD_PRELUDE = /* glsl */ `
attribute vec3 aCenter;
attribute float aSize;
attribute vec3 aLife; // birth, span, loose
uniform float uGrowth;
uniform vec2 uCondense;
`;

// Mirrors padScale() in growth.ts. Pads are flattened ellipsoids; the dark core
// sits just inside the leaf cards so gaps between leaves read as depth.
const PAD_NORMAL = /* glsl */ `
vec3 objectNormal = normalize(vec3(normal.x, normal.y * 2.0, normal.z));
`;

const PAD_SCALE = /* glsl */ `
float padGrown = smoothstep(aLife.x, aLife.x + aLife.y, uGrowth);
float padRelax = mix(aLife.z, 1.0, smoothstep(uCondense.x, uCondense.y, uGrowth));
`;

const PAD_POSITION = /* glsl */ `
${PAD_SCALE}
vec3 transformed = aCenter + vec3(position.x, position.y * 0.5, position.z) * aSize * padGrown * padRelax * ${CORE_SCALE.toFixed(2)};
`;

// Leaf cards: quads tangent to the canopy shell, rolled at random, scaled and
// placed with the same pad growth and condense rules as the core. Instances are
// shuffled across pads, so drawing a prefix thins every pad evenly.
const CARD_PRELUDE = /* glsl */ `
attribute vec3 aCenter;
attribute float aSize;
attribute vec3 aLife; // birth, span, loose
attribute vec3 aOffset; // position inside the unit canopy ball
attribute vec4 aCard; // roll, scale, tone, spare
uniform float uGrowth;
uniform vec2 uCondense;
uniform float uLeafSize;
varying float vLeafTone;
`;

const CARD_FRAME = /* glsl */ `
vec3 cardOut = normalize(vec3(aOffset.x, aOffset.y * 1.6, aOffset.z) + vec3(1e-5));
vec3 cardUp0 = abs(cardOut.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
vec3 cardT1 = normalize(cross(cardUp0, cardOut));
vec3 cardT2 = cross(cardOut, cardT1);
float cardC = cos(aCard.x);
float cardS = sin(aCard.x);
vec3 cardX = cardT1 * cardC + cardT2 * cardS;
vec3 cardY = cardT2 * cardC - cardT1 * cardS;
`;

// Soft canopy shading: the card lights like the blob it sits on, brighter on top.
const CARD_NORMAL = /* glsl */ `
${CARD_FRAME}
vec3 objectNormal = normalize(cardOut + vec3(0.0, 0.35, 0.0));
`;

const CARD_POSITION = /* glsl */ `
${PAD_SCALE}
vec3 transformed = aCenter + vec3(aOffset.x, aOffset.y * 0.5, aOffset.z) * aSize * padGrown * padRelax
  + (cardX * position.x + cardY * position.y) * uLeafSize * aCard.y * padGrown;
vLeafTone = aCard.z;
`;

interface Patch {
  key: string;
  prelude: string;
  normalChunk: string;
  positionChunk: string;
  uniforms: Record<string, THREE.IUniform>;
  /** Chunks the position code needs that the normal chunk normally defines (shadow pass has no normal chunk). */
  frame?: string;
  fragment?: (source: string) => string;
}

function patchMaterial(material: THREE.Material, patch: Patch) {
  material.customProgramCacheKey = () => patch.key;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, patch.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${patch.prelude}`)
      .replace("#include <beginnormal_vertex>", patch.normalChunk)
      .replace("#include <begin_vertex>", `${patch.frame ?? ""}${patch.positionChunk}`);
    if (patch.fragment) shader.fragmentShader = patch.fragment(shader.fragmentShader);
  };
}

/** Depth material for the shadow pass: the same vertex scaling as the lit material. */
function shadowMaterial(patch: Patch, options: { map?: THREE.Texture | null; alphaTest?: number } = {}): THREE.MeshDepthMaterial {
  const material = new THREE.MeshDepthMaterial({ map: options.map ?? null, alphaTest: options.alphaTest ?? 0 });
  patchMaterial(material, { ...patch, key: `${patch.key}-shadow`, normalChunk: "" });
  return material;
}

function instanced(base: THREE.BufferGeometry, count: number): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.getAttribute("position"));
  geometry.setAttribute("normal", base.getAttribute("normal"));
  geometry.setAttribute("uv", base.getAttribute("uv"));
  geometry.instanceCount = count;
  return geometry;
}

function interleave(parts: ArrayLike<number>[], count: number, stride: number): Float32Array {
  // parts are already flat per-instance arrays; this just concatenates by instance
  const out = new Float32Array(count * stride);
  let offset = 0;
  for (const part of parts) {
    const width = part.length / count;
    for (let i = 0; i < count; i += 1) {
      for (let c = 0; c < width; c += 1) out[i * stride + offset + c] = part[i * width + c]!;
    }
    offset += width;
  }
  return out;
}

/**
 * Leaf cluster atlas, drawn once on a canvas: a small spray of pointed leaves in
 * the natural greens of the palette. Browser only (the tests have no canvas);
 * without it the cards fall back to plain squares nobody renders.
 */
function createLeafTexture(): THREE.DataTexture | null {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const random = mulberry32(7);
  const greens = ["#3d6a3c", "#4a7a45", "#5a8a4b", "#6a9852", "#7fa05a"];
  // Small pointed leaves fanning out of a short stem: the look of a fine-leaved bonsai canopy.
  const leaf = (x: number, y: number, angle: number, length: number, width: number, color: string) => {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(width, -length * 0.5, 0, -length);
    context.quadraticCurveTo(-width, -length * 0.5, 0, 0);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = "rgba(200,220,160,0.45)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(0, -length * 0.1);
    context.lineTo(0, -length * 0.9);
    context.stroke();
    context.restore();
  };
  for (let i = 0; i < 44; i += 1) {
    const t = random();
    leaf(
      size / 2 + (random() - 0.5) * 36,
      size * (0.97 - 0.5 * t),
      (random() - 0.5) * 2.5,
      50 + random() * 36,
      14 + random() * 6,
      greens[Math.floor(random() * greens.length)]!,
    );
  }
  const image = context.getImageData(0, 0, size, size);
  // Transparent pixels keep a leaf colour, so mip levels do not bleed to black.
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3]! < 8) {
      image.data[i] = 74;
      image.data[i + 1] = 122;
      image.data[i + 2] = 69;
    }
  }
  const texture = new THREE.DataTexture(new Uint8Array(image.data.buffer.slice(0)), size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true; // canvas rows run top-down; the leaf base must sit at the card's base
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function createTree(data: BonsaiData): Tree {
  const group = new THREE.Group();
  group.name = "bonsai-tree";
  const uGrowth = { value: 0 };
  const disposables: { dispose(): void }[] = [];
  const segmentUniforms = {
    uGrowth,
    uDeathSpan: { value: DEATH_SPAN },
    uTrunkGrow: { value: new THREE.Vector2(TRUNK_GROW.from, TRUNK_GROW.to) },
    uTrunkMin: { value: TRUNK_MIN_THICKNESS },
    uBarkTile: { value: BARK_TILE },
  };
  const padUniforms = {
    uGrowth,
    uCondense: { value: new THREE.Vector2(CONDENSE_WINDOW.from, CONDENSE_WINDOW.to) },
    uLeafSize: { value: LEAF_SIZE },
  };

  // ── Segments ───────────────────────────────────────────────────────────
  const { segments, pads, wire } = data;
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, 0.5, 0);
  const segmentGeometry = instanced(cylinder, segments.count);
  cylinder.dispose();
  const life = interleave([segments.birth, segments.span, segments.death], segments.count, 3);
  segmentGeometry.setAttribute("aStart", new THREE.InstancedBufferAttribute(segments.start, 3));
  segmentGeometry.setAttribute("aEnd", new THREE.InstancedBufferAttribute(segments.end, 3));
  segmentGeometry.setAttribute("aRadius", new THREE.InstancedBufferAttribute(interleave([segments.radiusStart, segments.radiusEnd], segments.count, 2), 2));
  segmentGeometry.setAttribute("aLife", new THREE.InstancedBufferAttribute(life, 3));
  segmentGeometry.setAttribute("aKind", new THREE.InstancedBufferAttribute(Float32Array.from(segments.kind), 1));

  const barkMaterial = new THREE.MeshStandardMaterial({ color: TREE_COLORS.bark, roughness: 0.9, side: THREE.DoubleSide });
  const segmentPatch: Patch = {
    key: "bonsai-segments",
    prelude: SEGMENT_PRELUDE,
    normalChunk: SEGMENT_NORMAL,
    positionChunk: SEGMENT_POSITION,
    frame: SEGMENT_FRAME,
    uniforms: segmentUniforms,
  };
  patchMaterial(barkMaterial, { ...segmentPatch, frame: "" });
  const segmentMesh = new THREE.Mesh(segmentGeometry, barkMaterial);
  segmentMesh.name = "bonsai-segments";
  segmentMesh.frustumCulled = false; // instanced bounds are not the base geometry bounds
  segmentMesh.customDepthMaterial = shadowMaterial(segmentPatch);
  segmentMesh.castShadow = true;
  segmentMesh.receiveShadow = true;
  group.add(segmentMesh);

  // ── Joints: one ball per segment tip, sharing the segment attributes ───
  const ball = new THREE.SphereGeometry(1, 12, 8);
  const jointGeometry = instanced(ball, segments.count);
  ball.dispose();
  for (const name of ["aStart", "aEnd", "aRadius", "aLife", "aKind"]) {
    jointGeometry.setAttribute(name, segmentGeometry.getAttribute(name));
  }
  const jointMaterial = new THREE.MeshStandardMaterial({ color: TREE_COLORS.bark, roughness: 0.9 });
  const jointPatch: Patch = {
    key: "bonsai-joints",
    prelude: SEGMENT_PRELUDE,
    normalChunk: JOINT_NORMAL,
    positionChunk: JOINT_POSITION,
    uniforms: segmentUniforms,
  };
  patchMaterial(jointMaterial, jointPatch);
  const jointMesh = new THREE.Mesh(jointGeometry, jointMaterial);
  jointMesh.name = "bonsai-joints";
  jointMesh.frustumCulled = false;
  jointMesh.customDepthMaterial = shadowMaterial(jointPatch);
  jointMesh.castShadow = true;
  jointMesh.receiveShadow = true;
  group.add(jointMesh);

  // ── Foliage: a dark ellipsoid core per pad, covered by leaf cards ──────
  const sphere = new THREE.SphereGeometry(1, 14, 10);
  const padGeometry = instanced(sphere, pads.count);
  sphere.dispose();
  const padLife = interleave([pads.birth, pads.span, pads.loose], pads.count, 3);
  padGeometry.setAttribute("aCenter", new THREE.InstancedBufferAttribute(pads.center, 3));
  padGeometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(pads.radius, 1));
  padGeometry.setAttribute("aLife", new THREE.InstancedBufferAttribute(padLife, 3));

  const corePrelude = PAD_PRELUDE;
  const coreMaterial = new THREE.MeshStandardMaterial({ color: TREE_COLORS.core, roughness: 0.9 });
  const corePatch: Patch = {
    key: "bonsai-pads",
    prelude: corePrelude,
    normalChunk: PAD_NORMAL,
    positionChunk: PAD_POSITION,
    uniforms: padUniforms,
  };
  patchMaterial(coreMaterial, corePatch);
  const padMesh = new THREE.Mesh(padGeometry, coreMaterial);
  padMesh.name = "bonsai-pads";
  padMesh.frustumCulled = false;
  padMesh.customDepthMaterial = shadowMaterial(corePatch);
  padMesh.castShadow = true;
  padMesh.receiveShadow = true;
  group.add(padMesh);

  const cardCount = pads.count * LEAF_CARDS_PER_PAD;
  const random = mulberry32(data.seed ^ 0x1eaf);
  const cardCenter = new Float32Array(cardCount * 3);
  const cardSize = new Float32Array(cardCount);
  const cardLife = new Float32Array(cardCount * 3);
  const cardOffset = new Float32Array(cardCount * 3);
  const cardParams = new Float32Array(cardCount * 4);
  for (let k = 0; k < cardCount; k += 1) {
    const pad = k % pads.count; // shuffled across pads: any prefix is an even sample
    cardCenter.set(pads.center.subarray(pad * 3, pad * 3 + 3), k * 3);
    cardSize[k] = pads.radius[pad]!;
    cardLife.set(padLife.subarray(pad * 3, pad * 3 + 3), k * 3);
    // uniform direction on the sphere, biased towards the outer shell
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    const radius = 1 - 0.5 * random() * random();
    cardOffset[k * 3] = Math.cos(angle) * ring * radius;
    cardOffset[k * 3 + 1] = z * radius;
    cardOffset[k * 3 + 2] = Math.sin(angle) * ring * radius;
    cardParams[k * 4] = random() * Math.PI * 2;
    cardParams[k * 4 + 1] = 0.75 + random() * 0.6;
    cardParams[k * 4 + 2] = random();
    cardParams[k * 4 + 3] = random();
  }
  const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const cardGeometry = instanced(quad, cardCount);
  quad.dispose();
  cardGeometry.setAttribute("aCenter", new THREE.InstancedBufferAttribute(cardCenter, 3));
  cardGeometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(cardSize, 1));
  cardGeometry.setAttribute("aLife", new THREE.InstancedBufferAttribute(cardLife, 3));
  cardGeometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(cardOffset, 3));
  cardGeometry.setAttribute("aCard", new THREE.InstancedBufferAttribute(cardParams, 4));

  const leafTexture = createLeafTexture();
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: leafTexture,
    roughness: 0.78,
    alphaTest: leafTexture ? 0.34 : 0,
    alphaToCoverage: Boolean(leafTexture),
  });
  const cardPatch: Patch = {
    key: "bonsai-leaves",
    prelude: CARD_PRELUDE,
    normalChunk: CARD_NORMAL,
    positionChunk: CARD_POSITION,
    frame: "",
    uniforms: padUniforms,
    fragment: (source) =>
      source
        .replace("#include <common>", "#include <common>\nvarying float vLeafTone;")
        // alpha shrinks in the mips; lift it so the canopy keeps its coverage at distance
        .replace("#include <alphatest_fragment>", "diffuseColor.a = clamp(diffuseColor.a * 1.5, 0.0, 1.0);\n#include <alphatest_fragment>")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= mix(0.72, 1.16, vLeafTone);"),
  };
  patchMaterial(leafMaterial, cardPatch);
  const leafMesh = new THREE.Mesh(cardGeometry, leafMaterial);
  leafMesh.name = "bonsai-leaves";
  leafMesh.frustumCulled = false;
  leafMesh.customDepthMaterial = shadowMaterial(
    { ...cardPatch, frame: CARD_FRAME, fragment: undefined },
    { map: leafTexture, alphaTest: 0.4 },
  );
  leafMesh.castShadow = true;
  leafMesh.receiveShadow = true;
  group.add(leafMesh);

  // ── Wire: tube along the 5-turn path; its draw range grows with the trunk
  // and unwinds again during pruning (growth.ts wireExtent) ────────────
  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: wire.count }, (_, i) => new THREE.Vector3(wire.points[i * 3], wire.points[i * 3 + 1], wire.points[i * 3 + 2])),
  );
  const tubular = (wire.count - 1) * 3;
  const radial = 6;
  const wireGeometry = new THREE.TubeGeometry(curve, tubular, wire.radius, radial, false);
  const wireMaterial = new THREE.MeshStandardMaterial({ color: TREE_COLORS.wire, roughness: 0.4, metalness: 0.35 });
  const wireMesh = new THREE.Mesh(wireGeometry, wireMaterial);
  wireMesh.name = "bonsai-wire";
  wireMesh.frustumCulled = false;
  wireMesh.visible = false;
  group.add(wireMesh);

  disposables.push(
    segmentGeometry,
    jointGeometry,
    padGeometry,
    cardGeometry,
    wireGeometry,
    barkMaterial,
    jointMaterial,
    coreMaterial,
    leafMaterial,
    wireMaterial,
    segmentMesh.customDepthMaterial as THREE.Material,
    jointMesh.customDepthMaterial as THREE.Material,
    padMesh.customDepthMaterial as THREE.Material,
    leafMesh.customDepthMaterial as THREE.Material,
  );
  if (leafTexture) disposables.push(leafTexture);
  const indicesPerSegment = radial * 6;
  let lastWireCount = -1;

  return {
    group,
    setGrowth(growth: number) {
      uGrowth.value = growth;
      const revealed = Math.floor(wireExtent(growth) * tubular);
      if (revealed !== lastWireCount) {
        lastWireCount = revealed;
        wireMesh.visible = revealed > 0;
        wireGeometry.setDrawRange(0, revealed * indicesPerSegment);
      }
    },
    setBark(maps: BarkMaps) {
      for (const material of [barkMaterial, jointMaterial]) {
        material.map = maps.map ?? null;
        material.normalMap = maps.normalMap ?? null;
        material.roughnessMap = maps.roughnessMap ?? null;
        material.color.setHex(maps.map ? TREE_COLORS.barkTextured : TREE_COLORS.bark);
        material.roughness = maps.roughnessMap ? 1 : 0.9;
        material.needsUpdate = true;
      }
    },
    setEnvironmentReady(ready: boolean) {
      wireMaterial.metalness = ready ? 1 : 0.35;
    },
    setLeafDetail(fraction: number) {
      cardGeometry.instanceCount = Math.max(1, Math.round(cardCount * Math.min(1, Math.max(0, fraction))));
    },
    dispose() {
      disposables.forEach((item) => item.dispose());
    },
  };
}
