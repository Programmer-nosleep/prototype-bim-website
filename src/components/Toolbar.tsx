import { useEffect, useRef, useState } from 'react';
import { LineTool } from './LineTool';
import { RectangleTool } from './RectangleTool';
import { ExtrudeTool } from './ExtrudeTool';
import { SelectionTool } from './SelectionTool';
import { HandTool } from './HandTool';
import ExtrusionControls from './ExtrusionControls';
import * as THREE from 'three';

type Tool = 'hand' | 'select' | 'line' | 'rectangle' | 'extrude' | 'move' | 'rotate' | 'scale';

interface ToolbarProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  controls?: {
    enabled: boolean;
  };
  onToolChange?: (tool: Tool) => void;
}

export function Toolbar({ scene, camera, renderer, controls, onToolChange }: ToolbarProps) {
  const lineTool = useRef<LineTool | null>(null);
  const rectangleTool = useRef<RectangleTool | null>(null);
  const extrudeTool = useRef<ExtrudeTool | null>(null);
  const selectionTool = useRef<SelectionTool | null>(null);
  const handTool = useRef<HandTool | null>(null);
  const [extrusionHeight, setExtrusionHeight] = useState(1);
  const [showExtrusionControls, setShowExtrusionControls] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('hand');
  const [selectedObjects, setSelectedObjects] = useState<THREE.Object3D[]>([]);

  const handleCancelDrawing = () => {
    setActiveTool('select');
    if (onToolChange) {
      onToolChange('select');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (selectionTool.current) {
        selectionTool.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!scene || !camera || !renderer) return;

    // Initialize tools with cancel callback and controls
    lineTool.current = new LineTool(scene, camera, renderer, handleCancelDrawing, controls);
    rectangleTool.current = new RectangleTool(scene, camera, renderer, handleCancelDrawing, controls);
    extrudeTool.current = new ExtrudeTool(scene, camera, renderer, handleCancelDrawing, controls);
    selectionTool.current = new SelectionTool(
      scene, 
      camera, 
      renderer, 
      (selected: THREE.Object3D[]) => {
        setSelectedObjects(selected);
      }
    );
    handTool.current = new HandTool(camera, renderer, controls);

    // Set up keyboard shortcuts for undo/redo
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z') {
          if (event.shiftKey) {
            lineTool.current?.redo();
            rectangleTool.current?.redo();
          } else {
            lineTool.current?.undo();
            rectangleTool.current?.undo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      lineTool.current?.disable();
      rectangleTool.current?.disable();
    };
  }, [scene, camera, renderer]);

  const handleToolSelect = (tool: Tool) => {
    // Clean up previous tool
    if (activeTool === 'hand' && handTool.current) {
      handTool.current.disable();
    } else if (activeTool === 'line' && lineTool.current) {
      lineTool.current.disable();
    } else if (activeTool === 'rectangle' && rectangleTool.current) {
      rectangleTool.current.disable();
    } else if (activeTool === 'extrude' && extrudeTool.current) {
      extrudeTool.current.disable();
      setShowExtrusionControls(false);
    } else if (activeTool === 'select' && selectionTool.current) {
      selectionTool.current.disable();
    }
    
    setActiveTool(tool);
    if (onToolChange) onToolChange(tool);
    
    // Enable new tool
    if (tool === 'hand' && handTool.current) {
      handTool.current.enable();
      setActiveTool('hand');
    } else if (tool === 'select' && scene && camera && renderer) {
      if (!selectionTool.current) {
        selectionTool.current = new SelectionTool(
          scene, 
          camera, 
          renderer, 
          (selected: THREE.Object3D[]) => {
            setSelectedObjects(selected);
          }
        );
      }
      selectionTool.current.enable();
      setActiveTool('select');
    } else if (tool === 'line' && lineTool.current) {
      lineTool.current.enable();
      setActiveTool('line');
    } else if (tool === 'rectangle' && rectangleTool.current) {
      rectangleTool.current.enable();
      setActiveTool('rectangle');
    } else if (tool === 'extrude' && extrudeTool.current) {
      extrudeTool.current.enable();
      setActiveTool('extrude');
      setShowExtrusionControls(true);
    } else if (tool === 'rectangle' && scene && camera && renderer) {
      if (!rectangleTool.current) {
        rectangleTool.current = new RectangleTool(scene, camera, renderer, () => {
          setActiveTool('select');
          if (onToolChange) onToolChange('select');
        }, controls);
      }
      rectangleTool.current.enable();
    } else if (tool === 'extrude' && scene && camera && renderer) {
      if (!extrudeTool.current) {
        extrudeTool.current = new ExtrudeTool(scene, camera, renderer, () => {
          setActiveTool('select');
          setShowExtrusionControls(false);
          if (onToolChange) onToolChange('select');
        }, controls);
        
        extrudeTool.current.setOnExtrudeUpdate((height: number) => {
          setExtrusionHeight(height);
        });
      }
      extrudeTool.current.enable();
      setShowExtrusionControls(true);
    } else {
      if (lineTool.current) lineTool.current.disable();
      if (rectangleTool.current) rectangleTool.current.disable();
      if (extrudeTool.current) extrudeTool.current.disable();
      if (selectionTool.current) selectionTool.current.disable();
    }
  };

  const handleHeightChange = (height: number) => {
    setExtrusionHeight(height);
    if (extrudeTool.current) {
      extrudeTool.current.setHeight(height);
    }
  };

  const toolbarStyle: React.CSSProperties = {
    position: 'absolute',
    top: '70px',
    left: '20px',
    backgroundColor: '#252526',
    borderRadius: '4px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    zIndex: 1000,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
  };

  const dividerStyle = {
    width: '100%',
    height: '1px',
    backgroundColor: '#3c3c3c',
    margin: '4px 0'
  };

  const getButtonStyle = (tool: Tool): React.CSSProperties => ({
    width: '40px',
    height: '40px',
    backgroundColor: activeTool === tool ? '#007acc' : '#3c3c3c',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    transition: 'background-color 0.2s',
  });

  return (
    <>
      <div style={toolbarStyle}>
        <button
          style={getButtonStyle('hand')}
          onClick={() => handleToolSelect('hand')}
          title="Hand Tool (H) - Rotate view"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 12H6"></path>
            <path d="M15 5l3 3-3 3"></path>
            <path d="M15 19l3-3-3-3"></path>
            <path d="M9 5l-3 3 3 3"></path>
            <path d="M9 19l-3-3 3-3"></path>
          </svg>
        </button>
        <button
          style={getButtonStyle('select')}
          onClick={() => handleToolSelect('select')}
          title="Select Tool (S)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
            <path d="M13 13l6 6"></path>
          </svg>
        </button>
        <button
          style={getButtonStyle('line')}
          onClick={() => handleToolSelect('line')}
          title="Line Tool (L)"
        >
          <span>📏</span>
        </button>
        <button
          style={getButtonStyle('rectangle')}
          onClick={() => handleToolSelect('rectangle')}
          title="Rectangle Tool (R)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        </button>
        <button
          style={getButtonStyle('extrude')}
          onClick={() => handleToolSelect('extrude')}
          title="Extrude Tool (E)"
        >
          <span>🡹</span>
        </button>
        <div style={dividerStyle}></div>
        <button
          style={getButtonStyle('move')}
          onClick={() => handleToolSelect('move')}
          title="Move Tool (W)"
        >
          <span>✥</span>
        </button>
        <button
          style={getButtonStyle('rotate')}
          onClick={() => handleToolSelect('rotate')}
          title="Rotate Tool (E)"
        >
          <span>🔄</span>
        </button>
        <button
          style={getButtonStyle('scale')}
          onClick={() => handleToolSelect('scale')}
          title="Scale Tool (R)"
        >
          <span>⇲</span>
        </button>
        <div style={dividerStyle}></div>
        <div style={{ flexGrow: 1 }}></div>
      </div>
      
      {showExtrusionControls && (
        <ExtrusionControls 
          height={extrusionHeight}
          onHeightChange={handleHeightChange}
          visible={activeTool === 'extrude'}
        />
      )}
    </>
  );
}
