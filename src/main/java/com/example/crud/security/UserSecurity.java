package com.example.crud.security;

import com.example.crud.model.User;
import com.example.crud.model.UserStatus;
import com.example.crud.service.UserPermissionService;
import com.example.crud.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("userSecurity")
public class UserSecurity {
    @Autowired
    private UserService userService;
    
    @Autowired
    private UserPermissionService permissionService;

    /**
     * Checks if the authenticated user is the same as the requested user ID
     * and has appropriate status
     */
    public boolean isCurrentUser(Long userId) {
        // If user is blocked, no access is granted
        if (permissionService.isBlocked()) {
            return false;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return false;

        User user = userService.getUserById(userId);
        if (user == null) return false;

        return authentication.getName().equals(user.getUsername());
    }

    /**
     * Checks if the authenticated user can modify the resource
     * SUSPENDED users cannot modify resources
     */
    public boolean canModifyResource(Long userId) {
        // If user is blocked or suspended, they cannot modify resources
        if (permissionService.isBlocked() || permissionService.hasReadOnlyAccess()) {
            return false;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return false;

        User user = userService.getUserById(userId);
        if (user == null) return false;

        return authentication.getName().equals(user.getUsername());
    }
}