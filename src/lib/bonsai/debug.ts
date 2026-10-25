// `?debug` overlay: camera path, target curve, waypoints with chapter labels,
// and a small HUD. Press "o" for an overview camera to look at the whole path.

import * as THREE from "three";
import type { CameraPath, ConductorState } from "./conductor.ts";

export interface DebugOverlay {
  setPath(path: CameraPath): void;
  /** Camera to render with: the overview camera when toggled, otherwise the story camera. */
  renderCamera(story: THREE.PerspectiveCamera): THREE.PerspectiveCamera;
  resize(aspect: number): void;
  update(state: ConductorState, story: THREE.PerspectiveCamera, info: THREE.WebGLInfo): void;
  dispose(): void;
}

const SAMPLES = 400;

export function createDebugOverlay(scene: THREE.Scene, initialPath: CameraPath): DebugOverlay {
  const group = new THREE.Group();
  group.name = "debug";
  scene.add(group);

  const hud = document.createElement("pre");
  hud.style.cssText =
    "position:fixed;right:8px;top:8px;z-index:50;margin:0;padding:8px 10px;font:11px/1.4 ui-monospace,monospace;color:#f3b94c;background:rgba(11,38,32,.85);border-radius:8px;pointer-events:none";
  const labels = document.createElement("div");
  labels.style.cssText = "position:fixed;inset:0;z-index:49;pointer-events:none;overflow:hidden";
  document.body.append(hud, labels);

  const overviewCamera = new THREE.PerspectiveCamera(45, 1, 0.5, 1200);
  overviewCamera.position.set(150, 110, 220);
  overviewCamera.lookAt(0, 20, 0);
  let overviewOn = false;
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "o") overviewOn = !overviewOn;
  };
  window.addEventListener("keydown", onKey);

  let path = initialPath;
  const owned: { dispose(): void }[] = [];
  const projected = new THREE.Vector3();
  let labelNodes: HTMLDivElement[] = [];

  function line(points: THREE.Vector3[], color: number) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color });
    owned.push(geometry, material);
    const object = new THREE.Line(geometry, material);
    object.frustumCulled = false;
    group.add(object);
  }

  function marker(position: THREE.Vector3, color: number) {
    const geometry = new THREE.SphereGeometry(0.6, 8, 6);
    const material = new THREE.MeshBasicMaterial({ color });
    owned.push(geometry, material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    group.add(mesh);
  }

  function build() {
    group.clear();
    owned.splice(0).forEach((item) => item.dispose());
    labelNodes.forEach((node) => node.remove());
    labelNodes = [];

    const positions: THREE.Vector3[] = [];
    const targets: THREE.Vector3[] = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const pose = path.at(i / SAMPLES);
      positions.push(new THREE.Vector3(...pose.position));
      targets.push(new THREE.Vector3(...pose.target));
    }
    line(positions, 0xf3b94c);
    line(targets, 0x7fa497);
    path.waypoints.forEach((waypoint) => {
      marker(new THREE.Vector3(...waypoint.pose.position), 0xf3b94c);
      marker(new THREE.Vector3(...waypoint.pose.target), 0x7fa497);
      const node = document.createElement("div");
      node.textContent = waypoint.label;
      node.style.cssText =
        "position:absolute;left:0;top:0;font:11px ui-monospace,monospace;color:#f3b94c;background:rgba(11,38,32,.8);padding:1px 5px;border-radius:4px;white-space:nowrap";
      labels.append(node);
      labelNodes.push(node);
    });
  }
  build();

  return {
    setPath(next) {
      path = next;
      build();
    },
    renderCamera(story) {
      return overviewOn ? overviewCamera : story;
    },
    resize(aspect) {
      overviewCamera.aspect = aspect;
      overviewCamera.updateProjectionMatrix();
    },
    update(state, camera, info) {
      const active = overviewOn ? overviewCamera : camera;
      hud.textContent = [
        `progress ${state.progress.toFixed(3)}  growth ${state.growth.toFixed(3)}`,
        `chapter  ${state.id} (${state.index + 1}/7) local ${state.local.toFixed(2)} stop ${state.stop}`,
        `camera   ${camera.position.toArray().map((v) => v.toFixed(1)).join(", ")}  fov ${camera.fov.toFixed(1)}`,
        `calls ${info.render.calls}  tris ${info.render.triangles}`,
        `[o] overview ${overviewOn ? "on" : "off"}`,
      ].join("\n");
      path.waypoints.forEach((waypoint, i) => {
        projected.set(...waypoint.pose.position).project(active);
        const node = labelNodes[i];
        if (!node) return;
        const visible = projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1;
        node.style.display = visible ? "block" : "none";
        node.style.transform = `translate(${((projected.x + 1) / 2) * innerWidth}px, ${((1 - projected.y) / 2) * innerHeight}px)`;
      });
    },
    dispose() {
      window.removeEventListener("keydown", onKey);
      owned.splice(0).forEach((item) => item.dispose());
      group.removeFromParent();
      hud.remove();
      labels.remove();
    },
  };
}
