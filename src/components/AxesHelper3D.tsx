import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const AxesHelper3D = ({ scene, camera }: { scene: THREE.Scene; camera: THREE.Camera }) => {
  const groupRef = useRef<THREE.Group>(new THREE.Group());

  useEffect(() => {
    if (!scene) return;

    // Create axes with arrows
    const createAxis = (color: number, rotation: [number, number, number], position: [number, number, number]) => {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
      const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
      const arrow = new THREE.Mesh(geometry, material);
      
      // Position and rotate the arrow
      arrow.position.set(...position);
      arrow.rotation.set(...rotation);
      
      // Add arrow head
      const headGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
      const head = new THREE.Mesh(headGeometry, material);
      head.position.set(0, 0.65, 0);
      arrow.add(head);
      
      return arrow;
    };

    // Create XYZ axes
    const xAxis = createAxis(0xff0000, [0, 0, -Math.PI / 2], [0.5, 0, 0]);
    const yAxis = createAxis(0x00ff00, [0, 0, 0], [0, 0.5, 0]);
    const zAxis = createAxis(0x0000ff, [Math.PI / 2, 0, 0], [0, 0, 0.5]);

    // Create labels
    const createLabel = (text: string, color: string, position: [number, number, number]) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 32;
      const context = canvas.getContext('2d');
      if (!context) return null;
      
      context.fillStyle = 'rgba(0, 0, 0, 0.5)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.font = 'Bold 24px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = color;
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.5, 0.25, 1);
      sprite.position.set(...position);
      
      return sprite;
    };

    // Add axes and labels to group
    groupRef.current.add(xAxis, yAxis, zAxis);
    
    const xLabel = createLabel('X', '#ff0000', [1.2, 0, 0]);
    const yLabel = createLabel('Y', '#00ff00', [0, 1.2, 0]);
    const zLabel = createLabel('Z', '#0000ff', [0, 0, 1.2]);
    
    if (xLabel) groupRef.current.add(xLabel);
    if (yLabel) groupRef.current.add(yLabel);
    if (zLabel) groupRef.current.add(zLabel);

    // Position the group in the scene
    groupRef.current.position.set(2, 2, 2);
    scene.add(groupRef.current);

    // Add click handler
    const onMouseClick = (event: MouseEvent) => {
      if (!camera) return;
      
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      
      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Update the raycaster
      raycaster.setFromCamera(mouse, camera);
      
      // Check for intersections with axes
      const intersects = raycaster.intersectObjects([xAxis, yAxis, zAxis]);
      
      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const direction = new THREE.Vector3();
        
        if (clickedObject === xAxis || clickedObject.parent === xAxis) {
          direction.set(1, 0, 0);
        } else if (clickedObject === yAxis || clickedObject.parent === yAxis) {
          direction.set(0, 1, 0);
        } else if (clickedObject === zAxis || clickedObject.parent === zAxis) {
          direction.set(0, 0, 1);
        }
        
        // Move camera to look along the selected axis
        const distance = 5;
        const target = new THREE.Vector3().copy(direction).multiplyScalar(distance);
        camera.position.copy(target);
        camera.lookAt(0, 0, 0);
      }
    };

    window.addEventListener('click', onMouseClick);

    return () => {
      window.removeEventListener('click', onMouseClick);
      scene.remove(groupRef.current);
    };
  }, [scene, camera]);

  return null;
};

export default AxesHelper3D;
