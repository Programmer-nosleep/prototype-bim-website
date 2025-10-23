import * as THREE from 'three';

export class MatlabControls {
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private domElement: HTMLElement;
  private isDragging = false;
  private previousPosition = { x: 0, y: 0 };
  private target = new THREE.Vector3();
  
  constructor(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    
    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    
    // Add event listeners
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }
  
  private onMouseDown(event: MouseEvent) {
    if (event.button === 0) { // Left button
      this.isDragging = true;
      this.previousPosition = {
        x: event.clientX,
        y: event.clientY
      };
      
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    }
  }
  
  private onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;
    
    const deltaX = event.clientX - this.previousPosition.x;
    const deltaY = event.clientY - this.previousPosition.y;
    
    // Left button drag - rotate
    if (event.buttons === 1) {
      // Horizontal rotation (around Y axis)
      const angleX = (deltaX * Math.PI) / 180;
      // Vertical rotation (around X axis)
      const angleY = (deltaY * Math.PI) / 180;
      
      // Rotate around world up (Y axis)
      this.camera.position.sub(this.target);
      this.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleX);
      
      // Calculate right vector for X-axis rotation
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      this.camera.position.applyAxisAngle(right, angleY);
      
      this.camera.position.add(this.target);
      this.camera.lookAt(this.target);
    }
    
    this.previousPosition = {
      x: event.clientX,
      y: event.clientY
    };
  }
  
  private onMouseUp() {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
  
  private onWheel(event: WheelEvent) {
    event.preventDefault();
    
    // Zoom with mouse wheel
    const zoomSpeed = 0.1;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    
    if (event.deltaY > 0) {
      // Zoom out
      this.camera.position.add(direction.multiplyScalar(zoomSpeed * 2));
    } else {
      // Zoom in
      this.camera.position.sub(direction.multiplyScalar(zoomSpeed));
    }
  }
  
  private onContextMenu(event: MouseEvent) {
    // Prevent context menu on right-click
    event.preventDefault();
    
    // Pan with right-click
    if (event.button === 2) {
      const startX = event.clientX;
      const startY = event.clientY;
      
      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        // Calculate pan amount based on camera distance
        const panSpeed = this.camera.position.distanceTo(this.target) * 0.001;
        
        // Calculate right and up vectors
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        const forward = new THREE.Vector3();
        
        this.camera.getWorldDirection(forward);
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        up.crossVectors(right, forward).normalize();
        
        // Pan the camera and target
        this.camera.position.sub(right.multiplyScalar(deltaX * panSpeed));
        this.camera.position.add(up.multiplyScalar(deltaY * panSpeed));
        this.target.sub(right.multiplyScalar(deltaX * panSpeed));
        this.target.add(up.multiplyScalar(deltaY * panSpeed));
        
        this.camera.lookAt(this.target);
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
  }
  
  public dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
  
  public setTarget(target: THREE.Vector3) {
    this.target.copy(target);
    this.camera.lookAt(this.target);
  }
}
