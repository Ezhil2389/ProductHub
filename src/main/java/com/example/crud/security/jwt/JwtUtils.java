package com.example.crud.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import lombok.extern.slf4j.Slf4j;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

import com.example.crud.security.services.UserDetailsImpl;
import com.example.crud.service.TokenBlacklistService;
import com.example.crud.service.UserSessionService;
import com.example.crud.service.ApplicationLogService;

@Component
@Slf4j
public class JwtUtils {
    @Autowired
    private ApplicationLogService applicationLogService;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @Autowired
    private UserSessionService userSessionService;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private int jwtExpirationMs;

    @Value("${app.jwt.header}")
    private String headerName;

    @Value("${app.jwt.prefix}")
    private String tokenPrefix;

    public String generateJwtToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        String token = Jwts.builder()
                .setSubject((userPrincipal.getUsername()))
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();

        // Create new session for the user
        userSessionService.createSession(userPrincipal.getId(), token, expiryDate);
        
        // Log user login directly to SLF4J instead of through ApplicationLogService
        log.info("User '{}' logged in", userPrincipal.getUsername());
        
        // Try to log to ApplicationLogService in a safe way
        try {
            applicationLogService.logInfo("User '" + userPrincipal.getUsername() + "' logged in");
        } catch (Exception e) {
            log.warn("Could not save login to ApplicationLogService: {}", e.getMessage());
        }

        return token;
    }

    private Key key() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    public Date getExpirationDateFromToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return claims.getExpiration();
        } catch (Exception e) {
            return null;
        }
    }

    public boolean validateJwtToken(String authToken) {
        try {
            // First check if token is blacklisted
            if (tokenBlacklistService.isTokenBlacklisted(authToken)) {
                return false;
            }

            // First validate token signature and expiration
            try {
                Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(authToken);
            } catch (ExpiredJwtException e) {
                log.debug("JWT token is expired: {}", e.getMessage());
                return false;
            } catch (SecurityException | MalformedJwtException | UnsupportedJwtException | IllegalArgumentException e) {
                log.debug("Invalid JWT token: {}", e.getMessage());
                return false;
            }

            // Check if it's a password reset token
            boolean isPasswordResetToken = isPasswordResetToken(authToken);

            // Then check if it's a valid session token (skip for password reset tokens)
            if (!isPasswordResetToken && !userSessionService.isValidSession(authToken)) {
                log.debug("JWT token is not a valid session");
                return false;
            }

            return true;
        } catch (Exception e) {
            log.debug("JWT validation error: {}", e.getMessage());
            return false;
        }
    }

    public String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader(headerName);

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith(tokenPrefix)) {
            return headerAuth.substring(tokenPrefix.length());
        }

        return null;
    }

    public String generatePasswordResetToken(Long userId, String username) {
        // Log directly to SLF4J
        log.info("Password reset requested for user '{}'", username);
        
        // Try to log to ApplicationLogService in a safe way
        try {
            applicationLogService.logInfo("Password reset requested for user '" + username + "'");
        } catch (Exception e) {
            log.warn("Could not save password reset log to ApplicationLogService: {}", e.getMessage());
        }
        
        return Jwts.builder()
                .setSubject(username)
                .claim("userId", userId)
                .claim("type", "password_reset")
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + 900000)) // 15 minutes
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isPasswordResetToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return "password_reset".equals(claims.get("type"));
        } catch (ExpiredJwtException e) {
            // Even if expired, we can check the type
            return "password_reset".equals(e.getClaims().get("type"));
        } catch (Exception e) {
            return false;
        }
    }

    public Long getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return claims.get("userId", Long.class);
        } catch (Exception e) {
            return null;
        }
    }
}