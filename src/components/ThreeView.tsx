import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // === Scene ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202020);
    setScene(scene);

    // === Camera ===
    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    // === Renderer ===
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x0e0e10);
    setRenderer(renderer);

    // === Controls ===
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // === Grid + Axis (seperti di Blender) ===
    const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(gridHelper, axesHelper);

    // === Lighting ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(ambientLight, directionalLight);

    // === Render Loop ===
    const animate = () => {
      requestAnimationFrame(animate);
      const camPos = camera.position.clone();
      gridHelper.position.x = Math.floor(camPos.x / 10) * 10;
      gridHelper.position.z = Math.floor(camPos.z / 10) * 10;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // === Resize Handler ===
    const handleResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  // === Add Cube ===
  const addCube = () => {
    if (!scene) return;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2);
    scene.add(mesh);
  };

  // === Add Sphere ===
  const addSphere = () => {
    if (!scene) return;
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0xff6600 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2);
    scene.add(mesh);
  };

  // === Add Plane ===
  const addPlane = () => {
    if (!scene) return;
    const geometry = new THREE.PlaneGeometry(3, 3);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3366ff,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // rata di bawah
    mesh.position.y = 0.01; // sedikit di atas grid
    scene.add(mesh);
  };

  // === Clear Object ===
  const clearScene = () => {
    if (!scene) return;
    
    const PRESERVED_OBJECT_TYPES = new Set([
      "GridHelper",
      "AxesHelper",
      "AmbientLight",
      "DirectionalLight",
      "PerspectiveCamera"
    ]);

    const shouldKeepObject = (obj:THREE.Object3D): boolean => {
      return PRESERVED_OBJECT_TYPES.has(obj.type);
    }

    const objectsToRemove = scene.children.filter((obj) => !shouldKeepObject(obj));
    for (const obj of objectsToRemove) {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
      scene.remove(obj);
    }
    
    renderer?.render(scene, scene.children[0] as any);
  }
  return (
    <div className="relative w-full min-h-screen bg-neutral-900 overflow-hidden">
      {/* Canvas */}
      <canvas ref={canvasRef} style={{ width: "100%", height: "100vh" }} />

      {/* Floating Toolbar */}
      <div className="absolute flex gap-2 bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl text-white shadow-lg border border-white/10 z-99">
        <button
          onClick={addCube}
          className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 transition-all"
        >
          🟩 Cube
        </button>
        <button
          onClick={addSphere}
          className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 transition-all"
        >
          ⚪ Sphere
        </button>
        <button
          onClick={addPlane}
          className="px-3 py-1.5 rounded-md bg-yellow-600 hover:bg-yellow-700 transition-all"
        >
          🟨 Plane
        </button>
        <button
          onClick={clearScene}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition"
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
}
