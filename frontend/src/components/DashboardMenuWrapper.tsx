import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import DynamicMenu from './DynamicMenu';
import { useMenu } from '../contexts/MenuContext';

const DashboardMenuWrapper: React.FC = () => {
  const [menuMounted, setMenuMounted] = useState(false);
  const { menuItems } = useMenu();

  // Find and replace the hardcoded menu with our dynamic menu
  useEffect(() => {
    const targetSelector = 'aside nav.space-y-1\\.5';
    const targetElement = document.querySelector(targetSelector);
    
    if (targetElement && !menuMounted) {
      // Hide the original menu
      targetElement.innerHTML = '';
      setMenuMounted(true);
    }
  }, [menuMounted]);

  // Keep checking for the menu element in case of navigation or component re-renders
  useEffect(() => {
    const intervalId = setInterval(() => {
      const targetSelector = 'aside nav.space-y-1\\.5';
      const targetElement = document.querySelector(targetSelector);
      
      if (targetElement && !menuMounted) {
        // Hide the original menu
        targetElement.innerHTML = '';
        setMenuMounted(true);
      }
    }, 500);
    
    return () => clearInterval(intervalId);
  }, [menuMounted]);

  // If the menu is mounted, render our dynamic menu in its place
  if (menuMounted) {
    const targetSelector = 'aside nav.space-y-1\\.5';
    const targetElement = document.querySelector(targetSelector);
    
    if (targetElement) {
      return createPortal(
        <DynamicMenu />,
        targetElement
      );
    }
  }
  
  return null;
};

export default DashboardMenuWrapper; 