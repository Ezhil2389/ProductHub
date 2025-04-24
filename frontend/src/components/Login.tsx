import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ForgotPassword from './ForgotPassword';
import GoogleButton from './GoogleButton';
import api from '../services/axiosConfig';

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, googleSignIn } = useAuth();
  const { isDarkMode } = useTheme();
  const [showReactivation, setShowReactivation] = useState(false);
  const [reactivationSuccess, setReactivationSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signIn(username, password, showMfaInput ? parseInt(mfaCode) : undefined);
    } catch (error: any) {
      if (error.message === 'MFA code required') {
        setShowMfaInput(true);
      } else if (
        error.message === 'Account expired. Click to reactivate.'
      ) {
        setShowReactivation(true);
      } else if (
        error.message === 'Account is locked due to too many failed login attempts. Please contact an administrator.' ||
        error.message === 'Account has been locked due to too many failed login attempts. Please contact an administrator.'
      ) {
        setError('Your account is locked due to too many failed login attempts. Please contact an administrator to unlock your account.');
      } else if (
        error.message === 'Invalid username or password' ||
        error.message === 'Bad credentials' // sometimes backend returns this
      ) {
        setError('Invalid username or password. Please try again.');
      } else {
        setError(error.message);
      }
    }
  };
  
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setError('');
      await googleSignIn(credentialResponse.credential);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  const handleReactivation = async () => {
    try {
      await api.put(`/users/reactivate/${username}`);
      setReactivationSuccess(true);
      setShowReactivation(false);
      setError('Account reactivated! Please log in again.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reactivate account.');
    }
  };

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className={`w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
      <p className={`mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Sign in to your account to continue
      </p>
      
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="username" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Username
          </label>
          <div className="relative">
            <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} size={18} />
            <input
              id="username"
              type="text"
              placeholder="username or email"
              className={`w-full pl-10 pr-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 text-white focus:ring-indigo-500 placeholder-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-indigo-500 placeholder-gray-400'
              }`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="password" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </label>
            <button
              type="button"
              className={`text-xs font-medium ${
                isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
              }`}
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} size={18} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className={`w-full pl-10 pr-10 py-2.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 text-white focus:ring-indigo-500 placeholder-gray-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-indigo-500 placeholder-gray-400'
              }`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'
              }`}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {showMfaInput && (
          <div>
            <label htmlFor="mfaCode" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              MFA Code
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} size={18} />
              <input
                id="mfaCode"
                type="text"
                placeholder="Enter 6-digit code"
                className={`w-full pl-10 pr-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                  isDarkMode
                    ? 'bg-gray-900 border-gray-700 text-white focus:ring-indigo-500 placeholder-gray-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-indigo-500 placeholder-gray-400'
                }`}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className={`w-full py-2.5 rounded-md font-medium transition ${
            isDarkMode 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          Sign in
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${
              isDarkMode ? 'border-gray-800' : 'border-gray-200'
            }`}></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className={`px-2 ${
              isDarkMode ? 'bg-gray-950 text-gray-500' : 'bg-white text-gray-500'
            }`}>Or continue with</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signin_with"
          />
        </div>

        <div className={`text-center text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Don't have an account?{' '}
          <button
            type="button"
            className={`font-medium transition ${
              isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
            }`}
            onClick={onSwitchToRegister}
          >
            Create an account
          </button>
        </div>
      </form>

      {showReactivation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-sm w-full text-center`}>
            <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">Account Expired</h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">Your account has expired. Click below to reactivate for another year.</p>
            <button
              onClick={handleReactivation}
              className="w-full py-2.5 rounded-md font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition mb-2"
            >
              Reactivate Account
            </button>
            <button
              onClick={() => setShowReactivation(false)}
              className="w-full py-2.5 rounded-md font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;