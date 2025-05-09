import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ThemeToggle from './components/ThemeToggle';
import DashboardMenuWrapper from './components/DashboardMenuWrapper';
import { Code2 } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MenuProvider } from './contexts/MenuContext';
import { chatService } from './services/chatService';
import { ToastContainer } from 'react-toastify';

const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 z-50 bg-indigo-700 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
    {message}
    <button className="ml-4 text-white/80 hover:text-white" onClick={onClose}>×</button>
  </div>
);

function AppContent() {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const { isDarkMode } = useTheme();
  const [toast, setToast] = useState<string | null>(null);

  // Global chat subscription for notifications and message caching
  useEffect(() => {
    if (!isAuthenticated || !user?.username) return;
    chatService.setUsername(user.username);
    chatService.connect();
    const unsubscribe = chatService.onMessage((message) => {
      // Store in sessionStorage for the chat
      if (message.type === 'PRIVATE' && message.sender) {
        const cacheKey = `chat_${user.username}_${message.sender}`;
        const cached = sessionStorage.getItem(cacheKey);
        let messages = [];
        if (cached) {
          try { messages = JSON.parse(cached); } catch {}
        }
        // Mark as unread if not from the current user
        messages.push({ ...message, read: message.sender === user.username ? true : false });
        sessionStorage.setItem(cacheKey, JSON.stringify(messages));
      }
      if (message.type === 'BROADCAST') {
        const cacheKey = `chat_${user.username}_broadcast`;
        const cached = sessionStorage.getItem(cacheKey);
        let messages = [];
        if (cached) {
          try { messages = JSON.parse(cached); } catch {}
        }
        messages.push(message);
        sessionStorage.setItem(cacheKey, JSON.stringify(messages));
      }
      // Dispatch notification for all incoming messages not sent by the current user
      if (message.sender !== user.username) {
        window.dispatchEvent(new CustomEvent('chat-new-message', {
          detail: {
            from: message.sender,
            content: message.content,
            chatKey: message.type === 'BROADCAST'
              ? `chat_${user.username}_broadcast`
              : `chat_${user.username}_${message.sender}`,
            message
          }
        }));
      }
    });
    return () => {
      unsubscribe();
      chatService.disconnect();
    };
  }, [isAuthenticated, user?.username]);

  useEffect(() => {
    const handler = (e: any) => {
      const { from, content } = e.detail || {};
      setToast(`New message from ${from}: ${content}`);
    };
    window.addEventListener('chat-new-message', handler);
    return () => window.removeEventListener('chat-new-message', handler);
  }, []);

  if (isAuthenticated) {
    return (
      <>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        <BrowserRouter>
          <MenuProvider userRoles={user?.roles || []}>
            <DashboardMenuWrapper />
            <Routes>
              <Route path="/dashboard/*" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </MenuProvider>
        </BrowserRouter>
      </>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${
      isDarkMode ? 'bg-gray-950' : 'bg-white'
    }`}>
      {/* Large typography in background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <h1 className={`text-[20vw] font-black tracking-tighter opacity-5 select-none ${
          isDarkMode ? 'text-gray-700' : 'text-gray-200'
        }`}>
          PRODUCT<br/>HUB
        </h1>
      </div>
      
      {/* Theme toggle in top right */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      {/* Left side branding */}
      <div className="hidden md:flex md:w-1/2 h-screen items-center justify-center p-12">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <Code2 size={40} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
            <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>ProductHub</h1>
          </div>
          <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Your central platform for product innovation and management. Join thousands of product teams bringing ideas to life.
          </p>
          <div className={`mt-12 flex gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <span>© 2025 ProductHub</span>
            <span>•</span>
            <a href="#" className="hover:underline">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:underline">Terms</a>
          </div>
        </div>
      </div>

      {/* Right side auth form */}
      <div className="w-full md:w-1/2 h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Mobile logo - shown only on mobile */}
          <div className="flex md:hidden items-center justify-center gap-2 mb-8">
            <Code2 size={32} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>ProductHub</h1>
          </div>
          
          {isLogin ? (
            <Login onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <Register onSwitchToLogin={() => setIsLogin(true)} />
          )}
          
          {/* Mobile footer - shown only on mobile */}
          <div className={`mt-8 md:hidden text-center text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>© 2025 ProductHub. Enterprise-grade product management platform.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        closeOnClick 
        pauseOnHover 
        theme="colored" 
        aria-label="Notifications"
      />
      <AppContent />
    </AuthProvider>
  );
}

export default App;