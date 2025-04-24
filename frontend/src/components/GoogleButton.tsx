import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from '../contexts/ThemeContext';
import { FcGoogle } from 'react-icons/fc';

// Define props for the Google button component
interface GoogleButtonProps {
  onSuccess: (credentialResponse: any) => Promise<void>;
  onError: () => void;
  text: 'signin_with' | 'signup_with';
}

const GoogleButton: React.FC<GoogleButtonProps> = ({ onSuccess, onError, text }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className="relative w-full h-[42px] my-1">
      {/* Modern button overlay - pointer-events-none so clicks pass through */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className={`
          w-full h-full flex items-center justify-center gap-3 px-4
          rounded-lg border transition-all duration-200
          ${isDarkMode 
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-700/90' 
            : 'bg-white border-gray-300 hover:bg-gray-50/90'
          }
          shadow-sm hover:shadow
        `}>
          <FcGoogle className="w-5 h-5 flex-shrink-0" />
          <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
            {text === 'signin_with' ? 'Continue with Google' : 'Sign up with Google'}
          </span>
        </div>
      </div>

      {/* Actual Google button with opacity 0 but clickable */}
      <div className="opacity-0">
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          text={text}
          theme={isDarkMode ? "filled_black" : "outline"}
          size="large"
          width="100%"
          locale="en"
          shape="rectangular"
          useOneTap
        />
      </div>
    </div>
  );
};

export default GoogleButton; 