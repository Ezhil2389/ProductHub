package com.example.crud.model;

import com.example.crud.util.StringEncryptedConverter;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "username"),
                @UniqueConstraint(columnNames = "email")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 20)
    private String username;

    @NotBlank
    @Size(max = 255)
    @Email
    @Convert(converter = StringEncryptedConverter.class)
    private String email;

    @NotBlank
    @Size(max = 120)
    private String password;

    @ToString.Exclude  // Exclude roles from toString to prevent LazyInitializationException
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    @Size(max = 255)
    @Convert(converter = StringEncryptedConverter.class)
    private String mfaSecret;
    
    private boolean mfaEnabled = false;
    
    @ToString.Exclude  // Exclude collection from toString to prevent LazyInitializationException
    @ElementCollection
    @CollectionTable(name = "user_recovery_codes", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "recovery_code")
    @Convert(converter = StringEncryptedConverter.class)
    private List<String> recoveryCodes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "status_reason")
    @Size(max = 255)
    private String statusReason;

    @Column(name = "profile_image", columnDefinition = "TEXT")
    private String profileImage;
    
    @Column(name = "failed_login_attempts")
    private Integer failedLoginAttempts = 0;
    
    @Column(name = "last_failed_login_time")
    private LocalDateTime lastFailedLoginTime;

    @Column(name = "account_expires_at")
    private LocalDateTime accountExpiresAt;

    @Transient
    private boolean isExpired;

    public boolean isExpired() {
        return accountExpiresAt != null && accountExpiresAt.isBefore(LocalDateTime.now());
    }

    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
    }
    
    /**
     * Custom toString implementation to handle lazy-loaded collections safely
     */
    @Override
    public String toString() {
        return "User[id=" + id + 
               ", username='" + username + "'" +
               ", email='" + (email != null ? "REDACTED" : null) + "'" +
               ", status=" + status +
               ", mfaEnabled=" + mfaEnabled + "]";
    }
}