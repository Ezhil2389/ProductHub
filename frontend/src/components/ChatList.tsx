import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { userService, User } from '../services/userService';
import { MessageSquare, Send, Users, BellRing, UserCircle, X, AlertCircle } from 'lucide-react';
import Chat from './Chat';

// Add a more modern toast notification component
const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-5 py-3 rounded-lg shadow-lg animate-fadeIn flex items-center gap-3">
    <MessageSquare size={18} className="text-indigo-200" />
    <div className="flex-1">
      {message}
    </div>
    <button className="text-white/80 hover:text-white" onClick={onClose}>
      <X size={16} />
    </button>
  </div>
);

const ChatList: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showAdminBroadcast, setShowAdminBroadcast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState<{ [username: string]: number }>({});
  const [toast, setToast] = useState<string | null>(null);

  const isAdmin = user?.roles?.some(role => 
    role === 'ROLE_ADMIN' || role === 'ADMIN'
  );

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await userService.getAllUsers();
        // Filter out current user
        const filteredUsers = fetchedUsers.filter(u => u.username !== user?.username);
        setUsers(filteredUsers);
        setError(null);
      } catch (err) {
        setError('Failed to load users');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user?.username]);

  useEffect(() => {
    if (!user?.username) return;
    const newUnread: { [username: string]: number } = {};
    users.forEach(u => {
      const cacheKey = `chat_${user.username}_${u.username}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const msgs = JSON.parse(cached);
          newUnread[u.username] = msgs.filter(
            (msg: any) => msg.sender === u.username && !msg.read
          ).length;
        } catch {}
      }
    });
    setUnread(newUnread);
  }, [users, user?.username]);

  // Listen for live notifications
  useEffect(() => {
    const handler = (e: any) => {
      const { from, content, chatKey } = e.detail || {};
      // Only show notification if not currently chatting with this user
      if (from && from !== selectedUser) {
        setUnread(prev => ({ ...prev, [from]: (prev[from] || 0) + 1 }));
        setToast(`New message from ${from}: ${content}`);
      }
    };
    window.addEventListener('chat-new-message', handler);
    return () => window.removeEventListener('chat-new-message', handler);
  }, [selectedUser]);

  // Clear unread when opening a chat
  useEffect(() => {
    if (selectedUser) {
      setUnread(prev => ({ ...prev, [selectedUser]: 0 }));
    }
  }, [selectedUser]);

  const handleUserSelect = (username: string) => {
    setSelectedUser(username);
    setShowAdminBroadcast(false);
  };

  const handleShowAdminBroadcast = () => {
    setShowAdminBroadcast(true);
    setSelectedUser(null);
  };

  const handleCloseChat = () => {
    setSelectedUser(null);
    setShowAdminBroadcast(false);
  };

  // Generate background colors for user avatar based on username
  const getUserAvatarColor = (username: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-pink-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-cyan-500',
    ];
    
    // Simple hash function to get consistent color for the same username
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      
      <div className={`mb-8 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        <h1 className="text-3xl font-bold">Messaging</h1>
        <p className="text-sm mt-2 opacity-80">
          {isAdmin 
            ? 'Send private messages to team members or broadcast announcements to all users' 
            : 'Chat with team members or view announcements from administrators'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - User List */}
        <div className={`col-span-1 rounded-xl shadow-lg overflow-hidden border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              <Users size={18} className={isDarkMode ? 'text-indigo-300' : 'text-indigo-600'} />
              <span>Conversations</span>
            </h2>
          </div>

          {/* Admin broadcast option (for admins) */}
          {isAdmin && (
            <div
              onClick={handleShowAdminBroadcast}
              className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                showAdminBroadcast
                  ? isDarkMode ? 'bg-purple-900/30 text-purple-300 border-l-4 border-purple-500' : 'bg-purple-100 text-purple-800 border-l-4 border-purple-500'
                  : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              } ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
            >
              <div className={`p-2 rounded-full ${
                isDarkMode 
                  ? showAdminBroadcast ? 'bg-purple-700' : 'bg-gray-700' 
                  : showAdminBroadcast ? 'bg-purple-200' : 'bg-gray-100'
              }`}>
                <BellRing size={18} className={
                  isDarkMode 
                    ? showAdminBroadcast ? 'text-purple-200' : 'text-gray-300' 
                    : showAdminBroadcast ? 'text-purple-600' : 'text-gray-600'
                } />
              </div>
              <div>
                <h3 className="font-medium">Admin Broadcast</h3>
                <p className="text-xs opacity-75">Send message to all users</p>
              </div>
            </div>
          )}

          {/* User list */}
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {loading ? (
              <div className={`p-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="inline-block w-8 h-8 border-2 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="mt-2">Loading users...</p>
              </div>
            ) : error ? (
              <div className={`p-6 text-center ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
                <AlertCircle className="mx-auto mb-2" size={24} />
                <p>{error}</p>
              </div>
            ) : users.length === 0 ? (
              <div className={`p-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Users className="mx-auto mb-2 opacity-40" size={28} />
                <p>No users available</p>
              </div>
            ) : (
              users.map(user => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user.username)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b ${
                    selectedUser === user.username
                      ? isDarkMode 
                        ? 'bg-indigo-900/30 text-indigo-100 border-l-4 border-indigo-500 border-b-gray-700' 
                        : 'bg-indigo-50 text-indigo-900 border-l-4 border-indigo-500 border-b-gray-100'
                      : isDarkMode 
                        ? 'hover:bg-gray-700 border-gray-700' 
                        : 'hover:bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getUserAvatarColor(user.username)}`}>
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium flex items-center">
                      <span className="truncate">{user.username}</span>
                      {unread[user.username] > 0 && (
                        <span className="ml-2 flex items-center justify-center h-5 min-w-5 px-1.5 bg-red-600 text-white text-xs rounded-full animate-pulse">
                          {unread[user.username]}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs opacity-75 truncate">{user.email}</p>
                  </div>
                  {selectedUser === user.username && (
                    <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'}`}></span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel - Chat */}
        <div className="col-span-1 lg:col-span-2">
          {selectedUser ? (
            <Chat recipientUsername={selectedUser} onClose={handleCloseChat} />
          ) : showAdminBroadcast && isAdmin ? (
            <Chat onClose={handleCloseChat} />
          ) : (
            <div className={`h-[550px] flex flex-col items-center justify-center rounded-xl shadow-lg border ${
              isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-gray-500 border-gray-200'
            }`}>
              <div className="text-center p-8 max-w-md">
                <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <MessageSquare size={24} className={`opacity-60 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Your messages
                </h3>
                <p className="mb-6 opacity-80">
                  Select a conversation from the list to start messaging
                </p>
                {isAdmin && (
                  <button 
                    onClick={handleShowAdminBroadcast}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors mx-auto"
                  >
                    <BellRing size={16} />
                    <span>Admin Broadcast</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatList; 