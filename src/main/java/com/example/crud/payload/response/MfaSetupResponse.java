package com.example.crud.payload.response;

import lombok.Data;
import java.util.List;

@Data
public class MfaSetupResponse {
    private String secretKey;
    private String qrCodeUrl;
    private List<String> recoveryCodes;

    public MfaSetupResponse(String secretKey, String qrCodeUrl, List<String> recoveryCodes) {
        this.secretKey = secretKey;
        this.qrCodeUrl = qrCodeUrl;
        this.recoveryCodes = recoveryCodes;
    }
} 