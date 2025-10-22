import { OrbitControls } from "three/examples/jsm/Addons.js";
import * as THREE from "three";

export function createControls(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  return controls;
}