import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC<{ minimal?: boolean }> = ({ minimal = false }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  // For the minimal version (used in the dashboard sidebar)
  if (minimal) {
    return (
      <button
        onClick={toggleTheme}
        className={`relative p-2 rounded-lg transition-all duration-300 hover:scale-110 ${
          isDarkMode 
            ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' 
            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
        }`}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <div className="absolute inset-0 rounded-lg opacity-0 hover:opacity-20 transition-opacity bg-indigo-500"></div>
        <div className={`relative z-10 transform transition-transform duration-300 ${isDarkMode ? 'rotate-0' : '-rotate-90'}`}>
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </div>
      </button>
    );
  }

  // For the login/signup page (full version)
  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700' 
          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm'
      }`}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className={`flex items-center justify-center w-5 h-5 transition-transform duration-500 ${
        isDarkMode ? 'rotate-0 scale-100' : 'rotate-[360deg] scale-90'
      }`}>
        {isDarkMode ? (
          <Sun size={18} className="text-yellow-300" />
        ) : (
          <Moon size={18} className="text-indigo-600" />
        )}
      </div>
      <span className="text-sm font-medium whitespace-nowrap">
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </span>
    </button>
  );
};

export default ThemeToggle; 