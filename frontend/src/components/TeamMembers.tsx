import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Shield, 
  Edit, 
  Trash2, 
  Search, 
  Plus, 
  Lock, 
  X, 
  CheckCircle, 
  AlertCircle, 
  ShieldOff, 
  Filter,
  Key
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { userService, User, UserStatus, Role } from '../services/userService';
import { useNavigate } from 'react-router-dom';

// Helper component to display user avatars
const UserAvatar = ({ user, size = 'medium', isDarkMode }: { 
  user: User, 
  size?: 'small' | 'medium' | 'large',
  isDarkMode: boolean 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };
  
  const iconSizes = {
    small: 16,
    medium: 24,
    large: 32
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden ${
      !user.profileImage ? 
        isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600' 
        : ''
    }`}>
      {user.profileImage ? (
        <img 
          src={user.profileImage} 
          alt={`${user.username}'s avatar`} 
          className="w-full h-full object-cover"
        />
      ) : (
        <UserIcon size={iconSizes[size]} />
      )}
    </div>
  );
};

const TeamMembers: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user: currentUser, token } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');

  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [userToUpdateRoles, setUserToUpdateRoles] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [userToUpdateStatus, setUserToUpdateStatus] = useState<User | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');

  // Add state for unblock loading and error
  const [unblockLoadingId, setUnblockLoadingId] = useState<number | null>(null);
  const [unblockError, setUnblockError] = useState<string | null>(null);
  const [unblockSuccess, setUnblockSuccess] = useState<string | null>(null);

  // Add state for reactivation loading
  const [reactivateLoadingId, setReactivateLoadingId] = useState<number | null>(null);
  const [reactivateError, setReactivateError] = useState<string | null>(null);
  const [reactivateSuccess, setReactivateSuccess] = useState<string | null>(null);

  // Check if user is an admin
  const isAdmin = currentUser?.roles.some(role => 
    role === 'ROLE_ADMIN' || role === 'ADMIN'
  );

  // Fetch users
  const fetchUsers = async () => {
    if (!isAdmin) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedUsers = await userService.getAllUsers();
      setUsers(fetchedUsers);
      applyFilters(fetchedUsers);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  // Apply filters and search
  const applyFilters = (usersList: User[] = users) => {
    let filtered = [...usersList];
    
    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }
    
    setFilteredUsers(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, users]);

  // User actions
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsLoading(true);
    setError(null);
    
    try {
      await userService.deleteUser(userToDelete.id);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = (user: User) => {
    setUserToResetPassword(user);
    setNewPassword('');
    setShowPasswordResetModal(true);
  };

  const confirmResetPassword = async () => {
    if (!userToResetPassword || !newPassword) return;

    setIsLoading(true);
    setError(null);
    
    try {
      await userService.resetPassword(userToResetPassword.id, { newPassword });
      setShowPasswordResetModal(false);
      setUserToResetPassword(null);
      setNewPassword('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRoles = (user: User) => {
    setUserToUpdateRoles(user);
    setSelectedRoles(user.roles.map(role => role.name.replace('ROLE_', '').toLowerCase()));
    setShowRolesModal(true);
  };

  const confirmUpdateRoles = async () => {
    if (!userToUpdateRoles) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const updatedUser = await userService.updateRoles(userToUpdateRoles.id, { roles: selectedRoles });
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      setShowRolesModal(false);
      setUserToUpdateRoles(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = (user: User) => {
    setUserToUpdateStatus(user);
    setSelectedStatus(user.status);
    setStatusReason('');
    setShowStatusModal(true);
  };

  const confirmUpdateStatus = async () => {
    if (!userToUpdateStatus) return;

    setIsLoading(true);
    setError(null);
    
    try {
      await userService.updateStatus(userToUpdateStatus.id, { 
        status: selectedStatus,
        reason: statusReason || undefined
      });
      
      // Update local state
      const updatedUser = { ...userToUpdateStatus, status: selectedStatus };
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      setShowStatusModal(false);
      setUserToUpdateStatus(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Unblock user handler
  const handleUnblockUser = async (userId: number) => {
    setUnblockLoadingId(userId);
    setUnblockError(null);
    setUnblockSuccess(null);
    try {
      await userService.updateStatus(userId, { status: 'ACTIVE' });
      setUsers(users => users.map(u => u.id === userId ? { ...u, status: 'ACTIVE' } : u));
      setUnblockSuccess('User account has been unlocked.');
      setTimeout(() => setUnblockSuccess(null), 2000);
    } catch (err: any) {
      setUnblockError(err.message || 'Failed to unlock user.');
      setTimeout(() => setUnblockError(null), 3000);
    } finally {
      setUnblockLoadingId(null);
    }
  };

  // Helper to check if user is expired (status ACTIVE but accountExpiresAt in the past)
  const isUserExpired = (user: User) => {
    // If backend adds accountExpiresAt to user object, use it here
    // For now, assume user.accountExpiresAt exists and is ISO string
    if (!user.accountExpiresAt) return false;
    return new Date(user.accountExpiresAt) < new Date();
  };

  const handleReactivateUser = async (user: User) => {
    setReactivateLoadingId(user.id);
    setReactivateError(null);
    try {
      await userService.reactivateUser(user.username);
      setReactivateSuccess(`User ${user.username} reactivated!`);
      await fetchUsers();
    } catch (err: any) {
      setReactivateError(err.message);
    } finally {
      setReactivateLoadingId(null);
    }
  };

  // Helper functions
  const getUserStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded bg-green-100 text-green-800">
            <CheckCircle size={14} />
            Active
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
            <AlertCircle size={14} />
            Suspended
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded bg-red-100 text-red-800">
            <ShieldOff size={14} />
            Blocked
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleBadges = (roles: Role[]) => {
    return roles.map(role => {
      const roleName = role.name.replace('ROLE_', '');
      const isAdmin = roleName.toLowerCase() === 'admin';
      
      return (
        <span 
          key={role.id} 
          className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
            isAdmin 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {isAdmin && <Shield size={12} />}
          {roleName}
        </span>
      );
    });
  };

  // If not admin, don't show this component
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Shield size={48} className="text-gray-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
        <p className="text-gray-500 max-w-md">
          You need administrator privileges to access the team management section.
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header Section - Improved with better spacing and modern styling */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
              <UserIcon className={`h-6 w-6 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Team Members</h1>
            {isAdmin && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">Admin</span>
            )}
          </div>
          
          {/* User Management Controls */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate('/dashboard/team/add-user')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all shadow-sm
                  ${isDarkMode ? 
                    'bg-purple-600 hover:bg-purple-700 text-white' : 
                    'bg-purple-500 hover:bg-purple-600 text-white'
                  } font-medium`}
              >
                <Plus className="h-4 w-4" />
                <span>Add User</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Search and Filter Section - Improved styling */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className={`flex-grow flex items-center rounded-lg overflow-hidden shadow-sm ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="px-3">
              <Search className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-grow px-2 py-3 border-none focus:ring-0 ${
                isDarkMode ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>
          
          <div className="flex gap-2">
            <div className={`relative rounded-lg overflow-hidden shadow-sm ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'ALL')}
                className={`appearance-none pl-10 pr-8 py-3 rounded-lg border-none focus:ring-0 ${
                  isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                }`}
              >
                <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BLOCKED">Blocked</option>
          </select>
              <div className="absolute top-0 left-0 h-full flex items-center pl-3 pointer-events-none">
                <Filter className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            </div>
        </div>
      </div>
      
      {error && (
          <div className={`p-4 mb-6 rounded-lg flex items-center gap-3 ${
            isDarkMode ? 'bg-red-900/20 border border-red-900/30 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <AlertCircle className="flex-shrink-0" />
            <p>{error}</p>
        </div>
      )}
      
        {/* Users List */}
        <div className={`rounded-xl overflow-hidden shadow-sm ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300'
        }`}>
          <div className={`px-6 py-4 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-300'
          }`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Users {filteredUsers.length > 0 && <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">({filteredUsers.length})</span>}
            </h2>
          </div>
          
      {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent mx-auto mb-4"></div>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <UserIcon className={`h-8 w-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                No users found
              </h3>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                {searchQuery || statusFilter !== 'ALL' 
                  ? 'Try adjusting your filters or search terms' 
                  : isAdmin ? 'Add your first team member to get started' : 'No team members to display'}
              </p>
        </div>
      ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDarkMode ? 'bg-gray-750' : 'bg-gray-50 border-b border-gray-300'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                  User
                </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                  Status
                </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                  Roles
                </th>
                    <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                  Actions
                </th>
              </tr>
            </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredUsers.map((user) => (
                    <tr key={user.id} className={isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="mr-3">
                        <UserAvatar 
                          user={user} 
                          size="small" 
                          isDarkMode={isDarkMode} 
                        />
                      </div>
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {user.username}
                        </div>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getUserStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                      {getRoleBadges(user.roles)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-2">
                            {/* Reactivate button for expired users - leftmost */}
                            {isAdmin && isUserExpired(user) && (
                              <button
                                onClick={() => handleReactivateUser(user)}
                                className={`p-1.5 rounded-md ${
                                  isDarkMode ? 'text-green-400 hover:bg-green-900/30 hover:text-green-300' : 'text-green-600 hover:bg-green-100 hover:text-green-800'
                                }`}
                                title="Reactivate User"
                                disabled={reactivateLoadingId === user.id}
                              >
                                {reactivateLoadingId === user.id ? (
                                  <span className="animate-spin">⏳</span>
                                ) : (
                                  <CheckCircle size={18} />
                                )}
                              </button>
                            )}
                            {/* Unblock button always visible, only enabled if blocked */}
                            <button
                              onClick={() => handleUnblockUser(user.id)}
                              className={`p-1.5 rounded-md ${
                                user.status === 'BLOCKED'
                                  ? isDarkMode ? 'text-green-400 hover:bg-green-900/30 hover:text-green-300' : 'text-green-600 hover:bg-green-100 hover:text-green-800'
                                  : isDarkMode ? 'text-gray-700 bg-gray-800 cursor-not-allowed' : 'text-gray-300 bg-gray-100 cursor-not-allowed'
                              }`}
                              title="Unblock User"
                              disabled={user.status !== 'BLOCKED' || unblockLoadingId === user.id}
                            >
                              {unblockLoadingId === user.id ? (
                                <span className="animate-spin">🔓</span>
                              ) : (
                                <ShieldOff size={18} />
                              )}
                            </button>
                            <button
                              onClick={() => handleUpdateRoles(user)}
                              className={`p-1.5 rounded-md ${
                                isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                              title="Update Roles"
                            >
                              <Shield size={18} />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(user)}
                              className={`p-1.5 rounded-md ${
                                isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                              title="Update Status"
                            >
                              {user.status === 'ACTIVE' 
                                ? <UserIcon size={18} /> 
                                : <AlertCircle size={18} />
                              }
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              className={`p-1.5 rounded-md ${
                                isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                              title="Reset Password"
                            >
                              <Key size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className={`p-1.5 rounded-md ${
                                isDarkMode ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300' : 'text-red-500 hover:bg-red-100 hover:text-red-700'
                              }`}
                              title="Delete User"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-xl shadow-xl ${
            isDarkMode ? 'bg-gray-900' : 'bg-white border border-gray-300'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Confirm Delete
              </h2>
              <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Are you sure you want to delete user <span className="font-semibold">{userToDelete.username}</span>?
                This action cannot be undone.
              </p>
              <div className="mt-2 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                <p className="font-medium">Note:</p>
                <p>All data associated with this user (products, logs, etc.) will remain but will be unassociated.</p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-70"
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Password Reset Modal */}
      {showPasswordResetModal && userToResetPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 ${
            isDarkMode ? 'bg-gray-900' : 'bg-white border border-gray-300'
          }`}>
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400`}>
                  <Key size={20} />
                </div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Reset Password
              </h2>
              </div>
              <button 
                onClick={() => setShowPasswordResetModal(false)}
                className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
              >
                <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <UserAvatar 
                  user={userToResetPassword} 
                  size="medium" 
                  isDarkMode={isDarkMode}
                />
                <div>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {userToResetPassword.username}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {userToResetPassword.email}
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className={`p-4 rounded-lg mb-5 bg-blue-900/20 border border-blue-800/30 dark:bg-blue-900/20 dark:border-blue-800/30 ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-800'
                }`}>
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      <Lock size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                    </div>
                    <div>
                      <p className="text-sm">
                        Setting a new password will immediately log out the user from all devices. 
                        They will need to use this new password for their next login.
                      </p>
                    </div>
                  </div>
                </div>
                
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                  </div>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
                {newPassword && (
                  <div className="mt-4">
                    <div className="flex justify-between mb-1">
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Password Strength
                      </span>
                      <span className={`text-xs font-medium ${
                        newPassword.length >= 8 
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {newPassword.length >= 8 ? 'Good' : 'Too Short'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          newPassword.length < 4 
                            ? 'bg-red-500 w-1/4' 
                            : newPassword.length < 8 
                              ? 'bg-yellow-500 w-2/4' 
                              : newPassword.length < 12 
                                ? 'bg-blue-500 w-3/4' 
                                : 'bg-green-500 w-full'
                        }`}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPasswordResetModal(false)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResetPassword}
                  disabled={!newPassword || isLoading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-70`}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Role Update Modal */}
      {showRolesModal && userToUpdateRoles && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 ${
            isDarkMode ? 'bg-gray-900' : 'bg-white border border-gray-300'
          }`}>
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedRoles.includes('admin')
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  <Shield size={20} />
                </div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Update User Roles
              </h2>
              </div>
              <button 
                onClick={() => setShowRolesModal(false)}
                className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
              >
                <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <UserAvatar 
                  user={userToUpdateRoles} 
                  size="medium" 
                  isDarkMode={isDarkMode}
                />
                <div>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {userToUpdateRoles.username}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {userToUpdateRoles.email}
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Assign Roles
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRoles.includes('user')) {
                        setSelectedRoles(selectedRoles.filter(r => r !== 'user'));
                      } else {
                        setSelectedRoles([...selectedRoles, 'user']);
                      }
                    }}
                    className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                      selectedRoles.includes('user')
                        ? isDarkMode 
                          ? 'border-blue-500 bg-blue-900/20' 
                          : 'border-blue-500 bg-blue-50'
                        : isDarkMode
                          ? 'border-gray-700 bg-gray-800 hover:border-blue-500/50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className={`w-10 h-10 mr-3 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <UserIcon size={20} />
                    </div>
                    <div className="text-left">
                      <span className={`block font-medium ${
                        selectedRoles.includes('user')
                          ? isDarkMode ? 'text-blue-400' : 'text-blue-700'
                          : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        User
                      </span>
                      <span className={`block text-xs mt-0.5 ${
                        selectedRoles.includes('user')
                          ? isDarkMode ? 'text-blue-300/70' : 'text-blue-600/70'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Basic access
                      </span>
                </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedRoles.includes('admin')) {
                        setSelectedRoles(selectedRoles.filter(r => r !== 'admin'));
                      } else {
                        setSelectedRoles([...selectedRoles, 'admin']);
                      }
                    }}
                    className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                      selectedRoles.includes('admin')
                        ? isDarkMode 
                          ? 'border-purple-500 bg-purple-900/20' 
                          : 'border-purple-500 bg-purple-50'
                        : isDarkMode
                          ? 'border-gray-700 bg-gray-800 hover:border-purple-500/50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className={`w-10 h-10 mr-3 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}>
                      <Shield size={20} />
                    </div>
                    <div className="text-left">
                      <span className={`block font-medium ${
                        selectedRoles.includes('admin')
                          ? isDarkMode ? 'text-purple-400' : 'text-purple-700'
                          : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                    Admin
                      </span>
                      <span className={`block text-xs mt-0.5 ${
                        selectedRoles.includes('admin')
                          ? isDarkMode ? 'text-purple-300/70' : 'text-purple-600/70'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Full access
                      </span>
                </div>
                  </button>
              </div>
              
                <div className={`p-4 rounded-lg mt-4 ${
                  selectedRoles.includes('admin')
                    ? isDarkMode ? 'bg-purple-900/20 border border-purple-800/30' : 'bg-purple-50 border border-purple-100'
                    : isDarkMode ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {selectedRoles.includes('admin') ? (
                        <Shield size={18} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                      ) : (
                        <UserIcon size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold mb-1 ${
                        selectedRoles.includes('admin')
                          ? isDarkMode ? 'text-purple-400' : 'text-purple-700'
                          : isDarkMode ? 'text-blue-400' : 'text-blue-700'
                      }`}>
                        {selectedRoles.includes('admin') ? 'Administrative Access' : 'Standard Access'}
                      </p>
                      <p className={`text-sm ${
                        selectedRoles.includes('admin')
                          ? isDarkMode ? 'text-purple-300' : 'text-purple-800'
                          : isDarkMode ? 'text-blue-300' : 'text-blue-800'
                      }`}>
                        {selectedRoles.includes('admin') 
                          ? 'User will have full administrative privileges including user management and system configuration.'
                          : 'User will have standard access to create and manage resources according to their permissions.'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {selectedRoles.length === 0 && (
                  <div className="mt-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 text-yellow-800 dark:text-yellow-300 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} />
                      <span className="font-medium">Warning:</span>
                    </div>
                    <p className="ml-6">User must have at least one role assigned.</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowRolesModal(false)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpdateRoles}
                  disabled={selectedRoles.length === 0 || isLoading}
                  className={`px-4 py-2 text-white rounded-md font-medium transition-colors ${
                    selectedRoles.includes('admin')
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } disabled:opacity-70`}
                >
                  {isLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Update Modal */}
      {showStatusModal && userToUpdateStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 ${
            isDarkMode ? 'bg-gray-900' : 'bg-white border border-gray-300'
          }`}>
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedStatus === 'ACTIVE' 
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                    : selectedStatus === 'SUSPENDED'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {selectedStatus === 'ACTIVE' && <CheckCircle size={20} />}
                  {selectedStatus === 'SUSPENDED' && <AlertCircle size={20} />}
                  {selectedStatus === 'BLOCKED' && <ShieldOff size={20} />}
                </div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Update User Status
              </h2>
              </div>
              <button 
                onClick={() => setShowStatusModal(false)}
                className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
              >
                <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <UserAvatar 
                  user={userToUpdateStatus} 
                  size="medium" 
                  isDarkMode={isDarkMode}
                />
                <div>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {userToUpdateStatus.username}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {userToUpdateStatus.email}
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select Status
                </label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('ACTIVE')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      selectedStatus === 'ACTIVE'
                        ? isDarkMode 
                          ? 'border-green-500 bg-green-900/20' 
                          : 'border-green-500 bg-green-50'
                        : isDarkMode
                          ? 'border-gray-700 bg-gray-800 hover:border-green-500/50'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                    }`}
                  >
                    <div className={`w-8 h-8 mb-2 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                    }`}>
                      <CheckCircle size={18} />
                    </div>
                    <span className={`text-sm font-medium ${
                      selectedStatus === 'ACTIVE'
                        ? isDarkMode ? 'text-green-400' : 'text-green-700'
                        : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Active</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('SUSPENDED')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      selectedStatus === 'SUSPENDED'
                        ? isDarkMode 
                          ? 'border-amber-500 bg-amber-900/20' 
                          : 'border-amber-500 bg-amber-50'
                        : isDarkMode
                          ? 'border-gray-700 bg-gray-800 hover:border-amber-500/50'
                          : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <div className={`w-8 h-8 mb-2 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'
                    }`}>
                      <AlertCircle size={18} />
                    </div>
                    <span className={`text-sm font-medium ${
                      selectedStatus === 'SUSPENDED'
                        ? isDarkMode ? 'text-amber-400' : 'text-amber-700'
                        : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Suspended</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('BLOCKED')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      selectedStatus === 'BLOCKED'
                        ? isDarkMode 
                          ? 'border-red-500 bg-red-900/20' 
                          : 'border-red-500 bg-red-50'
                        : isDarkMode
                          ? 'border-gray-700 bg-gray-800 hover:border-red-500/50'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  >
                    <div className={`w-8 h-8 mb-2 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'
                    }`}>
                      <ShieldOff size={18} />
                    </div>
                    <span className={`text-sm font-medium ${
                      selectedStatus === 'BLOCKED'
                        ? isDarkMode ? 'text-red-400' : 'text-red-700'
                        : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Blocked</span>
                  </button>
                </div>
                
                <div className={`p-4 rounded-lg mb-4 ${
                  selectedStatus === 'ACTIVE'
                    ? isDarkMode ? 'bg-green-900/20 border border-green-800/30' : 'bg-green-50 border border-green-100'
                    : selectedStatus === 'SUSPENDED'
                      ? isDarkMode ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-100'
                      : isDarkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-100'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {selectedStatus === 'ACTIVE' && <CheckCircle size={18} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />}
                      {selectedStatus === 'SUSPENDED' && <AlertCircle size={18} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />}
                      {selectedStatus === 'BLOCKED' && <ShieldOff size={18} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold mb-1 ${
                        selectedStatus === 'ACTIVE'
                          ? isDarkMode ? 'text-green-400' : 'text-green-700'
                          : selectedStatus === 'SUSPENDED'
                            ? isDarkMode ? 'text-amber-400' : 'text-amber-700'
                            : isDarkMode ? 'text-red-400' : 'text-red-700'
                      }`}>
                        {selectedStatus === 'ACTIVE' && 'Full Access'}
                        {selectedStatus === 'SUSPENDED' && 'Limited Access'}
                        {selectedStatus === 'BLOCKED' && 'No Access'}
                      </p>
                      <p className={`text-sm ${
                        selectedStatus === 'ACTIVE'
                          ? isDarkMode ? 'text-green-300' : 'text-green-800'
                          : selectedStatus === 'SUSPENDED'
                            ? isDarkMode ? 'text-amber-300' : 'text-amber-800'
                            : isDarkMode ? 'text-red-300' : 'text-red-800'
                      }`}>
                        {selectedStatus === 'ACTIVE' && 'User will have full access to all features based on their assigned roles.'}
                        {selectedStatus === 'SUSPENDED' && 'User will have read-only access. They can log in but cannot create, update, or delete resources.'}
                        {selectedStatus === 'BLOCKED' && 'User will not be able to log in and all existing sessions will be invalidated.'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {selectedStatus !== 'ACTIVE' && (
                  <div className="mt-3 transition-all duration-300">
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Reason for {selectedStatus.toLowerCase()} (optional)
                    </label>
                    <textarea
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      rows={3}
                      className={`w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 transition-colors ${
                        selectedStatus === 'SUSPENDED'
                          ? 'focus:ring-amber-500'
                          : 'focus:ring-red-500'
                      } ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-700 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder={`Why is this user being ${selectedStatus.toLowerCase()}?`}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpdateStatus}
                  disabled={isLoading}
                  className={`px-4 py-2 text-white rounded-md font-medium transition-colors ${
                    selectedStatus === 'ACTIVE'
                      ? 'bg-green-600 hover:bg-green-700'
                      : selectedStatus === 'SUSPENDED'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-70`}
                >
                  {isLoading ? 'Updating...' : `Save Changes`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Error/Success Notification */}
      {unblockError && (
        <div className="mt-4 p-3 rounded-md bg-red-100 text-red-700 text-center">{unblockError}</div>
      )}
      {unblockSuccess && (
        <div className="mt-4 p-3 rounded-md bg-green-100 text-green-700 text-center">{unblockSuccess}</div>
      )}

      {/* Reactivate Success Notification */}
      {reactivateSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {reactivateSuccess}
          <button className="ml-2" onClick={() => setReactivateSuccess(null)}>&times;</button>
        </div>
      )}

      {/* Reactivate Error Notification */}
      {reactivateError && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {reactivateError}
          <button className="ml-2" onClick={() => setReactivateError(null)}>&times;</button>
        </div>
      )}
    </div>
  );
};

export default TeamMembers; 