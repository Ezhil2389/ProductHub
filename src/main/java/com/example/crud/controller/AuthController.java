package com.example.crud.controller;

import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import com.example.crud.model.User;
import com.example.crud.model.Role;
import com.example.crud.payload.request.LoginRequest;
import com.example.crud.payload.request.SignupRequest;
import com.example.crud.payload.response.JwtResponse;
import com.example.crud.payload.response.MessageResponse;
import com.example.crud.repository.UserRepository;
import com.example.crud.security.jwt.JwtUtils;
import com.example.crud.security.services.UserDetailsImpl;
import com.example.crud.service.UserService;
import com.example.crud.service.MfaService;
import com.example.crud.payload.request.MfaSetupRequest;
import com.example.crud.payload.response.MfaSetupResponse;
import com.example.crud.service.TokenBlacklistService;
import com.example.crud.service.UserSessionService;
import com.example.crud.service.LogService;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    UserService userService;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    private MfaService mfaService;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @Autowired
    private UserSessionService userSessionService;

    @Autowired
    private LogService logService;

    private String getClientIp(HttpServletRequest request) {
        String[] headersToCheck = {
                "X-Forwarded-For",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_X_FORWARDED_FOR",
                "HTTP_CLIENT_IP",
                "X-Real-IP"
        };
        for (String header : headersToCheck) {
            String ip = request.getHeader(header);
            if (ip != null && ip.length() != 0 && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        // Check if the account is expired before attempting authentication
        User userForExpiryCheck = userRepository.findByUsername(loginRequest.getUsername()).orElse(null);
        if (userForExpiryCheck != null && userForExpiryCheck.getAccountExpiresAt() != null &&
            userForExpiryCheck.getAccountExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            // Log account expired attempt? The spec doesn't explicitly state this, but it's a security event.
            // For now, sticking to the spec.
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Account expired. Please contact an administrator."));
        }
        
        // Check if the account is locked before attempting authentication
        if (userService.isAccountLocked(loginRequest.getUsername())) {
            logService.addLog("LOGIN_FAILURE", "USER_SESSION", loginRequest.getUsername(), "Failed login attempt: Account locked.", getClientIp(request));
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Account is locked due to too many failed login attempts. Please contact an administrator."));
        }
        
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            User user = userRepository.findById(userDetails.getId()).orElseThrow();

            // Check if MFA is enabled
            if (user.isMfaEnabled()) {
                if (loginRequest.getMfaCode() == null) {
                    logService.addLog("MFA_REQUIRED", "USER_SESSION", user.getUsername(), "MFA code required for login.", getClientIp(request));
                    return ResponseEntity.ok(new MessageResponse("MFA code required"));
                }
                
                // Verify MFA code
                if (!mfaService.verifyCode(user.getMfaSecret(), loginRequest.getMfaCode())) {
                    // Check if it's a recovery code
                    if (!mfaService.validateRecoveryCode(user, String.valueOf(loginRequest.getMfaCode()))) {
                        logService.addLog("MFA_VERIFICATION_FAILED", "USER_SESSION", user.getUsername(), "Invalid MFA code during login.", getClientIp(request));
                        return ResponseEntity.badRequest().body(new MessageResponse("Invalid MFA code"));
                    }
                }
            }

            // Reset failed login attempts on successful login
            userService.resetFailedLoginAttempts(loginRequest.getUsername());

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);
            logService.addLog("LOGIN_SUCCESS", "USER_SESSION", userDetails.getUsername(), "User logged in successfully.", getClientIp(request));

            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            return ResponseEntity.ok(new JwtResponse(jwt,
                    userDetails.getId(),
                    userDetails.getUsername(),
                    userDetails.getEmail(),
                    roles));
        } catch (BadCredentialsException e) {
            // Increment failed login attempts
            userService.incrementFailedLoginAttempts(loginRequest.getUsername());
            logService.addLog("LOGIN_FAILURE", "USER_SESSION", loginRequest.getUsername(), "Failed login attempt: Invalid credentials.", getClientIp(request));
            
            // Check if the account is now locked after incrementing
            if (userService.isAccountLocked(loginRequest.getUsername())) {
                logService.addLog("LOGIN_FAILURE", "USER_SESSION", loginRequest.getUsername(), "Failed login attempt: Account locked.", getClientIp(request));
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Account has been locked due to too many failed login attempts. Please contact an administrator."));
            }
            
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid username or password"));
        } catch (LockedException e) { // This case might be redundant if the above check catches it first.
            logService.addLog("LOGIN_FAILURE", "USER_SESSION", loginRequest.getUsername(), "Failed login attempt: Account locked.", getClientIp(request));
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Account is locked. Please contact an administrator."));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest, HttpServletRequest request) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Email is already in use!"));
        }

        // Create new user's account
        User user = new User(signUpRequest.getUsername(),
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()));

        Set<Role> roles = userService.getRoleSet(signUpRequest.getRoles());
        user.setRoles(roles);
        userRepository.save(user);
        logService.addLog("USER_REGISTERED", "USER", signUpRequest.getUsername(), "New user registered.", getClientIp(request));

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @PostMapping("/mfa/setup")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> setupMfa(HttpServletRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            User user = userRepository.findById(userDetails.getId()).orElseThrow();

            if (user.isMfaEnabled()) {
                return ResponseEntity.badRequest().body(new MessageResponse("MFA is already enabled"));
            }

            String secretKey = mfaService.generateSecretKey();
            String qrCodeUrl = mfaService.generateQrCodeUrl(secretKey, user.getUsername());
            
            user.setMfaSecret(secretKey);
            userRepository.save(user);
            logService.addLog("MFA_SETUP_INITIATED", "USER_SECURITY", userDetails.getUsername(), "MFA setup process initiated.", getClientIp(request));

            return ResponseEntity.ok(new MfaSetupResponse(secretKey, qrCodeUrl, null));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(new MessageResponse("Error setting up MFA: " + e.getMessage()));
        }
    }

    @PostMapping("/mfa/verify")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> verifyAndEnableMfa(@Valid @RequestBody MfaSetupRequest mfaRequest, HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElseThrow();

        try {
            mfaService.enableMfaForUser(user, mfaRequest.getCode());
            // Reload user to get the recovery codes
            user = userRepository.findById(userDetails.getId()).orElseThrow();
            logService.addLog("MFA_ENABLED", "USER_SECURITY", userDetails.getUsername(), "MFA enabled successfully.", getClientIp(request));
            return ResponseEntity.ok(new MfaSetupResponse(user.getMfaSecret(), null, user.getRecoveryCodes()));
        } catch (IllegalArgumentException e) {
            logService.addLog("MFA_VERIFICATION_FAILED", "USER_SECURITY", userDetails.getUsername(), "MFA code verification failed during setup: " + e.getMessage(), getClientIp(request));
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/mfa/disable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> disableMfa(@Valid @RequestBody MfaSetupRequest mfaRequest, HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElseThrow();

        try {
            mfaService.disableMfaForUser(user, mfaRequest.getCode());
            logService.addLog("MFA_DISABLED", "USER_SECURITY", userDetails.getUsername(), "MFA disabled successfully.", getClientIp(request));
            return ResponseEntity.ok(new MessageResponse("MFA disabled successfully"));
        } catch (IllegalArgumentException e) {
            logService.addLog("MFA_VERIFICATION_FAILED", "USER_SECURITY", userDetails.getUsername(), "MFA code verification failed during disable: " + e.getMessage(), getClientIp(request));
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/signout")
    public ResponseEntity<?> logoutUser(@RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader, HttpServletRequest request) {
        try {
            String token = authHeader.substring(7); // Remove "Bearer "
            Date expiryDate = jwtUtils.getExpirationDateFromToken(token);
            
            if (expiryDate != null) {
                // Get current user
                UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext()
                    .getAuthentication().getPrincipal();
                
                // Invalidate all sessions for the user
                userSessionService.invalidateUserSessions(userDetails.getId());
                
                // Blacklist the current token
                tokenBlacklistService.blacklistToken(token, expiryDate);
                logService.addLog("LOGOUT", "USER_SESSION", userDetails.getUsername(), "User logged out successfully.", getClientIp(request));
                
                return ResponseEntity.ok(new MessageResponse("Logged out successfully!"));
            } else {
                return ResponseEntity.badRequest().body(new MessageResponse("Invalid token"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: " + e.getMessage()));
        }
    }
    
    @PostMapping("/admin/unlock-account")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> unlockUserAccount(@RequestBody Long userId, HttpServletRequest request) { // Added request for potential future logging
        try {
            userService.unlockUserAccount(userId);
            // Consider logging this admin action with IP
            // logService.addLog("ADMIN_UNLOCK", "USER_ACCOUNT", adminUsername, "Unlocked account for user ID: " + userId, getClientIp(request));
            return ResponseEntity.ok(new MessageResponse("Account unlocked successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: " + e.getMessage()));
        }
    }
}