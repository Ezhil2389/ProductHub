package com.example.crud.repository;

import com.example.crud.model.ApplicationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApplicationLogRepository extends JpaRepository<ApplicationLog, Long> {
    
    @Query("SELECT a FROM ApplicationLog a ORDER BY a.timestamp DESC")
    List<ApplicationLog> findAllOrderByTimestampDesc();
    
    List<ApplicationLog> findByLevelOrderByTimestampDesc(String level);
    
    List<ApplicationLog> findByLoggerOrderByTimestampDesc(String logger);
    
    @Query("SELECT a FROM ApplicationLog a WHERE a.message LIKE %:keyword% ORDER BY a.timestamp DESC")
    List<ApplicationLog> findByMessageContainingOrderByTimestampDesc(String keyword);
} 