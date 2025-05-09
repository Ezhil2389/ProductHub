package com.example.crud.config;

import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration
public class HikariPoolLoggingConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(HikariPoolLoggingConfig.class);
    
    @Autowired
    private DataSource dataSource;
    
    @Bean
    public CommandLineRunner hikariLoggingSetup() {
        return args -> {
            if (dataSource instanceof HikariDataSource) {
                HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
                logger.info("Hikari Connection Pool Initialized:");
                logger.info("Pool Name: {}", hikariDataSource.getPoolName());
                logger.info("Maximum Pool Size: {}", hikariDataSource.getMaximumPoolSize());
                logger.info("Minimum Idle: {}", hikariDataSource.getMinimumIdle());
                logger.info("Connection Timeout: {}ms", hikariDataSource.getConnectionTimeout());
                logger.info("Idle Timeout: {}ms", hikariDataSource.getIdleTimeout());
                logger.info("Max Lifetime: {}ms", hikariDataSource.getMaxLifetime());
                logger.info("Auto Commit: {}", hikariDataSource.isAutoCommit());
                logger.info("Connection Test Query: {}", hikariDataSource.getConnectionTestQuery());
                logger.info("JMX Monitoring Enabled: {}", hikariDataSource.isRegisterMbeans());
            } else {
                logger.warn("DataSource is not a HikariDataSource. Connection pool monitoring will be limited.");
            }
        };
    }
} 