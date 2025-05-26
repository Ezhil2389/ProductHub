package com.example.crud.payload.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import jakarta.validation.constraints.NotBlank;


import java.util.Set;

@Data
public class SignupRequest {
    @NotBlank
    @Size(min = 3, max = 20)
    private String username;

    @NotBlank
    @Size(max = 50)
    @Email
    private String email;

    private Set<String> roles;

    @NotBlank
    @Size(min = 8, max = 40)
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])(?=\\S+$).{8,40}$", message = "Password must be 8 to 40 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character.")
    private String password;
}

