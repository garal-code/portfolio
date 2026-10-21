// Pure rules for the realistic surfaces (world bible sections 7 and 8): UV repeat
// of bark along a limb and the colour-space contract of the texture maps.
// No three.js: shared by the shaders' constants, the loader and the tests.

/** Texture roles. Only colour data is sRGB; everything else is linear data. */
export const TEXTURE_MAPS = ["diffuse", "emissive", "normal", "roughness", "ao", "metalness"] as const;
export type TextureMap = (typeof TEXTURE_MAPS)[number];

export function isColorMap(role: string): boolean {
  return role === "diffuse" || role === "emissive";
}

/** World size (cm) of one bark texture tile. Bark detail reads at ~6 cm per 1K tile. */
export const BARK_TILE = 7;

/**
 * UV repeat of bark along a limb of `radius` and `length` (cm): u wraps the
 * circumference and v runs along the length, with the same texels per cm in both
 * directions. Mirrored in the segment vertex shader (tree.ts).
 */
export function barkRepeat(radius: number, length: number, tile: number = BARK_TILE): { u: number; v: number } {
  return { u: (2 * Math.PI * radius) / tile, v: length / tile };
}
