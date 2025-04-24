import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMenu } from '../contexts/MenuContext';
import { useTheme } from '../contexts/ThemeContext';

interface DynamicMenuProps {
  className?: string;
  mobileView?: boolean;
  onItemClick?: () => void;
}

const DynamicMenu: React.FC<DynamicMenuProps> = ({ 
  className = '',
  mobileView = false,
  onItemClick
}) => {
  const { menuItems } = useMenu();
  const { isDarkMode } = useTheme();
  const location = useLocation();

  // Only show visible menu items
  const visibleMenuItems = menuItems.filter(item => item.isVisible);
  
  // Sort items by order
  const sortedItems = [...visibleMenuItems].sort((a, b) => 
    (a.order || 0) - (b.order || 0)
  );

  return (
    <nav className={`space-y-1.5 ${className}`}>
      {sortedItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.id}
            to={item.path}
            onClick={onItemClick}
            className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden ${
              isActive
                ? isDarkMode 
                    ? 'bg-indigo-600/20 text-indigo-300 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-indigo-500' 
                    : 'bg-indigo-50 text-indigo-700 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-indigo-500'
                : isDarkMode 
                    ? 'text-gray-300 hover:bg-gray-700/50' 
                    : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-indigo-500' : ''}`}>
              <Icon size={20} />
            </div>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                isDarkMode ? 'bg-indigo-600/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {item.badge}
              </span>
            )}
            {item.children && item.children.length > 0 && (
              !mobileView ? <ChevronRight size={16} /> : <ChevronDown size={16} />
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default DynamicMenu; 