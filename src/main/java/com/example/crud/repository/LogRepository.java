package com.example.crud.repository;

import com.example.crud.model.Log;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LogRepository extends JpaRepository<Log, Long> {
    
    @Query("SELECT l FROM Log l ORDER BY l.timestamp DESC")
    List<Log> findAllOrderByTimestampDesc();
    
    List<Log> findByEntityTypeOrderByTimestampDesc(String entityType);
    
    List<Log> findByPerformedByOrderByTimestampDesc(String performedBy);
} 