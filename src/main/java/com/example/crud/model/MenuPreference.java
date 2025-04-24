package com.example.crud.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "menu_preferences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuPreference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String menuKey;

    @Column(nullable = false)
    private boolean expanded;

    @Column(nullable = false)
    private Integer displayOrder;

    @Column(name = "menu_data", columnDefinition = "TEXT", nullable = false)
    private String menuData;
} 