package com.example.crud.security;

import com.example.crud.model.User;
import com.example.crud.model.UserStatus;
import com.example.crud.repository.UserRepository;
import com.example.crud.security.services.UserDetailsImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
public class UserStatusFilter extends OncePerRequestFilter {

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserDetailsImpl) {
            UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
            Optional<User> userOpt = userRepository.findByUsername(userDetails.getUsername());
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                
                // If account is blocked, deny all access
                if (user.getStatus() == UserStatus.BLOCKED) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Account is locked. Please contact an administrator.");
                    return;
                }
                
                // If suspended, only allow GET requests
                if (user.getStatus() == UserStatus.SUSPENDED && !request.getMethod().equals(HttpMethod.GET.name())) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Account suspended - Read only access");
                    return;
                }
            }
        }
        
        filterChain.doFilter(request, response);
    }
} 