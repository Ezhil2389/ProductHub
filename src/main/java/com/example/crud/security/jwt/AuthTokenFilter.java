package com.example.crud.security.jwt;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.crud.security.services.UserDetailsImpl;
import com.example.crud.security.services.UserDetailsServiceImpl;
import com.example.crud.service.ApplicationLogService;

@Component
public class AuthTokenFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private ApplicationLogService applicationLogService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestURI = request.getRequestURI();

        // Bypass JWT filter for WebSocket handshake paths
        if (requestURI != null && requestURI.startsWith("/api/ws")) {
            filterChain.doFilter(request, response);
            return;
        }

        String method = request.getMethod();
        
        try {
            String jwt = jwtUtils.parseJwt(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                String username = jwtUtils.getUserNameFromJwtToken(jwt);

                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                // Only log business operations, not regular API access
                if (isCrudOperation(requestURI, method)) {
                    String operation = getCrudOperationType(method, requestURI);
                    applicationLogService.logInfo("User '" + username + "' performed " + operation);
                }
            }
        } catch (Exception e) {
            // Only log significant security failures
            if (requestURI.contains("/api/") && !isStaticResource(requestURI)) {
                applicationLogService.logError("Authentication failure for request to " + requestURI, e);
            }
        }

        filterChain.doFilter(request, response);
    }
    
    private boolean isCrudOperation(String uri, String method) {
        if (!uri.startsWith("/api/")) return false;
        
        // Specific CRUD paths (example patterns - adjust for your actual API)
        boolean isUserOperation = uri.contains("/users") || uri.contains("/auth/signup");
        boolean isProductOperation = uri.contains("/products");
        boolean isOrderOperation = uri.contains("/orders");
        boolean isCommentOperation = uri.contains("/comments");
        
        // Only track create, update, delete operations
        boolean isWriteOperation = "POST".equals(method) || "PUT".equals(method) || 
                                  "PATCH".equals(method) || "DELETE".equals(method);
                                  
        return (isUserOperation || isProductOperation || isOrderOperation || isCommentOperation) && isWriteOperation;
    }
    
    private String getCrudOperationType(String method, String uri) {
        String resource = uri.substring(uri.lastIndexOf("/") + 1);
        if (resource.matches("\\d+")) {
            // If the last part is a number, get the resource name from the path before it
            String[] parts = uri.split("/");
            if (parts.length >= 2) {
                resource = parts[parts.length - 2];
            }
        }
        
        switch (method) {
            case "POST":
                return uri.contains("/auth/signup") ? "user registration" : "create operation on " + resource;
            case "PUT":
            case "PATCH":
                return "update operation on " + resource;
            case "DELETE":
                return "delete operation on " + resource;
            default:
                return "operation on " + resource;
        }
    }
    
    private boolean isStaticResource(String uri) {
        return uri.contains("/static/") || 
               uri.contains("/css/") || 
               uri.contains("/js/") || 
               uri.contains("/images/") || 
               uri.contains("/favicon.ico");
    }
}