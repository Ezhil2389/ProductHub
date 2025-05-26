package com.example.crud.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "operation_logs")
public class Log {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String operationType; // CREATE, READ, UPDATE, DELETE

    @Column(nullable = false)
    private String entityType; // "PRODUCT" or "USER"

    @Column(nullable = false)
    private String performedBy; // Username or ID of the user who performed the operation

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column
    private String details; // Additional details about the operation

    @Column(name = "ip_address", nullable = true)
    private String ipAddress;

    // Constructors
    public Log() {}

    public Log(String operationType, String entityType, String performedBy, String details, String ipAddress) {
        this.operationType = operationType;
        this.entityType = entityType;
        this.performedBy = performedBy;
        this.timestamp = LocalDateTime.now();
        this.details = details;
        this.ipAddress = ipAddress;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOperationType() {
        return operationType;
    }

    public void setOperationType(String operationType) {
        this.operationType = operationType;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
} 