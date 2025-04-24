import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import GoogleButton from './GoogleButton';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { signUp, googleSignUp } = useAuth();
  const { isDarkMode } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await signUp(username, email, password);
      onSwitchToLogin();
    } catch (error: any) {
      setError(error.message);
    }
  };
  
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setError('');
      await googleSignUp(credentialResponse.credential);
      onSwitchToLogin(); // Redirect to login after successful signup
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-up failed. Please try again.');
  };

  return (
    <div className={`w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <h2 className="text-2xl font-bold mb-1">Create an account</h2>
      <p className={`mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Join the product management community
      </p>
      
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="username" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Full Name
          </label>
          <div className="relative">
            <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} size={18} />
            <input
              id="username"
              type="text"
              placeholder="John Doe"
              className={`w-full pl-10 pr-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 text-white focus:ring-indigo-500 placeholder-gray-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-indigo-500 placeholder-gray-400'
              }`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Work Email
          </label>
          <div className="relative">
            <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} size={18} />
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              className={`w-full pl-10 pr-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 text-white focus:ring-indigo-500 placeholder-gray-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-indigo-500 placeholder-gray-400'
              }`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={50}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Password
          </label>
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
                  : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-indigo-500 placeholder-gray-400'
              }`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              maxLength={40}
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
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className={`w-full pl-10 pr-10 py-2.5 rounded-md border focus:outline-none focus:ring-2 transition ${
                isDarkMode
                  ? 'bg-gray-900 border-gray-700 text-white focus:ring-indigo-500 placeholder-gray-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 focus:ring-indigo-500 placeholder-gray-400'
              }`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              maxLength={40}
            />
            <button
              type="button"
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'
              }`}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <input 
            id="terms" 
            type="checkbox" 
            className={`h-4 w-4 rounded border focus:ring-0 ${
              isDarkMode ? 'bg-gray-800 border-gray-700 text-indigo-500' : 'bg-gray-50 border-gray-300 text-indigo-600'
            }`} 
          />
          <label htmlFor="terms" className={`ml-2 text-sm ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            I agree to the <a href="#" className={isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}>Terms</a> and <a href="#" className={isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}>Privacy Policy</a>
          </label>
        </div>

        <button
          type="submit"
          className={`w-full py-2.5 rounded-md font-medium transition ${
            isDarkMode 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          Create account
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
            }`}>Or sign up with</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signup_with"
          />
        </div>

        <div className={`text-center text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Already have an account?{' '}
          <button
            type="button"
            className={`font-medium transition ${
              isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
            }`}
            onClick={onSwitchToLogin}
          >
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
};

export default Register;