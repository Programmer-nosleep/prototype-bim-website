import * as OBC from "@thatopen/components";
import * as THREE from "three";

import { HelloWorldComponents } from "../components/HelloWorldComponent";

export function startUpdateLoop(
  components: OBC.Components,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  controls?: any
) {
  const animate = (time: number) => {
    requestAnimationFrame(animate);
    const delta = time * 0.0001;
    
    controls.update(delta);
    renderer.render(scene, camera);
  }
  animate(0);
}