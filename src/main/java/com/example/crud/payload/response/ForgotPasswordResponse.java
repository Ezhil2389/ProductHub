package com.example.crud.payload.response;

import lombok.Data;

@Data
public class ForgotPasswordResponse {
    private Long userId;
    private boolean mfaEnabled;
    private String tempToken;

    public ForgotPasswordResponse(Long userId, boolean mfaEnabled, String tempToken) {
        this.userId = userId;
        this.mfaEnabled = mfaEnabled;
        this.tempToken = tempToken;
    }
} 