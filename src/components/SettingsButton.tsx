import React from 'react';
import { Settings } from 'lucide-react';

interface SettingsButtonProps {
  onClick?: () => void;
  className?: string;
  size?: number;
  color?: string;
}

const SettingsButton: React.FC<SettingsButtonProps> = ({
  onClick = () => {},
  className = '',
  size = 20,
  color = '#e0e0e0'
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${className}`}
      aria-label="Settings"
    >
      <Settings size={size} color={color} />
    </button>
  );
};

export default SettingsButton;
