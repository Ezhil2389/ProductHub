package com.example.crud.config;

import com.example.crud.model.UserStatus;
import com.example.crud.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

@Component
public class DatabaseInitializer {
    
    private static final Logger logger = LoggerFactory.getLogger(DatabaseInitializer.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PlatformTransactionManager transactionManager;
    
    @Autowired
    private DataSource dataSource;
    
    @PostConstruct
    public void initializeUserStatuses() {
        logger.info("Initializing user statuses for existing users...");
        
        // Use direct JDBC approach which is more reliable for initialization tasks
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "UPDATE users SET status = 'ACTIVE' WHERE status IS NULL")) {
            
            int updated = stmt.executeUpdate();
            logger.info("Updated {} users with null status to ACTIVE", updated);
            
        } catch (SQLException e) {
            logger.error("Error updating user statuses", e);
        }
    }
} 