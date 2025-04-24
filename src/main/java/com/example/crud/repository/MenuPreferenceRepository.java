package com.example.crud.repository;

import com.example.crud.model.MenuPreference;
import com.example.crud.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MenuPreferenceRepository extends JpaRepository<MenuPreference, Long> {
    List<MenuPreference> findByUserOrderByDisplayOrder(User user);
    
    @Transactional
    @Modifying
    @Query("DELETE FROM MenuPreference mp WHERE mp.user = ?1")
    void deleteAllByUser(User user);
} 