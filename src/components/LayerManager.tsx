import { useState } from 'react';
import * as THREE from 'three';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  lines: THREE.Line[];
  color: string;
}

interface LayerManagerProps {
  scene: THREE.Scene;
  onLayerChange?: (layers: Layer[]) => void;
}

export function LayerManager({ scene, onLayerChange }: LayerManagerProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [newLayerName, setNewLayerName] = useState('');

  const addLayer = () => {
    if (!newLayerName.trim()) return;
    
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: newLayerName,
      visible: true,
      lines: [],
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    setLayers([...layers, newLayer]);
    setActiveLayerId(newLayer.id);
    setNewLayerName('');
    
    if (onLayerChange) {
      onLayerChange([...layers, newLayer]);
    }
  };

  const toggleLayerVisibility = (layerId: string) => {
    const updatedLayers = layers.map(layer => {
      if (layer.id === layerId) {
        const isVisible = !layer.visible;
        layer.lines.forEach(line => {
          line.visible = isVisible;
        });
        return { ...layer, visible: isVisible };
      }
      return layer;
    });
    
    setLayers(updatedLayers);
    if (onLayerChange) {
      onLayerChange(updatedLayers);
    }
  };

  const deleteLayer = (layerId: string) => {
    const layerToDelete = layers.find(l => l.id === layerId);
    if (!layerToDelete) return;
    
    // Remove all lines in this layer from the scene
    layerToDelete.lines.forEach(line => {
      scene.remove(line);
    });
    
    const updatedLayers = layers.filter(layer => layer.id !== layerId);
    setLayers(updatedLayers);
    
    if (activeLayerId === layerId) {
      setActiveLayerId(updatedLayers[0]?.id || null);
    }
    
    if (onLayerChange) {
      onLayerChange(updatedLayers);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.header}>Layers</h3>
      
      <div style={styles.addLayerContainer}>
        <input
          type="text"
          value={newLayerName}
          onChange={(e) => setNewLayerName(e.target.value)}
          placeholder="New layer name"
          style={styles.input}
          onKeyDown={(e) => e.key === 'Enter' && addLayer()}
        />
        <button onClick={addLayer} style={styles.addButton}>
          +
        </button>
      </div>
      
      <div style={styles.layersList}>
        {layers.map((layer) => (
          <div key={layer.id} style={styles.layerItem}>
            <div 
              style={{
                ...styles.layerColor,
                backgroundColor: layer.color,
                opacity: layer.visible ? 1 : 0.5
              }}
              onClick={() => toggleLayerVisibility(layer.id)}
            />
            <span 
              style={{
                ...styles.layerName,
                fontWeight: activeLayerId === layer.id ? 'bold' : 'normal',
                opacity: layer.visible ? 1 : 0.5
              }}
              onClick={() => setActiveLayerId(layer.id)}
            >
              {layer.name}
            </span>
            <button 
              onClick={() => deleteLayer(layer.id)}
              style={styles.deleteButton}
              title="Delete layer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '10px',
    backgroundColor: '#252526',
    color: '#e0e0e0',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  header: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#9e9e9e',
    borderBottom: '1px solid #3c3c3c',
    paddingBottom: '5px',
  },
  addLayerContainer: {
    display: 'flex',
    marginBottom: '10px',
  },
  input: {
    flex: 1,
    padding: '5px',
    backgroundColor: '#3c3c3c',
    border: '1px solid #555',
    color: '#e0e0e0',
    borderRadius: '3px',
    marginRight: '5px',
  },
  addButton: {
    padding: '0 10px',
    backgroundColor: '#007acc',
    border: 'none',
    color: 'white',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  layersList: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  layerItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px',
    margin: '2px 0',
    backgroundColor: '#2d2d2d',
    borderRadius: '3px',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#3c3c3c',
    },
  },
  layerColor: {
    width: '15px',
    height: '15px',
    borderRadius: '3px',
    marginRight: '8px',
    cursor: 'pointer',
  },
  layerName: {
    flex: 1,
    fontSize: '13px',
  },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    color: '#ff6b6b',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    padding: '0 5px',
    ':hover': {
      color: '#ff3b3b',
    },
  },
} as const;
