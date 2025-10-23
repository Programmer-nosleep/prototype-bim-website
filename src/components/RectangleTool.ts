import * as THREE from 'three';

type DrawableObject = THREE.Mesh;

export class RectangleTool {
  private isDrawing: boolean = false;
  private startPoint: THREE.Vector3 | null = null;
  private currentMesh: THREE.Mesh | null = null;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private controls?: {
    enabled: boolean;
  };
  private onCancel: (() => void) | null = null;
  private history: DrawableObject[] = [];
  private historyIndex: number = -1;
  private originalControlsEnabled: boolean = true;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, onCancel: () => void, controls?: any) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.onCancel = onCancel;
  }

  private getIntersectionPoint(event: MouseEvent): THREE.Vector3 | null {
    const mouse = new THREE.Vector2();
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Always use a flat ground plane at y=0
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
        // Ensure the point is exactly on the ground plane
        intersection.y = 0;
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
    
    // Create a group to hold both the fill and border
    const group = new THREE.Group();
    
    // Create fill (white, semi-transparent)
    const fillGeometry = new THREE.PlaneGeometry(actualWidth, actualDepth);
    const fillMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,  // White
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const fill = new THREE.Mesh(fillGeometry, fillMaterial);
    fill.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    fill.position.y = 0.001; // Slightly above ground
    
    // Create border (light gray) - using ShapeGeometry for precise border
    const borderShape = new THREE.Shape();
    const halfW = actualWidth / 2;
    const halfD = actualDepth / 2;
    
    borderShape.moveTo(-halfW, -halfD);
    borderShape.lineTo(halfW, -halfD);
    borderShape.lineTo(halfW, halfD);
    borderShape.lineTo(-halfW, halfD);
    borderShape.lineTo(-halfW, -halfD);
    
    const borderGeometry = new THREE.ShapeGeometry(borderShape);
    const borderEdges = new THREE.EdgesGeometry(borderGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({ 
      color: 0x888888,  // Slightly darker gray for better visibility
      linewidth: 1.5,
      transparent: true,
      opacity: 0.8
    });
    
    const border = new THREE.LineSegments(borderEdges, borderMaterial);
    border.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    border.position.y = 0.002; // Slightly above the fill
    
    // Add both to group
    group.add(fill);
    group.add(border);
    
    // Position the group at the center between start and end points
    const centerX = (startPoint.x + endPoint.x) / 2;
    const centerZ = (startPoint.z + endPoint.z) / 2;
    
    group.position.set(centerX, 0, centerZ);
    
    return group as unknown as THREE.Mesh;
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return; // Only left click
    
    const point = this.getIntersectionPoint(event);
    if (!point) return;
    
    // Disable camera controls when starting to draw
    if (this.controls) {
      this.originalControlsEnabled = this.controls.enabled;
      this.controls.enabled = false;
    }
    
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

  private onMouseUp = () => {
    if (!this.isDrawing || !this.currentMesh) return;
    
    // Add to history
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.currentMesh);
    this.historyIndex++;
    
    // Re-enable camera controls if they were enabled before
    if (this.controls) {
      this.controls.enabled = this.originalControlsEnabled;
    }
    
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
    
    // Make sure to re-enable controls when disabling the tool
    if (this.controls) {
      this.controls.enabled = true;
    }
    
    // Remove any existing timer if needed
    
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
