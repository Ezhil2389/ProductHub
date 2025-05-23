package com.example.crud.repository;

import com.example.crud.model.BlacklistedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Date;

@Repository
public interface BlacklistedTokenRepository extends JpaRepository<BlacklistedToken, Long> {
    boolean existsByToken(String token);
    
    @Modifying
    @Query("DELETE FROM BlacklistedToken b WHERE b.expiryDate < ?1")
    void deleteExpiredTokens(Date now);
}