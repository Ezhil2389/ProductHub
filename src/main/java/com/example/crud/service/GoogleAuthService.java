package com.example.crud.service;

import com.example.crud.model.ERole;
import com.example.crud.model.Role;
import com.example.crud.model.User;
import com.example.crud.model.UserStatus;
import com.example.crud.repository.RoleRepository;
import com.example.crud.repository.UserRepository;
import com.example.crud.security.jwt.JwtUtils;
import com.example.crud.security.services.UserDetailsImpl;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GoogleAuthService {
    
    private static final Logger logger = LoggerFactory.getLogger(GoogleAuthService.class);
    
    @Value("${google.client.id}")
    private String clientId;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RoleRepository roleRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtUtils jwtUtils;
    
    @Autowired
    private ApplicationLogService applicationLogService;
    
    @Autowired
    private UserService userService;
    
    /**
     * Verify the Google ID token
     * @param idTokenString the token to verify
     * @return the verified Google ID token payload, or null if verification fails
     * @throws IllegalArgumentException with detailed message if verification fails
     */
    public Payload verifyGoogleToken(String idTokenString) {
        try {
            // Log the client ID being used (don't log in production)
            logger.debug("Using Google Client ID: {}", clientId);
            
            // Check if client ID is properly configured
            if (clientId == null || clientId.isEmpty() || "your-google-client-id".equals(clientId)) {
                logger.error("Google Client ID is not properly configured");
                throw new IllegalArgumentException("Google Client ID is not configured correctly");
            }
            
            // Create verifier with proper audience
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(clientId))
                    .build();
            
            // Verify token
            logger.debug("Attempting to verify Google token");
            GoogleIdToken idToken = verifier.verify(idTokenString);
            
            if (idToken != null) {
                logger.info("Successfully verified Google token");
                return idToken.getPayload();
            } else {
                logger.error("Token verification failed - null token returned");
                throw new IllegalArgumentException("Google token verification failed");
            }
        } catch (IllegalArgumentException e) {
            // Rethrow configuration exceptions
            logger.error("Configuration error during Google token verification: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            // Log and wrap other exceptions
            logger.error("Error verifying Google token: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Error verifying Google token: " + e.getMessage());
        }
    }
    
    /**
     * Authenticate a user with Google credentials
     * @param token the Google ID token
     * @return JWT token if authentication is successful
     */
    @Transactional
    public String authenticateWithGoogle(String token) {
        Payload payload = verifyGoogleToken(token);
        if (payload == null) {
            throw new IllegalArgumentException("Invalid Google token");
        }
        
        String email = payload.getEmail();
        
        // Check if user exists
        Optional<User> userOptional = userRepository.findByEmail(email);
        
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("No user found with this Google account");
        }
        
        User user = userOptional.get();
        
        // Check if user is active
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException("User account is " + user.getStatus().toString().toLowerCase());
        }
        
        // Check for account expiry and block if expired
        if (user.getAccountExpiresAt() != null && user.getAccountExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalArgumentException("Account expired. Please contact an administrator.");
        }
        
        // Create authentication object
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        
        List<SimpleGrantedAuthority> authorities = userDetails.getAuthorities()
                .stream()
                .map(authority -> new SimpleGrantedAuthority(authority.getAuthority()))
                .collect(Collectors.toList());
        
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, authorities);
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        applicationLogService.logInfo("User '" + user.getUsername() + "' authenticated with Google");
        
        // Generate JWT
        return jwtUtils.generateJwtToken(authentication);
    }
    
    /**
     * Register a new user with Google credentials
     * @param token the Google ID token
     * @param username optional username (will be generated if not provided)
     * @return JWT token if registration is successful
     */
    @Transactional
    public String registerWithGoogle(String token, String username) {
        Payload payload = verifyGoogleToken(token);
        if (payload == null) {
            throw new IllegalArgumentException("Invalid Google token");
        }
        
        String email = payload.getEmail();
        String name = (String) payload.get("name");
        
        // Check if user exists
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already in use");
        }
        
        // Generate username if not provided
        if (username == null || username.trim().isEmpty()) {
            // Extract part before @ in email
            username = email.split("@")[0];
            
            // Check if username exists, append random string if it does
            int attempts = 0;
            String baseUsername = username;
            while (userRepository.existsByUsername(username) && attempts < 5) {
                username = baseUsername + UUID.randomUUID().toString().substring(0, 6);
                attempts++;
            }
            
            if (attempts >= 5) {
                throw new IllegalArgumentException("Unable to generate unique username");
            }
        } else if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already taken");
        }
        
        // Create new user
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setStatus(UserStatus.ACTIVE);
        user.setAccountExpiresAt(java.time.LocalDateTime.now().plusYears(1));
        
        // Generate random password for Google users
        String randomPassword = UUID.randomUUID().toString();
        user.setPassword(passwordEncoder.encode(randomPassword));
        
        // Set user role
        Set<Role> roles = new HashSet<>();
        Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                .orElseThrow(() -> new RuntimeException("Role 'ROLE_USER' not found"));
        roles.add(userRole);
        user.setRoles(roles);
        
        userRepository.save(user);
        
        applicationLogService.logInfo("New user '" + username + "' registered with Google");
        
        // Create user details and authentication
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        
        List<SimpleGrantedAuthority> authorities = userDetails.getAuthorities()
                .stream()
                .map(authority -> new SimpleGrantedAuthority(authority.getAuthority()))
                .collect(Collectors.toList());
        
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, authorities);
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        // Generate JWT
        return jwtUtils.generateJwtToken(authentication);
    }
    
    /**
     * Extract username from Google token
     * @param idTokenString the token to extract username from
     * @return the username
     */
    public String getUsernameFromToken(String idTokenString) {
        Payload payload = verifyGoogleToken(idTokenString);
        if (payload == null) {
            throw new IllegalArgumentException("Invalid Google token");
        }
        
        String email = payload.getEmail();
        Optional<User> userOptional = userRepository.findByEmail(email);
        
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("No user found with this Google account email: " + email);
        }
        
        return userOptional.get().getUsername();
    }
} 