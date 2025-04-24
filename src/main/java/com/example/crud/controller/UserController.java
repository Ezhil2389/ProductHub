package com.example.crud.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.example.crud.model.User;
import com.example.crud.payload.request.AdminPasswordResetRequest;
import com.example.crud.payload.request.PasswordUpdateRequest;
import com.example.crud.payload.request.UpdateRolesRequest;
import com.example.crud.payload.request.UpdateUserStatusRequest;
import com.example.crud.payload.request.ProfileImageRequest;
import com.example.crud.payload.response.MessageResponse;
import com.example.crud.service.UserService;
import com.example.crud.service.ApplicationLogService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/users")
public class UserController {
    @Autowired
    private UserService userService;
    
    @Autowired
    private ApplicationLogService applicationLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        applicationLogService.logInfo("Admin retrieved list of all users");
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#id)")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("@userSecurity.isCurrentUser(#id)")
    public ResponseEntity<?> updatePassword(@PathVariable Long id, @Valid @RequestBody PasswordUpdateRequest passwordUpdateRequest) {
        userService.updatePassword(id, passwordUpdateRequest.getCurrentPassword(), passwordUpdateRequest.getNewPassword());
        applicationLogService.logInfo("User ID " + id + " updated their password");
        return ResponseEntity.ok(new MessageResponse("Password updated successfully"));
    }

    @PutMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, @Valid @RequestBody AdminPasswordResetRequest resetRequest) {
        userService.resetPassword(id, resetRequest.getNewPassword());
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminUsername = auth.getName();
        applicationLogService.logInfo("Admin '" + adminUsername + "' reset password for user ID " + id);
        
        return ResponseEntity.ok(new MessageResponse("Password reset successfully"));
    }

    @PutMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> updateRoles(@PathVariable Long id, @Valid @RequestBody UpdateRolesRequest rolesRequest) {
        User updatedUser = userService.updateRoles(id, rolesRequest.getRoles());
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminUsername = auth.getName();
        applicationLogService.logInfo("Admin '" + adminUsername + "' updated roles for user '" + 
            updatedUser.getUsername() + "' to " + rolesRequest.getRoles());
        
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userService.getUserById(id);
        String username = user.getUsername();
        
        userService.deleteUser(id);
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminUsername = auth.getName();
        applicationLogService.logInfo("Admin '" + adminUsername + "' deleted user '" + username + "' (ID: " + id + ")");
        
        return ResponseEntity.ok(new MessageResponse("User deleted successfully!"));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest statusRequest) {
        User updatedUser = userService.updateUserStatus(id, statusRequest.getStatus(), statusRequest.getReason());
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminUsername = auth.getName();
        applicationLogService.logInfo("Admin '" + adminUsername + "' changed status of user '" + 
            updatedUser.getUsername() + "' to " + statusRequest.getStatus() + 
            " with reason: " + statusRequest.getReason());
        
        return ResponseEntity.ok(new MessageResponse("User status updated successfully"));
    }

    @PutMapping("/{id}/profile-image")
    @PreAuthorize("@userSecurity.isCurrentUser(#id)")
    public ResponseEntity<?> updateProfileImage(
            @PathVariable Long id,
            @Valid @RequestBody ProfileImageRequest profileImageRequest) {
        User updatedUser = userService.updateProfileImage(id, profileImageRequest.getProfileImage());
        applicationLogService.logInfo("User '" + updatedUser.getUsername() + "' updated their profile image");
        return ResponseEntity.ok(new MessageResponse("Profile image updated successfully"));
    }

    @PutMapping("/reactivate/{username}")
    public ResponseEntity<?> reactivateUser(@PathVariable String username) {
        User user = userService.getUserByUsername(username);
        user.setAccountExpiresAt(java.time.LocalDateTime.now().plusYears(1));
        userService.saveUser(user);
        applicationLogService.logInfo("User '" + username + "' reactivated their account");
        return ResponseEntity.ok(new MessageResponse("Account reactivated. You can now log in."));
    }
}