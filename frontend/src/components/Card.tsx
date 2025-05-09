import React, { ReactNode } from 'react';

interface CardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  isDarkMode: boolean;
}

const Card: React.FC<CardProps> = ({ title, value, subtitle, icon, isDarkMode }) => {
  return (
    <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
      <div className="flex justify-between">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {title}
        </h3>
        {icon}
      </div>
      <div className="mt-2">
        <p className="text-3xl font-bold">
          {value}
        </p>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default Card; 