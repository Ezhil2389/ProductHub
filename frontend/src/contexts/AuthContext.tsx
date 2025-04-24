import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  mfaEnabled: boolean;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (username: string, password: string, mfaCode?: number) => Promise<void>;
  signUp: (username: string, email: string, password: string, roles?: string[]) => Promise<void>;
  signOut: () => Promise<void>;
  setupMFA: () => Promise<{ secretKey: string; qrCodeUrl: string; recoveryCodes: string[] | null }>;
  verifyMFA: (code: number) => Promise<{ secretKey: string; qrCodeUrl: string | null; recoveryCodes: string[] | null }>;
  disableMFA: (code: number) => Promise<void>;
  googleSignIn: (credential: string) => Promise<void>;
  googleSignUp: (credential: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely parse JSON from localStorage
const getSavedState = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getSavedState('user'));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update localStorage when token or user changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          // If we have a token but no user info, try to restore from localStorage
          if (!user) {
            const savedUser = getSavedState('user');
            if (savedUser && savedUser.mfaEnabled !== undefined) {
              setUser(savedUser);
            } else {
              // Attempt to fetch user info using the token
              try {
                const userData = await authService.getUserData(token);
                if (userData.id && userData.username) {
                  const user: User = {
                    id: userData.id,
                    username: userData.username,
                    email: userData.email || '',
                    roles: userData.roles || [],
                    mfaEnabled: userData.mfaEnabled ?? false, // Use nullish coalescing to ensure a boolean value
                    profileImage: userData.profileImage
                  };
                  setUser(user);
                  localStorage.setItem('user', JSON.stringify(user));
                } else {
                  // Invalid user data
                  setToken(null);
                  localStorage.removeItem('token');
                }
              } catch (error) {
                console.error('Failed to fetch user data:', error);
                setToken(null);
                localStorage.removeItem('token');
              }
            }
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Auth initialization error:', error);
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsLoading(false);
        }
      } else {
        // If no token, make sure user is also null
        setUser(null);
        localStorage.removeItem('user');
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [token, user]);

  const signIn = async (username: string, password: string, mfaCode?: number) => {
    try {
      setError(null);
      const response = await authService.signIn({ username, password, mfaCode });
      
      if (response.token) {
        // If we got a token and MFA code was provided, or response indicates MFA is enabled,
        // ensure mfaEnabled is set to true
        const mfaEnabled = !!(mfaCode || response.mfaEnabled);
        
        const userData = {
          id: response.id!,
          username: response.username!,
          email: response.email!,
          roles: response.roles!,
          mfaEnabled, // Set MFA status based on the presence of MFA code or server response
          profileImage: response.profileImage
        };
        
        setToken(response.token);
        setUser(userData);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(userData));
      } else if (response.message === 'MFA code required') {
        throw new Error('MFA code required');
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const signUp = async (username: string, email: string, password: string, roles?: string[]) => {
    try {
      setError(null);
      await authService.signUp({ username, email, password, roles });
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (token) {
        await authService.signOut(token);
      }
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const setupMFA = async () => {
    if (!token) throw new Error('Not authenticated');
    return await authService.setupMFA(token);
  };

  const verifyMFA = async (code: number) => {
    if (!token) throw new Error('Not authenticated');
    const result = await authService.verifyMFA(token, code);
    
    // Update user with mfaEnabled status
    if (user) {
      const updatedUser = { ...user, mfaEnabled: true };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    return result;
  };

  const disableMFA = async (code: number) => {
    if (!token) throw new Error('Not authenticated');
    await authService.disableMFA(token, code);
    
    // Update user with mfaEnabled status
    if (user) {
      const updatedUser = { ...user, mfaEnabled: false };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const googleSignIn = async (credential: string) => {
    try {
      setError(null);
      const response = await authService.googleSignIn(credential);
      
      if (response.token) {
        const userData = {
          id: response.id!,
          username: response.username!,
          email: response.email!,
          roles: response.roles!,
          mfaEnabled: response.mfaEnabled || false,
          profileImage: response.profileImage
        };
        
        setToken(response.token);
        setUser(userData);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const googleSignUp = async (credential: string) => {
    try {
      setError(null);
      await authService.googleSignUp(credential);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    setupMFA,
    verifyMFA,
    disableMFA,
    googleSignIn,
    googleSignUp
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 