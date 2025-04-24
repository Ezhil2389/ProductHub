package com.example.crud.repository;

import com.example.crud.model.User;
import com.example.crud.model.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);
    
    @Modifying
    @Query("UPDATE User u SET u.status = com.example.crud.model.UserStatus.ACTIVE WHERE u.status IS NULL")
    int updateNullStatusesToActive();
}