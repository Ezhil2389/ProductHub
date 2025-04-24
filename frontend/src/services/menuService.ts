import api from './axiosConfig';
import { MenuItem, iconMap } from '../contexts/MenuContext';

interface MenuPreferenceItem {
  menuId: string;
  visible: boolean;
  order: number;
  name?: string;
  path?: string;
  iconName?: string;
  badge?: string;
}

interface MenuPreferenceRequest {
  preferences: MenuPreferenceItem[];
}

interface MenuPreferenceResponse {
  preferences: MenuPreferenceItem[];
}

export const menuService = {
  // Get user's menu preferences from the backend
  getMenuPreferences: async (): Promise<MenuPreferenceResponse> => {
    try {
      const response = await api.get('/api/menu-preferences');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch menu preferences:', error);
      // If the API fails, return an empty object to fall back to localStorage
      return { preferences: [] };
    }
  },

  // Save user's menu preferences to the backend
  saveMenuPreferences: async (menuItems: MenuItem[]): Promise<void> => {
    try {
      // Convert menu items to the format expected by the API
      const preferences: MenuPreferenceItem[] = menuItems.map((item, index) => {
        // Extract iconName from icon property if not present
        let iconName = (item as any).iconName;
        if (!iconName && item.icon) {
          iconName = Object.entries(iconMap).find(([_name, icon]) => icon === item.icon)?.[0] || 'Package';
        }
        return {
          menuId: item.id,
          visible: !!item.isVisible,
          order: item.order || index,
          name: item.name,
          path: item.path,
          iconName,
          badge: item.badge
        };
      });

      await api.post('/api/menu-preferences', { preferences });
    } catch (error: any) {
      console.error('Failed to save menu preferences:', error);
      // Let the error propagate up so the UI can decide how to handle it
      throw new Error(error.response?.data?.message || 'Failed to save menu preferences');
    }
  }
}; 