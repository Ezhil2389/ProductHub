import api from './axiosConfig';

export interface ConnectionPoolMetrics {
  poolName: string;
  maximumPoolSize: number;
  minimumIdle: number;
  idleTimeout: number;
  maxLifetime: number;
  connectionTimeout: number;
  validationTimeout: number;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  threadsAwaitingConnection: number;
  timestamp?: number;
  error?: string;
  activeChanged?: boolean;
  idleChanged?: boolean;
  waitingChanged?: boolean;
}

export interface PoolConfigUpdate {
  maximumPoolSize?: number;
  minimumIdle?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
  maxLifetime?: number;
}

export interface ActionResponse {
  status: string;
  message: string;
}

export const connectionPoolService = {
  getMetrics: async (): Promise<ConnectionPoolMetrics> => {
    try {
      const response = await api.get('/api/cpool/metrics');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch connection pool metrics');
    }
  },

  updateConfig: async (config: PoolConfigUpdate): Promise<PoolConfigUpdate> => {
    try {
      // Convert config object to URL params
      const params = new URLSearchParams();
      
      if (config.maximumPoolSize !== undefined) params.append('maximumPoolSize', config.maximumPoolSize.toString());
      if (config.minimumIdle !== undefined) params.append('minimumIdle', config.minimumIdle.toString());
      if (config.idleTimeout !== undefined) params.append('idleTimeout', config.idleTimeout.toString());
      if (config.connectionTimeout !== undefined) params.append('connectionTimeout', config.connectionTimeout.toString());
      if (config.maxLifetime !== undefined) params.append('maxLifetime', config.maxLifetime.toString());
      
      const response = await api.put(`/api/cpool/config?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update connection pool configuration');
    }
  },

  softReset: async (): Promise<ActionResponse> => {
    try {
      const response = await api.post('/api/cpool/actions/soft-reset');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reset connection pool');
    }
  },
  
  logStatus: async (): Promise<ActionResponse> => {
    try {
      const response = await api.post('/api/cpool/actions/log-status');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to log connection pool status');
    }
  },
  
  simulateHeavyLoad: async (
    concurrentQueries: number = 5, 
    queryTimeMs: number = 1000, 
    durationSeconds: number = 30
  ): Promise<any> => {
    try {
      const params = new URLSearchParams();
      params.append('concurrentQueries', concurrentQueries.toString());
      params.append('queryTimeMs', queryTimeMs.toString());
      params.append('durationSeconds', durationSeconds.toString());
      
      const response = await api.post(`/api/cpool/diagnostics/heavy-load?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to start heavy load simulation');
    }
  },
  
  simulatePoolSaturation: async (): Promise<any> => {
    try {
      const response = await api.post('/api/cpool/diagnostics/pool-saturation');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to start pool saturation test');
    }
  },
  
  quickTest: async (): Promise<any> => {
    try {
      const response = await api.post('/api/cpool/diagnostics/quick-test');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to start quick connection test');
    }
  },
  
  extremeStressTest: async (): Promise<any> => {
    try {
      const response = await api.post('/api/cpool/diagnostics/extreme-stress');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to start extreme stress test');
    }
  }
};

export default connectionPoolService; 