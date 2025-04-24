package com.example.crud.payload.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.Set;

@Data
public class UpdateRolesRequest {
    @NotNull
    private Set<String> roles;
} 