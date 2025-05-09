import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  LayoutDashboard, Package, Users, UserCircle, 
  MessageSquare, Settings, BarChart3, Activity,
  FileText, Database, Server, Code, Zap, Globe,
  LucideIcon
} from 'lucide-react';
import { menuService } from '../services/menuService';
import { useAuth } from './AuthContext';

// Define interface for menu items
export interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string;
  roles?: string[];
  isVisible?: boolean;
  order?: number;
  children?: MenuItem[];
}

// Type definitions for the context
interface MenuContextType {
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  addMenuItem: (menuItem: MenuItem) => void;
  removeMenuItem: (id: string) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  resetToDefault: () => void;
  toggleMenuVisibility: (id: string) => void;
  reorderMenuItems: (ids: string[]) => void;
}

// Create the context
const MenuContext = createContext<MenuContextType | undefined>(undefined);

// Default menu items - these will be used if no custom menu is found
const defaultMenuItems: MenuItem[] = [
  { 
    id: 'dashboard', 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: LayoutDashboard, 
    badge: '',
    isVisible: true,
    order: 0
  },
  { 
    id: 'products', 
    name: 'Products', 
    path: '/dashboard/products', 
    icon: Package, 
    badge: '',
    isVisible: true,
    order: 1
  },
  { 
    id: 'team', 
    name: 'Team Members', 
    path: '/dashboard/team', 
    icon: Users, 
    badge: '',
    roles: ['ROLE_ADMIN', 'ADMIN'],
    isVisible: true,
    order: 2
  },
  { 
    id: 'chat', 
    name: 'Chat', 
    path: '/dashboard/chat', 
    icon: MessageSquare, 
    badge: '',
    isVisible: true,
    order: 3
  },
  { 
    id: 'profile', 
    name: 'Profile', 
    path: '/dashboard/profile', 
    icon: UserCircle, 
    badge: '',
    isVisible: true,
    order: 4
  },
  { 
    id: 'logs', 
    name: 'Application Logs', 
    path: '/dashboard/logs', 
    icon: Activity, 
    badge: '',
    roles: ['ROLE_ADMIN', 'ADMIN'],
    isVisible: true,
    order: 5
  },
  {
    id: 'analytics',
    name: 'Analytics', 
    path: '/dashboard/analytics', 
    icon: BarChart3, 
    badge: 'New',
    isVisible: false,
    order: 6
  },
  {
    id: 'cpool',
    name: 'Connection Pool', 
    path: '/dashboard/cpool', 
    icon: Database, 
    badge: '',
    roles: ['ROLE_ADMIN', 'ADMIN'],
    isVisible: true,
    order: 7
  },
  {
    id: 'menu-settings',
    name: 'Menu Settings', 
    path: '/dashboard/menu-settings', 
    icon: Settings, 
    badge: '',
    roles: ['ROLE_ADMIN', 'ADMIN'],
    isVisible: true,
    order: 8
  }
];

// Define the icon map for dynamic icon selection
export const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Package,
  Users,
  UserCircle,
  MessageSquare,
  Settings,
  BarChart3,
  Activity,
  FileText,
  Database,
  Server,
  Code,
  Zap,
  Globe
};

// Hook for using the menu context
export const useMenu = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

// Provider props interface
interface MenuProviderProps {
  children: ReactNode;
  userRoles?: string[];
}

