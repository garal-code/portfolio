// Progressive loading of the Poly Haven (CC0) assets under public/bonsai/, see
// public/bonsai/CREDITS.md. The scene renders first with plain fallback colours;
// each group lands when it is ready and a failed file is skipped, never thrown:
//   critical  bark + ground textures and the 1K HDRI (reflections only)
//   growth    mossy rock model and its stone relief
//   dusk      pagoda roof tiles

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import type { Graybox } from "./graybox.ts";
import type { Tree } from "./tree.ts";

export interface AssetTargets {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  tree: Tree;
  graybox: Graybox;
  /** Called after each group lands, so the idle render loop draws again. */
  onChange(): void;
}

export interface AssetLoad {
  cancel(): void;
}

const MAPS = {
  bark: {
    map: "textures/bark/zelkova_diff_1k.jpg",
    normalMap: "textures/bark/zelkova_nor_gl_1k.jpg",
    roughnessMap: "textures/bark/zelkova_rough_1k.jpg",
  },
  ground: {
    map: "textures/ground/forrest_ground_01_diff_1k.jpg",
    normalMap: "textures/ground/forrest_ground_01_nor_gl_1k.jpg",
    roughnessMap: "textures/ground/forrest_ground_01_rough_1k.jpg",
  },
  roof: {
    map: "textures/roof/grey_roof_tiles_02_diff_512.jpg",
    normalMap: "textures/roof/grey_roof_tiles_02_nor_gl_512.jpg",
    roughnessMap: "textures/roof/grey_roof_tiles_02_rough_512.jpg",
  },
  // Roughness only: the rock atlas normal map does not match box UVs and tilted
  // whole bands of the platform towards the cool sky (lilac stripes).
  stone: {
    roughnessMap: "models/rock_moss_set_01/textures/rock_moss_set_01_rough_1k.jpg",
  },
} as const;

const ENVIRONMENT = "env/belfast_sunset_puresky_1k.hdr";
const ROCKS = "models/rock_moss_set_01/rock_moss_set_01_1k.gltf";

export function loadBonsaiAssets(targets: AssetTargets, base = "/"): AssetLoad {
  const root = `${base.replace(/\/?$/, "/")}bonsai/`;
  const { renderer, scene, tree, graybox, onChange } = targets;
  const owned: { dispose(): void }[] = [];
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  let cancelled = false;

  const textures = new THREE.TextureLoader();
  const load = async (path: string, color: boolean, aniso: number): Promise<THREE.Texture> => {
    const texture = await textures.loadAsync(root + path);
    // Colour maps are sRGB; normal, roughness and AO maps are linear data.
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = aniso;
    owned.push(texture);
    return texture;
  };

  /** Loads a texture set; a file that fails is skipped and the rest still apply. */
  async function loadSet(set: Partial<Record<"map" | "normalMap" | "roughnessMap", string>>, aniso: number) {
    const entries = await Promise.all(
      (Object.entries(set) as [string, string][]).map(async ([role, path]) => {
        try {
          return [role, await load(path, role === "map", aniso)] as const;
        } catch (error) {
          console.warn(`[bonsai] texture failed: ${path}`, error);
          return null;
        }
      }),
    );
    return Object.fromEntries(entries.filter((entry) => entry !== null)) as Record<string, THREE.Texture>;
  }

  async function guarded(name: string, step: () => Promise<void>) {
    if (cancelled) return;
    try {
      await step();
      if (!cancelled) onChange();
    } catch (error) {
      console.warn(`[bonsai] ${name} failed to load, keeping fallback colours`, error);
    }
  }

  async function critical() {
    // Bark first: it is on screen from the trunk chapter and proves the look.
    await guarded("bark", async () => {
      tree.setBark(await loadSet(MAPS.bark, 8));
    });
    await guarded("ground", async () => {
      graybox.setSurface("ground", await loadSet(MAPS.ground, 8));
    });
    await guarded("environment", async () => {
      const hdr = await new HDRLoader().loadAsync(root + ENVIRONMENT);
      if (cancelled) return hdr.dispose();
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const generator = new THREE.PMREMGenerator(renderer);
      const target = generator.fromEquirectangular(hdr);
      hdr.dispose();
      generator.dispose();
      owned.push(target);
      // Reflections only: the background stays the procedural sky.
      scene.environment = target.texture;
      tree.setEnvironmentReady(true);
      graybox.setEnvironmentReady(true);
    });
  }

  async function growth() {
    await guarded("rocks", async () => {
      const gltf = await new GLTFLoader().loadAsync(root + ROCKS);
      if (cancelled) return;
      gltf.scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh) {
          const material = mesh.material as THREE.MeshStandardMaterial;
          for (const map of [material.map, material.normalMap, material.roughnessMap]) if (map) map.anisotropy = 4;
          owned.push(material);
        }
      });
      graybox.setRocks(gltf.scene);
    });
    await guarded("stone", async () => {
      graybox.setSurface("stone", await loadSet(MAPS.stone, 4));
    });
  }

  async function dusk() {
    await guarded("roof", async () => {
      graybox.setSurface("roof", await loadSet(MAPS.roof, 4));
    });
  }

  void critical()
    .then(growth)
    .then(dusk);

  return {
    cancel() {
      cancelled = true;
      owned.forEach((item) => item.dispose());
    },
  };
}
