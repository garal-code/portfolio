// GPU layer for the generated bonsai. The whole tree is two draw calls of
// instanced geometry (segments, pads) plus a wire tube. Growth never touches the
// CPU per frame: the vertex shaders scale every instance from `uGrowth`, using
// the same rules as growth.ts (segmentScale, trunkThickness, padScale).

import * as THREE from "three";
import type { BonsaiData } from "./generator.ts";
import { CONDENSE_WINDOW, DEATH_SPAN, TRUNK_GROW, TRUNK_MIN_THICKNESS, wireExtent } from "./growth.ts";

export interface Tree {
  group: THREE.Group;
  setGrowth(growth: number): void;
  dispose(): void;
}

const TREE_COLORS = { bark: 0xc4b8a0, foliage: 0x4a7a45, wire: 0xb8793a };

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
`;

const SEGMENT_NORMAL = /* glsl */ `
vec3 segAxis = aEnd - aStart;
float segLen = length(segAxis);
vec3 segY = segAxis / max(segLen, 1e-5);
vec3 segHelper = abs(segY.y) < 0.98 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
vec3 segX = normalize(cross(segHelper, segY));
vec3 segZ = cross(segY, segX);
vec3 objectNormal = normalize(segX * normal.x + segZ * normal.z);
`;

// Mirrors segmentScale() and trunkThickness() in growth.ts.
const SEGMENT_SCALE = /* glsl */ `
float segGrown = smoothstep(aLife.x, aLife.x + aLife.y, uGrowth);
float segCut = aLife.z < 1.0 ? smoothstep(aLife.z - uDeathSpan, aLife.z, uGrowth) : 0.0;
float segScale = segGrown * (1.0 - segCut);
float segThickness = aKind < 0.5 ? mix(uTrunkMin, 1.0, smoothstep(uTrunkGrow.x, uTrunkGrow.y, uGrowth)) : 1.0;
`;

const SEGMENT_POSITION = /* glsl */ `
${SEGMENT_SCALE}
float segRadius = mix(aRadius.x, aRadius.y, position.y) * segThickness;
vec3 transformed = aStart + segScale * (segY * (position.y * segLen) + (segX * position.x + segZ * position.z) * segRadius);
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
`;

const PAD_PRELUDE = /* glsl */ `
attribute vec3 aCenter;
attribute float aSize;
attribute vec3 aLife; // birth, span, loose
uniform float uGrowth;
uniform vec2 uCondense;
`;

// Mirrors padScale() in growth.ts. Pads are flattened ellipsoids.
const PAD_NORMAL = /* glsl */ `
vec3 objectNormal = normalize(vec3(normal.x, normal.y * 2.0, normal.z));
`;

const PAD_POSITION = /* glsl */ `
float padGrown = smoothstep(aLife.x, aLife.x + aLife.y, uGrowth);
float padRelax = mix(aLife.z, 1.0, smoothstep(uCondense.x, uCondense.y, uGrowth));
vec3 transformed = aCenter + vec3(position.x, position.y * 0.5, position.z) * aSize * padGrown * padRelax;
`;

function patchMaterial(
  material: THREE.MeshStandardMaterial,
  key: string,
  prelude: string,
  normalChunk: string,
  positionChunk: string,
  uniforms: Record<string, THREE.IUniform>,
) {
  material.customProgramCacheKey = () => key;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${prelude}`)
      .replace("#include <beginnormal_vertex>", normalChunk)
      .replace("#include <begin_vertex>", positionChunk);
  };
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

