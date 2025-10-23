import { useState, useRef, useEffect } from 'react';

interface ProfileAccountProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
  onProfileClick?: () => void;
  className?: string;
}

const ProfileAccount: React.FC<ProfileAccountProps> = ({
  user = { name: 'Guest User', email: 'guest@example.com' },
  onLogout = () => console.log('Logout clicked'),
  onProfileClick = () => {},
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const togglePopup = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`} ref={popupRef}>
      {/* Profile Button */}
      <button
        onClick={togglePopup}
        className="flex items-center space-x-2 focus:outline-none"
        aria-label="User profile"
      >
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-600 text-lg font-medium">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          
          <div className="py-1">
            <button
              onClick={() => {
                onProfileClick();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Profile Settings
            </button>
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
          
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
            v1.0.0
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileAccount;
