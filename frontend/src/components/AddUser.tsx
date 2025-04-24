import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserIcon, 
  Shield, 
  Mail, 
  Lock, 
  AlertCircle, 
  Check,
  ArrowLeft,
  Upload
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/authService';
import { ProfileImageUploader } from './Dashboard';
import { userService } from '../services/userService';

const AddUser: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>();
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form validation
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    
    // Username validation
    if (!username.trim()) {
      setUsernameError('Username is required');
      isValid = false;
    } else if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      isValid = false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    
    // Password validation
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    }
    
    // Confirm password validation
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }
    
    return isValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare roles array
      const roles = isAdmin ? ['admin', 'user'] : ['user'];
      
      // First create the user without profile image
      const userData = {
        username,
        email,
        password,
        roles
      };
      
      console.log("Creating user:", userData);
      
      // Call the signUp method from authService
      const response = await authService.signUp(userData);
      console.log("Signup response:", response);
      
      // If we have a profile image and the user was created successfully
      if (profileImage && response) {
        try {
          console.log("Adding profile image for new user");
          // Try to get the user ID from different possible response formats
          let userId: number | undefined = undefined;
          
          if (response.id) {
            userId = response.id;
          } else if (response.hasOwnProperty('user') && (response as any).user?.id) {
            userId = (response as any).user.id;
          } else if (typeof response === 'string') {
            // Handle string response format
            const responseText = response as unknown as string;
            if (responseText.includes('id:')) {
              const idMatch = responseText.match(/id:(\d+)/);
              if (idMatch && idMatch[1]) {
                userId = parseInt(idMatch[1]);
              }
            }
          }
          
          if (userId) {
            // Update the user with the profile image
            await userService.updateProfileImage(userId, { profileImage });
            console.log("Profile image added successfully");
          } else {
            // Fallback: attempt to get the newly created user by username
            console.log("No user ID in response, fetching user by username");
            try {
              // Wait a moment for the backend to finish processing
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Find the user through the users list
              const users = await userService.getAllUsers();
              const createdUser = users.find(u => u.username === username);
              
              if (createdUser && createdUser.id) {
                console.log("Found user by username:", createdUser.username, "ID:", createdUser.id);
                await userService.updateProfileImage(createdUser.id, { profileImage });
                console.log("Profile image added successfully with fallback method");
              } else {
                console.error("Could not find the newly created user by username");
              }
            } catch (fallbackError) {
              console.error("Fallback method failed:", fallbackError);
            }
          }
        } catch (imageError: any) {
          console.error("Failed to add profile image:", imageError);
          // Don't fail the whole operation if just the image upload fails
        }
      }
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setIsAdmin(false);
      setProfileImage(undefined);
      
      // After 2 seconds, redirect back to team members page
      setTimeout(() => {
        navigate('/dashboard/team');
      }, 2000);
      
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard/team')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'text-gray-300 hover:bg-gray-800' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft size={18} />
            <span>Back to Team Members</span>
          </button>
        </div>
        
        <div className={`rounded-xl overflow-hidden shadow-sm ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300'
        }`}>
          <div className={`px-6 py-4 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <UserIcon className={`h-5 w-5 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`} />
              </div>
              <h1 className="text-xl font-semibold">Add New User</h1>
            </div>
          </div>
          
          <div className="p-6">
            {success ? (
              <div className={`p-4 mb-6 rounded-lg flex items-center gap-3 ${
                isDarkMode 
                  ? 'bg-green-900/20 border border-green-900/30 text-green-300' 
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}>
                <Check className="flex-shrink-0" />
                <div>
                  <p className="font-medium">User created successfully!</p>
                  <p className="text-sm opacity-90">Redirecting back to team members list...</p>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className={`p-4 mb-6 rounded-lg flex items-center gap-3 ${
                    isDarkMode 
                      ? 'bg-red-900/20 border border-red-900/30 text-red-300' 
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    <AlertCircle className="flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="mb-6">
                    <label 
                      className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Profile Image (Optional)
                    </label>
                    <div className="flex justify-center">
                      <ProfileImageUploader
                        currentImage={profileImage}
                        onImageChange={setProfileImage}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                    <p className={`mt-2 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Drag & drop an image or click to upload
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username field */}
                    <div>
                      <label 
                        htmlFor="username" 
                        className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Username
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <UserIcon size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                        </div>
                        <input
                          type="text"
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-700 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } ${usernameError ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder="Enter username"
                        />
                      </div>
                      {usernameError && (
                        <p className={`mt-1 text-sm text-red-500`}>{usernameError}</p>
                      )}
                    </div>
                    
                    {/* Email field */}
                    <div>
                      <label 
                        htmlFor="email" 
                        className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Mail size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                        </div>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-700 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } ${emailError ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder="Enter email address"
                        />
                      </div>
                      {emailError && (
                        <p className={`mt-1 text-sm text-red-500`}>{emailError}</p>
                      )}
                    </div>
                    
                    {/* Password field */}
                    <div>
                      <label 
                        htmlFor="password" 
                        className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Lock size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                        </div>
                        <input
                          type="password"
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-700 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } ${passwordError ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder="Enter password"
                        />
                      </div>
                      {passwordError && (
                        <p className={`mt-1 text-sm text-red-500`}>{passwordError}</p>
                      )}
                    </div>
                    
                    {/* Confirm Password field */}
                    <div>
                      <label 
                        htmlFor="confirmPassword" 
                        className={`block text-sm font-medium mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Lock size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                        </div>
                        <input
                          type="password"
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-700 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } ${confirmPasswordError ? 'border-red-500 focus:ring-red-500' : ''}`}
                          placeholder="Confirm password"
                        />
                      </div>
                      {confirmPasswordError && (
                        <p className={`mt-1 text-sm text-red-500`}>{confirmPasswordError}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Admin role checkbox */}
                  <div className="mt-4">
                    <div className="flex items-center">
                      <input
                        id="isAdmin"
                        type="checkbox"
                        checked={isAdmin}
                        onChange={(e) => setIsAdmin(e.target.checked)}
                        className={`h-5 w-5 rounded border focus:ring-purple-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-purple-500' 
                            : 'bg-white border-gray-300 text-purple-600'
                        }`}
                      />
                      <label 
                        htmlFor="isAdmin" 
                        className="ml-2 flex items-center gap-2"
                      >
                        <Shield size={16} className={`${isAdmin ? 'text-purple-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Grant Admin Privileges
                        </span>
                      </label>
                    </div>
                    <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Admin users can manage team members, update system settings, and have full access to all features.
                    </p>
                  </div>
                  
                  {/* Password strength indicator (if password exists) */}
                  {password && (
                    <div className="mt-4">
                      <div className="flex justify-between mb-1">
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Password Strength
                        </span>
                        <span className={`text-xs font-medium ${
                          password.length >= 8 
                            ? isDarkMode ? 'text-green-400' : 'text-green-600'
                            : isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`}>
                          {password.length < 4 
                            ? 'Weak' 
                            : password.length < 8 
                              ? 'Fair' 
                              : password.length < 12 
                                ? 'Good' 
                                : 'Strong'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            password.length < 4 
                              ? 'bg-red-500 w-1/4' 
                              : password.length < 8 
                                ? 'bg-yellow-500 w-2/4' 
                                : password.length < 12 
                                  ? 'bg-blue-500 w-3/4' 
                                  : 'bg-green-500 w-full'
                          }`}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Submit button */}
                  <div className="flex justify-end mt-6">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                        isDarkMode 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                      } disabled:opacity-70 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                          <span>Creating User...</span>
                        </>
                      ) : (
                        <>
                          <UserIcon size={18} />
                          <span>Create User</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUser; 