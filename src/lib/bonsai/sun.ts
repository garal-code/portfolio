// The setting sun (world bible sections 3 and 8): one pure function of the exact
// scroll progress. The sun disc, the sky gradient, the key light direction, its
// colour and its intensity all come from this state, so the light always arrives
// from where the visible sun is. No three.js, no hidden state: the same progress
// returns the same result forward, backward and after a jump.

import { CHAPTERS, type Chapter, type SkyColors, type Vec3 } from "./chapters.ts";
import { chapterAnchors } from "./conductor.ts";

/** Angular radius of the visible disc, in degrees (a little larger than the real sun, for the lens). */
export const SUN_DISC_RADIUS = 2.2;

/**
 * The key light never drops below this elevation (degrees). A light at the true
 * dusk angle would graze the tray, stretch the shadow map and light the scene
 * from below the horizon; the disc itself still follows the exact elevation.
 */
export const MIN_LIGHT_ELEVATION = 6;

export interface SunState {
  progress: number;
  /** Degrees from -z (behind the tree) towards +x (the right of the frame). */
  azimuth: number;
  /** Degrees above the horizon; negative once the disc has set. */
  elevation: number;
  /** Unit vector from the scene towards the visible sun. */
  direction: Vec3;
  /** Unit vector from the scene towards the key light (elevation clamped, see MIN_LIGHT_ELEVATION). */
  lightDirection: Vec3;
  keyIntensity: number;
  /** sRGB hex. */
  keyColor: number;
  sky: SkyColors;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const RAD = Math.PI / 180;

export function lerpHex(a: number, b: number, t: number): number {
  const channel = (shift: number) => Math.round(lerp((a >> shift) & 0xff, (b >> shift) & 0xff, t)) << shift;
  return channel(16) | channel(8) | channel(0);
}

/** Unit vector for an azimuth and elevation in degrees (azimuth 0 = -z, +90 = +x). */
export function directionOf(azimuth: number, elevation: number): Vec3 {
  const az = azimuth * RAD;
  const el = elevation * RAD;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
}

export function sunAt(rawProgress: number, chapters: readonly Chapter[] = CHAPTERS): SunState {
  const progress = clamp01(Number.isFinite(rawProgress) ? rawProgress : 0);
  const anchors = chapterAnchors(chapters);
  let index = 0;
  while (index < anchors.length - 2 && progress >= anchors[index + 1]!) index += 1;
  const a = chapters[index]!.light;
  const b = chapters[index + 1]!.light;
  const t = smooth(clamp01((progress - anchors[index]!) / (anchors[index + 1]! - anchors[index]!)));

  const azimuth = lerp(a.azimuth, b.azimuth, t);
  const elevation = lerp(a.elevation, b.elevation, t);
  return {
    progress,
    azimuth,
    elevation,
    direction: directionOf(azimuth, elevation),
    lightDirection: directionOf(azimuth, Math.max(elevation, MIN_LIGHT_ELEVATION)),
    keyIntensity: lerp(a.keyIntensity, b.keyIntensity, t),
    keyColor: lerpHex(a.key, b.key, t),
    sky: {
      zenith: lerpHex(a.sky.zenith, b.sky.zenith, t),
      horizon: lerpHex(a.sky.horizon, b.sky.horizon, t),
      ground: lerpHex(a.sky.ground, b.sky.ground, t),
    },
  };
}
