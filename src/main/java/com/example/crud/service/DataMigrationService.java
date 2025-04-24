package com.example.crud.service;

import com.example.crud.model.User;
import com.example.crud.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DataMigrationService {
    
    private static final Logger logger = LoggerFactory.getLogger(DataMigrationService.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EncryptionService encryptionService;
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    @Value("${app.encryption.migrate-on-startup:true}")
    private boolean migrateOnStartup;
    
    // Use ApplicationReadyEvent instead of PostConstruct to ensure all beans are fully initialized
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (migrateOnStartup) {
            try {
                migrateDataToEncrypted();
                migrateProductVersions();
            } catch (Exception e) {
                logger.error("Failed to perform migrations", e);
            }
        }
    }
    
    @Transactional
    public void migrateProductVersions() {
        logger.info("Starting product version migration");
        
        int updatedCount = jdbcTemplate.update(
            "UPDATE products SET version = 0 WHERE version IS NULL"
        );
        
        logger.info("Updated {} products with null version to version 0", updatedCount);
    }
    
    @Transactional
    public void migrateDataToEncrypted() {
        logger.info("Starting data migration to encrypted format");
        
        // Get all users directly from database to bypass JPA converters
        List<Object[]> userData = jdbcTemplate.query(
            "SELECT id, email, mfa_secret FROM users",
            (rs, rowNum) -> new Object[] {
                rs.getLong("id"),
                rs.getString("email"),
                rs.getString("mfa_secret")
            }
        );
        
        // Process each user
        for (Object[] data : userData) {
            Long id = (Long) data[0];
            String email = (String) data[1];
            String mfaSecret = (String) data[2];
            
            if (email != null) {
                // Check if already encrypted by trying to decode Base64
                try {
                    encryptionService.decrypt(email);
                    // No exception, means it's likely already encrypted
                    logger.debug("Email for user {} appears to be already encrypted", id);
                } catch (Exception e) {
                    // Not encrypted or invalid format, encrypt it
                    String encryptedEmail = encryptionService.encrypt(email);
                    jdbcTemplate.update(
                        "UPDATE users SET email = ? WHERE id = ?",
                        encryptedEmail, id
                    );
                    logger.debug("Encrypted email for user {}", id);
                }
            }
            
            if (mfaSecret != null) {
                // Check if already encrypted
                try {
                    encryptionService.decrypt(mfaSecret);
                    // No exception, means it's likely already encrypted
                    logger.debug("MFA secret for user {} appears to be already encrypted", id);
                } catch (Exception e) {
                    // Not encrypted or invalid format, encrypt it
                    String encryptedMfaSecret = encryptionService.encrypt(mfaSecret);
                    jdbcTemplate.update(
                        "UPDATE users SET mfa_secret = ? WHERE id = ?",
                        encryptedMfaSecret, id
                    );
                    logger.debug("Encrypted MFA secret for user {}", id);
                }
            }
        }
        
        // Migrate recovery codes
        List<Object[]> recoveryCodes = jdbcTemplate.query(
            "SELECT user_id, recovery_code FROM user_recovery_codes",
            (rs, rowNum) -> new Object[] {
                rs.getLong("user_id"),
                rs.getString("recovery_code")
            }
        );
        
        for (Object[] data : recoveryCodes) {
            Long userId = (Long) data[0];
            String code = (String) data[1];
            
            if (code != null) {
                // Check if already encrypted
                try {
                    encryptionService.decrypt(code);
                    // No exception, means it's likely already encrypted
                    logger.debug("Recovery code for user {} appears to be already encrypted", userId);
                } catch (Exception e) {
                    // Not encrypted or invalid format, encrypt it
                    String encryptedCode = encryptionService.encrypt(code);
                    jdbcTemplate.update(
                        "UPDATE user_recovery_codes SET recovery_code = ? WHERE user_id = ? AND recovery_code = ?",
                        encryptedCode, userId, code
                    );
                    logger.debug("Encrypted recovery code for user {}", userId);
                }
            }
        }
        
        logger.info("Data migration to encrypted format completed successfully");
    }
} 