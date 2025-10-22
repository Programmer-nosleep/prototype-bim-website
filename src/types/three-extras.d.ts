// src/types/three-extras.d.ts

declare module "three/examples/jsm/controls/OrbitControls" {
  import { Camera, EventDispatcher } from "three";

  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement);

    object: Camera;
    domElement: HTMLElement | Document;

    enabled: boolean;
    target: THREE.Vector3;

    enableDamping: boolean;
    dampingFactor: number;
    screenSpacePanning: boolean;
    minDistance: number;
    maxDistance: number;
    minZoom: number;
    maxZoom: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    minAzimuthAngle: number;
    maxAzimuthAngle: number;

    enableZoom: boolean;
    enableRotate: boolean;
    enablePan: boolean;

    update(): void;
    dispose(): void;
    saveState(): void;
    reset(): void;
  }
}
