import api from './axiosConfig';

export interface Role {
  id: number;
  name: string;
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';

export interface User {
  id: number;
  username: string;
  email: string;
  roles: Role[];
  mfaEnabled: boolean;
  status: UserStatus;
  statusReason?: string;
  profileImage?: string;
  accountExpiresAt?: string;
}

interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
}

interface AdminPasswordReset {
  newPassword: string;
}

interface RoleUpdate {
  roles: string[];
}

interface StatusUpdate {
  status: UserStatus;
  reason?: string;
}

interface ProfileImageUpdate {
  profileImage: string;
}

export const userService = {
  // Get all users (admin only)
  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  },

  // Get user by ID
  getUserById: async (id: number): Promise<User> => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user');
    }
  },

  // Update user password (only for the user themselves)
  updatePassword: async (id: number, data: PasswordUpdate): Promise<{ message: string }> => {
    try {
      const response = await api.put(`/users/${id}/password`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update password');
    }
  },

  // Admin reset user password
  resetPassword: async (id: number, data: AdminPasswordReset): Promise<{ message: string }> => {
    try {
      const response = await api.put(`/users/${id}/reset-password`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
  },

  // Update user roles (admin only)
  updateRoles: async (id: number, data: RoleUpdate): Promise<User> => {
    try {
      const response = await api.put(`/users/${id}/roles`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update roles');
    }
  },

  // Update user status (admin only)
  updateStatus: async (id: number, data: StatusUpdate): Promise<{ message: string }> => {
    try {
      const response = await api.put(`/users/${id}/status`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update user status');
    }
  },

  // Delete user (admin only)
  deleteUser: async (id: number): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete user');
    }
  },

  // Update user profile image
  updateProfileImage: async (id: number, data: ProfileImageUpdate): Promise<User> => {
    try {
      const response = await api.put(`/users/${id}/profile-image`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update profile image');
    }
  },

  // Admin unlock user account
  adminUnlockUser: async (userId: number, token: string): Promise<{ message: string }> => {
    try {
      const response = await api.post(`/auth/admin/unlock-account`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to unlock user account');
    }
  },

  // Reactivate expired user (admin only)
  reactivateUser: async (username: string): Promise<{ message: string }> => {
    try {
      const response = await api.put(`/users/reactivate/${username}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reactivate user');
    }
  },
}; 