export function createTree(data: BonsaiData): Tree {
  const group = new THREE.Group();
  group.name = "bonsai-tree";
  const uGrowth = { value: 0 };
  const disposables: { dispose(): void }[] = [];

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
  patchMaterial(barkMaterial, "bonsai-segments", SEGMENT_PRELUDE, SEGMENT_NORMAL, SEGMENT_POSITION, {
    uGrowth,
    uDeathSpan: { value: DEATH_SPAN },
    uTrunkGrow: { value: new THREE.Vector2(TRUNK_GROW.from, TRUNK_GROW.to) },
    uTrunkMin: { value: TRUNK_MIN_THICKNESS },
  });
  const segmentMesh = new THREE.Mesh(segmentGeometry, barkMaterial);
  segmentMesh.name = "bonsai-segments";
  segmentMesh.frustumCulled = false; // instanced bounds are not the base geometry bounds
  group.add(segmentMesh);

  // ── Joints: one ball per segment tip, sharing the segment attributes ───
  const ball = new THREE.SphereGeometry(1, 12, 8);
  const jointGeometry = instanced(ball, segments.count);
  ball.dispose();
  for (const name of ["aStart", "aEnd", "aRadius", "aLife", "aKind"]) {
    jointGeometry.setAttribute(name, segmentGeometry.getAttribute(name));
  }
  const jointMaterial = new THREE.MeshStandardMaterial({ color: TREE_COLORS.bark, roughness: 0.9 });
  patchMaterial(jointMaterial, "bonsai-joints", SEGMENT_PRELUDE, JOINT_NORMAL, JOINT_POSITION, {
    uGrowth,
    uDeathSpan: { value: DEATH_SPAN },
    uTrunkGrow: { value: new THREE.Vector2(TRUNK_GROW.from, TRUNK_GROW.to) },
    uTrunkMin: { value: TRUNK_MIN_THICKNESS },
  });
  const jointMesh = new THREE.Mesh(jointGeometry, jointMaterial);
  jointMesh.name = "bonsai-joints";
  jointMesh.frustumCulled = false;
  group.add(jointMesh);

  // ── Foliage pads ───────────────────────────────────────────────────────
  const sphere = new THREE.SphereGeometry(1, 14, 10);
  const padGeometry = instanced(sphere, pads.count);
  sphere.dispose();
  padGeometry.setAttribute("aCenter", new THREE.InstancedBufferAttribute(pads.center, 3));
  padGeometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(pads.radius, 1));
  padGeometry.setAttribute("aLife", new THREE.InstancedBufferAttribute(interleave([pads.birth, pads.span, pads.loose], pads.count, 3), 3));

  const foliageMaterial = new THREE.MeshStandardMaterial({ color: TREE_COLORS.foliage, roughness: 0.85 });
  patchMaterial(foliageMaterial, "bonsai-pads", PAD_PRELUDE, PAD_NORMAL, PAD_POSITION, {
    uGrowth,
    uCondense: { value: new THREE.Vector2(CONDENSE_WINDOW.from, CONDENSE_WINDOW.to) },
  });
  const padMesh = new THREE.Mesh(padGeometry, foliageMaterial);
  padMesh.name = "bonsai-pads";
  padMesh.frustumCulled = false;
  group.add(padMesh);

  // ── Wire: tube along the 5-turn path; its draw range grows with the trunk
  // and unwinds again during pruning (growth.ts wireExtent) ────────────
  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: wire.count }, (_, i) => new THREE.Vector3(wire.points[i * 3], wire.points[i * 3 + 1], wire.points[i * 3 + 2])),
  );
  const tubular = (wire.count - 1) * 3;
  const radial = 6;
  const wireGeometry = new THREE.TubeGeometry(curve, tubular, wire.radius, radial, false);
  const wireMaterial = new THREE.MeshStandardMaterial({ color: TREE_COLORS.wire, roughness: 0.45, metalness: 0.25 });
  const wireMesh = new THREE.Mesh(wireGeometry, wireMaterial);
  wireMesh.name = "bonsai-wire";
  wireMesh.frustumCulled = false;
  wireMesh.visible = false;
  group.add(wireMesh);

  disposables.push(segmentGeometry, jointGeometry, padGeometry, wireGeometry, barkMaterial, jointMaterial, foliageMaterial, wireMaterial);
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
    dispose() {
      disposables.forEach((item) => item.dispose());
    },
  };
}
