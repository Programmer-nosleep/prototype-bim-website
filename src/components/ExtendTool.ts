import * as THREE from 'three';

interface ExtendData {
  originalGeometry: THREE.BufferGeometry;
  mesh: THREE.Mesh;
  originalScale: THREE.Vector3;
}

export class ExtendTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private onCancel: () => void;
  private selectedObject: THREE.Mesh | null = null;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private currentScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private controls?: { enabled: boolean };
  private originalControlsEnabled = true;
  private activeExtend: ExtendData | null = null;
  private onExtendUpdate?: (scale: THREE.Vector3) => void;
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    onCancel: () => void,
    controls?: { enabled: boolean }
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.onCancel = onCancel;
    this.controls = controls;
  }

  public enable() {
    this.renderer.domElement.style.cursor = 'move';
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('keydown', this.onKeyDown);
    
    // Disable camera controls
    if (this.controls) {
      this.originalControlsEnabled = this.controls.enabled;
      this.controls.enabled = false;
    }
  }

  public disable() {
    this.renderer.domElement.style.cursor = '';
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('keydown', this.onKeyDown);
    
    this.deselectObject();
    
    // Restore original camera controls state
    if (this.controls) {
      this.controls.enabled = this.originalControlsEnabled;
    }
  }
  
  private deselectObject() {
    if (this.selectedObject) {
      // Reset material color if it exists
      if (this.selectedObject.material instanceof THREE.Material) {
        const material = this.selectedObject.material as THREE.MeshStandardMaterial;
        if (material.color) {
          material.color.set(0x00aaff);
          material.needsUpdate = true;
        }
      }
      this.selectedObject = null;
    }
    this.activeExtend = null;
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.onCancel();
    }
  };

  private findParentMesh(object: THREE.Object3D): THREE.Object3D | null {
    while (object !== null && !(object instanceof THREE.Mesh)) {
      if (object.parent === null) return null;
      object = object.parent;
    }
    return object;
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return; // Only left click

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    // Deselect current selection if clicking on empty space
    if (intersects.length === 0) {
      this.deselectObject();
      return;
    }

    const clickedObject = this.findParentMesh(intersects[0].object);
    
    if (clickedObject && clickedObject instanceof THREE.Mesh) {
      this.selectedObject = clickedObject;
      this.isDragging = true;
      this.startX = event.clientX;
      this.startY = event.clientY;
      
      // Initialize userData if it doesn't exist
      if (!clickedObject.userData) {
        clickedObject.userData = {};
      }
      
      // Highlight selected object
      if (clickedObject.material instanceof THREE.Material) {
        const material = clickedObject.material as THREE.MeshStandardMaterial;
        if (material.color) {
          material.color.set(0xffaa00); // Orange highlight
          material.needsUpdate = true;
        }
      }
      
      // Store original scale if not already extended
      if (!clickedObject.userData.isExtended) {
        this.currentScale.copy(clickedObject.scale);
        clickedObject.userData.originalScale = clickedObject.scale.clone();
        clickedObject.userData.isExtended = true;
      } else {
        this.currentScale.copy(clickedObject.scale);
      }
      
      this.activeExtend = {
        originalGeometry: clickedObject.geometry.clone(),
        mesh: clickedObject,
        originalScale: clickedObject.scale.clone()
      };
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging || !this.selectedObject || !this.activeExtend) return;

    const deltaX = (event.clientX - this.startX) * 0.01;
    const deltaY = (event.clientY - this.startY) * 0.01;
    
    // Update scale based on mouse movement
    this.currentScale.x = Math.max(0.1, this.currentScale.x + deltaX);
    this.currentScale.z = Math.max(0.1, this.currentScale.z - deltaY);
    
    this.updateExtend(this.currentScale);

    if (this.onExtendUpdate) {
      this.onExtendUpdate(this.currentScale);
    }
  };

  private onMouseUp = () => {
    this.isDragging = false;
    this.selectedObject = null;
  };

  private updateExtend(scale: THREE.Vector3) {
    if (!this.selectedObject || !this.activeExtend) return;
    
    this.selectedObject.scale.copy(scale);
    
    // Update the active extend data
    if (this.activeExtend) {
      this.activeExtend.originalScale.copy(scale);
    }
  }

  public setOnExtendUpdate(callback: (scale: THREE.Vector3) => void) {
    this.onExtendUpdate = callback;
  }

  public setScale(scale: THREE.Vector3) {
    this.currentScale.copy(scale);
    this.updateExtend(scale);
  }
}

export default ExtendTool;
