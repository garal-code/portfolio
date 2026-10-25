// Procedural sky for the setting sun (world bible section 3 and 8): a gradient
// dome with the sun disc and its glow, a distant low hill silhouette at the
// horizon, and and the haze below the horizon (the wide windowsill meets it through fog). Everything is
// driven by one SunState, so the visible sun always sits where the key light
// comes from. The HDRI is never used here: it only feeds scene.environment.

import * as THREE from "three";
import { SUN_DISC_RADIUS, type SunState } from "./sun.ts";

export interface Sky {
  group: THREE.Group;
  /** Applies the sun, sky gradient and ground colour for this frame. */
  setSun(sun: SunState): void;
  /** The dome is centred on the camera, so the sun stays at infinity. */
  follow(position: THREE.Vector3): void;
  dispose(): void;
}

const DOME_RADIUS = 640;

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uDiscRadius;
uniform float uGlow;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.45));

  // Soft glow around the sun, then the disc itself (HDR, so bloom can pick it up).
  float sd = clamp(dot(d, uSunDir), -1.0, 1.0);
  float angle = acos(sd);
  float halo = 0.5 * exp(-angle * 5.0) + 0.9 * exp(-angle * 22.0);
  sky += uSunColor * halo * uGlow;
  float disc = 1.0 - smoothstep(uDiscRadius * 0.9, uDiscRadius, angle);
  sky = mix(sky, uSunColor * 5.0, disc);

  // Distant hills: a low ridge that fades into the haze below the horizon.
  float az = atan(d.x, -d.z);
  float ridge = 0.016 + 0.011 * sin(az * 5.0 + 1.3) + 0.008 * sin(az * 11.0 + 4.1) + 0.005 * sin(az * 23.0 + 0.7);
  float hill = 1.0 - smoothstep(ridge - 0.0016, ridge + 0.0016, h);
  vec3 hillColor = mix(mix(uGround, uHorizon, 0.2), uHorizon, smoothstep(0.0, -0.03, h));
  gl_FragColor = vec4(mix(sky, hillColor, hill), 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createSky(): Sky {
  const group = new THREE.Group();
  group.name = "sky";

  const uniforms = {
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGround: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() },
    uDiscRadius: { value: (SUN_DISC_RADIUS * Math.PI) / 180 },
    uGlow: { value: 0.4 },
  };
  const domeMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 48, 24), domeMaterial);
  dome.name = "sky-dome";
  dome.frustumCulled = false;
  dome.renderOrder = -1000;

  group.add(dome);

  const white = new THREE.Color(0xffffff);

  return {
    group,
    setSun(sun: SunState) {
      uniforms.uZenith.value.setHex(sun.sky.zenith);
      uniforms.uHorizon.value.setHex(sun.sky.horizon);
      uniforms.uGround.value.setHex(sun.sky.ground);
      uniforms.uSunDir.value.set(...sun.direction);
      uniforms.uSunColor.value.setHex(sun.keyColor).lerp(white, 0.3);
      // The glow grows as the key light fades: strongest in the afterglow.
      const dusk = 1 - Math.min(1, Math.max(0, (sun.keyIntensity - 0.6) / 1.8));
      uniforms.uGlow.value = 0.3 + 0.9 * dusk;
    },
    follow(position: THREE.Vector3) {
      dome.position.copy(position);
    },
    dispose() {
      dome.geometry.dispose();
      domeMaterial.dispose();
    },
  };
}
