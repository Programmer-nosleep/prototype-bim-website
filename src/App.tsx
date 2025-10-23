import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Toolbar } from "./components/Toolbar";
import { LayerManager } from "./components/LayerManager";
import { SettingsButton } from "./components/SettingsButton";
import { RectangleTool } from "./components/RectangleTool";

import "./App.css";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [rectangleTool, setRectangleTool] = useState<RectangleTool | null>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  // Reusable style for property items
  const propertyItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 15px',
    borderBottom: '1px solid #3c3c3c',
    fontSize: '13px',
    ':hover': {
      backgroundColor: '#3c3c3c'
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // === Scene setup ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x202025);
    setScene(scene);

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
    setCamera(camera);

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    setRenderer(renderer);
    
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
    controlsRef.current = new OrbitControls(camera, renderer.domElement);
    controlsRef.current.enableDamping = true;

    // Initialize settings button
    SettingsButton({ panelSelector: "#options-panel" });

    // === Render loop ===
    const animate = (time: number) => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate(0);

    // Initialize tools
    const newRectangleTool = new RectangleTool(
      scene, 
      camera, 
      renderer, 
      () => setActiveTool('select'),
      controlsRef.current
    );
    setRectangleTool(newRectangleTool);

    // === Cleanup ===
    return () => {
      if (newRectangleTool) {
        newRectangleTool.disable();
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

  useEffect(() => {
    if (!scene || !camera || !renderer) return;

    // Disable all tools first
    if (rectangleTool) {
      rectangleTool.disable();
    }

    // Enable the selected tool
    if (activeTool === 'rectangle') {
      rectangleTool?.enable();
    }

    return () => {
      // Cleanup when component unmounts or tool changes
      rectangleTool?.disable();
    };
  }, [activeTool, scene, camera, renderer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTool('select');
      }
      
      // Forward key events to the active tool
      if (activeTool === 'rectangle' && rectangleTool) {
        if (rectangleTool.handleKeyDown(event)) {
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTool, rectangleTool]);

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
        {scene && camera && renderer && controlsRef.current && (
          <Toolbar 
            scene={scene} 
            camera={camera} 
            renderer={renderer}
            controls={controlsRef.current}
            onToolChange={(tool) => setActiveTool(tool)}
          />
        )}
      </div>

      {/* Right Sidebar - Properties and Layers */}
      <div style={{
        gridArea: 'right',
        backgroundColor: '#252526',
        borderLeft: '1px solid #3c3c3c',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        width: '300px',
        minWidth: '300px'
      }}>
        {/* Layers Section */}
        <div style={{
          borderBottom: '1px solid #3c3c3c',
          padding: '15px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h3 style={{ margin: 0, color: '#9e9e9e', fontSize: '14px', fontWeight: 'normal' }}>LAYERS</h3>
            <button 
              onClick={() => {}}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9e9e9e',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 5px',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
              onMouseOut={(e) => e.currentTarget.style.color = '#9e9e9e'}
              title="Add Layer"
            >
              +
            </button>
          </div>
          
          {scene && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <LayerManager 
                scene={scene}
                onLayerChange={(updatedLayers) => {
                  setLayers(updatedLayers);
                  if (updatedLayers.length > 0 && !activeLayerId) {
                    setActiveLayerId(updatedLayers[0].id);
                  }
                }}
              />
            </div>
          )}
        </div>
        
        {/* Properties Section */}
        <div style={{
          flex: 1,
          padding: '15px',
          overflowY: 'auto'
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            color: '#9e9e9e',
            fontSize: '14px',
            fontWeight: 'normal',
            textTransform: 'uppercase'
          }}>
            Properties
          </h3>
          
          <div style={{
            backgroundColor: '#2d2d2d',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '15px'
          }}>
            <div style={{
              padding: '10px 15px',
              backgroundColor: '#3c3c3c',
              color: '#e0e0e0',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Selected Object</span>
              <span style={{ color: '#9e9e9e' }}>None</span>
            </div>
            
            <div style={{ padding: '10px 15px' }}>
              <div style={propertyItemStyle}>
                <span>Visible</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              
              <div style={propertyItemStyle}>
                <span>Locked</span>
                <label className="switch">
                  <input type="checkbox" />
                  <span className="slider"></span>
                </label>
              </div>
              
              <div style={propertyItemStyle}>
                <span>Opacity</span>
                <span style={{ color: '#9e9e9e' }}>100%</span>
              </div>
            </div>
          </div>
          
          {/* Display Settings */}
          <div>
            <div style={{
              padding: '10px 15px',
              backgroundColor: '#3c3c3c',
              color: '#e0e0e0',
              fontSize: '13px',
              marginBottom: '10px',
              borderRadius: '4px'
            }}>
              Display Settings
            </div>
            
            <div style={{
              backgroundColor: '#2d2d2d',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={propertyItemStyle}>
                <span>Grid</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              
              <div style={propertyItemStyle}>
                <span>Axes</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              
              <div style={propertyItemStyle}>
                <span>Shadows</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status bar */}
        <div style={{
          padding: '8px 15px',
          borderTop: '1px solid #3c3c3c',
          fontSize: '11px',
          color: '#9e9e9e',
          display: 'flex',
          justifyContent: 'space-between',
          backgroundColor: '#2d2d2d'
        }}>
          <div>Ready</div>
          <div>Layers: {layers.length}</div>
        </div>
      </div>
      
      <style>{`
        .property-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 15px;
          border-bottom: 1px solid #3c3c3c;
          font-size: 13px;
        }
        .property-item:last-child {
          border-bottom: none;
        }
        .property-item:hover {
          background-color: #3c3c3c;
        }
      `}</style>

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