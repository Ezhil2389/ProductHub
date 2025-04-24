package com.example.crud.controller;

import com.example.crud.model.Log;
import com.example.crud.service.LogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LogController {

    @Autowired
    private LogService logService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Log>> getAllLogs() {
        return ResponseEntity.ok(logService.getAllLogs());
    }

    @GetMapping("/user/{username}")
    @PreAuthorize("hasRole('ADMIN') or #username == authentication.principal.username")
    public ResponseEntity<List<Log>> getLogsByUser(@PathVariable String username) {
        return ResponseEntity.ok(logService.getLogsByUser(username));
    }

    @GetMapping("/entity/{entityType}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Log>> getLogsByEntityType(@PathVariable String entityType) {
        return ResponseEntity.ok(logService.getLogsByEntityType(entityType));
    }

    @GetMapping("/my-logs")
    public ResponseEntity<List<Log>> getMyLogs() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        return ResponseEntity.ok(logService.getLogsByUser(username));
    }
} 