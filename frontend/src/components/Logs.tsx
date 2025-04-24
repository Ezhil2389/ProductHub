import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ApplicationLogs from './ApplicationLogs';

const Logs: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Application Logs
        </h1>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <ApplicationLogs 
          isDarkMode={isDarkMode} 
          showFilters={true} 
        />
      </div>
    </div>
  );
};

export default Logs; 