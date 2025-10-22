import { useEffect, useRef, useState } from 'react';
import { LineTool } from './LineTool';
import * as THREE from 'three';

type Tool = 'select' | 'line' | 'move' | 'rotate' | 'scale';

interface ToolbarProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  onToolChange?: (tool: Tool) => void;
}

export function Toolbar({ scene, camera, renderer, onToolChange }: ToolbarProps) {
  const lineTool = useRef<LineTool | null>(null);
  const [currentTool, setCurrentTool] = useState<Tool>('select');

  const handleCancelDrawing = () => {
    setCurrentTool('select');
    if (onToolChange) {
      onToolChange('select');
    }
  };

  useEffect(() => {
    if (!scene || !camera || !renderer) return;

    // Initialize line tool with cancel callback
    lineTool.current = new LineTool(scene, camera, renderer, handleCancelDrawing);

    // Set up keyboard shortcuts for undo/redo
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && lineTool.current) {
          if (event.shiftKey) {
            lineTool.current.redo();
          } else {
            lineTool.current.undo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (lineTool.current) {
        lineTool.current.disable();
      }
    };
  }, [scene, camera, renderer]);

  const handleToolClick = (tool: Tool) => {
    setCurrentTool(tool);
    
    // Disable all tools first
    if (lineTool.current) {
      lineTool.current.disable();
    }

    // Enable selected tool
    if (tool === 'line' && lineTool.current) {
      lineTool.current.enable();
    }

    if (onToolChange) {
      onToolChange(tool);
    }
  };

  // Handle ESC key globally
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && currentTool === 'line' && lineTool.current) {
        handleToolClick('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentTool]);

  return (
    <div style={{
      position: 'absolute',
      top: '70px',
      left: '20px',
      backgroundColor: '#252526',
      borderRadius: '4px',
      padding: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
    }}>
      <button
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: currentTool === 'select' ? '#007acc' : '#3c3c3c',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          transition: 'background-color 0.2s',
        }}
        onClick={() => handleToolClick('select')}
        title="Select Tool (Q)"
      >
        <span>✋</span>
      </button>
      
      <button
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: currentTool === 'line' ? '#007acc' : '#3c3c3c',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          transition: 'background-color 0.2s',
        }}
        onClick={() => handleToolClick('line')}
        title="Line Tool (L) - Press ESC to cancel"
      >
        <span>📏</span>
      </button>
      
      <div style={{ width: '100%', height: '1px', backgroundColor: '#3c3c3c', margin: '4px 0' }}></div>
      
      <button
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: currentTool === 'move' ? '#007acc' : '#3c3c3c',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          transition: 'background-color 0.2s',
        }}
        onClick={() => handleToolClick('move')}
        title="Move Tool (W)"
      >
        <span>✥</span>
      </button>
      
      <button
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: currentTool === 'rotate' ? '#007acc' : '#3c3c3c',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          transition: 'background-color 0.2s',
        }}
        onClick={() => handleToolClick('rotate')}
        title="Rotate Tool (E)"
      >
        <span>🔄</span>
      </button>
      
      <button
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: currentTool === 'scale' ? '#007acc' : '#3c3c3c',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          transition: 'background-color 0.2s',
        }}
        onClick={() => handleToolClick('scale')}
        title="Scale Tool (R)"
      >
        <span>⇲</span>
      </button>
    </div>
  );
}
