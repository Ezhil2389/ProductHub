import axios from 'axios';
import api from './axiosConfig';

const AUTH_URL = 'http://localhost:8080/api/auth';

export interface SignUpData {
  username: string;
  email: string;
  password: string;
  roles: string[];
}

interface SignInData {
  username: string;
  password: string;
  mfaCode?: number;
}

export interface AuthResponse {
  id?: number;
  username?: string;
  email?: string;
  roles?: string[];
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  mfaEnabled?: boolean;
  mfaRequired?: boolean;
  mfaSetupRequired?: boolean;
  profileImage?: string;
  message?: string;
}

interface MFASetupResponse {
  secretKey: string;
  qrCodeUrl: string;
  recoveryCodes: string[] | null;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

interface ApiError {
  message: string;
  status: number;
}

interface ForgotPasswordVerifyResponse {
  userId: number;
  mfaEnabled: boolean;
  tempToken: string;
}

interface PasswordResetData {
  userId: number;
  newPassword: string;
}

export const authService = {
  signUp: async (data: SignUpData): Promise<AuthResponse> => {
    try {
      console.log("API signup payload:", data);
      
      // Ensure the API endpoint can handle profile images properly
      const response = await api.post('/auth/signup', data);
      console.log("API signup response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API signup error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Sign up failed');
    }
  },

  signIn: async (data: SignInData): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/signin', data);
      if (data.mfaCode && response.data.token) {
        response.data.mfaEnabled = true;
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message === 'MFA code required') {
        throw new Error('MFA code required');
      }
      throw new Error(error.response?.data?.message || 'Sign in failed');
    }
  },

  googleSignIn: async (credential: string): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/google/signin', { credential });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Google sign in failed');
    }
  },

  googleSignUp: async (credential: string): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/google/signup', { credential });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Google sign up failed');
    }
  },

  signOut: async (token: string): Promise<{ message: string }> => {
    try {
      const response = await api.post('/auth/signout');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Sign out failed');
    }
  },

  setupMFA: async (token: string): Promise<MFASetupResponse> => {
    try {
      const response = await api.post('/auth/mfa/setup');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'MFA setup failed');
    }
  },

  verifyMFA: async (token: string, code: number): Promise<MFASetupResponse> => {
    try {
      const response = await api.post('/auth/mfa/verify', { code });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'MFA verification failed');
    }
  },

  disableMFA: async (token: string, code: number): Promise<{ message: string }> => {
    try {
      const response = await api.post('/auth/mfa/disable', { code });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'MFA disable failed');
    }
  },

  getUserData: async (token: string): Promise<AuthResponse> => {
    try {
      const response = await api.get('/auth/user-info');
      const userData = response.data;
      if (userData.mfaEnabled) {
        return {
          ...userData,
          mfaEnabled: true
        };
      }
      return {
        ...userData,
        mfaEnabled: false
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user data');
    }
  },

  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    try {
      await api.post('/users/password', data);
      return { message: 'Password changed successfully' };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || 'An error occurred';
        
        switch (status) {
          case 400:
            throw new Error('Invalid password format');
          case 401:
            throw new Error('Current password is incorrect');
          case 403:
            throw new Error('Not authorized to change password');
          default:
            throw new Error(message);
        }
      }
      throw new Error('Failed to connect to the server');
    }
  },

  forgotPasswordVerifyUsername: async (username: string): Promise<ForgotPasswordVerifyResponse> => {
    try {
      const response = await api.post('/auth/forgot-password/verify', { username });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Username verification failed');
    }
  },

  forgotPasswordVerifyMfa: async (code: string, tempToken: string): Promise<{ message: string }> => {
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${tempToken}`,
          'Content-Type': 'text/plain'
        }
      };
      const response = await api.post('/auth/forgot-password/mfa/verify', code, config);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid or expired token. Please restart the password reset process.');
      }
      throw new Error(error.response?.data?.message || 'MFA verification failed');
    }
  },

  forgotPasswordReset: async (data: PasswordResetData, tempToken: string): Promise<{ message: string }> => {
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${tempToken}`,
          'Content-Type': 'application/json'
        }
      };
      const response = await api.post('/auth/forgot-password/reset', data, config);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid or expired token. Please restart the password reset process.');
      }
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  }
}; 