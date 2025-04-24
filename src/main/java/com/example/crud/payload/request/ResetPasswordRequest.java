package com.example.crud.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotNull
    private Long userId;

    @NotBlank
    private String newPassword;
} 