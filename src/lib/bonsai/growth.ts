// Growth timeline rules shared by the generator, the tests and the shaders.
// Every function here is mirrored 1:1 in GLSL (see tree.ts), so the CPU and the
// GPU agree on what is visible at a given growth value.

import { growthWindow, type GrowthWindow } from "./chapters.ts";

/** Growth units a pruned segment takes to shrink away; it is gone at `death`. */
export const DEATH_SPAN = 0.02;

/** Trunk segments below this height (cm) are the sprout and belong to `sprout`. */
export const SPROUT_HEIGHT = 6;

const trunk = growthWindow("trunk");
const trunkLength = trunk.to - trunk.from;

/** Vertical growth and thickening of the trunk: first 55% of the trunk window. */
export const TRUNK_GROW: GrowthWindow = { from: trunk.from, to: trunk.from + trunkLength * 0.55 };

/** The copper wire is drawn once the trunk is done: last 40% of the trunk window. */
export const WIRE_WINDOW: GrowthWindow = { from: trunk.from + trunkLength * 0.6, to: trunk.to };

/** The wire comes off during pruning, in reverse of how it was drawn. */
export const WIRE_REMOVAL: GrowthWindow = growthWindow("pruning");

/** Pads relax from their loose shape to the clean pruned shape in `pruning`. */
export const CONDENSE_WINDOW: GrowthWindow = growthWindow("pruning");

/** A freshly sprouted trunk is this fraction of its final radius. */
export const TRUNK_MIN_THICKNESS = 0.15;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** GLSL smoothstep (edge0 < edge1). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Scale (0..1) of a branch segment at `growth`: grows from its attachment point
 * over [birth, birth + span], shrinks away over [death - DEATH_SPAN, death].
 * `death = 1` means the segment is never pruned.
 */
export function segmentScale(birth: number, span: number, death: number, growth: number): number {
  const grown = smoothstep(birth, birth + span, growth);
  const cut = death < 1 ? smoothstep(death - DEATH_SPAN, death, growth) : 0;
  return grown * (1 - cut);
}

/** Radius multiplier applied to trunk segments while the trunk thickens. */
export function trunkThickness(growth: number): number {
  return TRUNK_MIN_THICKNESS + (1 - TRUNK_MIN_THICKNESS) * smoothstep(TRUNK_GROW.from, TRUNK_GROW.to, growth);
}

/** Scale multiplier of a foliage pad: grows in at its birth, condenses when pruned. */
export function padScale(birth: number, span: number, loose: number, growth: number): number {
  const grown = smoothstep(birth, birth + span, growth);
  const relaxed = loose + (1 - loose) * smoothstep(CONDENSE_WINDOW.from, CONDENSE_WINDOW.to, growth);
  return grown * relaxed;
}

/** 0..1 portion of the wire revealed at `growth`. */
export function wireReveal(growth: number): number {
  return clamp01((growth - WIRE_WINDOW.from) / (WIRE_WINDOW.to - WIRE_WINDOW.from));
}

/**
 * 0..1 portion of the wire on the tree: drawn across the trunk window, kept
 * through the branches, unwound across the pruning window and gone at 1.
 */
export function wireExtent(growth: number): number {
  const removed = clamp01((growth - WIRE_REMOVAL.from) / (WIRE_REMOVAL.to - WIRE_REMOVAL.from));
  return Math.min(wireReveal(growth), 1 - removed);
}
