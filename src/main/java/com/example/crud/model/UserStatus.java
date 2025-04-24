package com.example.crud.model;

public enum UserStatus {
    ACTIVE,      // User has full access based on their roles
    SUSPENDED,   // Temporary restriction - read-only access
    BLOCKED      // Complete restriction - no access
} 