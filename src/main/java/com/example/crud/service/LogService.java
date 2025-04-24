package com.example.crud.service;

import com.example.crud.model.Log;
import com.example.crud.repository.LogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LogService {

    @Autowired
    private LogRepository logRepository;

    @Transactional
    public void addLog(String operationType, String entityType, String performedBy, String details) {
        Log log = new Log(operationType, entityType, performedBy, details);
        logRepository.save(log);

        // Check if we exceed the maximum number of logs (150)
        List<Log> allLogs = logRepository.findAllOrderByTimestampDesc();
        if (allLogs.size() > 150) {
            // Delete the oldest logs
            List<Log> logsToDelete = allLogs.subList(150, allLogs.size());
            logRepository.deleteAll(logsToDelete);
        }
    }

    public List<Log> getAllLogs() {
        return logRepository.findAllOrderByTimestampDesc();
    }

    public List<Log> getLogsByUser(String username) {
        return logRepository.findByPerformedByOrderByTimestampDesc(username);
    }

    public List<Log> getLogsByEntityType(String entityType) {
        return logRepository.findByEntityTypeOrderByTimestampDesc(entityType);
    }
} 