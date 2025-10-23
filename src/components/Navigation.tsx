import React from 'react';
import { Box, Layers, Settings, HelpCircle, Square, Circle, MousePointer, Move3D, Ruler } from 'lucide-react';

interface NavigationItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ icon, label, isActive = false, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer transition-colors relative ${
        isActive 
          ? 'text-blue-500' 
          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <div className="relative">
        <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-blue-500 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className={`relative z-10 ${isActive ? 'text-blue-500' : ''}`}>
          {icon}
        </div>
      </div>
      <span className="text-xs mt-1.5">{label}</span>
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-md"></div>
      )}
    </div>
  );
};

const Navigation: React.FC = () => {
  const [activeItem, setActiveItem] = React.useState('select');

  return (
    <div className="fixed left-0 top-0 bottom-0 w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 z-50">
      <div className="flex-1 flex flex-col items-center space-y-6 w-full">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white mb-6">
          <Box size={18} />
        </div>
        
        <NavigationItem 
          icon={<MousePointer size={20} />} 
          label="Select" 
          isActive={activeItem === 'select'}
          onClick={() => setActiveItem('select')}
        />
        
        <NavigationItem 
          icon={<Move3D size={20} />} 
          label="Move" 
          isActive={activeItem === 'move'}
          onClick={() => setActiveItem('move')}
        />
        
        <NavigationItem 
          icon={<Ruler size={20} />} 
          label="Measure" 
          isActive={activeItem === 'measure'}
          onClick={() => setActiveItem('measure')}
        />
        
        <div className="border-t border-gray-800 w-8 my-2"></div>
        
        <NavigationItem 
          icon={<Square size={20} />} 
          label="Rectangle" 
          isActive={activeItem === 'rectangle'}
          onClick={() => setActiveItem('rectangle')}
        />
        
        <NavigationItem 
          icon={<Circle size={20} />} 
          label="Circle" 
          isActive={activeItem === 'circle'}
          onClick={() => setActiveItem('circle')}
        />
        
        <div className="border-t border-gray-800 w-8 my-2"></div>
        
        <NavigationItem 
          icon={<Layers size={20} />} 
          label="Layers" 
          isActive={activeItem === 'layers'}
          onClick={() => setActiveItem('layers')}
        />
      </div>
      
      <div className="flex flex-col items-center space-y-4 w-full">
        <NavigationItem 
          icon={<Settings size={20} />} 
          label="Settings" 
          isActive={activeItem === 'settings'}
          onClick={() => setActiveItem('settings')}
        />
        <NavigationItem 
          icon={<HelpCircle size={20} />} 
          label="Help" 
          isActive={activeItem === 'help'}
          onClick={() => setActiveItem('help')}
        />
      </div>
    </div>
  );
};

export default Navigation;
