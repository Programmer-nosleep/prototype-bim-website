import { useEffect, useState } from 'react';

interface ExtrusionControlsProps {
  height: number;
  onHeightChange: (height: number) => void;
  visible: boolean;
}

export default function ExtrusionControls({ height, onHeightChange, visible }: ExtrusionControlsProps) {
  const [localHeight, setLocalHeight] = useState(height);

  useEffect(() => {
    setLocalHeight(height);
  }, [height]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: '10px 20px',
      borderRadius: '4px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9em', marginBottom: '5px' }}>Height: {localHeight.toFixed(2)}m</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => {
              const newHeight = Math.max(0.1, localHeight - 0.1);
              setLocalHeight(newHeight);
              onHeightChange(newHeight);
            }}
            style={buttonStyle}
          >
            -
          </button>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={localHeight}
            onChange={(e) => {
              const newHeight = parseFloat(e.target.value);
              setLocalHeight(newHeight);
              onHeightChange(newHeight);
            }}
            style={{
              width: '150px',
              cursor: 'pointer'
            }}
          />
          <button 
            onClick={() => {
              const newHeight = localHeight + 0.1;
              setLocalHeight(newHeight);
              onHeightChange(newHeight);
            }}
            style={buttonStyle}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#4CAF50',
  color: 'white',
  fontSize: '16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  transition: 'background-color 0.2s',
  ':hover': {
    backgroundColor: '#45a049'
  },
  ':active': {
    transform: 'scale(0.95)'
  }
} as React.CSSProperties;
