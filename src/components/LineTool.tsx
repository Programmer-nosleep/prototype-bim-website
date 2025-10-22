import * as THREE from 'three';

type DrawableObject = THREE.Line | THREE.Mesh;

interface ExtrudeSettings extends THREE.ExtrudeGeometryOptions {
  steps?: number;
  depth?: number;
  bevelEnabled?: boolean;
}

export class LineTool {
  private isDrawing = false;
  private points: THREE.Vector3[] = [];
  private currentLine: THREE.Line | null = null;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private onCancel: (() => void) | null = null;
  private history: DrawableObject[] = [];
  private historyIndex: number = -1;
  private tempLines: THREE.Line[] = [];
  private doubleClickTimer: number | null = null;
  private clickCount = 0;
  private currentMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, onCancel: () => void) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.onCancel = onCancel;
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.isDrawing) {
      this.cancelDrawing();
    }
  };

  private cancelDrawing() {
    if (this.currentLine) {
      this.scene.remove(this.currentLine);
    }
    this.clearTempLines();
    this.resetDrawing();
    
    if (this.onCancel) {
      this.onCancel();
    }
  }

  private getIntersectionPoint(event: MouseEvent): THREE.Vector3 | null {
    const mouse = new THREE.Vector2();
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    // Calculate mouse position in normalized device coordinates
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Create a raycaster and set it to point from the camera through the mouse position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // If we have existing points, create a plane that's perpendicular to the camera
    // and goes through the last point
    if (this.points.length > 0 && this.isDrawing) {
      const lastPoint = this.points[this.points.length - 1];
      const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
      
      // Create a plane that's perpendicular to the camera's view direction
      // and goes through the last point
      const plane = new THREE.Plane();
      plane.setFromNormalAndCoplanarPoint(cameraDirection, lastPoint);
      
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        return intersection;
      }
    }
    
    // Fallback: intersect with a plane at the average height of existing points
    // or at y=0 if no points exist yet
    const avgY = this.points.length > 0 
      ? this.points.reduce((sum, p) => sum + p.y, 0) / this.points.length 
      : 0;
      
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -avgY);
    const groundIntersection = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(groundPlane, groundIntersection)) {
      return groundIntersection;
    }
    
    return null;
  }

  private createLine(points: THREE.Vector3[]): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x00ff00, 
      linewidth: 2 
    });
    return new THREE.Line(geometry, material);
  }

  private handleSingleClick = (point: THREE.Vector3) => {
    if (!this.isDrawing) {
      // Start new polyline
      this.isDrawing = true;
      this.points = [point.clone()];
      this.currentLine = this.createLine([...this.points]);
      this.scene.add(this.currentLine);
      
      // Add preview line
      const previewLine = this.createLine([point.clone(), point.clone()]);
      this.tempLines.push(previewLine);
      this.scene.add(previewLine);
    } else {
      // Add point to current polyline
      this.points.push(point.clone());
      
      // Update the existing line geometry
      if (this.currentLine) {
        this.scene.remove(this.currentLine);
      }
      
      this.currentLine = this.createLine([...this.points]);
      this.scene.add(this.currentLine);
      
      // Update preview line
      this.clearTempLines();
      const previewLine = this.createLine([point.clone(), point.clone()]);
      this.tempLines.push(previewLine);
      this.scene.add(previewLine);
    }
  };

  private createMeshFromPoints(points: THREE.Vector3[]): THREE.Mesh | null {
    if (points.length < 2) return null;
    
    // Create a shape from points
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].z);
    
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].z);
    }
    
    // Close the shape if it's not already closed
    if (!points[0].equals(points[points.length - 1])) {
      shape.lineTo(points[0].x, points[0].z);
    }
    
    // Create extrusion settings
    const extrudeSettings = {
      steps: 1,
      depth: 0.1,
      bevelEnabled: false
    };
    
    // Create geometry and material
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    // Create and position the mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.05; // Slightly above the grid
    
    return mesh;
  }

  private handleDoubleClick = () => {
    if (this.isDrawing && this.points.length > 1) {
      // Create mesh from the polyline
      const mesh = this.createMeshFromPoints(this.points);
      
      if (mesh) {
        // Add the mesh to the scene
        this.scene.add(mesh);
        
        // Add to history
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(mesh);
        this.historyIndex++;
      }
      
      // Remove the temporary line
      if (this.currentLine) {
        this.scene.remove(this.currentLine);
      }
      
      this.resetDrawing();
    }
  };

  private onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return; // Only left click

    const point = this.getIntersectionPoint(event);
    if (!point) return;

    this.clickCount++;
    
    if (this.clickCount === 1) {
      // Single click - wait to see if it's a double click
      this.doubleClickTimer = window.setTimeout(() => {
        if (this.clickCount === 1) {
          this.handleSingleClick(point);
        }
        this.clickCount = 0;
      }, 250) as unknown as number;
    } else if (this.clickCount === 2) {
      // Double click - finish the polyline
      if (this.doubleClickTimer) {
        clearTimeout(this.doubleClickTimer);
      }
      this.handleDoubleClick();
      this.clickCount = 0;
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDrawing) return;
    
    const point = this.getIntersectionPoint(event);
    if (!point || this.points.length === 0) return;
    
    // Update the preview line
    if (this.tempLines.length > 0) {
      const previewLine = this.tempLines[0];
      const lastPoint = this.points[this.points.length - 1];
      const geometry = previewLine.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position as THREE.BufferAttribute;
      
      positions.setXYZ(0, lastPoint.x, lastPoint.y, lastPoint.z);
      positions.setXYZ(1, point.x, point.y, point.z);
      positions.needsUpdate = true;
    }
  };

  private clearTempLines() {
    this.tempLines.forEach(line => {
      this.scene.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material) {
        if (Array.isArray(line.material)) {
          line.material.forEach(m => m.dispose());
        } else {
          line.material.dispose();
        }
      }
    });
    this.tempLines = [];
  }

  private resetDrawing() {
    this.isDrawing = false;
    this.points = [];
    this.currentLine = null;
    this.clearTempLines();
  }

  public enable() {
    this.disable(); // Clean up any existing listeners
    window.addEventListener('keydown', this.handleKeyDown);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('dblclick', this.handleDoubleClick);
  }

  public disable() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('dblclick', this.handleDoubleClick);
    
    if (this.doubleClickTimer) {
      clearTimeout(this.doubleClickTimer);
      this.doubleClickTimer = null;
    }
    
    this.resetDrawing();
  }


  public undo() {
    if (this.historyIndex >= 0) {
      const line = this.history[this.historyIndex];
      this.scene.remove(line);
      this.historyIndex--;
      return true;
    }
    return false;
  }

  public redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const line = this.history[this.historyIndex];
      this.scene.add(line);
      return true;
    }
    return false;
  }
}
