import React, { useState } from 'react';
import { User, Lock, ArrowLeft, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/authService';

interface ForgotPasswordProps {
  onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState<'username' | 'mfa' | 'reset' | 'success'>('username');
  const [username, setUsername] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [tempToken, setTempToken] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handler for token expiration
  const handleTokenExpiration = (errorMessage: string) => {
    if (errorMessage.includes('Invalid or expired token')) {
      // Reset the form
      setError('Your session has expired. Please restart the password reset process.');
      setTimeout(() => {
        setStep('username');
        setUsername('');
        setMfaCode('');
        setNewPassword('');
        setConfirmPassword('');
        setUserId(null);
        setTempToken('');
        setMfaEnabled(false);
      }, 3000);
    } else {
      setError(errorMessage);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.forgotPasswordVerifyUsername(username);
      setUserId(response.userId);
      setTempToken(response.tempToken);
      setMfaEnabled(response.mfaEnabled);
      
      if (response.mfaEnabled) {
        setStep('mfa');
      } else {
        setStep('reset');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.forgotPasswordVerifyMfa(mfaCode, tempToken);
      setStep('reset');
    } catch (error: any) {
      handleTokenExpiration(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!userId) {
      setError('User ID not found');
      setIsLoading(false);
      return;
    }

    try {
      await authService.forgotPasswordReset({ userId, newPassword }, tempToken);
      setStep('success');
    } catch (error: any) {
      handleTokenExpiration(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={onBack}
          className={`mr-2 p-1 rounded-full transition ${
            isDarkMode 
              ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-2xl font-bold">Forgot Password</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700">
          {error}
        </div>
      )}

      {step === 'username' && (
        <>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Enter your username to start the password recovery process
          </p>
          <form onSubmit={handleUsernameSubmit} className="space-y-5">
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
                  placeholder="Enter your username"
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
            <button
              type="submit"
              className={`w-full py-2.5 rounded-md font-medium transition ${
                isDarkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Continue'}
            </button>
          </form>
        </>
      )}

      {step === 'mfa' && (
        <>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Enter the 6-digit code from your authenticator app
          </p>
          <form onSubmit={handleMfaSubmit} className="space-y-5">
            <div>
              <label htmlFor="mfaCode" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Authentication Code
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
                  maxLength={6}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className={`w-full py-2.5 rounded-md font-medium transition ${
                isDarkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </>
      )}

      {step === 'reset' && (
        <>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Create a new password for your account
          </p>
          <form onSubmit={handleResetSubmit} className="space-y-5">
            <div>
              <label htmlFor="newPassword" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                New Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} size={18} />
                <input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                    isDarkMode
                      ? 'bg-gray-900 border-gray-700 text-white focus:ring-indigo-500 placeholder-gray-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-indigo-500 placeholder-gray-400'
                  }`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} size={18} />
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                    isDarkMode
                      ? 'bg-gray-900 border-gray-700 text-white focus:ring-indigo-500 placeholder-gray-500'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-indigo-500 placeholder-gray-400'
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className={`w-full py-2.5 rounded-md font-medium transition ${
                isDarkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </>
      )}

      {step === 'success' && (
        <div className="text-center space-y-4">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            isDarkMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'
          }`}>
            <Check size={24} />
          </div>
          <h3 className="text-xl font-semibold">Password Reset Successful</h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <button
            onClick={onBack}
            className={`mt-4 w-full py-2.5 rounded-md font-medium transition ${
              isDarkMode 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            Return to Login
          </button>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword; 