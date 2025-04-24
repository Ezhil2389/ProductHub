package com.example.crud.service;

import com.example.crud.model.ERole;
import com.example.crud.model.Role;
import com.example.crud.model.User;
import com.example.crud.model.UserStatus;
import com.example.crud.repository.RoleRepository;
import com.example.crud.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {
    private static final int MAX_FAILED_ATTEMPTS = 5;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LogService logService;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @Autowired
    private UserSessionService userSessionService;

    public List<User> getAllUsers() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        logService.addLog("READ", "USER", auth.getName(), "Retrieved list of all users");
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
        logService.addLog("READ", "USER", auth.getName(), 
            "Retrieved user details for: " + user.getUsername() + " (ID: " + id + ")");
        return user;
    }

    public User getUserByUsername(String username) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
        logService.addLog("READ", "USER", auth.getName(), 
            "Retrieved user details for username: " + username);
        return user;
    }

    @Transactional
    public void deleteUser(Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = getUserById(id);
        String deletedUsername = user.getUsername();
        userRepository.deleteById(id);
        logService.addLog("DELETE", "USER", auth.getName(), 
            "Deleted user: " + deletedUsername + " (ID: " + id + ")");
    }

    @Transactional
    public void updatePassword(Long userId, String currentPassword, String newPassword) {
        User user = getUserById(userId);
        
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadCredentialsException("Current password is incorrect");
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        logService.addLog("UPDATE", "USER", user.getUsername(), 
            "Password updated for user: " + user.getUsername() + " (ID: " + userId + ")");
    }

    @Transactional
    public void resetPassword(Long userId, String newPassword) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = getUserById(userId);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        logService.addLog("UPDATE", "USER", auth.getName(), 
            "Password reset for user: " + user.getUsername() + " (ID: " + userId + ")");
    }

    @Transactional
    public User updateRoles(Long userId, Set<String> newRoles) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = getUserById(userId);
        Set<Role> roles = getRoleSet(newRoles);
        String oldRoles = user.getRoles().stream()
            .map(role -> role.getName().name())
            .collect(Collectors.joining(", "));
        String newRolesStr = roles.stream()
            .map(role -> role.getName().name())
            .collect(Collectors.joining(", "));
        
        user.setRoles(roles);
        User savedUser = userRepository.save(user);
        
        logService.addLog("UPDATE", "USER", auth.getName(), 
            "Updated roles for user: " + user.getUsername() + " (ID: " + userId + ") from [" + oldRoles + "] to [" + newRolesStr + "]");
        
        return savedUser;
    }

    public Set<Role> getRoleSet(Set<String> strRoles) {
        Set<Role> roles = new HashSet<>();

        if (strRoles == null || strRoles.isEmpty()) {
            Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                switch (role) {
                    case "admin":
                        Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(adminRole);
                        break;
                    default:
                        Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(userRole);
                }
            });
        }

        return roles;
    }

    public User updateUserStatus(Long id, UserStatus status, String reason) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = getUserById(id);
        
        // Prevent status updates on admin users
        if (user.getRoles().stream().anyMatch(role -> role.getName().name().equals("ROLE_ADMIN"))) {
            throw new RuntimeException("Cannot modify admin user status");
        }
        
        // If user is being blocked, invalidate all their sessions
        if (status == UserStatus.BLOCKED) {
            userSessionService.invalidateAllUserSessions(id);
        }
        
        UserStatus oldStatus = user.getStatus();
        user.setStatus(status);
        user.setStatusReason(reason);
        
        User savedUser = userRepository.save(user);
        
        logService.addLog("UPDATE", "USER", auth.getName(), 
            "Updated user status: " + user.getUsername() + " (ID: " + id + ") from [" + 
            (oldStatus == null ? "ACTIVE (default)" : oldStatus) + "] to [" + status + "]" + 
            (reason != null ? " Reason: " + reason : ""));
        
        return savedUser;
    }

    public boolean isUserAccessAllowed(User user) {
        return user.getStatus() == UserStatus.ACTIVE;
    }

    public boolean isUserReadOnlyAccess(User user) {
        return user.getStatus() == UserStatus.SUSPENDED;
    }

    @Transactional
    public User updateProfileImage(Long userId, String profileImage) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = getUserById(userId);
        user.setProfileImage(profileImage);
        User savedUser = userRepository.save(user);
        
        logService.addLog("UPDATE", "USER", auth.getName(), 
            "Updated profile image for user: " + user.getUsername() + " (ID: " + userId + ")");
        
        return savedUser;
    }
    
    @Transactional
    public void incrementFailedLoginAttempts(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
        
        int attempts = user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts();
        user.setFailedLoginAttempts(attempts + 1);
        user.setLastFailedLoginTime(LocalDateTime.now());
        
        // Lock account if failed attempts exceed threshold
        if (user.getFailedLoginAttempts() >= MAX_FAILED_ATTEMPTS) {
            lockUserAccount(user);
        }
        
        userRepository.save(user);
    }
    
    @Transactional
    public void resetFailedLoginAttempts(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
        
        user.setFailedLoginAttempts(0);
        user.setLastFailedLoginTime(null);
        userRepository.save(user);
    }
    
    @Transactional
    public void lockUserAccount(User user) {
        user.setStatus(UserStatus.BLOCKED);
        user.setStatusReason("Account locked due to " + MAX_FAILED_ATTEMPTS + " failed login attempts");
        userSessionService.invalidateAllUserSessions(user.getId());
        
        logService.addLog("UPDATE", "USER", "SYSTEM", 
            "Account locked automatically for user: " + user.getUsername() + 
            " (ID: " + user.getId() + ") due to " + MAX_FAILED_ATTEMPTS + " failed login attempts");
    }
    
    @Transactional
    public void unlockUserAccount(Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = getUserById(userId);
        
        user.setStatus(UserStatus.ACTIVE);
        user.setStatusReason(null);
        user.setFailedLoginAttempts(0);
        user.setLastFailedLoginTime(null);
        user.setAccountExpiresAt(LocalDateTime.now().plusYears(1));
        userRepository.save(user);
        
        logService.addLog("UPDATE", "USER", auth.getName(), 
            "Account unlocked for user: " + user.getUsername() + " (ID: " + userId + ")");
    }
    
    public boolean isAccountLocked(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
                
        return user.getStatus() == UserStatus.BLOCKED;
    }

    @Transactional
    public User saveUser(User user) {
        return userRepository.save(user);
    }
    
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }
}