package com.example.crud.service;

import com.example.crud.model.User;
import com.example.crud.repository.RoleRepository;
import com.example.crud.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTests {

    @Mock
    private UserRepository userRepository;

    @Mock
    private LogService logService;

    @Mock
    private RoleRepository roleRepository; // Added as it's a dependency

    @Mock
    private PasswordEncoder passwordEncoder; // Added as it's a dependency

    @Mock
    private TokenBlacklistService tokenBlacklistService; // Added as it's a dependency
    
    @Mock
    private UserSessionService userSessionService; // Added as it's a dependency

    @InjectMocks
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User("testuser", "test@example.com", "password");
        testUser.setId(1L);
        // Initialize failedLoginAttempts to 0 for consistent testing
        testUser.setFailedLoginAttempts(0);
    }

    @Test
    void testIncrementFailedLoginAttempts_logsCorrectEvent() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        userService.incrementFailedLoginAttempts("testuser");

        // Verify logService.addLog was called with expected parameters
        // The expected detail message includes the attempt number, which will be 1.
        verify(logService, times(1)).addLog(
                eq("LOGIN_ATTEMPT_FAILED"),
                eq("USER_SECURITY"),
                eq("testuser"),
                eq("Failed login attempt for user. Attempt: 1"),
                isNull() // IP address is null in this context
        );

        // Also verify that user's failed attempts count was incremented
        // This is implicitly tested by the log message, but explicit check is good
        assertEquals(1, testUser.getFailedLoginAttempts());
        assertNotNull(testUser.getLastFailedLoginTime());
        
        // Verify save is called
        verify(userRepository, times(1)).save(testUser);
    }
    
    @Test
    void testIncrementFailedLoginAttempts_locksAccountAfterMaxAttempts() {
        // Set failed attempts to just below max
        testUser.setFailedLoginAttempts(UserService.MAX_FAILED_ATTEMPTS - 1);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        userService.incrementFailedLoginAttempts("testuser");

        // First, verify the LOGIN_ATTEMPT_FAILED log
        verify(logService, times(1)).addLog(
                eq("LOGIN_ATTEMPT_FAILED"),
                eq("USER_SECURITY"),
                eq("testuser"),
                eq("Failed login attempt for user. Attempt: " + UserService.MAX_FAILED_ATTEMPTS),
                isNull()
        );

        // Then, verify the account lock log (which happens inside lockUserAccount method called by incrementFailedLoginAttempts)
        verify(logService, times(1)).addLog(
                eq("UPDATE"),
                eq("USER"),
                eq("SYSTEM"), // "SYSTEM" is the performer for automatic lock
                eq("Account locked automatically for user: testuser (ID: 1) due to " + UserService.MAX_FAILED_ATTEMPTS + " failed login attempts"),
                isNull() // Assuming IP is null for system actions too
        );
        
        assertEquals(UserService.MAX_FAILED_ATTEMPTS, testUser.getFailedLoginAttempts());
        assertEquals(com.example.crud.model.UserStatus.BLOCKED, testUser.getStatus());
        assertNotNull(testUser.getStatusReason());
        verify(userRepository, times(1)).save(testUser);
        verify(userSessionService, times(1)).invalidateAllUserSessions(testUser.getId());
    }
}
