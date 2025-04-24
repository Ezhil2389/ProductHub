package com.example.crud.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "application_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String level;  // INFO, WARN, ERROR, DEBUG

    @Column(nullable = false)
    private String logger;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(columnDefinition = "TEXT")
    private String stackTrace;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    public ApplicationLog(String level, String logger, String message, String stackTrace) {
        this.level = level;
        this.logger = logger;
        this.message = message;
        this.stackTrace = stackTrace;
        this.timestamp = LocalDateTime.now();
    }
} 