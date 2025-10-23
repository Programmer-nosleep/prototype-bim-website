import * as THREE from 'three';

type DrawableObject = THREE.Mesh;

export class RectangleTool {
  private isDrawing = false;
  private startPoint: THREE.Vector3 | null = null;
  private currentMesh: THREE.Mesh | null = null;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private onCancel: (() => void) | null = null;
  private history: DrawableObject[] = [];
  private historyIndex: number = -1;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, onCancel: () => void) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.onCancel = onCancel;
  }

  private getIntersectionPoint(event: MouseEvent): THREE.Vector3 | null {
    const mouse = new THREE.Vector2();
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
      return intersection;
    }
    
    return null;
  }

  private createRectangleMesh(startPoint: THREE.Vector3, endPoint: THREE.Vector3): THREE.Mesh {
    const width = Math.abs(endPoint.x - startPoint.x);
    const depth = Math.abs(endPoint.z - startPoint.z);
    
    // Ensure minimum size
    const minSize = 0.1;
    const actualWidth = Math.max(width, minSize);
    const actualDepth = Math.max(depth, minSize);
    
    const geometry = new THREE.BoxGeometry(actualWidth, 0.1, actualDepth);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position the mesh at the center between start and end points
    const centerX = (startPoint.x + endPoint.x) / 2;
    const centerZ = (startPoint.z + endPoint.z) / 2;
    
    mesh.position.set(centerX, 0.05, centerZ);
    
    return mesh;
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return; // Only left click
    
    const point = this.getIntersectionPoint(event);
    if (!point) return;
    
    this.isDrawing = true;
    this.startPoint = point.clone();
    
    // Create initial rectangle
    this.currentMesh = this.createRectangleMesh(this.startPoint, this.startPoint);
    this.scene.add(this.currentMesh);
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDrawing || !this.startPoint || !this.currentMesh) return;
    
    const point = this.getIntersectionPoint(event);
    if (!point) return;
    
    // Update rectangle dimensions
    this.scene.remove(this.currentMesh);
    this.currentMesh = this.createRectangleMesh(this.startPoint!, point);
    this.scene.add(this.currentMesh);
  };

  private onMouseUp = (event: MouseEvent) => {
    if (!this.isDrawing || !this.currentMesh) return;
    
    // Add to history
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.currentMesh);
    this.historyIndex++;
    
    this.resetDrawing();
  };

  private resetDrawing() {
    this.isDrawing = false;
    this.startPoint = null;
    this.currentMesh = null;
  }

  public enable() {
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
  }

  public disable() {
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.resetDrawing();
  }

  public undo() {
    if (this.historyIndex >= 0) {
      const lastObject = this.history[this.historyIndex];
      this.scene.remove(lastObject);
      this.historyIndex--;
    }
  }

  public redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const nextObject = this.history[this.historyIndex];
      this.scene.add(nextObject);
    }
  }

  public handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      this.disable();
      if (this.onCancel) this.onCancel();
      return true;
    }
    return false;
  }
}
