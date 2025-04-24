import React, { useState, useEffect, useCallback } from 'react';
import { useMenu, MenuItem, iconMap } from '../contexts/MenuContext';
import { 
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DroppableProvided,
  DraggableProvided,
  DraggableStateSnapshot,
  DroppableProps,
  DroppableStateSnapshot,
  DragStart
} from 'react-beautiful-dnd';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  LucideIcon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// StrictModeDroppable is a wrapper around Droppable that works with React.StrictMode
// This is a workaround for a known issue with react-beautiful-dnd and React 18
const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Enable drag and drop after a short delay to avoid hydration issues in StrictMode
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};

interface MenuItemFormData {
  id: string;
  name: string;
  path: string;
  iconName: string;
  badge: string;
}

// Add this component for icon selection
const IconSelector = ({ 
  selectedIcon, 
  onSelect,
  isDarkMode
}: { 
  selectedIcon: string, 
  onSelect: (iconName: string) => void,
  isDarkMode: boolean
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  
  const iconEntries = Object.entries(iconMap);
  
  // Filter icons by search term
  const filteredIcons = searchTerm.trim() === '' 
    ? iconEntries 
    : iconEntries.filter(([name]) => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  
  // Limit displayed icons if not showing all
  const displayedIcons = showAll ? filteredIcons : filteredIcons.slice(0, 20);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search icons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
          } focus:ring-1 focus:ring-indigo-500 outline-none transition-colors`}
        />
      </div>
      
      <div className={`grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 rounded-lg ${isDarkMode ? 'scrollbar-dark' : 'scrollbar-light'}`}>
        {displayedIcons.map(([name, Icon]) => (
          <div
            key={name}
            onClick={() => onSelect(name)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer transition-all hover:scale-110 ${
              selectedIcon === name
                ? isDarkMode 
                    ? 'bg-indigo-700/50 text-indigo-300 ring-2 ring-indigo-500' 
                    : 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                : isDarkMode
                    ? 'hover:bg-gray-700/70 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-700'
            }`}
            title={name}
          >
            <Icon size={20} />
            <span className="text-xs truncate max-w-full mt-1">{name}</span>
          </div>
        ))}
      </div>
      
      {filteredIcons.length > 20 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className={`text-xs ${
            isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
          } underline`}
        >
          Show all {filteredIcons.length} icons
        </button>
      )}
      
      {showAll && (
        <button
          onClick={() => setShowAll(false)}
          className={`text-xs ${
            isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
          } underline`}
        >
          Show fewer icons
        </button>
      )}
    </div>
  );
};

