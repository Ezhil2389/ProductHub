package com.example.crud.repository;

import com.example.crud.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    Optional<UserSession> findByUserId(Long userId);
    Optional<UserSession> findByToken(String token);
    boolean existsByToken(String token);
    
    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.expiryDate < ?1")
    void deleteExpiredSessions(Date now);
    
    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.userId = ?1")
    void deleteByUserId(Long userId);
} 