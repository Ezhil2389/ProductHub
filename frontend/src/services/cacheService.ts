import api from './axiosConfig';

export interface CacheMetrics {
  name: string;
  size: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  evictionWeight: number;
  loadSuccessCount: number;
  loadFailureCount: number;
  totalLoadTime: number;
  averageLoadPenalty: number;
}

export interface CacheResponse {
  caches: CacheMetrics[];
  totalCaches: number;
}

export interface CacheConfigUpdate {
  name?: string;
  expireAfterWrite?: number;
  maximumSize?: number;
}

export interface ActionResponse {
  status: string;
  message: string;
}

export const cacheService = {
  getMetrics: async (): Promise<CacheResponse> => {
    try {
      const response = await api.get('/api/cache/metrics');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch cache metrics');
    }
  },

  clearCache: async (cacheName: string): Promise<ActionResponse> => {
    try {
      const response = await api.post(`/api/cache/actions/clear/${cacheName}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to clear cache');
    }
  },

  clearAllCaches: async (): Promise<ActionResponse> => {
    try {
      const response = await api.post('/api/cache/actions/clear-all');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to clear all caches');
    }
  },

  updateConfig: async (cacheName: string, config: CacheConfigUpdate): Promise<CacheConfigUpdate> => {
    try {
      const params = new URLSearchParams();
      
      if (config.expireAfterWrite !== undefined) params.append('expireAfterWrite', config.expireAfterWrite.toString());
      if (config.maximumSize !== undefined) params.append('maximumSize', config.maximumSize.toString());
      
      const response = await api.put(`/api/cache/config/${cacheName}?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update cache configuration');
    }
  }
};

export default cacheService; 