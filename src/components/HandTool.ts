import * as THREE from 'three';

export class HandTool {
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private isDragging: boolean = false;
  private previousPosition = { x: 0, y: 0 };
  private controls: any; // OrbitControls or similar

  constructor(
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    controls: any
  ) {
    this.camera = camera;
    this.domElement = renderer.domElement;
    this.controls = controls;
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return; // Only left mouse button
    
    this.isDragging = true;
    this.previousPosition = {
      x: event.clientX,
      y: event.clientY
    };
    
    this.domElement.style.cursor = 'grabbing';
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.isDragging) return;
    
    const deltaX = event.clientX - this.previousPosition.x;
    const deltaY = event.clientY - this.previousPosition.y;
    
    // Rotate the camera based on mouse movement
    if (this.controls) {
      // For OrbitControls
      this.controls.rotateLeft(-deltaX * 0.01);
      this.controls.rotateUp(-deltaY * 0.01);
      this.controls.update();
    } else {
      // Fallback if no controls are provided
      this.camera.position.x -= deltaX * 0.01;
      this.camera.position.y += deltaY * 0.01;
    }
    
    this.previousPosition = {
      x: event.clientX,
      y: event.clientY
    };
  };

  private onPointerUp = () => {
    this.isDragging = false;
    this.domElement.style.cursor = 'grab';
  };

  public enable() {
    this.domElement.style.cursor = 'grab';
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    
    // Disable selection when hand tool is active
    this.domElement.style.pointerEvents = 'auto';
  }

  public disable() {
    this.domElement.style.cursor = '';
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.style.pointerEvents = '';
  }

  public dispose() {
    this.disable();
  }
}