// Menu Provider component
export const MenuProvider: React.FC<MenuProviderProps> = ({ 
  children, 
  userRoles = [] 
}) => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    // First try to load from localStorage for immediate rendering
    const savedMenu = localStorage.getItem('userMenu');
    if (savedMenu) {
      try {
        // Parse the saved menu and map icons correctly
        const parsedMenu = JSON.parse(savedMenu);
        return parsedMenu.map((item: any) => {
          // Convert the string icon name to the actual component
          const iconName = Object.keys(iconMap).find(
            key => key === item.iconName || key === item.icon?.name
          );
          return {
            ...item,
            icon: iconName ? iconMap[iconName] : iconMap.Package
          };
        }).filter((item: MenuItem) => filterItemByRoles(item, userRoles));
      } catch (error) {
        console.error('Failed to parse saved menu:', error);
        return filterMenuItemsByRole(defaultMenuItems, userRoles);
      }
    }
    
    return filterMenuItemsByRole(defaultMenuItems, userRoles);
  });

  // Load menu preferences from the backend when the user is authenticated
  useEffect(() => {
    const loadFromBackend = async () => {
      if (!user?.id) return;
      
      try {
        const response = await menuService.getMenuPreferences();
        
        if (response.preferences && response.preferences.length > 0) {
          // Convert API response to menu items
          // Create a map of existing items by ID for quick lookup
          const currentItemsMap = new Map(
            menuItems.map(item => [item.id, item])
          );
          
          // Update only the order and visibility properties from the backend
          const updatedItems = response.preferences.map(pref => {
            const existingItem = currentItemsMap.get(pref.menuId);
            
            // Merge all fields from backend if present
            const merged = {
              ...(existingItem || {}),
              isVisible: pref.visible,
              order: pref.order,
              name: pref.name ?? existingItem?.name,
              path: pref.path ?? existingItem?.path,
              badge: pref.badge ?? existingItem?.badge,
              // iconName is used for serialization, but we need to map it to icon
              icon: pref.iconName ? (iconMap[pref.iconName] || iconMap.Package) : (existingItem?.icon || iconMap.Package),
            };
            return merged;
          })
          .filter(Boolean) as MenuItem[];
          
          // Add any items that exist locally but not in the backend response
          const backendItemIds = new Set(
            response.preferences.map(pref => pref.menuId)
          );
          
          const localOnlyItems = menuItems.filter(
            item => !backendItemIds.has(item.id)
          );
          
          // Combine and sort by order
          const combined = [...updatedItems, ...localOnlyItems]
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          
          setMenuItems(combined);
        }
      } catch (error) {
        console.error('Failed to load menu preferences from backend:', error);
        // Continue using localStorage if backend fails
      }
    };
    
    loadFromBackend();
  }, [user?.id]);

  // Check if a single item should be shown based on roles
  function filterItemByRoles(item: MenuItem, roles: string[]): boolean {
    // If no roles are specified for this menu item, allow access to everyone
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    
    // If user has no roles but item requires roles, deny access
    if (roles.length === 0) {
      return false;
    }
    
    // Check if the user has at least one of the required roles
    return item.roles.some(role => roles.includes(role));
  }

  // Filter menu items based on user roles
  function filterMenuItemsByRole(items: MenuItem[], roles: string[]): MenuItem[] {
    return items.filter(item => filterItemByRoles(item, roles));
  }

  // Add a new menu item
  const addMenuItem = (menuItem: MenuItem) => {
    setMenuItems(prev => {
      // Check if item with same ID already exists
      const exists = prev.some(item => item.id === menuItem.id);
      if (exists) {
        return prev;
      }
      
      const newItems = [...prev, menuItem];
      return newItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  };

  // Remove a menu item by ID
  const removeMenuItem = (id: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
  };

  // Update a menu item
  const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  // Reset to default menu
  const resetToDefault = () => {
    const filtered = filterMenuItemsByRole(defaultMenuItems, userRoles);
    setMenuItems(filtered);
  };

  // Toggle a menu item's visibility
  const toggleMenuVisibility = (id: string) => {
    setMenuItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isVisible: !item.isVisible } : item
      )
    );
  };

  // Reorder menu items
  const reorderMenuItems = (ids: string[]) => {
    setMenuItems(prev => {
      const itemMap = new Map(prev.map(item => [item.id, item]));
      
      // Create a new array with the specified order
      const reordered = ids
        .filter(id => itemMap.has(id))
        .map((id, index) => {
          const item = itemMap.get(id)!;
          return { ...item, order: index };
        });
      
      // Add any remaining items that weren't in the ids array
      const remainingItems = prev
        .filter(item => !ids.includes(item.id))
        .map(item => ({ ...item, order: ids.length + (item.order || 0) }));
      
      return [...reordered, ...remainingItems].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  };

  // Update local storage when menu items change
  useEffect(() => {
    try {
      // Create a serializable version of the menu items
      const serializableItems = menuItems.map(item => ({
        ...item,
        // Store icon as a string name
        iconName: Object.entries(iconMap).find(
          ([_, icon]) => icon === item.icon
        )?.[0] || 'Package',
        // Remove the actual icon component for serialization
        icon: undefined
      }));
      
      localStorage.setItem('userMenu', JSON.stringify(serializableItems));
      
      // Only save to backend if user is authenticated
      if (user?.id) {
        // Use a debounced save to avoid too many API calls
        const timeoutId = setTimeout(() => {
          menuService.saveMenuPreferences(menuItems)
            .catch(error => console.error('Error saving to backend:', error));
        }, 1000); // 1 second debounce
        
        return () => clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Failed to save menu to localStorage:', error);
    }
  }, [menuItems, user?.id]);

  return (
    <MenuContext.Provider
      value={{
        menuItems,
        setMenuItems,
        addMenuItem,
        removeMenuItem,
        updateMenuItem,
        resetToDefault,
        toggleMenuVisibility,
        reorderMenuItems
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};

export default MenuProvider;