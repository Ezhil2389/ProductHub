import api from './axiosConfig';

export interface ApplicationLog {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  logger: string;
  message: string;
  stackTrace: string | null;
  timestamp: string;
}

class LogService {
  async getAllLogs(): Promise<ApplicationLog[]> {
    const response = await api.get('/api/application-logs');
    return response.data;
  }
}

export const logService = new LogService(); 