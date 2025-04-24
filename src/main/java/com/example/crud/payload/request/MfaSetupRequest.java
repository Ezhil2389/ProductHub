package com.example.crud.payload.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MfaSetupRequest {
    @NotNull
    private Integer code;
} 