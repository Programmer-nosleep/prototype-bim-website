import * as THREE from 'three';

interface ExtrusionData {
  baseShape: THREE.Shape;
  mesh: THREE.Mesh;
  height: number;
}

export class ExtrudeTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private onCancel: () => void;
  private selectedObject: THREE.Mesh | null = null;
  private originalPosition: THREE.Vector3 | null = null;
  private isDragging = false;
  private startY = 0;
  private currentHeight = 1;
  private controls?: { enabled: boolean };
  private originalControlsEnabled = true;
  private extrudeGroup: THREE.Group = new THREE.Group();
  private activeExtrusion: ExtrusionData | null = null;
  private onExtrudeUpdate?: (height: number) => void;
  
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
    this.renderer.domElement.style.cursor = 'ns-resize';
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('keydown', this.onKeyDown);
    
    // Create a group to hold all extrusions
    this.extrudeGroup = new THREE.Group();
    this.scene.add(this.extrudeGroup);
    
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
    
    if (this.extrudeGroup) {
      this.scene.remove(this.extrudeGroup);
    }
    this.deselectObject();
    
    // Restore original camera controls state
    if (this.controls) {
      this.controls.enabled = this.originalControlsEnabled;
    }
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.onCancel();
    } else if (event.key === 'ArrowUp') {
      this.setHeight(this.currentHeight + 0.1);
      if (this.onExtrudeUpdate) {
        this.onExtrudeUpdate(this.currentHeight);
      }
    } else if (event.key === 'ArrowDown') {
      this.setHeight(Math.max(0.1, this.currentHeight - 0.1));
      if (this.onExtrudeUpdate) {
        this.onExtrudeUpdate(this.currentHeight);
      }
    }
  };

  private createShapeFromPoints(points: THREE.Vector2[]): THREE.Shape {
    const shape = new THREE.Shape();
    if (points.length > 0) {
      shape.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, points[i].y);
      }
      shape.closePath();
    }
    return shape;
  }

  public setOnExtrudeUpdate(callback: (height: number) => void) {
    this.onExtrudeUpdate = callback;
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return; // Only left click

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      // Check if we're clicking on an existing extrusion
      const mesh = this.findParentMesh(clickedObject);

      if (mesh && mesh.userData.isExtrusion) {
        this.selectedObject = mesh;
        this.isDragging = true;
        this.startY = event.clientY;
        this.currentHeight = mesh.scale.y;
        this.activeExtrusion = {
          baseShape: mesh.userData.baseShape,
          mesh: mesh,
          height: this.currentHeight
        };
        if (this.onExtrudeUpdate) {
          this.onExtrudeUpdate(this.currentHeight);
        }
      }
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging || !this.selectedObject) return;

    const deltaY = (event.clientY - this.startY) * 0.01;
    this.currentHeight = Math.max(0.1, this.currentHeight + deltaY);
    this.startY = event.clientY;

    this.updateExtrusion(this.currentHeight);

    if (this.onExtrudeUpdate) {
      this.onExtrudeUpdate(this.currentHeight);
    }
  };

  private onMouseUp = () => {
    this.isDragging = false;
    this.selectedObject = null;
    this.originalPosition = null;
  };

  private updateExtrusion(height: number) {
    if (!this.selectedObject || !this.activeExtrusion) return;

    this.selectedObject.scale.set(1, height, 1);
    this.selectedObject.position.y = height / 2;
    this.activeExtrusion.height = height;
  }

  private findParentMesh(object: THREE.Object3D): THREE.Mesh | null {
    let current = object;
    while (current.parent) {
      if (current.userData.isExtrusion) {
        return current as THREE.Mesh;
      }
      current = current.parent;
    }
    return null;
  }

  public setHeight(height: number) {
    this.currentHeight = Math.max(0.1, height);
    this.updateExtrusion(this.currentHeight);
  }

  public createExtrusion(shape: THREE.Shape, height: number = 1, position: THREE.Vector3 = new THREE.Vector3()): THREE.Mesh {
    const extrudeSettings = {
      depth: 1,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      wireframe: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(1, height, 1);
    mesh.position.copy(position);
    mesh.position.y = height / 2; // Center vertically
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Store reference to original shape for later modifications
    mesh.userData = {
      isExtrusion: true,
      baseShape: shape,
      originalHeight: height
    };

    this.scene.add(mesh);
    return mesh;
  }

  private createShapeFromGeometry(geometry: THREE.BufferGeometry): THREE.Shape {
    const shape = new THREE.Shape();
    const position = geometry.attributes.position;

    if (position.count >= 3) {
      // Start the shape at the first vertex
      shape.moveTo(position.getX(0), position.getZ(0));

      // Add lines to the other vertices
      for (let i = 1; i < position.count; i++) {
        shape.lineTo(position.getX(i), position.getZ(i));
      }

      // Close the shape
      shape.closePath();
    }

    return shape;
  }

  private selectObject(object: THREE.Mesh) {
    // Deselect previous selection
    this.deselectObject();

    // Store the original state
    this.selectedObject = object;
    this.originalPosition = object.position.clone();

    // Highlight the selected object
    if (object.material instanceof THREE.Material) {
      (object.material as any).color.set(0x00ff00); // Green highlight
      object.material.needsUpdate = true;
    }
  }

  private deselectObject() {
    if (this.selectedObject) {
      // Reset material color if it exists
      if (this.selectedObject.material instanceof THREE.Material) {
        const material = this.selectedObject.material as THREE.MeshStandardMaterial;
        material.color.set(0x00aaff);
        material.needsUpdate = true;
      }

      this.selectedObject = null;
      this.originalPosition = null;
    }
  }

  private getIntersection(event: MouseEvent): THREE.Intersection | null {
    const mouse = new THREE.Vector2();
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    // Find the first mesh that's not a helper or grid
    for (const intersect of intersects) {
      if (intersect.object instanceof THREE.Mesh && 
          !(intersect.object instanceof THREE.GridHelper) &&
          !(intersect.object instanceof THREE.AxesHelper)) {
        return intersect;
      }
    }
    
    return null;
  }
}

export default ExtrudeTool;
