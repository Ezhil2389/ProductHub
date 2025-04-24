package com.example.crud.controller;

import com.example.crud.model.ApplicationLog;
import com.example.crud.service.ApplicationLogService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/application-logs")
@CrossOrigin(origins = "*", maxAge = 3600)
@Slf4j
public class ApplicationLogController {

    @Autowired
    private ApplicationLogService applicationLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ApplicationLog>> getAllLogs() {
        log.info("Fetching all application logs");
        return ResponseEntity.ok(applicationLogService.getAllLogs());
    }

    @GetMapping("/level/{level}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ApplicationLog>> getLogsByLevel(@PathVariable String level) {
        log.info("Fetching application logs with level: {}", level);
        return ResponseEntity.ok(applicationLogService.getLogsByLevel(level));
    }

    @GetMapping("/logger/{logger}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ApplicationLog>> getLogsByLogger(@PathVariable String logger) {
        log.info("Fetching application logs for logger: {}", logger);
        return ResponseEntity.ok(applicationLogService.getLogsByLogger(logger));
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ApplicationLog>> searchLogs(@RequestParam String keyword) {
        log.info("Searching application logs with keyword: {}", keyword);
        return ResponseEntity.ok(applicationLogService.searchLogs(keyword));
    }

    @PostMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> generateTestLogs() {
        applicationLogService.logInfo("This is a test INFO log message");
        applicationLogService.logWarning("This is a test WARNING log message");
        applicationLogService.logDebug("This is a test DEBUG log message");
        try {
            throw new RuntimeException("Test exception for logging");
        } catch (Exception e) {
            applicationLogService.logError("This is a test ERROR log message", e);
        }
        
        return ResponseEntity.ok("Test logs generated successfully");
    }
} 