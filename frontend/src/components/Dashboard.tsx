import React, { useState, useRef, KeyboardEvent, ClipboardEvent, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Users as UsersIcon, UserCircle, Menu, X, Code2, ArrowUpRight, ArrowDownRight, Bell, Search, LogOut, Moon, Sun, PlusCircle, RefreshCw, Filter, TrendingUp, LineChart, Zap, BarChart3, PieChart, DollarSign, Calendar, Sparkles, ShoppingCart, Tag, Clock, User as UserIcon, Mail, Shield, ShieldCheck, Activity, LogIn, Key, UserCog, History, PencilIcon, AlertCircle, CheckCircle, Save, Lock, Circle, XCircle, Unlock, ShieldOff, QrCode, CheckSquare, Upload, Download, AlertTriangle, Bug, Info, MessageSquare, Settings } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ProductRoutes from './ProductRoutes';
import TeamMembers from './TeamMembers';
import AddUser from './AddUser';
import { authService } from '../services/authService';
import { productService, Product } from '../services/productService';
import { userService, User } from '../services/userService';
import { logService, ApplicationLog } from '../services/logService';
import Logs from './Logs';
import ChatList from './ChatList';
import MenuSettings from './MenuSettings';
import ThemeToggle from './ThemeToggle';

// Define interface for navigation items
interface NavItem {
  name: string;
  path: string;
  icon: React.FC<{ size?: number }>;
  badge?: string;
}

