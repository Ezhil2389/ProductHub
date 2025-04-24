import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { chatService, ChatMessage } from '../services/chatService';
import { Send, AlertCircle, MessageCircle, X, Clock, Bell } from 'lucide-react';

// Use the imported ChatMessage but force 'type' to be required
interface Message extends Omit<ChatMessage, 'type'> {
  type: 'PRIVATE' | 'BROADCAST';
}

interface ChatProps {
  recipientUsername?: string;
  onClose?: () => void;
}

const Chat: React.FC<ChatProps> = ({ recipientUsername, onClose }) => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.roles.includes('ROLE_ADMIN') || user?.roles.includes('ADMIN');

  const getCacheKey = () => {
    if (recipientUsername) {
      return `chat_${user?.username}_${recipientUsername}`;
    } else if (isAdmin) {
      return `chat_${user?.username}_broadcast`;
    }
    return '';
  };

  const getInitialMessages = () => {
    if (!user?.username || !recipientUsername) return [];
    const cacheKey =
      recipientUsername
        ? `chat_${user.username}_${recipientUsername}`
        : isAdmin
          ? `chat_${user.username}_broadcast`
          : '';
    if (!cacheKey) return [];
    const cached = sessionStorage.getItem(cacheKey);
    let loaded: Message[] = [];
    if (cached) {
      try {
        loaded = JSON.parse(cached);
      } catch {
        loaded = [];
      }
    }
    loaded = loaded.filter(msg => msg.content && msg.sender);
    return loaded.map(msg =>
      msg.sender !== user.username
        ? { ...msg, read: true, type: msg.type || 'PRIVATE' }
        : { ...msg, type: msg.type || 'PRIVATE' }
    );
  };

  const [messages] = useState<Message[]>(getInitialMessages);

  // Load cached messages whenever the chat target changes
  useEffect(() => {
    if (!user?.username || !recipientUsername) return;
    const cacheKey = getCacheKey();
    if (!cacheKey) return;
    const cached = sessionStorage.getItem(cacheKey);
    let loaded: Message[] = [];
    if (cached) {
      try {
        loaded = JSON.parse(cached);
      } catch {
        loaded = [];
      }
    }
    // Defensive: filter out invalid messages
    loaded = loaded.filter(msg => msg.content && msg.sender);
    // Mark all messages from the other user as read, always set type
    const updated = loaded.map(msg =>
      msg.sender !== user.username
        ? { ...msg, read: true, type: msg.type || 'PRIVATE' }
        : { ...msg, type: msg.type || 'PRIVATE' }
    );
    sessionStorage.setItem(cacheKey, JSON.stringify(updated));
    console.log('Loaded for', recipientUsername, updated);
  }, [user?.username, recipientUsername, isAdmin]);

  // Save messages to cache whenever they change
  useEffect(() => {
    const cacheKey = getCacheKey();
    if (cacheKey) {
      sessionStorage.setItem(cacheKey, JSON.stringify(messages));
    }
  }, [messages, recipientUsername, isAdmin, user?.username]);

  useEffect(() => {
    if (!user?.username) return;
    setIsConnected(chatService.isConnected);
    chatService.setUsername(user.username);

    // Handler for new messages
    const messageUnsubscribe = chatService.onMessage((message) => {
      // Only show the message if it's for the currently open chat
      if (
        (recipientUsername && message.sender === recipientUsername) ||
        (!recipientUsername && message.type === 'BROADCAST')
      ) {
        const validMessage = {
          ...message,
          type: message.type || 'PRIVATE'
        };
        sessionStorage.setItem(getCacheKey(), JSON.stringify([...messages, validMessage]));
        scrollToBottom();
      }
    });

    // Add a window error listener to detect CORS errors 
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message.includes('CORS') || event.message.includes('Access-Control')) {
        setError('CORS policy error: Backend server may not allow cross-origin requests');
        setIsConnected(false);
      }
    };
    window.addEventListener('error', handleGlobalError);
    
    // Subscribe to connection status
    const connectionUnsubscribe = chatService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setError('Connection lost. Attempting to reconnect...');
      } else {
        setError(null);
      }
    });

    return () => {
      try {
        window.removeEventListener('error', handleGlobalError);
        messageUnsubscribe();
        connectionUnsubscribe();
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    };
  }, [user?.username, recipientUsername, isAdmin]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Focus input field when chat opens
  useEffect(() => {
    messageInputRef.current?.focus();
  }, [recipientUsername]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    try {
      if (recipientUsername) {
        chatService.sendPrivateMessage(recipientUsername, newMessage, user?.username || '');
        // Add the sent message to the local state
        sessionStorage.setItem(getCacheKey(), JSON.stringify([...messages, {
          content: newMessage,
          sender: user?.username,
          timestamp: new Date().toISOString(),
          type: 'PRIVATE'
        }]));
      } else if (isAdmin) {
        chatService.sendAdminBroadcast(newMessage);
        // Do NOT add the sent broadcast to the local state. The server will broadcast it back.
      }
      setNewMessage('');
      scrollToBottom();
      // Focus back on input after sending
      messageInputRef.current?.focus();
    } catch (error) {
      setError('Failed to send message');
    }
  };

  // Group messages by day
  const groupedMessages = messages.reduce((groups, message) => {
    const date = message.timestamp ? new Date(message.timestamp).toLocaleDateString() : 'Unknown';
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className={`flex flex-col h-[550px] rounded-xl shadow-lg overflow-hidden border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className={`flex justify-between items-center p-4 border-b ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            recipientUsername 
              ? isDarkMode ? 'bg-indigo-600' : 'bg-indigo-100' 
              : isDarkMode ? 'bg-purple-600' : 'bg-purple-100'
          }`}>
            <MessageCircle size={18} className={
              recipientUsername 
                ? isDarkMode ? 'text-indigo-100' : 'text-indigo-600' 
                : isDarkMode ? 'text-purple-100' : 'text-purple-600'
            } />
          </div>
          <div>
            <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {recipientUsername ? recipientUsername : 'Admin Broadcast'}
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {recipientUsername ? 'Private conversation' : 'Message to all users'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-gray-200 transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label="Close chat"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Connection status or error */}
      {!isConnected && (
        <div className={`p-3 text-center ${
          isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-50 text-red-600'
        }`}>
          <AlertCircle className="inline-block mr-2" size={16} />
          <span>
            {error || 'Disconnected'} 
            {error?.includes('CORS') && ' - Cross-origin connection blocked by browser'}
          </span>
          <div className="mt-2">
            <button 
              onClick={() => {
                setError('Attempting to reconnect...');
              }}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                isDarkMode 
                  ? 'bg-red-800 hover:bg-red-700 text-white' 
                  : 'bg-red-200 hover:bg-red-300 text-red-700'
              }`}
            >
              Retry Connection
            </button>
          </div>
          <p className="text-xs mt-2 opacity-80">
            Note: If connection fails, verify the backend server is running and accessible at <code>http://localhost:8080</code>
          </p>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        {Object.entries(groupedMessages).map(([date, dayMessages], dateIndex) => (
          <div key={dateIndex} className="space-y-4">
            <div className="flex justify-center">
              <div className={`text-xs rounded-full px-3 py-1 ${
                isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
              }`}>
                {date === new Date().toLocaleDateString() ? 'Today' : date}
              </div>
            </div>
            
            {dayMessages.map((message, index) => {
              const isSender = message.sender === user?.username;
              const isConsecutive = index > 0 && dayMessages[index - 1].sender === message.sender;
              
              return (
                <div
                  key={index}
                  className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} ${
                    isConsecutive ? 'mt-1' : 'mt-3'
                  }`}
                >
                  {/* If first message in a sequence, show sender name */}
                  {!isConsecutive && !isSender && (
                    <span className={`text-xs ml-2 mb-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {message.sender}
                    </span>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.type === 'BROADCAST'
                        ? isDarkMode 
                          ? 'bg-purple-900 text-purple-100 border border-purple-800' 
                          : 'bg-purple-100 text-purple-900 border border-purple-200'
                        : isSender
                          ? isDarkMode 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-indigo-500 text-white'
                          : isDarkMode 
                            ? 'bg-gray-800 text-gray-100 border border-gray-700' 
                            : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                    } ${
                      isSender 
                        ? 'rounded-tr-none' 
                        : 'rounded-tl-none'
                    }`}
                  >
                    {message.type === 'BROADCAST' && (
                      <div className="text-xs font-semibold mb-1 flex items-center gap-1">
                        <Bell size={12} />
                        <span>Admin Broadcast</span>
                      </div>
                    )}
                    <p className="break-words">{message.content}</p>
                    <div className={`text-xs mt-1 flex items-center gap-1 ${
                      isDarkMode 
                        ? isSender ? 'text-indigo-200/70' : 'text-gray-400' 
                        : isSender ? 'text-indigo-50/90' : 'text-gray-500'
                    }`}>
                      <Clock size={10} />
                      {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <MessageCircle size={40} className={`opacity-20 mb-3 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {recipientUsername 
                ? `No messages yet with ${recipientUsername}` 
                : 'No broadcast messages yet'}
            </p>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Type a message below to start the conversation
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className={`p-4 border-t ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex gap-2">
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isAdmin && !recipientUsername ? 'Type a broadcast message...' : 'Type a message...'}
            className={`flex-1 px-4 py-3 rounded-full border transition-all ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-indigo-400'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || !newMessage.trim()}
            className={`px-4 py-3 rounded-full flex items-center gap-2 transition-colors ${
              isConnected && newMessage.trim()
                ? isDarkMode
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
