import React, { useState, useEffect } from 'react';
import { logService, ApplicationLog } from '../services/logService';
import { AlertCircle, Info, AlertTriangle, Bug, RefreshCw, Clock, Search, User, Shield, FileText, Settings, Database, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ApplicationLogsProps {
  isDarkMode: boolean;
  limit?: number;
  showFilters?: boolean;
}

const ApplicationLogs: React.FC<ApplicationLogsProps> = ({ 
  isDarkMode, 
  limit = 10,
  showFilters = true
}) => {
  const [logs, setLogs] = useState<ApplicationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredLogs, setFilteredLogs] = useState<ApplicationLog[]>([]);
  const { user } = useAuth();

  const isAdmin = user?.roles?.some(role => 
    role === 'ROLE_ADMIN' || role === 'ADMIN'
  );

  const fetchLogs = async () => {
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      if (!isAdmin) {
        setError("You don't have permission to view logs");
        setLoading(false);
        return;
      }
      
      // Only use the GET /api/application-logs endpoint
      const data = await logService.getAllLogs();
      
      // Apply limit if needed
      const limitedData = limit ? data.slice(0, limit) : data;
      setLogs(limitedData);
      setFilteredLogs(limitedData);
    } catch (err) {
      setError('Failed to load application logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  useEffect(() => {
    // Handle client-side filtering with search term
    if (searchTerm) {
      const filtered = logs.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.logger.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.level.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLogs(filtered);
    } else {
      setFilteredLogs(logs);
    }
  }, [searchTerm, logs]);

  const getLogIcon = (level: string, message: string) => {
    // First try to determine icon by message content
    if (message.toLowerCase().includes("user") && 
        (message.toLowerCase().includes("create") || message.toLowerCase().includes("register"))) {
      return <User className="text-blue-500" size={18} />;
    } else if (message.toLowerCase().includes("role") || message.toLowerCase().includes("permission")) {
      return <Shield className="text-purple-500" size={18} />;
    } else if (message.toLowerCase().includes("login") || message.toLowerCase().includes("auth")) {
      return <UserCheck className="text-green-500" size={18} />;
    } else if (message.toLowerCase().includes("product") || message.toLowerCase().includes("item")) {
      return <FileText className="text-indigo-500" size={18} />;
    } else if (message.toLowerCase().includes("database") || message.toLowerCase().includes("query")) {
      return <Database className="text-amber-500" size={18} />;
    } else if (message.toLowerCase().includes("config") || message.toLowerCase().includes("setting")) {
      return <Settings className="text-gray-500" size={18} />;
    }
    
    // Fall back to level-based icons
    switch (level) {
      case 'ERROR':
        return <AlertCircle className="text-red-500" size={18} />;
      case 'WARN':
        return <AlertTriangle className="text-amber-500" size={18} />;
      case 'DEBUG':
        return <Bug className="text-purple-500" size={18} />;
      case 'INFO':
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const logTime = new Date(timestamp);
    const diff = now.getTime() - logTime.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getLoggerName = (logger: string) => {
    // Extract the last part of the logger name (after the last dot)
    const parts = logger.split('.');
    return parts[parts.length - 1];
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return isDarkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-100 text-red-700 border-red-200';
      case 'WARN':
        return isDarkMode ? 'bg-amber-900/30 text-amber-400 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200';
      case 'DEBUG':
        return isDarkMode ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200';
      case 'INFO':
      default:
        return isDarkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw size={20} className={`${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} animate-spin`} />
          <span className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Loading application logs...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-md ${isDarkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={`p-4 rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <p>Administrator access required to view application logs.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className={`text-lg font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} flex items-center gap-2`}>
          <FileText className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} size={20} />
          Business Application Logs
        </h3>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            className={`inline-flex items-center px-3 py-2 text-sm rounded-md ${
              isDarkMode 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800'
            } transition-all duration-200`}
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh Logs
          </button>
        </div>
      </div>
      
      {success && (
        <div className={`px-4 py-2 ${isDarkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800'}`}>
          {success}
        </div>
      )}
      
      {error && (
        <div className={`px-4 py-2 ${isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'}`}>
          {error}
        </div>
      )}
      
      {showFilters && (
        <div className="px-4 py-3 border-t border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </div>
              <input
                type="text"
                placeholder="Search in logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-md border ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white border-gray-600 focus:border-indigo-500' 
                    : 'bg-white text-gray-900 border-gray-300 focus:border-indigo-500'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
              />
            </div>
          </div>
        </div>
      )}

      <div className="overflow-auto max-h-[calc(100vh-300px)]">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <li 
                key={log.id} 
                className={`p-4 relative hover:${isDarkMode ? 'bg-gray-750' : 'bg-gray-50'} transition-colors duration-150`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {getLogIcon(log.level, log.message)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Main log content */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                      <div className="flex-1">
                        <p className={`text-base font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {log.message}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                          <div className="flex items-center text-sm">
                            <Clock size={14} className={isDarkMode ? 'text-gray-400 mr-1' : 'text-gray-500 mr-1'} />
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} title={formatTimestamp(log.timestamp)}>
                              {getRelativeTime(log.timestamp)}
                            </span>
                          </div>
                          
                          <span 
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}
                          >
                            {log.level}
                          </span>
                          
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {getLoggerName(log.logger)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-right mt-2 sm:mt-0">
                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    {log.stackTrace && (
                      <details className="mt-3">
                        <summary className={`text-xs cursor-pointer inline-flex items-center ${
                          isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'
                        }`}>
                          <span className="mr-1">View Stack Trace</span>
                        </summary>
                        <pre className={`mt-2 text-xs overflow-auto p-3 rounded-md border ${
                          isDarkMode 
                            ? 'bg-gray-900 text-gray-300 border-gray-700' 
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {log.stackTrace}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-12 text-center">
              <div className="inline-flex flex-col items-center">
                <FileText size={40} className={`${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                  No logs found matching your criteria.
                </p>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className={`mt-3 text-sm ${
                      isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'
                    }`}
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ApplicationLogs; 