// OTP Input Component
const OTPInput = ({ 
  length = 6, 
  value = '', 
  onChange,
  isDarkMode 
}: { 
  length: number; 
  value: string; 
  onChange: (value: string) => void;
  isDarkMode: boolean;
}) => {
  const [otp, setOtp] = useState(value.split(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusNext = (index: number) => {
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const focusPrev = (index: number) => {
    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleChange = (index: number, value: string) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    onChange(newOtp.join(''));
    if (value) focusNext(index);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index]) {
        focusPrev(index);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < length) newOtp[index] = char;
    });
    setOtp(newOtp);
    onChange(newOtp.join(''));
    inputRefs.current[Math.min(pastedData.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[index] || ''}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`w-12 h-12 text-center text-2xl font-bold rounded-lg border-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all ${
            isDarkMode 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        />
      ))}
    </div>
  );
};

// Simple bar chart component for product metrics
const SimpleBarChart = ({ 
  data, 
  isDarkMode 
}: { 
  data: {label: string, value: number}[];
  isDarkMode: boolean
}) => {
  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                {item.label}
              </span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>
                {item.value}
              </span>
            </div>
            <div className={`h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className="h-full rounded-full bg-indigo-500" 
                style={{width: `${percentage}%`}}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Activity feed component to show recent actions and logs
const ActivityFeed = ({ 
  activities, 
  isDarkMode,
  applicationLogs = []
}: { 
  activities: {
    id: number;
    action: string;
    time: string;
    user?: string;
    target?: string;
    status?: 'success' | 'pending' | 'warning' | 'error';
    icon?: React.ReactNode;
  }[];
  isDarkMode: boolean;
  applicationLogs?: ApplicationLog[];
}) => {
  const { user } = useAuth();
  
  const getStatusColor = (status: string = 'success') => {
    const colors = {
      success: isDarkMode ? 'text-green-400 bg-green-900' : 'text-green-600 bg-green-100',
      pending: isDarkMode ? 'text-yellow-400 bg-yellow-900' : 'text-yellow-600 bg-yellow-100',
      warning: isDarkMode ? 'text-orange-400 bg-orange-900' : 'text-orange-600 bg-orange-100',
      error: isDarkMode ? 'text-red-400 bg-red-900' : 'text-red-600 bg-red-100',
      info: isDarkMode ? 'text-blue-400 bg-blue-900' : 'text-blue-600 bg-blue-100',
      debug: isDarkMode ? 'text-purple-400 bg-purple-900' : 'text-purple-600 bg-purple-100',
    };
    return colors[status.toLowerCase() as keyof typeof colors] || colors.success;
  };

  const getIconForLog = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return <AlertCircle size={16} />;
      case 'WARN':
        return <AlertTriangle size={16} />;
      case 'DEBUG':
        return <Bug size={16} />;
      case 'INFO':
      default:
        return <Info size={16} />;
    }
  };
  
  // Convert application logs to activity feed format
  const logsAsActivities = applicationLogs.map((log, index) => ({
    id: log.id || index,
    action: log.message || 'System Log',
    time: new Date(log.timestamp).toLocaleString(),
    user: log.logger?.split('.')?.pop() || 'System',
    status: log.level?.toLowerCase() as 'success' | 'pending' | 'warning' | 'error',
    icon: getIconForLog(log.level),
    target: undefined
  }));
  
  return (
    <div className="space-y-4">
      {logsAsActivities.length > 0 ? (
        logsAsActivities.map(activity => (
          <div 
            key={activity.id} 
            className={`p-4 rounded-lg flex items-start gap-3 ${
              isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
            }`}
          >
            <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
              {activity.icon || <Clock size={16} />}
            </div>
            <div className="flex-1">
              <p className={isDarkMode ? 'text-white' : 'text-gray-800'}>
                {activity.action}
                {activity.target && (
                  <span className="font-medium"> {activity.target}</span>
                )}
              </p>
              <div className="flex justify-between mt-1">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {activity.user && `by ${activity.user}`}
                </span>
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {activity.time}
                </span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No activity logs available.
        </div>
      )}
    </div>
  );
};

// Product popularity chart
const ProductPopularityChart = ({
  products,
  isDarkMode
}: {
  products: Product[];
  isDarkMode: boolean;
}) => {
  // Sort products by price
  const topProducts = [...products]
    .sort((a, b) => b.price * b.quantity - a.price * a.quantity)
    .slice(0, 5);
  
  const maxValue = Math.max(...topProducts.map(p => p.price * p.quantity));
  
  return (
    <div className="space-y-3">
      {topProducts.map((product, index) => {
        const value = product.price * product.quantity;
        const percentage = (value / maxValue) * 100;
        
        return (
          <div key={product.id} className="space-y-1">
            <div className="flex justify-between">
              <span className={`truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} 
                    style={{maxWidth: '180px'}}>
                {product.name}
              </span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>
                ${value.toFixed(2)}
              </span>
            </div>
            <div className={`h-3 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className={`h-full rounded-full ${
                  ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'][index % 5]
                }`}
                style={{width: `${percentage}%`}}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Functional Dashboard Content that fetches and displays real data
const DashboardContent = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [applicationLogs, setApplicationLogs] = useState<ApplicationLog[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTimeRange, setActiveTimeRange] = useState<'daily'|'weekly'|'monthly'>('weekly');
  const [animateStats, setAnimateStats] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.roles?.some(role => 
    role === 'ROLE_ADMIN' || role === 'ADMIN'
  );
  
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUsers: 0,
    avgPrice: 0,
    lowStockItems: 0,
    myProducts: 0,
    totalValue: 0,
    recentActivity: [] as Array<{
      id: number;
      action: string;
      target: string;
      status: 'success' | 'pending' | 'warning' | 'error';
      icon: React.ReactNode;
      user?: string;
      time: string;
    }>
  });
  
  // Fetch products, users data, and application logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        setIsLoadingProducts(true);
        const productsData = await productService.getAll('');
        
        let productsList: Product[] = [];
        // Handle both direct arrays and paginated responses correctly
        if (Array.isArray(productsData)) {
          productsList = productsData;
        } else if (productsData.content) {
          productsList = productsData.content;
        }
        
        setProducts(productsList);
        
        // Calculate product stats safely
        const totalProducts = productsList.length;
        const avgPrice = productsList.length > 0 
          ? productsList.reduce((acc: number, product: Product) => acc + product.price, 0) / productsList.length 
          : 0;
        const lowStockItems = productsList.filter((product: Product) => product.quantity < 10).length;
        const totalValue = productsList.reduce((sum: number, product: Product) => sum + (product.price * product.quantity), 0);
        
        // Fetch user's own products if they have the right role
        let myProductsCount = 0;
        if (user?.roles?.some(role => 
          ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_MODERATOR'].includes(role)
        )) {
          const myProductsData = await productService.getMyProducts('');
          
          let myProductsList: Product[] = [];
          // Handle both direct arrays and paginated responses correctly
          if (Array.isArray(myProductsData)) {
            myProductsList = myProductsData;
          } else if (myProductsData.content) {
            myProductsList = myProductsData.content;
          }
          
          myProductsCount = myProductsList.length;
        }
        
        // Fetch real application logs
        setIsLoadingLogs(true);
        try {
          const logsData = await logService.getAllLogs();
          
          // Filter out test logs and logs with future dates
          const currentDate = new Date();
          const filteredLogs = logsData.filter(log => {
            const logDate = new Date(log.timestamp);
            // Filter out test logs and future dates
            return logDate <= currentDate && 
                   !log.message.toLowerCase().includes('test') &&
                   !log.logger.toLowerCase().includes('test');
          });
          
          // Sort logs by timestamp (newest first)
          const sortedLogs = filteredLogs.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setApplicationLogs(sortedLogs);
        } catch (err) {
          console.error("Failed to load logs:", err);
        } finally {
          setIsLoadingLogs(false);
        }
        
        // Only fetch users if user is an admin
        let usersCount = 0;
        if (user?.roles?.includes('ROLE_ADMIN')) {
          setIsLoadingUsers(true);
          const usersData = await userService.getAllUsers();
          setUsers(usersData);
          usersCount = usersData.length;
          setIsLoadingUsers(false);
        }
        
        // Update stats with animation
        setStats({
          totalProducts,
          totalUsers: usersCount,
          avgPrice,
          lowStockItems,
          myProducts: myProductsCount,
          totalValue,
          recentActivity: []
        });
        
        setIsLoadingProducts(false);
        
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load dashboard data");
        setIsLoadingProducts(false);
        setIsLoadingUsers(false);
      }
    };
    
    fetchData();
    
    // Trigger animation of stats when component mounts
    setAnimateStats(true);
    const timer = setTimeout(() => setAnimateStats(false), 1000);
    
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  // Sample data for time range switcher
  const getDataByTimeRange = (range: string) => {
    // This would connect to real analytics in a production app
    const ranges = {
      daily: {
        valueChange: '+2.3%',
        salesChange: '+1.1%',
        viewsChange: '+5.4%'
      },
      weekly: {
        valueChange: '+8.5%',
        salesChange: '+12.7%',
        viewsChange: '+23.9%'
      },
      monthly: {
        valueChange: '+18.2%',
        salesChange: '+24.5%',
        viewsChange: '+42.1%'
      }
    };
    
    return ranges[range as keyof typeof ranges];
  };
  
  // Get trend data for the selected time range
  const activeRangeData = getDataByTimeRange(activeTimeRange);
  
  // Generate chart data from products
  const generateChartData = () => {
    // Category distribution chart
    if (products.length === 0) return [];
    
    const categories = products.reduce((acc, product) => {
      const category = product.name.split(' ')[0]; // Simplified - in reality would use a category field
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };
  
  // Calculate percentage changes (random data for demo)
  const getChangePercentage = (stat: string) => {
    const changes = {
      totalProducts: '+8%',
      totalUsers: '+12%',
      avgPrice: '+2%',
      lowStockItems: '-5%',
      myProducts: '+15%',
      totalValue: '+9%'
    };
    return changes[stat as keyof typeof changes] || '+0%';
  };
  
  // Generate stat cards with real data and more interesting metrics
  const statCards = [
    { 
      title: 'Total Products', 
      value: stats.totalProducts.toString(), 
      change: getChangePercentage('totalProducts'), 
      icon: Package, 
      trend: 'up',
      color: 'indigo'
    },
    { 
      title: 'My Products', 
      value: stats.myProducts.toString(), 
      change: getChangePercentage('myProducts'), 
      icon: Tag, 
      trend: 'up',
      color: 'purple'
    },
    { 
      title: 'Average Price', 
      value: `$${stats.avgPrice.toFixed(2)}`, 
      change: getChangePercentage('avgPrice'), 
      icon: DollarSign, 
      trend: 'up',
      color: 'emerald'
    },
    { 
      title: 'Low Stock Items', 
      value: stats.lowStockItems.toString(), 
      change: getChangePercentage('lowStockItems'), 
      icon: Bell, 
      trend: 'down',
      color: 'amber'
    },
    { 
      title: 'Inventory Value', 
      value: `$${stats.totalValue.toFixed(2)}`, 
      change: getChangePercentage('totalValue'), 
      icon: BarChart3, 
      trend: 'up',
      color: 'blue'
    }
  ];
  
  // Add admin-only stats if user is admin
  if (user?.roles.includes('ROLE_ADMIN')) {
    statCards.push({
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      change: getChangePercentage('totalUsers'),
      icon: UsersIcon,
      trend: 'up',
      color: 'rose'
    });
  }
  
  // Recent products table - show 5 most recent products
  const recentProducts = [...products]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);
  
  // Animation classes for stats cards
  const getAnimationClass = (index: number) => {
    if (!animateStats) return 'opacity-0 translate-y-4';
    return `opacity-100 translate-y-0 transition-all duration-700 delay-${index * 100}`;
  };
  
  // Mock activities feed
  const activities = [];
  
  // Sample color mapping for product categories
  const categoryColors = {
    'Electronics': 'bg-blue-500',
    'Clothing': 'bg-purple-500',
    'Food': 'bg-green-500',
    'Books': 'bg-amber-500',
    'Toys': 'bg-pink-500'
  };
  
  if (isLoadingProducts) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
        <p>Error: {error}</p>
        <button 
          className="mt-2 bg-red-200 dark:bg-red-800 px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    );
  }
  
  return (
  <div className="space-y-8">
      {/* Modern Welcome Section with Glassmorphism */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        {/* Background pattern elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <radialGradient id="radialGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="20" cy="20" r="20" fill="url(#radialGradient)" />
            <circle cx="80" cy="30" r="15" fill="url(#radialGradient)" />
            <circle cx="40" cy="70" r="25" fill="url(#radialGradient)" />
          </svg>
    </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Hello, {user?.username || 'User'} 👋</h1>
              <p className="text-indigo-100 max-w-xl opacity-90">Here's what's happening with your products today. Your inventory is looking healthy with {stats.totalProducts} products.</p>
            </div>
            
            {/* Glass-effect time range selector */}
            <div className="hidden md:flex items-center gap-1 p-1 bg-white/20 backdrop-blur-lg rounded-xl">
              {['daily', 'weekly', 'monthly'].map((range) => (
                <button
                  key={range}
                  onClick={() => setActiveTimeRange(range as 'daily'|'weekly'|'monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTimeRange === range
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Modern Glass-effect stat cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-5 border border-white/10 hover:bg-white/25 transition-all">
              <div className="flex justify-between items-center">
                <p className="text-sm text-white/80">Total Value</p>
                <span className="text-green-300 flex items-center text-sm font-medium">
                  {activeRangeData.valueChange} <TrendingUp size={14} className="ml-1" />
                </span>
              </div>
              <p className="text-2xl font-bold mt-2">${stats.totalValue.toFixed(2)}</p>
            </div>
            
            {/* Upload CSV Card */}
            <div 
              className="bg-white/20 backdrop-blur-md rounded-xl p-5 border border-white/10 hover:bg-white/25 transition-all cursor-pointer group"
              onClick={() => {
                navigate('/dashboard/products');
                sessionStorage.setItem('open_csv_import', 'true');
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80">Import Data</p>
                  <p className="text-base font-medium mt-2">Upload CSV File</p>
                </div>
                <div className="bg-white/30 rounded-full p-3 group-hover:scale-110 group-hover:bg-white/40 transition-all">
                  <Upload size={20} className="text-white" />
                </div>
              </div>
              <div className="mt-3 bg-white/10 h-1 rounded-full w-full overflow-hidden">
                <div className="h-1 bg-green-400/70 w-0 group-hover:w-full transition-all duration-500"></div>
              </div>
              <p className="text-xs mt-2 text-white/60">Click to open CSV importer</p>
            </div>
            
            {/* Download CSV Card */}
            <div
              className="bg-white/20 backdrop-blur-md rounded-xl p-5 border border-white/10 hover:bg-white/25 transition-all cursor-pointer group"
              onClick={() => {
                navigate('/dashboard/products');
                sessionStorage.setItem('trigger_csv_export', 'true');
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80">Export Data</p>
                  <p className="text-base font-medium mt-2">Download CSV File</p>
                </div>
                <div className="bg-white/30 rounded-full p-3 group-hover:scale-110 group-hover:bg-white/40 transition-all">
                  <Download size={20} className="text-white" />
                </div>
              </div>
              <div className="mt-3 bg-white/10 h-1 rounded-full w-full overflow-hidden">
                <div className="h-1 bg-blue-400/70 w-0 group-hover:w-full transition-all duration-500"></div>
              </div>
              <p className="text-xs mt-2 text-white/60">Click to download product data</p>
            </div>
          </div>
          
          <div className="mt-8 flex gap-3">
            <Link 
              to="/dashboard/products/new" 
              className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-opacity-90 transition-all px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl"
            >
              <PlusCircle size={18} />
              <span>Add Product</span>
            </Link>
            <Link 
              to="/dashboard/products" 
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all px-6 py-3 rounded-xl border border-white/10"
            >
              <Package size={18} />
              <span>View Products</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          // Dynamic color classes
          const getBgColor = (color: string, isDark: boolean) => {
            const colorMap: Record<string, string> = {
              'indigo': isDark ? 'bg-indigo-900/40' : 'bg-indigo-50',
              'purple': isDark ? 'bg-purple-900/40' : 'bg-purple-50',
              'emerald': isDark ? 'bg-emerald-900/40' : 'bg-emerald-50',
              'amber': isDark ? 'bg-amber-900/40' : 'bg-amber-50',
              'blue': isDark ? 'bg-blue-900/40' : 'bg-blue-50',
              'rose': isDark ? 'bg-rose-900/40' : 'bg-rose-50',
              'red': isDark ? 'bg-red-900/40' : 'bg-red-50'
            };
            return colorMap[color] || (isDark ? 'bg-gray-800' : 'bg-gray-100');
          };
          
          const getTextColor = (color: string, isDark: boolean) => {
            const colorMap: Record<string, string> = {
              'indigo': isDark ? 'text-indigo-400' : 'text-indigo-600',
              'purple': isDark ? 'text-purple-400' : 'text-purple-600',
              'emerald': isDark ? 'text-emerald-400' : 'text-emerald-600',
              'amber': isDark ? 'text-amber-400' : 'text-amber-600',
              'blue': isDark ? 'text-blue-400' : 'text-blue-600',
              'rose': isDark ? 'text-rose-400' : 'text-rose-600',
              'red': isDark ? 'text-red-400' : 'text-red-600'
            };
            return colorMap[color] || (isDark ? 'text-gray-400' : 'text-gray-600');
          };
          
          return (
            <div 
              key={index} 
              className={`p-6 rounded-2xl hover:shadow-lg transition-all duration-300 border group ${
                isDarkMode 
                  ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:border-gray-600' 
                  : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl ${getBgColor(stat.color, isDarkMode)}`}>
                  <stat.icon size={24} className={getTextColor(stat.color, isDarkMode)} />
            </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>{stat.title}</h3>
                  <p className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>{stat.value}</p>
                </div>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
              stat.change.startsWith('+') 
                    ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600' 
                    : isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'
            }`}>
              {stat.change}
            </span>
          </div>
              
              {/* Add a horizontal graph bar */}
              <div className={`h-1 rounded-full w-full mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div 
                  className={`h-1 rounded-full ${
                    stat.trend === 'up' 
                      ? isDarkMode ? `bg-${stat.color}-500` : `bg-${stat.color}-500` 
                      : isDarkMode ? 'bg-red-500' : 'bg-red-500'
                  }`}
                  style={{width: `${stat.trend === 'up' ? '75%' : '40%'}`}}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Dashboard main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Products Table with modern UI */}
          <div className={`rounded-2xl overflow-hidden border ${
            isDarkMode 
              ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50' 
              : 'bg-white border-gray-300'
          }`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className={`text-xl font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>Recent Products</h2>
                <Link 
                  to="/dashboard/products" 
                  className={`text-sm flex items-center gap-1 ${
                    isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
                  }`}
                >
                  <span>View all</span>
                  <ArrowUpRight size={14} />
                </Link>
        </div>
            </div>
            
            {recentProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Name</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Price</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Quantity</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Value</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Created By</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {recentProducts.map((product, index) => (
                      <tr 
                        key={product.id} 
                        className={`transition-colors hover:${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} group`}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}>
                          <Link 
                            to={`/dashboard/products/${product.id}`}
                            className="hover:text-indigo-500 transition-colors flex items-center"
                          >
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'][index % 5]
                            }`}></span>
                            <span className="group-hover:translate-x-0.5 transition-transform duration-150">{product.name}</span>
                          </Link>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>${product.price.toFixed(2)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap`}>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.quantity < 10 
                              ? isDarkMode ? 'bg-red-900/60 text-red-200' : 'bg-red-100 text-red-800'
                              : isDarkMode ? 'bg-green-900/60 text-green-200' : 'bg-green-100 text-green-800'
                          }`}>
                            {product.quantity}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                          isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                        }`}>
                          ${(product.price * product.quantity).toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>{product.createdBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`p-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="mb-3 flex justify-center">
                  <Package size={40} className="opacity-20" />
                </div>
                <p>No products found. Start adding some products!</p>
                <Link 
                  to="/dashboard/products/new" 
                  className="mt-4 inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlusCircle size={16} />
                  <span>Add Product</span>
                </Link>
              </div>
            )}
    </div>

          {/* Product Popularity Chart - Updated UI */}
          <div className={`rounded-2xl p-6 border ${
            isDarkMode 
              ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50' 
              : 'bg-white border-gray-300'
          }`}>
            <h2 className={`text-xl font-semibold mb-6 ${
        isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Top Products by Value</h2>
            
            {products.length > 0 ? (
              <ProductPopularityChart products={products} isDarkMode={isDarkMode} />
            ) : (
              <div className={`p-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>No product data available</p>
              </div>
            )}
          </div>
          
          {/* Product Category Distribution - Updated UI */}
          <div className={`rounded-2xl p-6 border ${
            isDarkMode 
              ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50' 
              : 'bg-white border-gray-300'
          }`}>
            <h2 className={`text-xl font-semibold mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Product Categories</h2>
            
            {products.length > 0 ? (
              <SimpleBarChart 
                data={generateChartData()} 
                isDarkMode={isDarkMode} 
              />
            ) : (
              <div className={`p-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>No product data available</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Sidebar content - 1 col */}
        <div className="space-y-6">
          {/* Quick Actions Card - Updated UI */}
          <div className={`p-6 rounded-2xl border ${
            isDarkMode 
              ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50' 
              : 'bg-white border-gray-300'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              <div className="flex items-center gap-2">
                <Zap className={isDarkMode ? 'text-amber-400' : 'text-amber-500'} size={20} /> 
                <span>Quick Actions</span>
              </div>
            </h3>
            <div className="space-y-3">
              <Link 
                to="/dashboard/products/new"
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-white hover:translate-x-1' 
                    : 'hover:bg-gray-50 text-gray-800 hover:translate-x-1'
                }`}
              >
                <div className="bg-indigo-100 dark:bg-indigo-900/60 p-3 rounded-xl">
                  <PlusCircle size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium">Add New Product</p>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Create a new product in the catalog</p>
                </div>
              </Link>
              <Link 
                to="/dashboard/products"
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-white hover:translate-x-1' 
                    : 'hover:bg-gray-50 text-gray-800 hover:translate-x-1'
                }`}
              >
                <div className="bg-purple-100 dark:bg-purple-900/60 p-3 rounded-xl">
                  <Filter size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">Search Products</p>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>Find products by name, price or quantity</p>
                </div>
              </Link>
              {user?.roles.includes('ROLE_ADMIN') && (
                <Link 
                  to="/dashboard/team"
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-white hover:translate-x-1' 
                      : 'hover:bg-gray-50 text-gray-800 hover:translate-x-1'
                  }`}
                >
                  <div className="bg-teal-100 dark:bg-teal-900/60 p-3 rounded-xl">
                    <UsersIcon size={20} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="font-medium">Manage Users</p>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Add, edit or remove user accounts</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
          
          {/* Product Insights - Updated Modern UI */}
          <div className={`p-6 rounded-2xl border ${
            isDarkMode 
              ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50' 
              : 'bg-white border-gray-300'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className={isDarkMode ? 'text-amber-400' : 'text-amber-500'} size={20} /> 
                <span>Product Insights</span>
              </div>
            </h3>
            
            {products.length > 0 ? (
      <div className="space-y-4">
                <div className={`p-5 rounded-xl border ${
                  isDarkMode ? 'border-gray-700 bg-gray-700/40' : 'border-gray-300 bg-gray-50/80'
                }`}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-green-100 dark:bg-green-900/60 rounded-lg">
                      <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
            </div>
                    <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Highest priced product</p>
          </div>
                  <p className={`font-medium text-lg mt-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {products.reduce((max, p) => p.price > max.price ? p : max, products[0]).name}
                  </p>
                  <p className="text-green-600 dark:text-green-400 font-medium text-xl">
                    ${products.reduce((max, p) => p.price > max.price ? p : max, products[0]).price.toFixed(2)}
                  </p>
      </div>
                
                <div className={`p-5 rounded-xl border ${
                  isDarkMode ? 'border-gray-700 bg-gray-700/40' : 'border-gray-300 bg-gray-50/80'
                }`}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-red-100 dark:bg-red-900/60 rounded-lg">
                      <Bell size={16} className="text-red-600 dark:text-red-400" />
                    </div>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Low stock alert</p>
                  </div>
                  <p className={`font-medium text-lg mt-2 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {products.reduce((min, p) => p.quantity < min.quantity ? p : min, products[0]).name}
                  </p>
                  <p className="text-red-600 dark:text-red-400 font-medium">
                    {products.reduce((min, p) => p.quantity < min.quantity ? p : min, products[0]).quantity} units remaining
                  </p>
                </div>
                
                <div className={`p-5 rounded-xl border ${
                  isDarkMode ? 'border-gray-700 bg-gray-700/40' : 'border-gray-300 bg-gray-50/80'
                }`}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/60 rounded-lg">
                      <DollarSign size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Total inventory value</p>
                  </div>
                  <p className="text-blue-600 dark:text-blue-400 font-medium text-xl mt-2">
                    ${products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mt-3">
                    <div className="bg-blue-500 h-2 rounded-full w-3/4"></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Target: $75,000</span>
                    <span>75%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-6 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <p>No product data available</p>
              </div>
            )}
          </div>
          
          {/* Recent Activity Feed - Updated UI */}
          <div className={`p-6 rounded-2xl shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              System Tools
            </h3>
            <div className="space-y-4">
              {isAdmin && (
                <>
                  <button
                    onClick={() => navigate('/dashboard/logs')}
                    className={`flex items-center justify-center w-full gap-3 py-3 px-4 rounded-lg font-medium transition-colors ${
                      isDarkMode 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                        : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800'
                    }`}
                  >
                    <Activity size={18} />
                    <span>View Business Application Logs</span>
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/menu-settings')}
                    className={`flex items-center justify-center w-full gap-3 py-3 px-4 rounded-lg font-medium transition-colors ${
                      isDarkMode 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-800'
                    }`}
                  >
                    <Settings size={18} />
                    <span>Manage Menu Items</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
    </div>
  </div>
  );
};

// Profile image uploader component for reuse in Profile and AddUser components
export const ProfileImageUploader = ({
  currentImage,
  onImageChange,
  isDarkMode
}: {
  currentImage?: string;
  onImageChange: (base64Image: string) => void;
  isDarkMode: boolean;
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | undefined>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (file: File) => {
    // Only process image files
    if (!file.type.match('image.*')) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setPreviewImage(reader.result);
        onImageChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      className={`relative ${currentImage ? '' : 'cursor-pointer'}`} 
      onClick={currentImage ? undefined : handleClick}
      onDragEnter={handleDrag}
    >
      {/* File Input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleChange}
      />
      
      {/* Drag & Drop Area / Preview */}
      <div 
        className={`flex flex-col items-center justify-center h-32 w-32 rounded-full ${
          dragActive 
            ? isDarkMode ? 'border-2 border-indigo-500' : 'border-2 border-indigo-500'
            : currentImage || previewImage
              ? ''
              : isDarkMode 
                ? 'border-4 border-gray-800 bg-gray-700' 
                : 'border-4 border-white bg-gray-200'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {previewImage ? (
          <img 
            src={previewImage} 
            alt="Profile preview" 
            className="h-32 w-32 rounded-full object-cover"
          />
        ) : (
          <UserCircle 
            size={96} 
            className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}
          />
        )}
        
        {/* Upload/Change overlay */}
        <div 
          className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity`}
        >
          <div className="text-white text-sm font-medium text-center">
            <Upload size={20} className="mx-auto mb-1" />
            {previewImage ? 'Change' : 'Upload'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile component for user settings
const Profile = () => {
  const { isDarkMode } = useTheme();
  const { user, setupMFA, verifyMFA, disableMFA } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [mfaSetup, setMfaSetup] = useState({
    secretKey: '',
    qrCodeUrl: '',
    verificationCode: '',
    recoveryCodes: [] as string[]
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [profileImage, setProfileImage] = useState<string | undefined>(user?.profileImage);
  const [isUploading, setIsUploading] = useState(false);
  const [imageSuccess, setImageSuccess] = useState('');
  
  // Determine the primary role (admin or user)
  const primaryRole = user?.roles.find(role => 
    role.toLowerCase().includes('admin')
  ) || user?.roles[0] || 'User';

  const handleProfileImageChange = async (base64Image: string) => {
    if (!user?.id) return;
    
    try {
      setIsUploading(true);
      setError('');
      setImageSuccess('');
      
      // Update the profile image in the backend
      await userService.updateProfileImage(user.id, { profileImage: base64Image });
      
      // Update local state
      setProfileImage(base64Image);
      setImageSuccess('Profile image updated successfully');
      
      // Refresh user data to make sure it's available in other components
      try {
        const userData = await authService.getUserData("");
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        
        // For real-time UI update without page reload, could add a context update here
        // For simplicity, we'll use a page reload after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (refreshError) {
        console.error("Error refreshing user data:", refreshError);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setImageSuccess('');
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to update profile image');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    
    if (!passwordRegex.test(passwordForm.newPassword)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setSuccess('Password changed successfully');
      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleInitiateMfaSetup = async () => {
    try {
      // If MFA is already enabled, don't try to set it up again
      if (user?.mfaEnabled) {
        setError('MFA is already enabled for your account');
        return;
      }

      const response = await setupMFA();
      setMfaSetup({
        secretKey: response.secretKey,
        qrCodeUrl: response.qrCodeUrl,
        verificationCode: '',
        recoveryCodes: response.recoveryCodes || []
      });
      setActiveTab('mfa');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to initiate MFA setup';
      setError(errorMessage);
    }
  };

  const handleVerifyMfaSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await verifyMFA(parseInt(mfaSetup.verificationCode));
      setMfaSetup(prevState => ({
        ...prevState,
        recoveryCodes: response.recoveryCodes || []
      }));
      setSuccess('MFA setup completed successfully');
      setActiveTab('profile');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to verify MFA setup';
      setError(errorMessage);
    }
  };

  const handleDisableMfa = async () => {
    try {
      setError('');
      setSuccess('');

      if (!showPrompt) {
        setShowPrompt(true);
        return;
      }

      if (!verificationCode || verificationCode.length !== 6) {
        setError('Please enter a valid 6-digit code');
        return;
      }

      await disableMFA(parseInt(verificationCode));
      setSuccess('MFA has been disabled');
      setShowPrompt(false);
      setVerificationCode('');
      setMfaSetup({
        secretKey: '',
        qrCodeUrl: '',
        verificationCode: '',
        recoveryCodes: []
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to disable MFA';
      setError(errorMessage);
    }
  };
  
  return (
  <div className="max-w-4xl mx-auto space-y-8">
    <div className={`rounded-2xl shadow-sm overflow-hidden ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600" />
      <div className="px-8 pb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 space-y-4 sm:space-y-0 sm:space-x-6">
          <div className={`flex items-center justify-center h-32 w-32 rounded-full border-4 ${
            isDarkMode ? 'border-gray-800 bg-gray-700' : 'border-white bg-gray-200'
          }`}>
            <ProfileImageUploader
              currentImage={profileImage}
              onImageChange={handleProfileImageChange}
              isDarkMode={isDarkMode}
            />
          </div>
          <div className="flex-1">
            <h1 className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {user?.username || 'User'}
            </h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              {primaryRole.replace('ROLE_', '')} at ProductHub
            </p>
            {imageSuccess && (
              <p className={`mt-1 text-sm ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {imageSuccess}
              </p>
            )}
            {error && activeTab === 'profile' && (
              <p className={`mt-1 text-sm ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                {error}
              </p>
            )}
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            Edit Profile
          </button>
        </div>
      </div>
    </div>

    {/* Tabs Navigation */}
    <div className="flex space-x-4 mb-6">
      {['Profile', 'Password', 'MFA'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab.toLowerCase())}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === tab.toLowerCase()
              ? isDarkMode 
                ? 'bg-indigo-700 text-white' 
                : 'bg-indigo-100 text-indigo-600'
              : isDarkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>

    {/* Profile Information Tab */}
    {activeTab === 'profile' && (
    <div className="grid grid-cols-1 gap-8">
      <div className={`rounded-2xl shadow-sm ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
          <h2 className={`text-xl font-semibold flex items-center gap-2 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <UserCircle className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={20} />
            Account Information
          </h2>
          </div>
        <div className="p-6 space-y-4">
          <div className={`rounded-lg overflow-hidden ${
            isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
          }`}>
            <div className={`p-4 ${
              isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <UserIcon className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={16} />
          </div>
                <span className={`font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Username</span>
          </div>
              <div className={`pl-10 font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>{user?.username || 'N/A'}</div>
          </div>
            
            <div className={`p-4 ${
              isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <Mail className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={16} />
          </div>
                <span className={`font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Email</span>
        </div>
              <div className={`pl-10 font-semibold break-words ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>{user?.email || 'N/A'}</div>
      </div>

            <div className={`p-4 ${
              isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <Shield className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={16} />
                </div>
                <span className={`font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Role</span>
              </div>
              <div className={`pl-10 font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>{primaryRole}</div>
            </div>
            
            <div className={`p-4 ${
              isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <ShieldCheck className={isDarkMode ? 'text-green-400' : 'text-green-500'} size={16} />
                </div>
                <span className={`font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>MFA Status</span>
              </div>
              <div className="pl-10">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.mfaEnabled
                    ? isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                    : isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <Clock className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={16} />
                </div>
                <span className={`font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Last Login</span>
              </div>
              <div className={`pl-10 font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>{new Date().toLocaleDateString()}</div>
            </div>
          </div>
          
          <button className={`w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 hover:bg-gray-650 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}>
            <PencilIcon size={16} />
            Edit Profile
          </button>
        </div>
      </div>
    </div>
    )}

    {/* Password Change Tab */}
    {activeTab === 'password' && (
      <div className={`rounded-2xl shadow-sm ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
          <h2 className={`text-xl font-semibold flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <Key className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={20} />
            Change Password
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
        {error && (
            <div className={`p-4 rounded-lg border flex items-start gap-3 ${
              isDarkMode ? 'bg-red-900/20 border-red-900/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="p-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/70 dark:text-red-300 mt-0.5">
                <AlertCircle size={16} />
              </div>
              <div className="flex-1">{error}</div>
          </div>
        )}
        
        {success && (
            <div className={`p-4 rounded-lg border flex items-start gap-3 ${
              isDarkMode ? 'bg-green-900/20 border-green-900/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <div className="p-1 rounded-full bg-green-100 text-green-600 dark:bg-green-900/70 dark:text-green-300 mt-0.5">
                <CheckCircle size={16} />
              </div>
              <div className="flex-1">{success}</div>
          </div>
        )}
        
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className={`p-5 rounded-lg ${
              isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
            }`}>
              <h3 className={`text-sm font-medium mb-4 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Current Password</h3>
              
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} size={18} />
            <input
              type="password"
              id="currentPassword"
                  placeholder="Enter your current password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
              required
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 ${
                isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500'
              }`}
            />
              </div>
          </div>
          
            <div className={`p-5 rounded-lg ${
              isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
            }`}>
              <h3 className={`text-sm font-medium mb-4 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>New Password</h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <Key className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`} size={18} />
            <input
              type="password"
              id="newPassword"
                    placeholder="Enter new password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
              required
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 ${
                isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500'
              }`}
            />
          </div>
          
                {/* Password strength indicators */}
                {passwordForm.newPassword && (
                  <div className="mt-3 space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>Password Strength</span>
                      
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        passwordForm.newPassword.length >= 8 &&
                        /[A-Z]/.test(passwordForm.newPassword) &&
                        /[a-z]/.test(passwordForm.newPassword) &&
                        /[0-9]/.test(passwordForm.newPassword) &&
                        /[^A-Za-z0-9]/.test(passwordForm.newPassword)
                          ? isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                          : passwordForm.newPassword.length >= 8 &&
                            ((/[A-Z]/.test(passwordForm.newPassword) && /[a-z]/.test(passwordForm.newPassword)) ||
                             (/[0-9]/.test(passwordForm.newPassword) && /[^A-Za-z0-9]/.test(passwordForm.newPassword)))
                            ? isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                            : isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                      }`}>
                        {passwordForm.newPassword.length >= 8 &&
                         /[A-Z]/.test(passwordForm.newPassword) &&
                         /[a-z]/.test(passwordForm.newPassword) &&
                         /[0-9]/.test(passwordForm.newPassword) &&
                         /[^A-Za-z0-9]/.test(passwordForm.newPassword)
                          ? 'Strong'
                          : passwordForm.newPassword.length >= 8 &&
                            ((/[A-Z]/.test(passwordForm.newPassword) && /[a-z]/.test(passwordForm.newPassword)) ||
                             (/[0-9]/.test(passwordForm.newPassword) && /[^A-Za-z0-9]/.test(passwordForm.newPassword)))
                            ? 'Medium'
                            : 'Weak'}
                      </span>
                    </div>
                    
                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          passwordForm.newPassword.length >= 8 &&
                          /[A-Z]/.test(passwordForm.newPassword) &&
                          /[a-z]/.test(passwordForm.newPassword) &&
                          /[0-9]/.test(passwordForm.newPassword) &&
                          /[^A-Za-z0-9]/.test(passwordForm.newPassword)
                            ? 'bg-green-500 w-full'
                            : passwordForm.newPassword.length >= 8 &&
                              ((/[A-Z]/.test(passwordForm.newPassword) && /[a-z]/.test(passwordForm.newPassword)) ||
                               (/[0-9]/.test(passwordForm.newPassword) && /[^A-Za-z0-9]/.test(passwordForm.newPassword)))
                              ? 'bg-yellow-500 w-2/3'
                              : 'bg-red-500 w-1/3'
                        }`}
                      ></div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      <div className={`flex items-center gap-2 text-xs ${
                        passwordForm.newPassword.length >= 8
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        <div className={`p-0.5 rounded-full ${
                          passwordForm.newPassword.length >= 8
                            ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                            : isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {passwordForm.newPassword.length >= 8 ? <CheckCircle size={12} /> : <Circle size={12} />}
                        </div>
                        <span>At least 8 characters</span>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-xs ${
                        /[A-Z]/.test(passwordForm.newPassword)
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        <div className={`p-0.5 rounded-full ${
                          /[A-Z]/.test(passwordForm.newPassword)
                            ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                            : isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {/[A-Z]/.test(passwordForm.newPassword) ? <CheckCircle size={12} /> : <Circle size={12} />}
                        </div>
                        <span>Uppercase letter</span>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-xs ${
                        /[a-z]/.test(passwordForm.newPassword)
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        <div className={`p-0.5 rounded-full ${
                          /[a-z]/.test(passwordForm.newPassword)
                            ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                            : isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {/[a-z]/.test(passwordForm.newPassword) ? <CheckCircle size={12} /> : <Circle size={12} />}
                        </div>
                        <span>Lowercase letter</span>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-xs ${
                        /[0-9]/.test(passwordForm.newPassword)
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        <div className={`p-0.5 rounded-full ${
                          /[0-9]/.test(passwordForm.newPassword)
                            ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                            : isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {/[0-9]/.test(passwordForm.newPassword) ? <CheckCircle size={12} /> : <Circle size={12} />}
                        </div>
                        <span>Number</span>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-xs ${
                        /[^A-Za-z0-9]/.test(passwordForm.newPassword)
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        <div className={`p-0.5 rounded-full ${
                          /[^A-Za-z0-9]/.test(passwordForm.newPassword)
                            ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                            : isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? <CheckCircle size={12} /> : <Circle size={12} />}
                        </div>
                        <span>Special character</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="relative mt-4">
                  <CheckCircle className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`} size={18} />
            <input
              type="password"
              id="confirmNewPassword"
                    placeholder="Confirm new password"
              value={passwordForm.confirmNewPassword}
              onChange={(e) => setPasswordForm({...passwordForm, confirmNewPassword: e.target.value})}
              required
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 ${
                isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white focus:ring-indigo-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-indigo-500'
                    } ${
                      passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword
                        ? isDarkMode ? 'border-red-500' : 'border-red-500'
                        : passwordForm.confirmNewPassword && passwordForm.newPassword === passwordForm.confirmNewPassword
                          ? isDarkMode ? 'border-green-500' : 'border-green-500'
                          : ''
              }`}
            />
                  
                  {passwordForm.confirmNewPassword && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {passwordForm.newPassword === passwordForm.confirmNewPassword ? (
                        <CheckCircle className="text-green-500" size={18} />
                      ) : (
                        <XCircle className="text-red-500" size={18} />
                      )}
                    </div>
                  )}
                </div>
                
                {passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
          </div>
          
          <button 
            type="submit" 
              disabled={
                !passwordForm.currentPassword ||
                !passwordForm.newPassword ||
                !passwordForm.confirmNewPassword ||
                passwordForm.newPassword !== passwordForm.confirmNewPassword ||
                !(passwordForm.newPassword.length >= 8 &&
                /[A-Z]/.test(passwordForm.newPassword) &&
                /[a-z]/.test(passwordForm.newPassword) &&
                /[0-9]/.test(passwordForm.newPassword) &&
                /[^A-Za-z0-9]/.test(passwordForm.newPassword))
              }
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                !passwordForm.currentPassword ||
                !passwordForm.newPassword ||
                !passwordForm.confirmNewPassword ||
                passwordForm.newPassword !== passwordForm.confirmNewPassword ||
                !(passwordForm.newPassword.length >= 8 &&
                /[A-Z]/.test(passwordForm.newPassword) &&
                /[a-z]/.test(passwordForm.newPassword) &&
                /[0-9]/.test(passwordForm.newPassword) &&
                /[^A-Za-z0-9]/.test(passwordForm.newPassword))
                  ? isDarkMode 
                    ? 'bg-gray-700 text-gray-300 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Save size={18} />
              Update Password
          </button>
        </form>
        </div>
      </div>
    )}

    {/* MFA Setup Tab */}
    {activeTab === 'mfa' && (
      <div className={`rounded-2xl shadow-sm ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
          <h2 className={`text-xl font-semibold flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            <ShieldCheck className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={20} />
            Multi-Factor Authentication
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
        {error && (
            <div className={`p-4 rounded-lg border flex items-start gap-3 ${
              isDarkMode ? 'bg-red-900/20 border-red-900/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="p-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/70 dark:text-red-300 mt-0.5">
                <AlertCircle size={16} />
              </div>
              <div className="flex-1">{error}</div>
          </div>
        )}
        
        {success && (
            <div className={`p-4 rounded-lg border flex items-start gap-3 ${
              isDarkMode ? 'bg-green-900/20 border-green-900/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <div className="p-1 rounded-full bg-green-100 text-green-600 dark:bg-green-900/70 dark:text-green-300 mt-0.5">
                <CheckCircle size={16} />
              </div>
              <div className="flex-1">{success}</div>
          </div>
        )}
          
          {/* MFA Status Card */}
          <div className={`p-5 rounded-xl border ${
            isDarkMode 
              ? user?.mfaEnabled ? 'bg-green-900/10 border-green-900/30' : 'bg-yellow-900/10 border-yellow-900/30'
              : user?.mfaEnabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${
                user?.mfaEnabled
                  ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                  : isDarkMode ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
              }`}>
                {user?.mfaEnabled ? <ShieldCheck size={20} /> : <Unlock size={20} />}
              </div>
              <div>
                <h3 className={`font-medium ${
                  user?.mfaEnabled
                    ? isDarkMode ? 'text-green-300' : 'text-green-700'
                    : isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  {user?.mfaEnabled ? 'MFA is enabled' : 'MFA is not enabled'}
                </h3>
                <p className={`text-sm mt-1 ${
                  user?.mfaEnabled
                    ? isDarkMode ? 'text-green-300/70' : 'text-green-600/70'
                    : isDarkMode ? 'text-yellow-300/70' : 'text-yellow-600/70'
                }`}>
                  {user?.mfaEnabled 
                    ? 'Your account is protected with an additional layer of security.' 
                    : 'Enable multi-factor authentication to add an extra layer of security to your account.'}
                </p>
              </div>
            </div>
          </div>
        
        {/* MFA Setup Initialization - Only show when MFA is disabled */}
        {!user?.mfaEnabled && !mfaSetup.secretKey && (
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
            }`}>
              <div className="space-y-4">
                <h3 className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>How it works</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-white'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isDarkMode ? 'bg-indigo-900/70 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                      }`}>1</div>
                      <span className={`font-medium ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-800'
                      }`}>Setup</span>
                    </div>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Scan a QR code with your authenticator app</p>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-white'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isDarkMode ? 'bg-indigo-900/70 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                      }`}>2</div>
                      <span className={`font-medium ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-800'
                      }`}>Verify</span>
                    </div>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Enter the code from your authenticator app</p>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-white'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isDarkMode ? 'bg-indigo-900/70 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                      }`}>3</div>
                      <span className={`font-medium ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-800'
                      }`}>Secure</span>
                    </div>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>Save recovery codes as a backup</p>
                  </div>
                </div>
                
            <button 
              onClick={handleInitiateMfaSetup}
                  className="w-full flex items-center justify-center gap-2 mt-6 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
                  <Shield size={18} />
              Set Up MFA
            </button>
              </div>
          </div>
        )}
        
        {/* MFA QR Code Setup */}
        {!user?.mfaEnabled && mfaSetup.secretKey && !mfaSetup.recoveryCodes.length && (
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
            }`}>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <QrCode className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={20} />
                    <h3 className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Scan QR Code</h3>
                  </div>
                  
                  <div className={`p-4 rounded-lg flex justify-center ${
                    isDarkMode ? 'bg-white' : 'bg-white'
                  }`}>
              {mfaSetup.qrCodeUrl && (
                <img 
                  src={mfaSetup.qrCodeUrl} 
                  alt="MFA QR Code" 
                        className="max-w-full h-auto"
                      />
                    )}
                  </div>
                  
                  <div className={`p-3 rounded-lg text-xs ${
                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <p className="font-medium mb-1">Manual setup:</p>
                    <p className="select-all font-mono break-all">{mfaSetup.secretKey}</p>
                  </div>
                  
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Open Google Authenticator, Microsoft Authenticator, Authy, or another authentication app and scan the QR code.
                  </p>
            </div>
            
            <form onSubmit={handleVerifyMfaSetup} className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={20} />
                    <h3 className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>Verify Setup</h3>
                  </div>
                  
              <div>
                    <label className={`block text-sm mb-4 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                  Enter the 6-digit code from your authenticator app
                </label>
                <OTPInput
                  length={6}
                  value={mfaSetup.verificationCode}
                  onChange={(value) => setMfaSetup(prev => ({ ...prev, verificationCode: value }))}
                  isDarkMode={isDarkMode}
                />
              </div>
              
              <button 
                type="submit" 
                    disabled={mfaSetup.verificationCode.length !== 6}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                      mfaSetup.verificationCode.length !== 6
                        ? isDarkMode 
                          ? 'bg-gray-700 text-gray-300 cursor-not-allowed' 
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <ShieldCheck size={18} />
                Verify and Enable MFA
              </button>
            </form>
              </div>
          </div>
        )}
        
        {/* Recovery Codes Display */}
        {!user?.mfaEnabled && mfaSetup.recoveryCodes.length > 0 && (
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
            }`}>
          <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Key className={isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} size={20} />
                  <h3 className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Recovery Codes</h3>
                </div>
                
                <div className={`p-4 rounded-lg border ${
                  isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/70 dark:text-yellow-300 mt-0.5">
                      <AlertCircle size={16} />
                    </div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <p className="font-medium">Important: Save these recovery codes</p>
                      <p className="mt-1">Each code can be used once to sign in if you lose access to your authentication app. Store them in a secure password manager.</p>
                    </div>
                  </div>
                </div>
                
                <div className={`rounded-lg border overflow-hidden ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className={`p-3 font-medium text-sm ${
                    isDarkMode ? 'bg-gray-700 text-gray-300 border-b border-gray-600' : 'bg-gray-100 text-gray-700 border-b border-gray-200'
                  }`}>
                    Recovery codes (click to copy)
                  </div>
                  
                  <div className={`p-4 grid grid-cols-2 md:grid-cols-5 gap-3 ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  }`}>
              {mfaSetup.recoveryCodes.map((code, index) => (
                <div 
                  key={index} 
                        className={`p-3 text-center rounded-lg font-mono text-sm cursor-pointer hover:opacity-80 ${
                    isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                  }`}
                        onClick={() => {
                          navigator.clipboard.writeText(code);
                        }}
                >
                  {code}
                </div>
              ))}
                  </div>
            </div>
            
            <button 
              onClick={() => setActiveTab('profile')}
                  className="w-full flex items-center justify-center gap-2 mt-6 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
                  <CheckSquare size={18} />
              Complete MFA Setup
            </button>
              </div>
          </div>
        )}
        
        {/* Disable MFA Option - Only show when MFA is enabled */}
        {user?.mfaEnabled && (
            <div className={`p-6 rounded-xl ${
              isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
            }`}>
          <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <ShieldOff className={isDarkMode ? 'text-red-400' : 'text-red-500'} size={20} />
                  <h3 className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Disable MFA</h3>
              </div>
                
                <div className={`p-4 rounded-lg border ${
                  isDarkMode ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-red-100 text-red-600 dark:bg-red-900/70 dark:text-red-300 mt-0.5">
                      <AlertCircle size={16} />
                    </div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-red-300' : 'text-red-700'
                    }`}>
                      <p className="font-medium">Warning: Reduced security</p>
                      <p className="mt-1">Disabling multi-factor authentication will make your account more vulnerable to unauthorized access.</p>
                    </div>
                  </div>
            </div>
              
              {showPrompt ? (
                  <div className="space-y-5">
                    <label className={`block text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                    Enter the 6-digit code from your authenticator app to confirm
                  </label>
                  <OTPInput
                    length={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                    isDarkMode={isDarkMode}
                  />
                    <div className="flex gap-4 mt-6">
                    <button 
                      onClick={() => {
                        setShowPrompt(false);
                        setVerificationCode('');
                      }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium ${
                          isDarkMode 
                            ? 'bg-gray-700 text-white hover:bg-gray-600' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <X size={18} />
                      Cancel
                    </button>
                    <button 
                      onClick={handleDisableMfa}
                        disabled={verificationCode.length !== 6}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                          verificationCode.length !== 6
                            ? isDarkMode 
                              ? 'bg-gray-700 text-gray-300 cursor-not-allowed' 
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        <ShieldOff size={18} />
                      Disable MFA
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowPrompt(true)}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                    <ShieldOff size={18} />
                  Disable Multi-Factor Authentication
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    )}
  </div>
  );
};

// Main Dashboard component
const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Check if user is admin
  const isAdmin = user?.roles.some(role => 
    role === 'ROLE_ADMIN' || role === 'ADMIN'
  );

  // Get percentage changes to display
  const getChangePercentage = (stat: string) => {
    const changes = {
      totalProducts: '+8%',
      totalUsers: '+12%',
      avgPrice: '+2%',
      lowStockItems: '-5%',
      myProducts: '+15%',
      totalValue: '+9%'
    };
    return changes[stat as keyof typeof changes] || '+0%';
  };

  // Fetch data for the quick stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        // Fetch products data for product count and value
        const productsData = await productService.getAll('');
        
        // Handle paginated response properly
        let productsList: Product[] = [];
        if (Array.isArray(productsData)) {
          productsList = productsData;
        } else if (productsData.content) {
          productsList = productsData.content;
        }
        
        setProductCount(productsList.length);
        
        // Calculate value safely with typed parameters
        const value = productsList.reduce(
          (sum: number, p: Product) => sum + (p.price * p.quantity), 
          0
        );
        setTotalValue(value);
        
        // Calculate low stock items (items with quantity < 10)
        const lowStock = productsList.filter(
          (p: Product) => p.quantity < 10
        ).length;
        setLowStockCount(lowStock);
        
        // Fetch users if admin
        if (isAdmin) {
          const usersData = await userService.getAllUsers();
          setUserCount(usersData.length);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [isAdmin]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className={`min-h-screen ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        {/* Mobile sidebar toggle */}
        <div className={`lg:hidden fixed top-0 left-0 right-0 z-10 p-4 flex justify-between items-center shadow-sm ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center gap-2">
            <Code2 size={24} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
            <span className="text-xl font-bold">ProductHub</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-lg ${
              isDarkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Sidebar */}
        <aside 
          className={`fixed inset-y-0 left-0 z-20 w-72 transform transition-all duration-300 ease-in-out shadow-xl ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${
            isDarkMode ? 'bg-gradient-to-b from-gray-800 via-gray-800 to-gray-900 border-r border-gray-700/50' : 'bg-gradient-to-b from-white via-white to-gray-50 border-r border-gray-200/70'
          }`}
        >
          {/* Sidebar header with animated logo */}
          <div className="pt-6 px-6">
            <div className="flex items-center gap-3 mb-8 group">
              <div className="relative">
                <Code2 size={32} className={`transition-all duration-300 transform group-hover:rotate-12 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <div className={`absolute -inset-1 bg-indigo-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">ProductHub</h1>
            </div>
            
            {/* User profile card */}
            <div className={`relative mb-8 p-4 rounded-xl overflow-hidden transition-all ${
              isDarkMode 
                ? 'bg-gradient-to-br from-gray-700/70 to-gray-800/70 border border-gray-700/50' 
                : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200/70'
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex items-center gap-3">
                <div 
                  className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center ${
                    isDarkMode ? 'bg-indigo-600/30 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                  }`}
                  onClick={() => user && navigate('/dashboard/profile')}
                  style={{ cursor: 'pointer' }}
                >
                  {user?.profileImage && user.profileImage.length > 0 ? (
                    <img
                      src={user.profileImage}
                      alt={`${user.username}'s profile`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', e);
                        // Fallback to letter on error
                        e.currentTarget.style.display = 'none';
                        // Remove this line if it causes issues
                      }}
                    />
                  ) : (
                    <span className="text-lg font-bold">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {user?.username || 'User'}
                  </h3>
                  <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.email || 'user@example.com'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {user?.roles?.map((role, index) => (
                      <span key={index} className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        role.includes('ADMIN') 
                          ? isDarkMode ? 'bg-purple-600/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                          : isDarkMode ? 'bg-blue-600/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {role.replace('ROLE_', '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation with interaction effects */}
            <nav className="space-y-1.5">
              {([
                { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, badge: ''},
                { name: 'Products', path: '/dashboard/products', icon: Package, badge: productCount > 0 ? productCount.toString() : '' },
                ...(isAdmin ? [
                  { name: 'Team Members', path: '/dashboard/team', icon: UsersIcon, badge: userCount > 0 ? userCount.toString() : '' }
                ] : []),
                { name: 'Chat', path: '/dashboard/chat', icon: MessageSquare, badge: '' },
                { name: 'Profile', path: '/dashboard/profile', icon: UserCircle, badge: '' },
              ] as NavItem[]).map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                <Link
                  key={index}
                  to={item.path}
                    className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden ${
                      isActive
                      ? isDarkMode 
                          ? 'bg-indigo-600/20 text-indigo-300 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-indigo-500' 
                          : 'bg-indigo-50 text-indigo-700 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-indigo-500'
                      : isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700/50' 
                        : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                    <div className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-indigo-500' : ''}`}>
                  <item.icon size={20} />
                    </div>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                        isDarkMode ? 'bg-indigo-600/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                </Link>
                );
              })}
            </nav>
            
            {/* Quick Stats Section */}
            <div className={`mt-8 px-3 pt-4 border-t ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
              <h3 className={`text-xs font-medium mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>QUICK STATS</h3>
              <div className="space-y-2">
                <div 
                  className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} transition-all duration-300 hover:shadow-md`}
                  onClick={() => navigate('/dashboard/products')}
                  role="button"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Low Stock Items</span>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      {getChangePercentage('lowStockItems')}
                    </span>
          </div>
                  <div className="flex items-center gap-2">
                    <Bell size={16} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {!isLoading && lowStockCount ? lowStockCount : '...'}
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>

                <div 
                  className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} transition-all duration-300 hover:shadow-md`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inventory Value</span>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {getChangePercentage('totalValue')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {!isLoading && totalValue ? `$${totalValue.toFixed(2)}` : '$...'}
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar footer with theme toggle and logout */}
          <div className={`absolute bottom-0 w-full p-6 border-t backdrop-blur-sm ${
            isDarkMode ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200/50 bg-white/30'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Appearance</span>
              <ThemeToggle minimal />
            </div>
            <button 
              onClick={handleLogout}
              className={`flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-200' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>
        
        {/* Main content */}
        <div className="pt-16 lg:pt-0 lg:pl-72">
          <div className={`h-full flex-grow p-6 overflow-auto ${
            isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
          }`}>
            <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<DashboardContent />} />
              <Route path="/products/*" element={<ProductRoutes />} />
              {isAdmin && (
                <>
                  <Route path="/team" element={<TeamMembers />} />
                  <Route path="/team/add-user" element={<AddUser />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/menu-settings" element={<MenuSettings />} />
                </>
              )}
              <Route path="/chat" element={<ChatList />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;