package com.example.crud.controller;

import com.example.crud.model.User;
import com.example.crud.payload.request.ForgotPasswordRequest;
import com.example.crud.payload.request.ResetPasswordRequest;
import com.example.crud.payload.response.ForgotPasswordResponse;
import com.example.crud.payload.response.MessageResponse;
import com.example.crud.security.jwt.JwtUtils;
import com.example.crud.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/forgot-password")
public class PasswordResetController {

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/verify")
    public ResponseEntity<?> verifyUsername(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            User user = passwordResetService.verifyUsername(request.getUsername());
            String tempToken = jwtUtils.generatePasswordResetToken(user.getId(), user.getUsername());
            
            return ResponseEntity.ok(new ForgotPasswordResponse(
                user.getId(),
                user.isMfaEnabled(),
                tempToken
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: Invalid username"));
        }
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<?> verifyMfaCode(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody String code) {
        try {
            String token = authHeader.substring(7); // Remove "Bearer "
            if (!passwordResetService.validateResetToken(token)) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: Invalid or expired token"));
            }

            Long userId = jwtUtils.getUserIdFromToken(token);
            User user = passwordResetService.verifyUsername(jwtUtils.getUserNameFromJwtToken(token));

            if (!passwordResetService.verifyMfaCode(user, code)) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: Invalid MFA code"));
            }

            return ResponseEntity.ok(new MessageResponse("MFA verification successful"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: Invalid request"));
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetPassword(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ResetPasswordRequest request) {
        try {
            String token = authHeader.substring(7); // Remove "Bearer "
            
            if (!passwordResetService.validateResetToken(token)) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: Invalid or expired token"));
            }

            if (!passwordResetService.validateUserIdMatchesToken(request.getUserId(), token)) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Error: User ID mismatch"));
            }

            passwordResetService.resetPassword(request.getUserId(), request.getNewPassword());
            return ResponseEntity.ok(new MessageResponse("Password has been reset successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: Could not reset password"));
        }
    }
} 