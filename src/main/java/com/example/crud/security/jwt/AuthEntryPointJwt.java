package com.example.crud.security.jwt;

import java.io.IOException;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import com.example.crud.service.ApplicationLogService;

@Component
public class AuthEntryPointJwt implements AuthenticationEntryPoint {
    @Autowired
    private ApplicationLogService applicationLogService;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {
        // Only log failed login attempts to the auth endpoint
        String requestURI = request.getRequestURI();
        if (requestURI.contains("/api/auth/signin")) {
            applicationLogService.logWarning("Failed login attempt");
        }
            
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Error: Unauthorized");
    }
}