import * as THREE from 'three';

class SelectionRectangle {
  private element: HTMLDivElement;
  private startX: number = 0;
  private startY: number = 0;
  private isSelecting: boolean = false;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.element = document.createElement('div');
    this.element.style.position = 'absolute';
    this.element.style.border = '2px dashed #fff';
    this.element.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.element.style.pointerEvents = 'none';
    this.element.style.display = 'none';
    this.element.style.zIndex = '1000';
    this.container.style.position = 'relative';
    this.container.appendChild(this.element);
  }

  start(x: number, y: number) {
    this.startX = x;
    this.startY = y;
    this.isSelecting = true;
    this.update(x, y);
    this.element.style.display = 'block';
  }

  update(x: number, y: number) {
    if (!this.isSelecting) return;
    
    const left = Math.min(this.startX, x);
    const top = Math.min(this.startY, y);
    const width = Math.abs(x - this.startX);
    const height = Math.abs(y - this.startY);
    
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
  }

  end(): { x: number; y: number; width: number; height: number } | null {
    if (!this.isSelecting) return null;
    
    this.isSelecting = false;
    this.element.style.display = 'none';
    
    const rect = this.element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  dispose() {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

export class SelectionTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private selectedObjects: THREE.Object3D[] = [];
  private domElement: HTMLElement;
  private onSelect: (selected: THREE.Object3D[]) => void;
  private selectionRect: SelectionRectangle;
  private isDragging: boolean = false;
  private startPoint: THREE.Vector2 = new THREE.Vector2();
  private controls?: {
    enabled: boolean;
  };
  private originalControlsEnabled: boolean = true;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    onSelect: (selected: THREE.Object3D[]) => void = () => {},
    controls?: any
  ) {
    this.scene = scene;
    this.camera = camera;
    this.onSelect = onSelect;
    this.controls = controls;
    this.domElement = renderer.domElement;
    this.selectionRect = new SelectionRectangle(this.domElement.parentElement || this.domElement);
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return; // Only left mouse button
    
    const rect = this.domElement.getBoundingClientRect();
    this.startPoint.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    // Start selection rectangle
    this.isDragging = true;
    this.selectionRect.start(event.clientX, event.clientY);
    
    // If not holding shift, clear previous selection
    if (!event.shiftKey) {
      this.clearSelection();
    }
  };

  private selectObject(object: THREE.Object3D) {
    // Find the top-most parent that's a direct child of the scene
    let selectedObject = object;
    while (selectedObject.parent && selectedObject.parent !== this.scene) {
      selectedObject = selectedObject.parent;
    }

    // Check if the object is already selected
    const index = this.selectedObjects.indexOf(selectedObject);
    if (index === -1) {
      // Add to selection
      this.selectedObjects.push(selectedObject);
      this.highlightObject(selectedObject);
    } else {
      // Remove from selection
      this.selectedObjects.splice(index, 1);
      this.removeHighlight(selectedObject);
    }

    // Notify about selection change
    this.onSelect([...this.selectedObjects]);
  }

  private highlightObject(object: THREE.Object3D) {
    // Remove any existing highlight for this object
    this.removeHighlight(object);

    // Create and add highlight
    const box = new THREE.BoxHelper(object, 0xffff00);
    box.name = 'selectionHelper';
    object.userData.selectionHelper = box;
    this.scene.add(box);
  }

  private removeHighlight(object: THREE.Object3D) {
    if (object.userData.selectionHelper) {
      this.scene.remove(object.userData.selectionHelper);
      object.userData.selectionHelper = null;
    }
  }

  public clearSelection() {
    // Remove all highlights
    this.selectedObjects.forEach(obj => {
      this.removeHighlight(obj);
    });
    
    // Clear selection array
    this.selectedObjects = [];
    
    // Notify about selection change
    this.onSelect([]);
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) return;
    this.selectionRect.update(event.clientX, event.clientY);
  };

  private onMouseUp = (event: MouseEvent) => {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    const rect = this.selectionRect.end();
    
    if (rect) {
      const rectLeft = (rect.x - this.domElement.getBoundingClientRect().left) / this.domElement.clientWidth * 2 - 1;
      const rectTop = -(rect.y - this.domElement.getBoundingClientRect().top) / this.domElement.clientHeight * 2 + 1;
      const rectRight = rectLeft + (rect.width / this.domElement.clientWidth * 2);
      const rectBottom = rectTop - (rect.height / this.domElement.clientHeight * 2);
      
      // Convert screen space to NDC
      const ndcRect = new THREE.Box2(
        new THREE.Vector2(rectLeft, rectBottom),
        new THREE.Vector2(rectRight, rectTop)
      );
      
      // Clear previous selection if not holding shift
      if (!event.shiftKey) {
        this.clearSelection();
      }
      
      // Find all objects that intersect with the selection rectangle
      const selectedObjects = new Set<THREE.Object3D>();
      
      // Check all objects in the scene
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const position = new THREE.Vector3();
          object.getWorldPosition(position);
          
          // Convert world position to NDC
          position.project(this.camera);
          
          // Check if point is inside selection rectangle
          if (ndcRect.containsPoint(new THREE.Vector2(position.x, position.y))) {
            selectedObjects.add(object);
          }
        }
      });
      
      // Add to selection
      selectedObjects.forEach(obj => this.selectObject(obj));
    }
  };

  public enable() {
    // Store original controls state and disable them
    if (this.controls) {
      this.originalControlsEnabled = this.controls.enabled;
      this.controls.enabled = false;
    }
    
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    this.domElement.style.cursor = 'crosshair';
  }

  public disable() {
    // Restore original controls state
    if (this.controls) {
      this.controls.enabled = this.originalControlsEnabled;
    }
    
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.style.cursor = '';
    this.clearSelection();
    this.selectionRect.dispose();
  }

  public getSelectedObjects(): THREE.Object3D[] {
    return [...this.selectedObjects];
  }

  public dispose() {
    this.disable();
    this.clearSelection();
  }
}
