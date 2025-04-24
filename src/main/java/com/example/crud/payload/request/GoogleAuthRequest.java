package com.example.crud.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GoogleAuthRequest {
    
    @NotBlank
    private String credential;
    
    // Optional additional fields for user registration
    private String username;
} 