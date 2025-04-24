package com.example.crud.service;

import com.example.crud.model.ApplicationLog;
import com.example.crud.repository.ApplicationLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.hibernate.HibernateException;
import org.springframework.dao.DataAccessException;

import java.util.List;

@Service
@Slf4j
public class ApplicationLogService {

    @Autowired
    private ApplicationLogRepository applicationLogRepository;

    public void logInfo(String message) {
        log.info(message);
        saveLog("INFO", log.getClass().getName(), message, null);
    }

    public void logWarning(String message) {
        log.warn(message);
        saveLog("WARN", log.getClass().getName(), message, null);
    }

    public void logError(String message, Throwable throwable) {
        log.error(message, throwable);
        
        // Don't attempt to save log if it's a database access error
        if (throwable instanceof DataAccessException || throwable instanceof HibernateException) {
            log.error("Not saving log to database due to database error: {}", throwable.getMessage());
            return;
        }
        
        String stackTrace = null;
        if (throwable != null) {
            StringBuilder sb = new StringBuilder();
            for (StackTraceElement element : throwable.getStackTrace()) {
                sb.append(element.toString()).append("\n");
            }
            stackTrace = sb.toString();
        }
        
        saveLog("ERROR", log.getClass().getName(), message, stackTrace);
    }

    public void logDebug(String message) {
        log.debug(message);
        saveLog("DEBUG", log.getClass().getName(), message, null);
    }

    @Transactional
    private void saveLog(String level, String logger, String message, String stackTrace) {
        try {
            ApplicationLog applicationLog = new ApplicationLog(level, logger, message, stackTrace);
            applicationLogRepository.save(applicationLog);
            
            // Check if we exceed the maximum number of logs (500)
            try {
                List<ApplicationLog> allLogs = applicationLogRepository.findAllOrderByTimestampDesc();
                if (allLogs.size() > 500) {
                    // Delete the oldest logs
                    List<ApplicationLog> logsToDelete = allLogs.subList(500, allLogs.size());
                    applicationLogRepository.deleteAll(logsToDelete);
                }
            } catch (Exception e) {
                // If we can't clean up logs, just log the error but don't throw
                log.error("Failed to clean up old logs: {}", e.getMessage());
            }
        } catch (Exception e) {
            // Log the error to console but don't attempt to save it to database to avoid recursion
            log.error("Failed to save log to database: {}", e.getMessage());
        }
    }

    public List<ApplicationLog> getAllLogs() {
        return applicationLogRepository.findAllOrderByTimestampDesc();
    }

    public List<ApplicationLog> getLogsByLevel(String level) {
        return applicationLogRepository.findByLevelOrderByTimestampDesc(level);
    }

    public List<ApplicationLog> getLogsByLogger(String logger) {
        return applicationLogRepository.findByLoggerOrderByTimestampDesc(logger);
    }
    
    public List<ApplicationLog> searchLogs(String keyword) {
        return applicationLogRepository.findByMessageContainingOrderByTimestampDesc(keyword);
    }
} 