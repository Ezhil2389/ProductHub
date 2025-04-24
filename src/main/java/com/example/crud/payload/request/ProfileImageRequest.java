package com.example.crud.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ProfileImageRequest {
    @NotBlank
    private String profileImage;
} 