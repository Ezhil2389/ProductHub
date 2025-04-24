package com.example.crud.service;

import com.example.crud.model.UserSession;
import com.example.crud.repository.UserSessionRepository;
import com.example.crud.security.jwt.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

@Service
public class UserSessionService {

    @Autowired
    private UserSessionRepository userSessionRepository;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @Transactional
    public void createSession(Long userId, String token, Date expiryDate) {
        // First, invalidate any existing session
        invalidateUserSessions(userId);
        
        // Create new session
        UserSession session = new UserSession(userId, token, expiryDate);
        userSessionRepository.save(session);
    }

    @Transactional
    public void invalidateUserSessions(Long userId) {
        userSessionRepository.findByUserId(userId).ifPresent(session -> {
            // Blacklist the existing token
            tokenBlacklistService.blacklistToken(session.getToken(), session.getExpiryDate());
            // Delete the session
            userSessionRepository.deleteByUserId(userId);
        });
    }

    @Transactional
    public void invalidateAllUserSessions(Long userId) {
        invalidateUserSessions(userId);
    }

    public boolean isValidSession(String token) {
        return userSessionRepository.existsByToken(token);
    }

    @Scheduled(cron = "0 */30 * * * *") // Run every 30 minutes
    @Transactional
    public void cleanupExpiredSessions() {
        userSessionRepository.deleteExpiredSessions(new Date());
    }
} 