const MenuSettings: React.FC = () => {
  const { 
    menuItems, 
    toggleMenuVisibility, 
    resetToDefault, 
    reorderMenuItems,
    addMenuItem,
    removeMenuItem,
    updateMenuItem
  } = useMenu();
  const { isDarkMode } = useTheme();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<MenuItemFormData>({
    id: '',
    name: '',
    path: '',
    iconName: 'Package',
    badge: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastMovedItem, setLastMovedItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update local items when menuItems change
  useEffect(() => {
    setItems(menuItems);
  }, [menuItems]);

  // On drag start handler
  const handleDragStart = (start: DragStart) => {
    setIsDragging(true);
    setSuccessMessage(null);
    
    // Create a subtle haptic feedback if browser supports it
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch (e) {
        // Ignore errors - vibration may not be supported or allowed
      }
    }
  };

  // Handle drag end event
  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    
    // If no destination or dropped at same spot, do nothing
    if (!result.destination || 
        (result.destination.index === result.source.index)) {
      return;
    }
    
    // Create a new array from items
    const reorderedItems = Array.from(items);
    
    // Remove the dragged item from its position
    const [removed] = reorderedItems.splice(result.source.index, 1);
    
    // Insert the dragged item at the new position
    reorderedItems.splice(result.destination.index, 0, removed);
    
    // Update our local state
    setItems(reorderedItems);

    // Show saving indicator
    setIsSaving(true);
    setLastMovedItem(removed.id);
    
    // Create a subtle haptic feedback on successful drop if browser supports it
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([20, 30, 20]);
      } catch (e) {
        // Ignore errors - vibration may not be supported or allowed
      }
    }
    
    // Update the global menu context
    reorderMenuItems(reorderedItems.map(item => item.id));
    
    // Hide saving indicator after a short delay
    setTimeout(() => {
      setIsSaving(false);
      setSuccessMessage("Menu order updated");
      
      // Clear the last moved item and success message after animation completes
      setTimeout(() => {
        setLastMovedItem(null);
        setTimeout(() => {
          setSuccessMessage(null);
        }, 1500);
      }, 700);
    }, 500);
  };

  // Toggle menu item visibility
  const handleToggleVisibility = (id: string) => {
    toggleMenuVisibility(id);
  };

  // Reset menu to default
  const handleResetToDefault = () => {
    resetToDefault();
    setShowConfirmReset(false);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditMode && editingItemId) {
      // Update existing item
      updateMenuItem(editingItemId, {
        name: formData.name,
        path: formData.path,
        icon: iconMap[formData.iconName] || iconMap.Package,
        badge: formData.badge
      });
      
      setIsEditMode(false);
      setEditingItemId(null);
    } else {
      // Add new item
      const newItem: MenuItem = {
        id: formData.id || `menu-${Date.now()}`,
        name: formData.name,
        path: formData.path,
        icon: iconMap[formData.iconName] || iconMap.Package,
        badge: formData.badge,
        isVisible: true,
        order: items.length
      };
      
      addMenuItem(newItem);
    }
    
    // Reset form
    setFormData({
      id: '',
      name: '',
      path: '',
      iconName: 'Package',
      badge: ''
    });
    
    setShowAddForm(false);
  };

  // Edit menu item
  const handleEditItem = (item: MenuItem) => {
    setIsEditMode(true);
    setEditingItemId(item.id);
    
    // Find the icon name from iconMap
    const iconName = Object.entries(iconMap).find(
      ([_, icon]) => icon === item.icon
    )?.[0] || 'Package';
    
    setFormData({
      id: item.id,
      name: item.name,
      path: item.path,
      iconName,
      badge: item.badge || ''
    });
    
    setShowAddForm(true);
  };

  // Delete menu item
  const handleDeleteItem = (id: string) => {
    removeMenuItem(id);
  };

  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl font-semibold flex items-center gap-2 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          <Settings className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} size={22} />
          Menu Settings
        </h2>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm ${
              isDarkMode 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
            }`}
          >
            <Plus size={16} />
            <span>Add Item</span>
          </button>
          
          <button
            onClick={() => setShowConfirmReset(true)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>
      </div>
      
      {/* Add/Edit Form */}
      {showAddForm && (
        <div className={`mb-6 p-4 rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-700 border-gray-600' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <h3 className={`text-lg font-medium mb-3 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            {isEditMode ? 'Edit Menu Item' : 'Add Menu Item'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Input */}
              <div>
                <label 
                  className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Display Name *
                </label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
                  } focus:ring-1 focus:ring-indigo-500 outline-none transition-colors`}
                />
              </div>
              
              {/* Path Input */}
              <div>
                <label 
                  className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Path/URL *
                </label>
                <input 
                  type="text"
                  name="path"
                  value={formData.path}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
                  } focus:ring-1 focus:ring-indigo-500 outline-none transition-colors`}
                />
              </div>
              
              {/* Badge Input */}
              <div>
                <label 
                  className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Badge Text (optional)
                </label>
                <input 
                  type="text"
                  name="badge"
                  value={formData.badge}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
                  } focus:ring-1 focus:ring-indigo-500 outline-none transition-colors`}
                />
              </div>
            </div>
            
            {/* Icon Selection Grid */}
            <div className="mt-4">
              <label 
                className={`block text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Select Icon
              </label>
              <IconSelector 
                selectedIcon={formData.iconName} 
                onSelect={(iconName) => setFormData(prev => ({ ...prev, iconName }))}
                isDarkMode={isDarkMode}
              />
            </div>
            
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setIsEditMode(false);
                  setEditingItemId(null);
                  setFormData({
                    id: '',
                    name: '',
                    path: '',
                    iconName: 'Package',
                    badge: ''
                  });
                }}
                className={`px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  isDarkMode 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                }`}
              >
                <Save size={16} />
                {isEditMode ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Instruction text for drag and drop */}
      <div className="mb-4">
        <div className={`flex items-center gap-2 p-3 rounded-lg border relative ${
          isDarkMode ? 'bg-gray-700/50 text-gray-200 border-gray-600' : 'bg-indigo-50 text-indigo-800 border-indigo-100'
        }`}>
          <GripVertical size={18} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
          <span className="text-sm">
            <span className="font-medium">Drag and drop</span> menu items using the handle (<GripVertical size={14} className="inline-block mx-1" />) to reorder them. 
            Changes are saved automatically.
          </span>
          
          {isSaving && (
            <div className="absolute right-3 top-3 flex items-center gap-2 text-xs">
              <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
              <span className={isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}>Saving changes...</span>
            </div>
          )}
          
          {successMessage && !isSaving && (
            <div className="absolute right-3 top-3 flex items-center gap-2 text-xs animate-fade-in">
              <CheckCircle size={16} className={isDarkMode ? 'text-green-400' : 'text-green-500'} />
              <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>{successMessage}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* DragDropContext for menu items */}
      <DragDropContext 
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <StrictModeDroppable droppableId="menu-items">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`rounded-lg border transition-all duration-300 ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              } ${snapshot.isDraggingOver 
                  ? isDarkMode 
                    ? 'bg-indigo-900/20 border-indigo-500/40 shadow-lg' 
                    : 'bg-indigo-50 border-indigo-300 shadow-lg' 
                  : ''
              }`}
            >
              {items.length === 0 ? (
                <div 
                  className={`p-6 text-center ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  No menu items found. Add some items to get started.
                </div>
              ) : (
                items.map((item, index) => (
                  <Draggable 
                    key={item.id} 
                    draggableId={item.id} 
                    index={index}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`p-3 flex items-center gap-3 border-b last:border-b-0 draggable-item transition-all duration-300 ${
                          isDarkMode ? 'border-gray-700' : 'border-gray-200'
                        } ${
                          dragSnapshot.isDragging 
                            ? `${isDarkMode ? 'bg-gray-700' : 'bg-indigo-50'} shadow-lg rounded-lg border-0 dragging scale-[1.02]` 
                            : isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
                        } ${
                          lastMovedItem === item.id 
                            ? isDarkMode 
                                ? 'bg-indigo-900/20 animate-pulse-once' 
                                : 'bg-green-50 animate-pulse-once'
                            : ''
                        }`}
                        style={{
                          ...dragProvided.draggableProps.style,
                          transition: dragSnapshot.isDragging 
                            ? 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' 
                            : 'background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease'
                        }}
                      >
                        <div 
                          {...dragProvided.dragHandleProps}
                          className={`cursor-grab flex items-center justify-center p-2.5 rounded-lg drag-handle transition-all duration-300 ${
                            isDarkMode 
                              ? 'bg-gray-700 hover:bg-indigo-700/30 text-gray-400 hover:text-indigo-300 hover:scale-110' 
                              : 'bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 hover:scale-110'
                          } ${
                            dragSnapshot.isDragging 
                              ? isDarkMode 
                                ? 'cursor-grabbing bg-indigo-700/40 text-indigo-300 shadow-inner scale-110' 
                                : 'cursor-grabbing bg-indigo-200 text-indigo-700 shadow-inner scale-110' 
                              : ''
                          }`}
                          title="Drag to reorder"
                        >
                          <GripVertical 
                            size={20}
                            className={`${dragSnapshot.isDragging ? 'rotate-12 transition-transform duration-300' : ''}`}
                          />
                        </div>
                        
                        <div 
                          className={`p-2 rounded-lg ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                          } ${
                            dragSnapshot.isDragging 
                              ? isDarkMode ? 'bg-gray-600' : 'bg-indigo-100'
                              : ''
                          }`}
                        >
                          {React.createElement(item.icon, { size: 18 })}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium truncate ${
                            isDarkMode ? 'text-white' : 'text-gray-800'
                          }`}>
                            {item.name}
                          </h4>
                          <p className={`text-xs truncate ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {item.path}
                          </p>
                        </div>
                        
                        {item.badge && (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleVisibility(item.id)}
                            className={`p-1.5 rounded ${
                              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                            title={item.isVisible ? 'Hide menu item' : 'Show menu item'}
                          >
                            {item.isVisible ? (
                              <Eye 
                                size={18} 
                                className={isDarkMode ? 'text-green-400' : 'text-green-600'} 
                              />
                            ) : (
                              <EyeOff 
                                size={18} 
                                className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} 
                              />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleEditItem(item)}
                            className={`p-1.5 rounded ${
                              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                            title="Edit menu item"
                          >
                            <Settings 
                              size={18} 
                              className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} 
                            />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className={`p-1.5 rounded ${
                              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                            title="Delete menu item"
                          >
                            <Trash2 
                              size={18} 
                              className={isDarkMode ? 'text-red-400' : 'text-red-600'} 
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>
      
      {/* Confirm Reset Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-sm p-6 rounded-lg ${
            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
          }`}>
            <h3 className="text-lg font-medium mb-3">Reset Menu?</h3>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              This will reset all menu items to their default state. Any custom items will be lost.
            </p>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className={`px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              
              <button
                onClick={handleResetToDefault}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={`mt-4 p-4 rounded-lg ${
        isDarkMode ? 'bg-gray-750 text-gray-300' : 'bg-gray-50 text-gray-600'
      }`}>
        <div className="flex items-start gap-2">
          <div className="p-1 mt-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/70 dark:text-indigo-300">
            <ChevronRight size={16} />
          </div>
          <div>
            <p className="text-sm">
              Changes to menu items are saved automatically and will affect your navigation immediately. Hidden items won't appear in the sidebar but remain accessible via direct URL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuSettings;