import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { components } from "./components/ComponentsManager";
import { HelloWorldComponents } from "./components/HelloWorldComponent";
import { SettingsButton } from "./components/SettingsButton";

import "./App.css";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // === Scene setup ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202025);

    const near = 5;
    const far = 15;
    scene.fog = new THREE.Fog(0x0202025, near, far);
    scene.background = new THREE.Color(scene.fog.color);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    
    // Set initial size
    const updateSize = () => {
      if (!canvasRef.current) return;
      
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      
      // Update camera
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      // Update renderer
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    };
    
    // Initial render
    updateSize();
    
    // Handle window resize
    const handleResize = () => {
      updateSize();
      renderer.render(scene, camera);
    };
    
    window.addEventListener('resize', handleResize);

    // === Lighting ===
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // === Axis & Grid ===
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    const size = 100;
    const divisions = 100;
    const gridHelper = new THREE.GridHelper(size, divisions);

    // Enable fog for the grid
    if (gridHelper.material instanceof THREE.Material) {
        gridHelper.material.fog = true;
        gridHelper.material.opacity = 0.5;
        gridHelper.material.transparent = true;
    }
    scene.add(gridHelper);

    // === Controls ===
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // === OBC Component ===
    let hello = components.get(HelloWorldComponents);
    if (!hello) {
      hello = new HelloWorldComponents(components);
    }
    hello.greet("Zani");

    // === Render loop ===
    const animate = (time: number) => {
      requestAnimationFrame(animate);
      const delta = time * 0.001;
      if (hello.enabled) {
        hello.update(delta);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate(0);

    const button = SettingsButton({ panelSelector: "#options-panel" });


    // === Cleanup ===
    return () => {
      if (hello) {
        hello.dispose();
      }
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      
      // Clear the canvas
      if (canvasRef.current) {
        const context = canvasRef.current.getContext('webgl');
        if (context) {
          context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
        }
      }
    };
  }, []);
  return (
    <div style={{
      display: 'grid',
      gridTemplateAreas: `
        "header header header"
        "left main right"
        "footer footer footer"
      `,
      gridTemplateColumns: '300px 1fr 300px',
      gridTemplateRows: 'auto 1fr auto',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#1e1e1e'
    }}>
      {/* Header */}
      <div style={{
        gridArea: 'header',
        backgroundColor: '#252526',
        padding: '10px 20px',
        borderBottom: '1px solid #3c3c3c',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#007acc',
            borderRadius: '4px'
          }}></div>
          <span>Project Name</span>
        </div>
        <div style={{
          backgroundColor: '#2d2d2d',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '0.9em',
          color: '#9e9e9e'
        }}>
          Status: Connected
        </div>
      </div>

      {/* Left Sidebar - Navigation */}
      <div style={{
        gridArea: 'left',
        backgroundColor: '#252526',
        borderRight: '1px solid #3c3c3c',
        padding: '15px',
        overflowY: 'auto'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#9e9e9e' }}>Navigation</h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {['Home', 'Models', 'Materials', 'Lights', 'Views'].map((item) => (
            <div 
              key={item} 
              className={`nav-item ${item === 'Models' ? 'active' : ''}`}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: item === 'Models' ? '#2a2d2e' : 'transparent',
                color: 'white',
                transition: 'background-color 0.2s',
                ...(item !== 'Models' && {
                  ':hover': {
                    backgroundColor: '#2a2d2e'
                  }
                })
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - 3D View */}
      <div style={{
        gridArea: 'main',
        position: 'relative',
        backgroundColor: '#1e1e1e',
        overflow: 'hidden'
      }}>
        <canvas 
          ref={canvasRef} 
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      </div>

      {/* Right Sidebar - Properties */}
      <div style={{
        gridArea: 'right',
        backgroundColor: '#252526',
        borderLeft: '1px solid #3c3c3c',
        padding: '15px',
        overflowY: 'auto',
        color: 'white'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#9e9e9e' }}>Properties</h3>
        
        {/* Selected Object Section */}
        <div style={{
          backgroundColor: '#2d2d2d',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <div style={{ color: '#9e9e9e', fontSize: '0.9em', marginBottom: '8px' }}>Selected Object</div>
          <div>None selected</div>
        </div>
        
        {/* Display Settings */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ color: '#9e9e9e', marginBottom: '10px' }}>Display Settings</h4>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <span>Grid</span>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <span>Axes</span>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        gridArea: 'footer',
        backgroundColor: '#007acc',
        padding: '5px 15px',
        fontSize: '0.8em',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white'
      }}>
        <div>Ready</div>
        <div>FPS: 60</div>
      </div>
    </div>
  );
}