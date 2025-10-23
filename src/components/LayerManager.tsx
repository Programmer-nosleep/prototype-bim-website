import { useState, useEffect } from 'react';
import * as THREE from 'three';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  objects: THREE.Object3D[];
  color: string;
}

interface LayerManagerProps {
  scene: THREE.Scene;
  onLayerChange?: (layers: Layer[]) => void;
  onObjectLayerChange?: (object: THREE.Object3D, newLayerId: string) => void;
  activeObject?: THREE.Object3D | null;
}

const DEFAULT_LAYER: Layer = {
  id: 'layer-0',
  name: 'Layer 0',
  visible: true,
  objects: [],
  color: '#4CAF50' // Default green color for Layer 0
};

export function LayerManager({ 
  scene, 
  onLayerChange, 
  onObjectLayerChange,
  activeObject 
}: LayerManagerProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [newLayerName, setNewLayerName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with default layer
  useEffect(() => {
    if (!isInitialized && layers.length === 0) {
      setLayers([DEFAULT_LAYER]);
      setActiveLayerId(DEFAULT_LAYER.id);
      setIsInitialized(true);
      
      if (onLayerChange) {
        onLayerChange([DEFAULT_LAYER]);
      }
    }
  }, [isInitialized, layers.length, onLayerChange]);

  const addLayer = () => {
    if (!newLayerName.trim()) return;
    
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: newLayerName,
      visible: true,
      objects: [],
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    const updatedLayers = [...layers, newLayer];
    setLayers(updatedLayers);
    setActiveLayerId(newLayer.id);
    setNewLayerName('');
    
    if (onLayerChange) {
      onLayerChange(updatedLayers);
    }
  };
  
  // Add object to a layer
  const addObjectToLayer = (object: THREE.Object3D, layerId: string) => {
    const updatedLayers = layers.map(layer => {
      // Remove from all layers first
      const filteredObjects = layer.objects.filter(obj => obj.uuid !== object.uuid);
      
      // Add to the target layer
      if (layer.id === layerId) {
        return {
          ...layer,
          objects: [...filteredObjects, object]
        };
      }
      
      return {
        ...layer,
        objects: filteredObjects
      };
    });
    
    setLayers(updatedLayers);
    
    // Update object's userData to store layer information
    object.userData.layerId = layerId;
    
    if (onLayerChange) {
      onLayerChange(updatedLayers);
    }
    
    if (onObjectLayerChange) {
      onObjectLayerChange(object, layerId);
    }
  };
  
  // Remove object from all layers
  const removeObjectFromLayers = (object: THREE.Object3D) => {
    const updatedLayers = layers.map(layer => ({
      ...layer,
      objects: layer.objects.filter(obj => obj.uuid !== object.uuid)
    }));
    
    setLayers(updatedLayers);
    
    if (onLayerChange) {
      onLayerChange(updatedLayers);
    }
  };

  const toggleLayerVisibility = (layerId: string) => {
    const updatedLayers = layers.map(layer => {
      if (layer.id === layerId) {
        const isVisible = !layer.visible;
        // Update visibility of all objects in this layer
        layer.objects.forEach(object => {
          object.visible = isVisible;
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
    
    // Check if trying to delete default layer
    if (layerId === DEFAULT_LAYER.id) {
      // Only allow deletion if there are other layers and default layer is empty
      if (layers.length <= 1) {
        console.warn("Cannot delete the only layer");
        return;
      }
      
      if (layerToDelete.objects.length > 0) {
        console.warn("Cannot delete default layer because it contains objects");
        return;
      }
    }
    
    // If not default layer or default layer is empty, proceed with deletion
    const defaultLayer = layers.find(l => l.id === DEFAULT_LAYER.id);
    
    // If deleting a non-default layer, move its objects to default layer
    if (layerId !== DEFAULT_LAYER.id && defaultLayer) {
      const objectsToMove = [...layerToDelete.objects];
      objectsToMove.forEach(object => {
        addObjectToLayer(object, DEFAULT_LAYER.id);
      });
    }
    
    // Find next active layer (prefer default layer if available, otherwise first available)
    let nextActiveLayerId = DEFAULT_LAYER.id;
    if (activeLayerId === layerId) {
      const otherLayers = layers.filter(l => l.id !== layerId);
      if (otherLayers.length > 0) {
        nextActiveLayerId = otherLayers[0].id;
      }
    }
    
    const updatedLayers = layers.filter(layer => layer.id !== layerId);
    setLayers(updatedLayers);
    
    if (activeLayerId === layerId) {
      setActiveLayerId(nextActiveLayerId);
    }
  };
  
  // Get the layer of an object
  const getObjectLayer = (object: THREE.Object3D) => {
    return layers.find(layer => 
      layer.objects.some(obj => obj.uuid === object.uuid)
    );
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
      
      {activeObject && (
        <div style={styles.currentObject}>
          <div style={styles.currentObjectLabel}>Selected:</div>
          <select 
            value={getObjectLayer(activeObject)?.id || ''}
            onChange={(e) => addObjectToLayer(activeObject, e.target.value)}
            style={styles.layerSelect}
          >
            {layers.map(layer => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
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
            {(layer.id !== DEFAULT_LAYER.id || (layers.length > 1 && layer.objects.length === 0)) && (
              <button 
                onClick={() => deleteLayer(layer.id)}
                style={styles.deleteButton}
                title="Delete layer"
              >
                ×
              </button>
            )}
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
    marginTop: '10px',
  },
  currentObject: {
    margin: '10px 0',
    padding: '8px',
    backgroundColor: '#333',
    borderRadius: '4px',
    fontSize: '13px',
  },
  currentObjectLabel: {
    marginBottom: '5px',
    color: '#9e9e9e',
  },
  layerSelect: {
    width: '100%',
    padding: '4px',
    backgroundColor: '#3c3c3c',
    color: '#e0e0e0',
    border: '1px solid #555',
    borderRadius: '3px',
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
