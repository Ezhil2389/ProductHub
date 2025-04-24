package com.example.crud.service;

import com.example.crud.model.User;
import com.example.crud.repository.UserRepository;
import com.example.crud.security.jwt.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private MfaService mfaService;

    public User verifyUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
    }

    public boolean verifyMfaCode(User user, String code) {
        if (!user.isMfaEnabled()) {
            return true;
        }
        try {
            int mfaCode = Integer.parseInt(code);
            return mfaService.verifyCode(user.getMfaSecret(), mfaCode) ||
                   mfaService.validateRecoveryCode(user, code);
        } catch (NumberFormatException e) {
            return mfaService.validateRecoveryCode(user, code);
        }
    }

    @Transactional
    public void resetPassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userId));
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public boolean validateResetToken(String token) {
        return jwtUtils.validateJwtToken(token) && jwtUtils.isPasswordResetToken(token);
    }

    public boolean validateUserIdMatchesToken(Long userId, String token) {
        Long tokenUserId = jwtUtils.getUserIdFromToken(token);
        return tokenUserId != null && tokenUserId.equals(userId);
    }
} 