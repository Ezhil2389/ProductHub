import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowPathIcon, 
  BoltIcon, 
  ClockIcon, 
  CpuChipIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  BeakerIcon,
  PlayIcon,
  StopIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { 
  ConnectionPoolMetrics, 
  PoolConfigUpdate,
  connectionPoolService 
} from '../services/connectionPoolService';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, TooltipProps
} from 'recharts';
import { toast } from 'react-toastify';

// Interface for simulation state
interface SimulationState {
  isRunning: boolean;
  concurrentRequests: number;
  requestDuration: number;
  interval: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  responseTimeData: Array<{
    timestamp: number;
    responseTime: number;
  }>;
  intervalId?: number;
  scenarioType: 'custom' | 'overflow' | 'optimal';
}

const ConnectionPool: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // States for metrics, historical data, and loading status
  const [metrics, setMetrics] = useState<ConnectionPoolMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{
    timestamp: number;
    active: number;
    idle: number;
    total: number;
    waiting: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<PoolConfigUpdate>({});
  const [isConfigFormOpen, setIsConfigFormOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [isRefreshing, setIsRefreshing] = useState(true);
  
  // Simulation state
  const [simulation, setSimulation] = useState<SimulationState>({
    isRunning: false,
    concurrentRequests: 10,
    requestDuration: 500,
    interval: 1000,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    responseTimeData: [],
    scenarioType: 'custom'
  });
  const [showSimulation, setShowSimulation] = useState(false);
  const [showTips, setShowTips] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.roles?.some(role => 
    role === 'ROLE_ADMIN' || role === 'ADMIN'
  );
  
  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      toast.error('Access denied: Admin privileges required');
    }
  }, [isAdmin, navigate]);
  
  // Function to fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const data = await connectionPoolService.getMetrics();
      
      // Add visual indication of change if values have changed
      if (metrics) {
        data.activeChanged = data.activeConnections !== metrics.activeConnections;
        data.idleChanged = data.idleConnections !== metrics.idleConnections;
        data.waitingChanged = data.threadsAwaitingConnection !== metrics.threadsAwaitingConnection;
      }
      
      setMetrics(data);
      
      // Update historical data
      setHistoricalData(prev => {
        const now = Date.now();
        
        // Only keep the last 20 data points
        const newDataPoint = {
          timestamp: now,
          active: data.activeConnections,
          idle: data.idleConnections,
          total: data.totalConnections,
          waiting: data.threadsAwaitingConnection
        };
        
        const MAX_POINTS = 20;
        return [...prev, newDataPoint].slice(-MAX_POINTS);
      });
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch connection pool metrics');
      console.error('Error fetching connection pool metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [metrics]);
  
  // Refresh metrics periodically (outside simulation)
  useEffect(() => {
    // Initial fetch
    fetchMetrics();
    
    let intervalId: number | undefined;
    
    if (isRefreshing && !simulation.isRunning) { // Only run this interval if not simulating
      intervalId = window.setInterval(() => fetchMetrics(), refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    // Re-added dependencies: isRefreshing, simulation.isRunning, fetchMetrics, refreshInterval
  }, [isRefreshing, simulation.isRunning, fetchMetrics, refreshInterval]);
  
  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulation.isRunning && simulation.intervalId) {
        window.clearInterval(simulation.intervalId);
      }
    };
  }, [simulation.isRunning, simulation.intervalId]);
  
  // Handle form changes
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfigForm(prev => ({
      ...prev,
      [name]: parseInt(value, 10)
    }));
  };
  
  // Handle form submission
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await connectionPoolService.updateConfig(configForm);
      toast.success('Connection pool configuration updated');
      setConfigForm({});
      setIsConfigFormOpen(false);
      fetchMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update configuration');
    }
  };
  
  // Handle soft reset
  const handleSoftReset = async () => {
    try {
      await connectionPoolService.softReset();
      toast.success('Connection pool reset initiated');
      fetchMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset connection pool');
    }
  };
  
  // Handle log status
  const handleLogStatus = async () => {
    try {
      await connectionPoolService.logStatus();
      toast.success('Connection pool status logged to server logs');
      fetchMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log connection pool status');
    }
  };
  
  // Format timestamp for tooltip
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Simulation functions
  const startSimulation = () => {
    if (simulation.isRunning) return;
    
    // Reset stats at start
    setSimulation(prev => ({
      ...prev,
      isRunning: true,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      responseTimeData: []
    }));
    
    toast.info(`Starting ${simulation.scenarioType === 'custom' ? 'custom' : simulation.scenarioType} simulation with ${simulation.concurrentRequests} concurrent requests`);
    
    // Create interval for simulation batch execution AND metric fetching
    const intervalId = window.setInterval(() => {
      // Fetch metrics *before* running the batch to get the current state
      fetchMetrics(); 
      runSimulationBatch();
    }, simulation.interval);
    
    // Store interval ID in state for cleanup
    setSimulation(prev => ({ ...prev, intervalId: intervalId as unknown as number }));
  };
  
  const stopSimulation = () => {
    if (!simulation.isRunning) return;
    
    // Clear the interval
    if (simulation.intervalId) {
      window.clearInterval(simulation.intervalId);
    }
    
    setSimulation(prev => ({ ...prev, isRunning: false, intervalId: undefined }));
    toast.info('Simulation stopped');
  };
  
  const runSimulationBatch = async () => {
    // Create an array of promises for concurrent requests
    const requests = Array(simulation.concurrentRequests).fill(0).map(() => {
      return simulateRequest();
    });
    
    // Run all requests concurrently
    const results = await Promise.allSettled(requests);
    
    // Update simulation stats
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const responseTimes = results
      .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
      .map(r => r.value);
    
    const avgTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    // Update state with results
    setSimulation(prev => {
      const newTotal = prev.totalRequests + simulation.concurrentRequests;
      const newSuccessful = prev.successfulRequests + successful;
      const newFailed = prev.failedRequests + failed;
      const newAvgTime = ((prev.avgResponseTime * prev.successfulRequests) + (avgTime * successful)) / 
                          (prev.successfulRequests + successful || 1); // Avoid division by zero
      
      // Add to response time data for the chart
      const newResponseTimeData = [...prev.responseTimeData, {
        timestamp: Date.now(),
        responseTime: avgTime
      }].slice(-20); // Keep only last 20 data points
      
      return {
        ...prev,
        totalRequests: newTotal,
        successfulRequests: newSuccessful,
        failedRequests: newFailed,
        avgResponseTime: newAvgTime,
        responseTimeData: newResponseTimeData
      };
    });
    
    // We fetch metrics at the START of the interval now, so no need to call it here again.
    // fetchMetrics(); 
  };
  
  const simulateRequest = (): Promise<number> => {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      
      // For overflow test, make multiple sequential requests to hold the connection longer
      const requestsToMake = simulation.scenarioType === 'overflow' ? 3 : 1;
      let requestsCompleted = 0;
      
      const makeRequest = () => {
        // Simulate a database query by making a metrics request
        connectionPoolService.getMetrics()
          .then(() => {
            requestsCompleted++;
            
            if (requestsCompleted < requestsToMake) {
              // For overflow scenario, make another request to extend connection usage
              setTimeout(makeRequest, 100);
            } else {
              // Add artificial delay to simulate processing time if requested
              if (simulation.requestDuration > 0) {
                const elapsed = performance.now() - startTime;
                const remainingDelay = Math.max(0, simulation.requestDuration - elapsed);
                
                if (remainingDelay > 0) {
                  setTimeout(() => {
                    resolve(performance.now() - startTime);
                  }, remainingDelay);
                } else {
                  resolve(performance.now() - startTime);
                }
              } else {
                resolve(performance.now() - startTime);
              }
            }
          })
          .catch(error => {
            reject(error);
          });
      };
      
      // Start the first request
      makeRequest();
    });
  };
  
  // Update simulation settings
  const handleSimulationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSimulation(prev => ({
      ...prev,
      [name]: parseInt(value, 10)
    }));
  };
  
  // Apply predefined simulation scenarios
  const applyScenario = (scenarioType: 'overflow' | 'optimal') => {
    if (simulation.isRunning) {
      stopSimulation();
    }
    
    // Wait for simulation to stop
    setTimeout(() => {
      if (scenarioType === 'overflow') {
        // Connection pool overflow scenario - MUCH more aggressive
        // Uses extremely high concurrent requests and much longer request duration
        setSimulation(prev => ({
          ...prev,
          concurrentRequests: metrics?.maximumPoolSize ? metrics.maximumPoolSize * 5 : 50, // 5x max pool size
          requestDuration: 5000, // Very long-running queries (5 seconds)
          interval: 200, // Very frequent batches
          scenarioType: 'overflow'
        }));
        
        toast.info('Configured aggressive overflow test - this will force connection pool saturation');
      } else if (scenarioType === 'optimal') {
        // Optimal performance scenario
        // Uses a reasonable number of concurrent requests that should
        // work well with default pool settings
        setSimulation(prev => ({
          ...prev,
          concurrentRequests: metrics?.maximumPoolSize ? Math.max(2, Math.floor(metrics.maximumPoolSize * 0.6)) : 5, // 60% of max pool size
          requestDuration: 300, // Fast queries
          interval: 1500, // Less frequent batches
          scenarioType: 'optimal'
        }));
        
        toast.info('Configured optimal performance test scenario - this will demonstrate healthy pool behavior');
      }
    }, 100);
  };
  
  // Handle server-side simulation start
  const handleServerSimulation = async (simulationType: string) => {
    try {
      // Set auto-refresh to true and increase refresh rate during simulation
      setRefreshInterval(1000); // Set to 1 second during simulations
      if (!isRefreshing) {
        setIsRefreshing(true);
      }
      
      let result;
      if (simulationType === 'quick') {
        result = await connectionPoolService.quickTest();
        toast.success(`Quick connection test started. Will run for ${result.durationSeconds} seconds with ${result.concurrentQueries} connections.`);
      } else if (simulationType === 'heavy') {
        result = await connectionPoolService.simulateHeavyLoad(15, 2000, 60);
        toast.success(`Heavy load simulation started with 15 concurrent queries. Will run for 60 seconds.`);
      } else if (simulationType === 'saturation') {
        result = await connectionPoolService.simulatePoolSaturation();
        toast.success(`Pool saturation test started. Check server logs for results.`);
      } else if (simulationType === 'extreme') {
        result = await connectionPoolService.extremeStressTest();
        toast.success(`Extreme stress test started. Attempting to hold ${result.maxConnections} connections for ${result.durationSeconds} seconds.`);
      }
      
      // Force an immediate fetch
      fetchMetrics();
      
      // Schedule a return to normal refresh rate after the test
      const duration = result?.durationSeconds || 60; // Default to 60 seconds if not specified
      setTimeout(() => {
        setRefreshInterval(5000); // Return to normal refresh rate
        fetchMetrics(); // Fetch one more time after test completes
        toast.info("Connection test completed. Returning to normal refresh rate.");
      }, (duration + 2) * 1000); // Add 2 seconds buffer
      
    } catch (err: any) {
      toast.error(err.message || `Failed to start ${simulationType} test`);
    }
  };
  
  if (!isAdmin) {
    return null; // Prevent rendering if not admin
  }
  
  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold flex items-center">
              <CpuChipIcon className="h-8 w-8 mr-2 text-indigo-500" />
              Connection Pool Monitor
            </h1>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsRefreshing(!isRefreshing)}
                className={`px-3 py-2 rounded-md text-sm flex items-center ${
                  isRefreshing 
                    ? isDarkMode ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800' 
                    : isDarkMode ? 'bg-red-800 text-red-100' : 'bg-red-100 text-red-800'
                }`}
              >
                <ClockIcon className="h-5 w-5 mr-1" />
                {isRefreshing ? 'Auto-refresh On' : 'Auto-refresh Off'}
              </button>
              <button
                onClick={() => fetchMetrics()}
                className={`px-3 py-2 rounded-md text-sm flex items-center ${
                  isDarkMode ? 'bg-blue-800 text-blue-100 hover:bg-blue-700' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                <ArrowPathIcon className="h-5 w-5 mr-1" />
                Refresh Now
              </button>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value, 10))}
                className={`px-3 py-2 rounded-md text-sm ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-700' 
                    : 'bg-white text-gray-800 border-gray-300'
                } border`}
              >
                <option value={1000}>1 second</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
              </select>
            </div>
          </div>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Real-time monitoring and management of your database connection pool
          </p>
        </header>
        
        {error && (
          <div className={`p-4 rounded-md mb-6 ${isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'}`}>
            <p>{error}</p>
          </div>
        )}
        
        {isLoading && !metrics ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : metrics ? (
          <>
            {/* Current Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`p-6 rounded-lg shadow-md ${
                isDarkMode ? 'bg-gray-800' : 'bg-indigo-50'
              }`}>
                <div className="flex justify-between">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Pool Status
                  </h3>
                  <ShieldCheckIcon className={`h-6 w-6 ${
                    metrics.activeConnections < metrics.maximumPoolSize 
                      ? 'text-green-500' 
                      : 'text-yellow-500'
                  }`} />
                </div>
                <div className="mt-2">
                  <p className={`text-3xl font-bold ${metrics?.activeChanged ? 'animate-pulse text-yellow-500 dark:text-yellow-400' : ''}`}>
                    {metrics.activeConnections}/{metrics.maximumPoolSize}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Active/Max Connections
                  </p>
                </div>
                <div className="mt-4 h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      metrics.activeConnections / metrics.maximumPoolSize < 0.7 
                        ? 'bg-green-500' 
                        : metrics.activeConnections / metrics.maximumPoolSize < 0.9 
                          ? 'bg-yellow-500' 
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${(metrics.activeConnections / metrics.maximumPoolSize) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className={`p-6 rounded-lg shadow-md ${
                isDarkMode ? 'bg-gray-800' : 'bg-green-50'
              }`}>
                <div className="flex justify-between">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Idle Connections
                  </h3>
                  <LightBulbIcon className="h-6 w-6 text-green-500" />
                </div>
                <div className="mt-2">
                  <p className={`text-3xl font-bold ${metrics?.idleChanged ? 'animate-pulse text-green-500 dark:text-green-400' : ''}`}>
                    {metrics.idleConnections}/{metrics.minimumIdle}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Current/Min Idle
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Idle Timeout
                    </p>
                    <p className="font-medium">{metrics.idleTimeout / 1000}s</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Max Lifetime
                    </p>
                    <p className="font-medium">{metrics.maxLifetime / 1000}s</p>
                  </div>
                </div>
              </div>
              
              <div className={`p-6 rounded-lg shadow-md ${
                isDarkMode ? 'bg-gray-800' : 'bg-blue-50'
              }`}>
                <div className="flex justify-between">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Waiting Threads
                  </h3>
                  <BoltIcon className={`h-6 w-6 ${
                    metrics.threadsAwaitingConnection > 0 
                      ? 'text-yellow-500' 
                      : 'text-blue-500'
                  }`} />
                </div>
                <div className="mt-2">
                  <p className={`text-3xl font-bold ${
                    metrics.threadsAwaitingConnection > 0 
                      ? 'text-red-500 dark:text-red-400' 
                      : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  } ${metrics?.waitingChanged ? 'animate-pulse' : ''}`}>
                    {metrics.threadsAwaitingConnection}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Threads waiting for connection
                  </p>
                </div>
                <div className="mt-4">
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Connection Timeout
                  </p>
                  <p className="font-medium">{metrics.connectionTimeout / 1000}s</p>
                </div>
              </div>
              
              <div className={`p-6 rounded-lg shadow-md ${
                isDarkMode ? 'bg-gray-800' : 'bg-purple-50'
              }`}>
                <div className="flex justify-between">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Pool Info
                  </h3>
                  <CpuChipIcon className="h-6 w-6 text-purple-500" />
                </div>
                <div className="mt-2">
                  <p className="text-xl font-bold">
                    {metrics.poolName}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Pool Name
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Validation Timeout
                    </p>
                    <p className="font-medium">{metrics.validationTimeout / 1000}s</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Total Connections
                    </p>
                    <p className="font-medium">{metrics.totalConnections}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-3 mb-8">
              <button
                onClick={handleSoftReset}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isDarkMode 
                    ? 'bg-yellow-800 text-yellow-100 hover:bg-yellow-700' 
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                }`}
              >
                Soft Reset Pool
              </button>
              
              <button
                onClick={handleLogStatus}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isDarkMode 
                    ? 'bg-green-800 text-green-100 hover:bg-green-700' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                Log Pool Status
              </button>
              
              <button
                onClick={() => setIsConfigFormOpen(!isConfigFormOpen)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isDarkMode 
                    ? 'bg-indigo-800 text-indigo-100 hover:bg-indigo-700' 
                    : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                }`}
              >
                {isConfigFormOpen ? 'Cancel' : 'Modify Pool Settings'}
              </button>

              <button
                onClick={() => setShowSimulation(!showSimulation)}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                  isDarkMode 
                    ? 'bg-purple-800 text-purple-100 hover:bg-purple-700' 
                    : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                }`}
              >
                <BeakerIcon className="h-4 w-4 mr-1" />
                {showSimulation ? 'Hide Simulation' : 'Load Simulator'}
              </button>
              
              <button
                onClick={() => setShowTips(!showTips)}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                  isDarkMode 
                    ? 'bg-blue-800 text-blue-100 hover:bg-blue-700' 
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                {showTips ? 'Hide Tips' : 'Show Tips'}
              </button>
            </div>
            
            {/* Config Form */}
            {isConfigFormOpen && (
              <div className={`mb-8 p-6 rounded-lg shadow-md ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className="text-xl font-semibold mb-4">Modify Pool Configuration</h3>
                <form onSubmit={handleConfigSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Maximum Pool Size (current: {metrics.maximumPoolSize})
                    </label>
                    <input
                      type="number"
                      name="maximumPoolSize"
                      value={configForm.maximumPoolSize || ''}
                      onChange={handleConfigChange}
                      min="1"
                      max="100"
                      placeholder="e.g., 10"
                      className={`w-full p-2 rounded-md ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      } border`}
                    />
                    <p className="text-xs mt-1 text-gray-500">
                      Maximum number of connections to maintain
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Minimum Idle (current: {metrics.minimumIdle})
                    </label>
                    <input
                      type="number"
                      name="minimumIdle"
                      value={configForm.minimumIdle || ''}
                      onChange={handleConfigChange}
                      min="0"
                      max="100"
                      placeholder="e.g., 5"
                      className={`w-full p-2 rounded-md ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      } border`}
                    />
                    <p className="text-xs mt-1 text-gray-500">
                      Minimum number of idle connections to maintain
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Idle Timeout (ms) (current: {metrics.idleTimeout})
                    </label>
                    <input
                      type="number"
                      name="idleTimeout"
                      value={configForm.idleTimeout || ''}
                      onChange={handleConfigChange}
                      min="10000"
                      step="10000"
                      placeholder="e.g., 300000"
                      className={`w-full p-2 rounded-md ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      } border`}
                    />
                    <p className="text-xs mt-1 text-gray-500">
                      Max time a connection can remain idle (milliseconds)
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Connection Timeout (ms) (current: {metrics.connectionTimeout})
                    </label>
                    <input
                      type="number"
                      name="connectionTimeout"
                      value={configForm.connectionTimeout || ''}
                      onChange={handleConfigChange}
                      min="1000"
                      step="1000"
                      placeholder="e.g., 30000"
                      className={`w-full p-2 rounded-md ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      } border`}
                    />
                    <p className="text-xs mt-1 text-gray-500">
                      Maximum time to wait for connection (milliseconds)
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Max Lifetime (ms) (current: {metrics.maxLifetime})
                    </label>
                    <input
                      type="number"
                      name="maxLifetime"
                      value={configForm.maxLifetime || ''}
                      onChange={handleConfigChange}
                      min="30000"
                      step="30000"
                      placeholder="e.g., 1800000"
                      className={`w-full p-2 rounded-md ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border-gray-600' 
                          : 'bg-white text-gray-900 border-gray-300'
                      } border`}
                    />
                    <p className="text-xs mt-1 text-gray-500">
                      Maximum lifetime of a connection (milliseconds)
                    </p>
                  </div>
                  
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-md font-medium ${
                        isDarkMode 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                          : 'bg-indigo-500 text-white hover:bg-indigo-600'
                      }`}
                    >
                      Apply Configuration
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Simulation Panel */}
            {showSimulation && (
              <div className={`mb-8 p-6 rounded-lg shadow-md ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">Connection Pool Load Simulator</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Test your connection pool performance under different load conditions
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {!simulation.isRunning ? (
                      <button
                        onClick={startSimulation}
                        disabled={simulation.isRunning}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                          isDarkMode 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                        } ${simulation.isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <PlayIcon className="h-4 w-4 mr-1" />
                        Start Simulation
                      </button>
                    ) : (
                      <button
                        onClick={stopSimulation}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                          isDarkMode 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        <StopIcon className="h-4 w-4 mr-1" />
                        Stop Simulation
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Predefined Test Scenarios */}
                <div className="mb-6 p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                  <h4 className="text-md font-medium mb-3">Predefined Test Scenarios:</h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => applyScenario('overflow')}
                      disabled={simulation.isRunning}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isDarkMode 
                          ? simulation.scenarioType === 'overflow' 
                            ? 'bg-red-700 text-white' 
                            : 'bg-red-900/40 text-red-200 hover:bg-red-900/60'
                          : simulation.scenarioType === 'overflow'
                            ? 'bg-red-500 text-white'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } ${simulation.isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Pool Overflow Test
                    </button>
                    
                    <button
                      onClick={() => applyScenario('optimal')}
                      disabled={simulation.isRunning}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isDarkMode 
                          ? simulation.scenarioType === 'optimal'
                            ? 'bg-green-700 text-white'
                            : 'bg-green-900/40 text-green-200 hover:bg-green-900/60'
                          : simulation.scenarioType === 'optimal'
                            ? 'bg-green-500 text-white'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                      } ${simulation.isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Optimal Performance Test
                    </button>
                    
                    <button
                      onClick={() => {
                        setSimulation(prev => ({
                          ...prev,
                          concurrentRequests: 10,
                          requestDuration: 500,
                          interval: 1000,
                          scenarioType: 'custom'
                        }));
                      }}
                      disabled={simulation.isRunning}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isDarkMode 
                          ? simulation.scenarioType === 'custom'
                            ? 'bg-blue-700 text-white'
                            : 'bg-blue-900/40 text-blue-200 hover:bg-blue-900/60' 
                          : simulation.scenarioType === 'custom'
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      } ${simulation.isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Custom Test
                    </button>
                  </div>
                  <div className="mt-3">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {simulation.scenarioType === 'overflow' && 
                        "This test simulates heavy load that exceeds your connection pool capacity. You should see connection wait times increase and possibly request failures."}
                      {simulation.scenarioType === 'optimal' && 
                        "This test simulates balanced load for optimal performance. Your connection pool should handle this load efficiently with minimal wait times."}
                      {simulation.scenarioType === 'custom' && 
                        "Configure custom test parameters below to design your own simulation scenario."}
                    </p>
                  </div>
                </div>
                
                {/* Backend-Powered Simulations */}
                <div className="mb-6 p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-indigo-50 dark:bg-indigo-900/30">
                  <h4 className="text-md font-medium mb-3">Server-Side Simulations:</h4>
                  <p className="text-sm mb-4 text-indigo-800 dark:text-indigo-300">
                    These simulations run directly on the server and generate real database connections, providing more accurate results.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleServerSimulation('quick')}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isDarkMode 
                          ? 'bg-blue-700 text-white hover:bg-blue-600' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      Quick Test
                    </button>
                    
                    <button
                      onClick={() => handleServerSimulation('heavy')}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isDarkMode 
                          ? 'bg-purple-700 text-white hover:bg-purple-600' 
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                      }`}
                    >
                      Start Heavy Load (15 conn, 60s)
                    </button>
                    
                    <button
                      onClick={() => handleServerSimulation('saturation')}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isDarkMode 
                          ? 'bg-red-700 text-white hover:bg-red-600' 
                          : 'bg-red-500 text-white hover:bg-red-600'
                      }`}
                    >
                      Run Pool Saturation Test
                    </button>
                    
                    <button
                      onClick={() => handleServerSimulation('extreme')}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isDarkMode 
                          ? 'bg-red-900 text-white hover:bg-red-800' 
                          : 'bg-red-700 text-white hover:bg-red-800'
                      }`}
                    >
                      <span className="animate-pulse">EXTREME Stress Test</span>
                    </button>
                  </div>
                  <div className="mt-4 p-3 bg-white/30 dark:bg-gray-800/30 rounded text-sm">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Server-side simulations create real database connections and may impact system performance</li>
                      <li>Results will be logged to the server logs - check the terminal/logs for detailed metrics</li>
                      <li>Refresh the page periodically to view connection pool changes</li>
                    </ul>
                  </div>
                </div>
                
                {/* Simulation Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Concurrent Requests (per batch)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        name="concurrentRequests"
                        value={simulation.concurrentRequests}
                        onChange={handleSimulationChange}
                        min="1"
                        max="50"
                        step="1"
                        disabled={simulation.isRunning}
                        className="mr-3 flex-grow"
                      />
                      <span className="w-10 text-center">{simulation.concurrentRequests}</span>
                    </div>
                    <p className="text-xs mt-1 text-gray-500">
                      Number of simultaneous requests to make
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Request Duration (ms)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        name="requestDuration"
                        value={simulation.requestDuration}
                        onChange={handleSimulationChange}
                        min="0"
                        max="2000"
                        step="100"
                        disabled={simulation.isRunning}
                        className="mr-3 flex-grow"
                      />
                      <span className="w-16 text-center">{simulation.requestDuration}ms</span>
                    </div>
                    <p className="text-xs mt-1 text-gray-500">
                      Simulated processing time per request
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Batch Interval (ms)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        name="interval"
                        value={simulation.interval}
                        onChange={handleSimulationChange}
                        min="500"
                        max="5000"
                        step="500"
                        disabled={simulation.isRunning}
                        className="mr-3 flex-grow"
                      />
                      <span className="w-16 text-center">{simulation.interval}ms</span>
                    </div>
                    <p className="text-xs mt-1 text-gray-500">
                      Time between batches of requests
                    </p>
                  </div>
                </div>
                
                {/* Simulation Results */}
                <div className="mb-6">
                  <h4 className="text-md font-medium mb-3">Simulation Results:</h4>
                  
                  {/* Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className={`p-3 rounded-lg shadow-sm ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
                      <p className="text-xl font-bold">{simulation.totalRequests}</p>
                    </div>
                    
                    <div className={`p-3 rounded-lg shadow-sm ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
                      <p className={`text-xl font-bold ${
                        simulation.scenarioType === 'overflow' && simulation.failedRequests > 0 
                          ? 'text-yellow-500 dark:text-yellow-400' 
                          : 'text-green-500 dark:text-green-400'
                      }`}>
                        {simulation.successfulRequests} 
                        {simulation.totalRequests > 0 && 
                          <span className="text-sm font-normal ml-1">
                            ({Math.round((simulation.successfulRequests / simulation.totalRequests) * 100)}%)
                          </span>
                        }
                      </p>
                    </div>
                    
                    <div className={`p-3 rounded-lg shadow-sm ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
                      <p className={`text-xl font-bold ${
                        simulation.failedRequests > 0 
                          ? 'text-red-500 dark:text-red-400' 
                          : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {simulation.failedRequests}
                        {simulation.totalRequests > 0 && simulation.failedRequests > 0 && 
                          <span className="text-sm font-normal ml-1">
                            ({Math.round((simulation.failedRequests / simulation.totalRequests) * 100)}%)
                          </span>
                        }
                      </p>
                    </div>
                    
                    <div className={`p-3 rounded-lg shadow-sm ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Response Time</p>
                      <p className={`text-xl font-bold ${
                        simulation.avgResponseTime > 1000 
                          ? 'text-red-500 dark:text-red-400' 
                          : simulation.avgResponseTime > 500
                            ? 'text-yellow-500 dark:text-yellow-400'
                            : 'text-green-500 dark:text-green-400'
                      }`}>
                        {simulation.avgResponseTime.toFixed(1)} ms
                      </p>
                    </div>
                  </div>
                  
                  {/* Connection Pool Status During Simulation */}
                  <div className={`p-4 rounded-lg border ${
                    isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
                  } mb-4`}>
                    <h5 className="text-sm font-medium mb-2">Connection Pool Status:</h5>
                    
                    <div className="flex items-center mb-2">
                      <span className={`text-sm w-40 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Active Connections:</span>
                      <div className="flex-grow h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            metrics && metrics.activeConnections / metrics.maximumPoolSize > 0.9
                              ? 'bg-red-500 dark:bg-red-600'
                              : metrics && metrics.activeConnections / metrics.maximumPoolSize > 0.7
                                ? 'bg-yellow-500 dark:bg-yellow-600'
                                : 'bg-green-500 dark:bg-green-600'
                          }`}
                          style={{ 
                            width: metrics ? `${(metrics.activeConnections / metrics.maximumPoolSize) * 100}%` : '0%'
                          }}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm font-medium">
                        {metrics ? `${metrics.activeConnections}/${metrics.maximumPoolSize}` : '0/0'}
                      </span>
                    </div>
                    
                    <div className="flex items-center mb-2">
                      <span className={`text-sm w-40 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Threads Waiting:</span>
                      <div className={`py-1 px-3 rounded-full text-sm ${
                        metrics && metrics.threadsAwaitingConnection > 0
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {metrics ? metrics.threadsAwaitingConnection : 0} threads waiting
                      </div>
                    </div>
                    
                    {simulation.scenarioType === 'overflow' && simulation.isRunning && metrics && metrics.activeConnections >= metrics.maximumPoolSize && (
                      <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md text-sm">
                        <p className="font-medium">Pool Saturation Detected</p>
                        <p>Your connection pool is now saturated. New requests will wait for connections to become available, leading to increased response times.</p>
                      </div>
                    )}
                    
                    {simulation.scenarioType === 'optimal' && simulation.isRunning && metrics && metrics.activeConnections < metrics.maximumPoolSize * 0.8 && (
                      <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md text-sm">
                        <p className="font-medium">Optimal Performance</p>
                        <p>Your connection pool is handling the load efficiently with sufficient capacity remaining.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Explanation of what's happening in each scenario */}
                  {simulation.isRunning && (
                    <div className={`p-4 rounded-lg ${
                      isDarkMode ? 'bg-indigo-900/30 text-indigo-200' : 'bg-indigo-50 text-indigo-800'
                    }`}>
                      <h5 className="font-medium mb-2">What's Happening:</h5>
                      
                      {simulation.scenarioType === 'overflow' && (
                        <div>
                          <p className="mb-2">
                            In this overflow scenario, the simulator is generating {simulation.concurrentRequests} concurrent requests 
                            every {simulation.interval}ms, each holding a database connection for {simulation.requestDuration}ms.
                          </p>
                          <p>
                            This exceeds your pool's capacity of {metrics?.maximumPoolSize || 'unknown'} connections, forcing requests to wait.
                            As the test continues, you should see:
                          </p>
                          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                            <li>Active connections reaching maximum</li>
                            <li>Threads waiting for connections</li>
                            <li>Increasing response times</li>
                            <li>Possible request failures if wait time exceeds timeout</li>
                          </ul>
                        </div>
                      )}
                      
                      {simulation.scenarioType === 'optimal' && (
                        <div>
                          <p className="mb-2">
                            In this optimal scenario, the simulator is generating {simulation.concurrentRequests} concurrent requests 
                            every {simulation.interval}ms, with each request completing in around {simulation.requestDuration}ms.
                          </p>
                          <p>
                            This is designed to work efficiently with your pool's capacity of {metrics?.maximumPoolSize || 'unknown'} connections.
                            You should observe:
                          </p>
                          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                            <li>Active connections remaining below maximum</li>
                            <li>No threads waiting for connections</li>
                            <li>Low and consistent response times</li>
                            <li>All requests completing successfully</li>
                          </ul>
                        </div>
                      )}
                      
                      {simulation.scenarioType === 'custom' && (
                        <p>
                          Running custom simulation with {simulation.concurrentRequests} concurrent requests 
                          every {simulation.interval}ms, each holding a connection for approximately {simulation.requestDuration}ms.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Simulation Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 border-t border-b py-4 border-gray-200 dark:border-gray-700">
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Total Requests
                    </p>
                    <p className="text-2xl font-semibold">
                      {simulation.totalRequests.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Successful
                    </p>
                    <p className="text-2xl font-semibold text-green-500">
                      {simulation.successfulRequests.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Failed
                    </p>
                    <p className="text-2xl font-semibold text-red-500">
                      {simulation.failedRequests.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Avg Response Time
                    </p>
                    <p className="text-2xl font-semibold">
                      {simulation.avgResponseTime.toFixed(2)}ms
                    </p>
                  </div>
                </div>
                
                {/* Response time chart */}
                <div className="h-64">
                  <h4 className="text-lg font-medium mb-2">Response Time (ms)</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={simulation.responseTimeData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp} 
                        stroke={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 
                      />
                      <YAxis 
                        stroke={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                        domain={[0, 'dataMax + 100']} 
                      />
                      <Tooltip 
                        labelFormatter={formatTimestamp} 
                        formatter={(value: any) => [`${value.toFixed(2)} ms`, 'Response Time']}
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#374151' : '#fff',
                          borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                          color: isDarkMode ? '#F9FAFB' : '#111827'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="responseTime" 
                        name="Response Time" 
                        stroke="#8884d8" 
                        fill="rgba(136, 132, 216, 0.2)" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className={`p-6 rounded-lg shadow-md ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className="text-lg font-semibold mb-4">Connection Pool Activity</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historicalData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp} 
                        stroke={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 
                      />
                      <YAxis stroke={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                      <Tooltip labelFormatter={formatTimestamp} contentStyle={{
                        backgroundColor: isDarkMode ? '#374151' : '#fff',
                        borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                        color: isDarkMode ? '#F9FAFB' : '#111827'
                      }} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="active" 
                        name="Active Connections"
                        stroke="#2563eb" 
                        fill="rgba(37, 99, 235, 0.5)" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="idle" 
                        name="Idle Connections"
                        stroke="#10b981" 
                        fill="rgba(16, 185, 129, 0.5)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        name="Total Connections"
                        stroke="#6366f1" 
                        fill="rgba(99, 102, 241, 0.5)" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className={`p-6 rounded-lg shadow-md ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className="text-lg font-semibold mb-4">Threads Awaiting Connection</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={historicalData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTimestamp} 
                        stroke={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} 
                      />
                      <YAxis stroke={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                      <Tooltip labelFormatter={formatTimestamp} contentStyle={{
                        backgroundColor: isDarkMode ? '#374151' : '#fff',
                        borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                        color: isDarkMode ? '#F9FAFB' : '#111827'
                      }} />
                      <Legend />
                      <Bar 
                        dataKey="waiting" 
                        name="Waiting Threads" 
                        fill="#f43f5e" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Recommendations */}
            <div className={`p-6 rounded-lg shadow-md mb-8 ${
              isDarkMode ? 'bg-gray-800' : 'bg-blue-50'
            }`}>
              <h3 className="text-xl font-semibold mb-3">Pool Health Assessment</h3>
              
              <div className="space-y-4">
                {metrics.activeConnections / metrics.maximumPoolSize > 0.9 && (
                  <div className={`p-3 rounded ${
                    isDarkMode ? 'bg-red-900/50 text-red-100' : 'bg-red-100 text-red-800'
                  }`}>
                    <p className="font-medium">High connection utilization detected</p>
                    <p className="text-sm">
                      Your pool is using {Math.round((metrics.activeConnections / metrics.maximumPoolSize) * 100)}% of available connections.
                      Consider increasing the maximum pool size to prevent connection wait times.
                    </p>
                  </div>
                )}
                
                {metrics.threadsAwaitingConnection > 0 && (
                  <div className={`p-3 rounded ${
                    isDarkMode ? 'bg-yellow-900/50 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <p className="font-medium">Threads are waiting for connections</p>
                    <p className="text-sm">
                      {metrics.threadsAwaitingConnection} threads are currently waiting for a connection.
                      This may indicate insufficient pool capacity for your current load.
                    </p>
                  </div>
                )}
                
                {metrics.idleConnections < metrics.minimumIdle && (
                  <div className={`p-3 rounded ${
                    isDarkMode ? 'bg-blue-900/50 text-blue-100' : 'bg-blue-100 text-blue-800'
                  }`}>
                    <p className="font-medium">Low idle connection count</p>
                    <p className="text-sm">
                      The pool has fewer idle connections ({metrics.idleConnections}) than the configured minimum ({metrics.minimumIdle}).
                      This usually resolves as the pool creates new connections to meet demand.
                    </p>
                  </div>
                )}
                
                {metrics.activeConnections === 0 && metrics.totalConnections === 0 && (
                  <div className={`p-3 rounded ${
                    isDarkMode ? 'bg-purple-900/50 text-purple-100' : 'bg-purple-100 text-purple-800'
                  }`}>
                    <p className="font-medium">No active connections</p>
                    <p className="text-sm">
                      Your pool has no active connections. This is normal if your application isn't currently serving requests.
                    </p>
                  </div>
                )}
                
                {metrics.activeConnections / metrics.maximumPoolSize <= 0.9 && 
                  metrics.threadsAwaitingConnection === 0 &&
                  metrics.idleConnections >= metrics.minimumIdle &&
                  metrics.totalConnections > 0 && (
                  <div className={`p-3 rounded ${
                    isDarkMode ? 'bg-green-900/50 text-green-100' : 'bg-green-100 text-green-800'
                  }`}>
                    <p className="font-medium">Pool is healthy</p>
                    <p className="text-sm">
                      Your connection pool is operating within optimal parameters with no detected issues.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Connection Pool Tips */}
            {showTips && (
              <div className={`p-6 rounded-lg shadow-md mb-8 ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <InformationCircleIcon className="h-6 w-6 mr-2 text-blue-500" />
                  Connection Pool Best Practices
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium mb-2">Optimal Pool Size</h4>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                      Finding the right pool size is critical. A general guideline is to set your maximum pool size 
                      based on: <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">Connections = ((CPU cores * 2) + effective disk spindles)</code>
                    </p>
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm">
                      <p className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        Current System: {metrics && metrics.maximumPoolSize} max connections
                      </p>
                      <p className={isDarkMode ? 'text-blue-200' : 'text-blue-600'}>
                        For most applications, 10-20 connections is sufficient. Large-scale applications may need 20-50.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium mb-2">Connection Timeouts</h4>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                      Your connection timeout should be long enough to establish a connection but short enough 
                      to fail quickly when the database is unavailable. Typical values are between 5-30 seconds.
                    </p>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                      <li><span className="font-medium">Connection Timeout:</span> {metrics && (metrics.connectionTimeout / 1000)}s - 
                        <span className={`ml-1 ${
                          metrics?.connectionTimeout && metrics.connectionTimeout > 30000 
                            ? 'text-yellow-500' 
                            : metrics?.connectionTimeout && metrics.connectionTimeout < 5000 
                              ? 'text-yellow-500' 
                              : 'text-green-500'
                        }`}>
                          {metrics?.connectionTimeout && metrics.connectionTimeout > 30000 
                            ? 'Consider reducing' 
                            : metrics?.connectionTimeout && metrics.connectionTimeout < 5000 
                              ? 'Consider increasing' 
                              : 'Good value'}
                        </span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium mb-2">Idle Connections &amp; Lifetimes</h4>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                      Maintain a minimum pool of idle connections to handle sudden bursts of traffic. 
                      Set max lifetime to prevent connection issues caused by database restarts or network changes.
                    </p>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                      <li><span className="font-medium">Minimum Idle:</span> {metrics && metrics.minimumIdle} connections (typically 25-50% of max pool size)</li>
                      <li><span className="font-medium">Idle Timeout:</span> {metrics && (metrics.idleTimeout / 1000)}s (suggests 300s - 600s)</li>
                      <li><span className="font-medium">Max Lifetime:</span> {metrics && (metrics.maxLifetime / 1000)}s (suggests 1800s - 7200s)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium mb-2">Monitoring &amp; Testing</h4>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                      Regularly monitor:
                    </p>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                      <li><span className="font-medium">Connection Usage:</span> If consistently near maximum, consider increasing pool size</li>
                      <li><span className="font-medium">Wait Time:</span> Long waits indicate insufficient connections</li>
                      <li><span className="font-medium">Timeout Errors:</span> May indicate database performance issues or insufficient pool size</li>
                      <li><span className="font-medium">Connection Leaks:</span> Monitor for steady increases in active connections that don't return to the pool</li>
                    </ul>
                    <p className="mt-2 text-sm">
                      Use the load simulator to test your connection pool under different loads and optimize settings.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium mb-2">Common Issues</h4>
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm">
                        <p className="font-medium">Pool Exhaustion</p>
                        <p>When all connections are in use and threads must wait. Solution: increase max pool size or optimize queries.</p>
                      </div>
                      <div className="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm">
                        <p className="font-medium">Connection Leaks</p>
                        <p>Connections not properly closed. Solution: use try-with-resources or proper connection handling patterns.</p>
                      </div>
                      <div className="p-2 rounded bg-gray-100 dark:bg-gray-700 text-sm">
                        <p className="font-medium">Database Restarts</p>
                        <p>Stale connections after database maintenance. Solution: appropriate max lifetime settings.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ConnectionPool; 