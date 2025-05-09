import React, { useEffect, useState } from 'react';
import { ArrowPathIcon, BoltIcon, InformationCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cacheService, CacheMetrics } from '../services/cacheService';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import { PieChart } from 'react-minimal-pie-chart';

// Define PieChart palette since we're not importing it from the library
const pieChartPalette = ['#0088FE', '#FF8042', '#FFBB28', '#00C49F', '#AF19FF'];

// Define interface for PieChart label rendering
interface DataEntry {
  title: string;
  value: number;
  color: string;
}

const CacheManagement: React.FC = () => {
  const [metrics, setMetrics] = useState<{ caches: CacheMetrics[], totalCaches: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [selectedCache, setSelectedCache] = useState<CacheMetrics | null>(null);
  const [configValue, setConfigValue] = useState<{ expireAfterWrite: number, maximumSize: number }>({
    expireAfterWrite: 60,
    maximumSize: 1000
  });
  
  const { isDarkMode } = useTheme();
  const toast = useToast();
  
  useEffect(() => {
    fetchMetrics();
    
    const intervalId = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 10000); // Auto-refresh every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [refreshTrigger]);
  
  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const data = await cacheService.getMetrics();
      setMetrics(data);
      
      // Set the first cache as selected by default if none is selected
      if (!selectedCache && data.caches.length > 0) {
        setSelectedCache(data.caches[0]);
      } else if (selectedCache) {
        // Update the selected cache with fresh data
        const updatedCache = data.caches.find(cache => cache.name === selectedCache.name);
        if (updatedCache) {
          setSelectedCache(updatedCache);
        }
      }
    } catch (error: any) {
      toast.error(`Error fetching cache metrics: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearCache = async (cacheName: string) => {
    try {
      await cacheService.clearCache(cacheName);
      toast.success(`Cache ${cacheName} cleared successfully`);
      fetchMetrics();
    } catch (error: any) {
      toast.error(`Error clearing cache: ${error.message}`);
    }
  };
  
  const handleClearAllCaches = async () => {
    try {
      await cacheService.clearAllCaches();
      toast.success(`All caches cleared successfully`);
      fetchMetrics();
    } catch (error: any) {
      toast.error(`Error clearing all caches: ${error.message}`);
    }
  };
  
  const handleUpdateConfig = async (cacheName: string) => {
    try {
      await cacheService.updateConfig(cacheName, {
        expireAfterWrite: configValue.expireAfterWrite * 60 * 1000, // Convert minutes to ms
        maximumSize: configValue.maximumSize
      });
      toast.success(`Cache configuration updated for ${cacheName}`);
      fetchMetrics();
    } catch (error: any) {
      toast.error(`Error updating cache configuration: ${error.message}`);
    }
  };
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  };
  
  const formatPercentage = (num: number): string => {
    return (num * 100).toFixed(1) + '%';
  };
  
  return (
    <div className="container px-4 mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-3xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Cache Management
        </h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => fetchMetrics()}
            className={`flex items-center px-3 py-2 rounded-md 
              ${isDarkMode 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            <ArrowPathIcon className="h-5 w-5 mr-1" />
            Refresh
          </button>
          <button 
            onClick={handleClearAllCaches}
            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <TrashIcon className="h-5 w-5 mr-1" />
            Clear All Caches
          </button>
        </div>
      </div>
      
      {isLoading && !metrics ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cache List Panel */}
          <div className={`col-span-1 rounded-lg shadow-md p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Available Caches
            </h2>
            <div className="overflow-y-auto max-h-96">
              {metrics.caches.map((cache) => (
                <div 
                  key={cache.name}
                  onClick={() => setSelectedCache(cache)}
                  className={`p-3 rounded-md cursor-pointer mb-2 transition duration-150 flex justify-between items-center
                    ${selectedCache?.name === cache.name 
                      ? (isDarkMode ? 'bg-blue-800' : 'bg-blue-100') 
                      : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200')}`}
                >
                  <div>
                    <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {cache.name}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Items: {cache.size} | Hit Rate: {formatPercentage(cache.hitRate)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearCache(cache.name);
                    }}
                    className={`p-1 rounded-full ${isDarkMode 
                      ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200' 
                      : 'hover:bg-gray-300 text-gray-500 hover:text-gray-800'}`}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              {metrics.caches.length === 0 && (
                <p className={`text-center p-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No caches configured
                </p>
              )}
            </div>
          </div>
          
          {/* Cache Details Panel */}
          <div className={`col-span-2 rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            {selectedCache ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedCache.name}
                    </h2>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Cache metrics and operations
                    </p>
                  </div>
                  <button
                    onClick={() => handleClearCache(selectedCache.name)}
                    className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <TrashIcon className="h-5 w-5 mr-1" />
                    Clear Cache
                  </button>
                </div>
                
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card 
                    title="Cache Size" 
                    value={formatNumber(selectedCache.size)}
                    subtitle="Current entries"
                    icon={<InformationCircleIcon className="h-6 w-6 text-blue-500" />}
                    isDarkMode={isDarkMode}
                  />
                  <Card 
                    title="Hit Rate" 
                    value={formatPercentage(selectedCache.hitRate)}
                    subtitle="Cache efficiency"
                    icon={<BoltIcon className={`h-6 w-6 ${
                      selectedCache.hitRate > 0.8 ? 'text-green-500' : 
                      selectedCache.hitRate > 0.5 ? 'text-yellow-500' : 'text-red-500'
                    }`} />}
                    isDarkMode={isDarkMode}
                  />
                  <Card 
                    title="Evictions" 
                    value={formatNumber(selectedCache.evictionCount)}
                    subtitle="Items removed"
                    icon={<TrashIcon className={`h-6 w-6 ${
                      selectedCache.evictionCount > 1000 ? 'text-red-500' : 
                      selectedCache.evictionCount > 100 ? 'text-yellow-500' : 'text-green-500'
                    }`} />}
                    isDarkMode={isDarkMode}
                  />
                </div>
                
                {/* Charts and detailed metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Cache Performance
                    </h3>
                    <div className="h-64 flex items-center justify-center">
                      {selectedCache.hitCount + selectedCache.missCount > 0 ? (
                        <PieChart
                          data={[
                            { title: 'Hits', value: selectedCache.hitCount, color: pieChartPalette[0] },
                            { title: 'Misses', value: selectedCache.missCount, color: pieChartPalette[1] }
                          ]}
                          lineWidth={20}
                          paddingAngle={2}
                          rounded
                          label={({ dataEntry }: { dataEntry: DataEntry }) => dataEntry.title}
                          labelStyle={(index: number) => ({
                            fill: isDarkMode ? '#fff' : '#000',
                            fontSize: '5px',
                            fontFamily: 'sans-serif',
                          })}
                          labelPosition={70}
                        />
                      ) : (
                        <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          No cache activity recorded yet
                        </p>
                      )}
                    </div>
                    <div className="flex justify-between text-sm mt-4">
                      <div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: pieChartPalette[0] }}></div>
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Hits: {formatNumber(selectedCache.hitCount)}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: pieChartPalette[1] }}></div>
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Misses: {formatNumber(selectedCache.missCount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Detailed Metrics
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Size:</span>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedCache.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Hit Count:</span>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedCache.hitCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Miss Count:</span>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedCache.missCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Hit Rate:</span>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{formatPercentage(selectedCache.hitRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Eviction Count:</span>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedCache.evictionCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Load Success:</span>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedCache.loadSuccessCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Load Failure:</span>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedCache.loadFailureCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Avg Load Time:</span>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {selectedCache.averageLoadPenalty.toFixed(2)} ns
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Configuration */}
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    Cache Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Expiry Time (minutes)
                      </label>
                      <input
                        type="number"
                        value={configValue.expireAfterWrite}
                        onChange={(e) => setConfigValue({
                          ...configValue,
                          expireAfterWrite: parseInt(e.target.value) || 0
                        })}
                        className={`w-full px-3 py-2 rounded-md ${isDarkMode 
                          ? 'bg-gray-800 text-white border-gray-700' 
                          : 'bg-white text-gray-900 border-gray-300'} border`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Maximum Size
                      </label>
                      <input
                        type="number"
                        value={configValue.maximumSize}
                        onChange={(e) => setConfigValue({
                          ...configValue,
                          maximumSize: parseInt(e.target.value) || 0
                        })}
                        className={`w-full px-3 py-2 rounded-md ${isDarkMode 
                          ? 'bg-gray-800 text-white border-gray-700' 
                          : 'bg-white text-gray-900 border-gray-300'} border`}
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-right">
                    <button
                      onClick={() => handleUpdateConfig(selectedCache.name)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Update Configuration
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <InformationCircleIcon className={`h-16 w-16 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                <h3 className={`text-xl font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-2`}>
                  Select a Cache
                </h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Select a cache from the list to view details and configure settings.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`p-6 rounded-lg shadow-md text-center ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}>
          <p className="text-xl">Error loading cache metrics. Please try again later.</p>
        </div>
      )}
      
      {/* Information Panel */}
      <div className={`mt-8 p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          About Caching
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Cache Benefits
            </h3>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Caching improves application performance by storing frequently accessed data in memory,
              reducing database load and response times.
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Reduced database load</li>
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Faster response times</li>
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Improved scalability</li>
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Lower resource usage</li>
            </ul>
          </div>
          <div>
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Cache Configuration
            </h3>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Proper cache configuration balances memory usage with performance benefits.
              Key parameters include:
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                <span className="font-medium">Maximum Size:</span> Limits memory usage
              </li>
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                <span className="font-medium">Expiry Time:</span> Controls data freshness
              </li>
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                <span className="font-medium">Eviction Policy:</span> Determines which entries to remove first
              </li>
            </ul>
          </div>
          <div>
            <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Cache Performance Metrics
            </h3>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Monitor these key metrics to evaluate and optimize cache performance:
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                <span className="font-medium">Hit Rate:</span> Higher is better (&gt;80% is excellent)
              </li>
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                <span className="font-medium">Eviction Rate:</span> High rates may indicate undersized cache
              </li>
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                <span className="font-medium">Load Times:</span> Shows cost of cache misses
              </li>
              <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                <span className="font-medium">Size:</span> Actual entries vs. maximum capacity
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheManagement; 