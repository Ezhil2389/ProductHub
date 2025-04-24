package com.example.crud.payload.request;

import com.example.crud.model.UserStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {
    @NotNull
    private UserStatus status;

    @Size(max = 255)
    private String reason;
} 