package com.example.crud.service;

import com.example.crud.model.User;
import com.example.crud.model.UserStatus;
import com.example.crud.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserPermissionService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Checks if the current authenticated user has full access
     * @return true if the user has full access (ACTIVE status)
     */
    public boolean hasFullAccess() {
        Optional<User> currentUser = getCurrentUser();
        return currentUser.isPresent() && 
               (currentUser.get().getStatus() == null || currentUser.get().getStatus() == UserStatus.ACTIVE);
    }
    
    /**
     * Checks if the current authenticated user has read-only access
     * @return true if the user has read-only access (SUSPENDED status)
     */
    public boolean hasReadOnlyAccess() {
        Optional<User> currentUser = getCurrentUser();
        return currentUser.isPresent() && 
               currentUser.get().getStatus() != null && 
               currentUser.get().getStatus() == UserStatus.SUSPENDED;
    }
    
    /**
     * Checks if the current authenticated user is blocked
     * @return true if the user is blocked (BLOCKED status)
     */
    public boolean isBlocked() {
        Optional<User> currentUser = getCurrentUser();
        return currentUser.isPresent() && 
               currentUser.get().getStatus() != null && 
               currentUser.get().getStatus() == UserStatus.BLOCKED;
    }
    
    /**
     * Gets the current authenticated user
     * @return Optional containing the User if found
     */
    private Optional<User> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser")) {
            return Optional.empty();
        }
        
        return userRepository.findByUsername(auth.getName());
    }
} 