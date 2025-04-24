package com.example.crud.controller;

import com.example.crud.model.User;
import com.example.crud.payload.request.GoogleAuthRequest;
import com.example.crud.payload.response.JwtResponse;
import com.example.crud.payload.response.MessageResponse;
import com.example.crud.security.services.UserDetailsImpl;
import com.example.crud.service.GoogleAuthService;
import com.example.crud.service.UserService;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/auth/google")
public class GoogleAuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(GoogleAuthController.class);
    
    @Autowired
    private GoogleAuthService googleAuthService;
    
    @Autowired
    private UserService userService;
    
    /**
     * Google Sign-in endpoint
     * Authenticates an existing user with Google credentials
     */
    @PostMapping("/signin")
    public ResponseEntity<?> signInWithGoogle(@Valid @RequestBody GoogleAuthRequest request) {
        try {
            if (request.getCredential() == null || request.getCredential().isEmpty()) {
                logger.error("Google sign-in attempt with empty credential");
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: Google credential is required"));
            }
            
            logger.debug("Google sign-in attempt with token length: {}", request.getCredential().length());
            
            String jwt = googleAuthService.authenticateWithGoogle(request.getCredential());
            
            // Get user details from the JWT
            String username = googleAuthService.getUsernameFromToken(request.getCredential());
            User user = userService.getUserByUsername(username);
            List<String> roles = user.getRoles().stream()
                    .map(role -> role.getName().name())
                    .collect(Collectors.toList());
            
            logger.info("User '{}' successfully signed in with Google", username);
            
            return ResponseEntity.ok(new JwtResponse(
                    jwt,
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    roles,
                    user.isMfaEnabled(),
                    user.getProfileImage()
            ));
        } catch (Exception e) {
            logger.error("Google sign-in error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }
    
    /**
     * Google Sign-up endpoint
     * Registers a new user with Google credentials
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signUpWithGoogle(@Valid @RequestBody GoogleAuthRequest request) {
        try {
            if (request.getCredential() == null || request.getCredential().isEmpty()) {
                logger.error("Google sign-up attempt with empty credential");
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: Google credential is required"));
            }
            
            logger.debug("Google sign-up attempt with token length: {}", request.getCredential().length());
            
            // If username is provided but is invalid, return an error
            if (request.getUsername() != null && !request.getUsername().isEmpty()) {
                if (request.getUsername().length() < 3 || request.getUsername().length() > 20) {
                    return ResponseEntity.badRequest()
                            .body(new MessageResponse("Error: Username must be between 3 and 20 characters"));
                }
            }
            
            String jwt = googleAuthService.registerWithGoogle(request.getCredential(), request.getUsername());
            
            // Get user details from the token
            String username = googleAuthService.getUsernameFromToken(request.getCredential());
            User user = userService.getUserByUsername(username);
            List<String> roles = user.getRoles().stream()
                    .map(role -> role.getName().name())
                    .collect(Collectors.toList());
            
            logger.info("New user '{}' successfully signed up with Google", username);
            
            return ResponseEntity.ok(new JwtResponse(
                    jwt,
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    roles,
                    user.isMfaEnabled(),
                    user.getProfileImage()
            ));
        } catch (Exception e) {
            logger.error("Google sign-up error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }
} 