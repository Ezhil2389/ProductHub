package com.example.crud.controller;

import com.example.crud.model.User;
import com.example.crud.payload.request.LoginRequest;
import com.example.crud.payload.request.MfaSetupRequest;
import com.example.crud.payload.request.SignupRequest;
import com.example.crud.payload.response.JwtResponse;
import com.example.crud.payload.response.MessageResponse;
import com.example.crud.payload.response.MfaSetupResponse;
import com.example.crud.repository.UserRepository;
import com.example.crud.security.jwt.JwtUtils;
import com.example.crud.security.services.UserDetailsImpl;
import com.example.crud.service.*;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthControllerTests {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtUtils jwtUtils;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserService userService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private MfaService mfaService;
    @Mock
    private LogService logService;
    @Mock
    private TokenBlacklistService tokenBlacklistService;
    @Mock
    private UserSessionService userSessionService;

    @InjectMocks
    private AuthController authController;

    private MockHttpServletRequest mockRequest;
    private UserDetailsImpl mockUserDetails;
    private User mockUser;

    @BeforeEach
    void setUp() {
        mockRequest = new MockHttpServletRequest();
        mockRequest.setRemoteAddr("127.0.0.1"); // Default IP

        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        mockUserDetails = new UserDetailsImpl(1L, "testuser", "test@example.com", "password", true, true, true, true, authorities, null, null, null, null, null, null);
        mockUser = new User("testuser", "test@example.com", "password");
        mockUser.setId(1L);
    }

    private void setupMockAuthentication() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(mockUserDetails);
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }


    @Test
    void authenticateUser_success_logsCorrectEvent() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password");

        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(mockUserDetails);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(authentication);
        when(userRepository.findById(mockUserDetails.getId())).thenReturn(Optional.of(mockUser));
        when(jwtUtils.generateJwtToken(authentication)).thenReturn("test-jwt-token");

        ResponseEntity<?> response = authController.authenticateUser(loginRequest, mockRequest);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody() instanceof JwtResponse);
        verify(logService, times(1)).addLog(
                eq("LOGIN_SUCCESS"),
                eq("USER_SESSION"),
                eq("testuser"),
                eq("User logged in successfully."),
                anyString() // IP address
        );
    }

    @Test
    void authenticateUser_badCredentials_logsCorrectEvent() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("wrongpassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));
        
        // Mock user for expiry and lock check
        when(userRepository.findByUsername(loginRequest.getUsername())).thenReturn(Optional.of(mockUser));
        when(userService.isAccountLocked(loginRequest.getUsername())).thenReturn(false);


        ResponseEntity<?> response = authController.authenticateUser(loginRequest, mockRequest);

        assertNotNull(response);
        assertEquals(400, response.getStatusCode().value()); // Bad Request
        verify(logService, times(1)).addLog(
                eq("LOGIN_FAILURE"),
                eq("USER_SESSION"),
                eq("testuser"),
                eq("Failed login attempt: Invalid credentials."),
                anyString()
        );
    }
    
    @Test
    void authenticateUser_accountLocked_logsCorrectEvent() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("lockeduser");
        loginRequest.setPassword("password");

        // Mock user for expiry check
        User lockedUser = new User("lockeduser", "locked@example.com", "password");
        when(userRepository.findByUsername(loginRequest.getUsername())).thenReturn(Optional.of(lockedUser));
        when(userService.isAccountLocked("lockeduser")).thenReturn(true);

        ResponseEntity<?> response = authController.authenticateUser(loginRequest, mockRequest);

        assertNotNull(response);
        assertEquals(400, response.getStatusCode().value()); // Bad Request
        verify(logService, times(1)).addLog(
                eq("LOGIN_FAILURE"),
                eq("USER_SESSION"),
                eq("lockeduser"),
                eq("Failed login attempt: Account locked."),
                anyString()
        );
    }

    @Test
    void registerUser_success_logsCorrectEvent() {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setUsername("newuser");
        signupRequest.setEmail("new@example.com");
        signupRequest.setPassword("ValidPass1@");

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userService.getRoleSet(null)).thenReturn(new HashSet<>(Collections.singletonList(new Role(ERole.ROLE_USER))));

        ResponseEntity<?> response = authController.registerUser(signupRequest, mockRequest);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        verify(logService, times(1)).addLog(
                eq("USER_REGISTERED"),
                eq("USER"),
                eq("newuser"),
                eq("New user registered."),
                anyString()
        );
    }

    @Test
    void setupMfa_success_logsCorrectEvent() {
        setupMockAuthentication();
        when(userRepository.findById(mockUserDetails.getId())).thenReturn(Optional.of(mockUser));
        when(mfaService.generateSecretKey()).thenReturn("testsecret");
        when(mfaService.generateQrCodeUrl(anyString(), anyString())).thenReturn("testqrcode");

        ResponseEntity<?> response = authController.setupMfa(mockRequest);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        verify(logService, times(1)).addLog(
                eq("MFA_SETUP_INITIATED"),
                eq("USER_SECURITY"),
                eq("testuser"),
                eq("MFA setup process initiated."),
                anyString()
        );
    }

    @Test
    void verifyAndEnableMfa_success_logsCorrectEvent() {
        setupMockAuthentication();
        MfaSetupRequest mfaSetupRequest = new MfaSetupRequest();
        mfaSetupRequest.setCode("123456");
        
        when(userRepository.findById(mockUserDetails.getId())).thenReturn(Optional.of(mockUser));
        // Assume enableMfaForUser modifies user and doesn't throw exception
        doNothing().when(mfaService).enableMfaForUser(any(User.class), anyString());

        ResponseEntity<?> response = authController.verifyAndEnableMfa(mfaSetupRequest, mockRequest);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        verify(logService, times(1)).addLog(
                eq("MFA_ENABLED"),
                eq("USER_SECURITY"),
                eq("testuser"),
                eq("MFA enabled successfully."),
                anyString()
        );
    }

    @Test
    void verifyAndEnableMfa_failure_logsCorrectEvent() {
        setupMockAuthentication();
        MfaSetupRequest mfaSetupRequest = new MfaSetupRequest();
        mfaSetupRequest.setCode("wrongcode");

        when(userRepository.findById(mockUserDetails.getId())).thenReturn(Optional.of(mockUser));
        doThrow(new IllegalArgumentException("Invalid MFA code"))
            .when(mfaService).enableMfaForUser(any(User.class), eq("wrongcode"));
        
        ResponseEntity<?> response = authController.verifyAndEnableMfa(mfaSetupRequest, mockRequest);

        assertNotNull(response);
        assertEquals(400, response.getStatusCode().value()); // Bad Request
        verify(logService, times(1)).addLog(
                eq("MFA_VERIFICATION_FAILED"),
                eq("USER_SECURITY"),
                eq("testuser"),
                eq("MFA code verification failed during setup: Invalid MFA code"),
                anyString()
        );
    }

    @Test
    void disableMfa_success_logsCorrectEvent() {
        setupMockAuthentication();
        MfaSetupRequest mfaSetupRequest = new MfaSetupRequest(); // Assuming code is needed
        mfaSetupRequest.setCode("validcode");

        when(userRepository.findById(mockUserDetails.getId())).thenReturn(Optional.of(mockUser));
        doNothing().when(mfaService).disableMfaForUser(any(User.class), anyString());

        ResponseEntity<?> response = authController.disableMfa(mfaSetupRequest, mockRequest);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        verify(logService, times(1)).addLog(
                eq("MFA_DISABLED"),
                eq("USER_SECURITY"),
                eq("testuser"),
                eq("MFA disabled successfully."),
                anyString()
        );
    }
    
    @Test
    void disableMfa_failure_logsCorrectEvent() {
        setupMockAuthentication();
        MfaSetupRequest mfaSetupRequest = new MfaSetupRequest();
        mfaSetupRequest.setCode("wrongcode");

        when(userRepository.findById(mockUserDetails.getId())).thenReturn(Optional.of(mockUser));
        doThrow(new IllegalArgumentException("Invalid MFA code for disabling"))
            .when(mfaService).disableMfaForUser(any(User.class), eq("wrongcode"));

        ResponseEntity<?> response = authController.disableMfa(mfaSetupRequest, mockRequest);

        assertNotNull(response);
        assertEquals(400, response.getStatusCode().value()); // Bad Request
        verify(logService, times(1)).addLog(
                eq("MFA_VERIFICATION_FAILED"),
                eq("USER_SECURITY"),
                eq("testuser"),
                eq("MFA code verification failed during disable: Invalid MFA code for disabling"),
                anyString()
        );
    }

    @Test
    void logoutUser_success_logsCorrectEvent() {
        setupMockAuthentication(); // Ensure SecurityContextHolder has an authentication
        String fakeToken = "Bearer testtoken123";
        Date expiryDate = new Date(System.currentTimeMillis() + 3600000); // 1 hour from now
        
        when(jwtUtils.getExpirationDateFromToken("testtoken123")).thenReturn(expiryDate);
        // Mock userSessionService.invalidateUserSessions to avoid NullPointerException if it's called
        doNothing().when(userSessionService).invalidateUserSessions(anyLong());
        // Mock tokenBlacklistService.blacklistToken
        doNothing().when(tokenBlacklistService).blacklistToken(anyString(), any(Date.class));


        ResponseEntity<?> response = authController.logoutUser(fakeToken, mockRequest);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        verify(logService, times(1)).addLog(
                eq("LOGOUT"),
                eq("USER_SESSION"),
                eq("testuser"),
                eq("User logged out successfully."),
                anyString()
        );
    }
}
