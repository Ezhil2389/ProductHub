package com.example.crud.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.crud.security.jwt.AuthEntryPointJwt;
import com.example.crud.security.jwt.AuthTokenFilter;
import com.example.crud.security.UserStatusFilter;
import com.example.crud.security.services.UserDetailsServiceImpl;
import com.example.crud.security.ratelimit.RateLimitingFilter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Consider if @EnableGlobalMethodSecurity with prePostEnabled=true is needed for @PreAuthorize
public class WebSecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Autowired
    UserDetailsServiceImpl userDetailsService;

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;

    @Autowired
    private UserStatusFilter userStatusFilter;

    @Autowired
    private AuthTokenFilter authTokenFilter; // Inject the filter
    
    @Autowired
    private RateLimitingFilter rateLimitingFilter; // Inject rate limiting filter

    // Keep the Authentication Provider and Manager beans as they are shared
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Global CORS configuration remains the same
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = new ArrayList<>(Arrays.asList(allowedOrigins.split(",")));
        origins.add("http://localhost:5173");
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(Arrays.asList("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // Security Filter Chain for WebSocket paths (Order 0 - highest precedence)
    @Bean
    @Order(0)
    SecurityFilterChain webSocketFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher(new AntPathRequestMatcher("/ws/**")) // Match paths seen by backend logs
            .cors(cors -> cors.configurationSource(corsConfigurationSource())) // Apply CORS
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll() // Permit all requests under /ws/**
            )
            .csrf(csrf -> csrf.disable()) // Disable CSRF for WS path
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)); // Stateless
            // DO NOT add AuthTokenFilter or UserStatusFilter here
        return http.build();
    }

    // Security Filter Chain for all other API/Auth paths (Order 1 - lower precedence)
    @Bean
    @Order(1)
    SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher(new AntPathRequestMatcher("/**")) // Apply to all other paths
            .cors(cors -> cors.configurationSource(corsConfigurationSource())) // Apply CORS
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/auth/**", "/auth/google/**", "/h2-console/**").permitAll()
                    // Note: No need for /ws/** permitAll here, handled by the other chain
                    .requestMatchers("/api/logs/**").authenticated()
                    .anyRequest().authenticated()
            )
            .csrf(csrf -> csrf.disable()) // Disable CSRF generally
            .headers(headers -> headers.frameOptions(frameOption -> frameOption.sameOrigin())) // For H2 Console
            .authenticationProvider(authenticationProvider()) // Set auth provider
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class) // Add rate limiting filter
            .addFilterBefore(authTokenFilter, UsernamePasswordAuthenticationFilter.class) // Add JWT filter
            .addFilterAfter(userStatusFilter, AuthTokenFilter.class); // Add User status filter

        return http.build();
    }
}