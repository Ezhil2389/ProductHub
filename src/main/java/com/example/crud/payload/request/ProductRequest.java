package com.example.crud.payload.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

import jakarta.validation.constraints.Size;

@Data
public class ProductRequest {
    @NotBlank
    @Size(min = 3, max = 100)
    private String name;

    @Size(max = 1000)
    private String description;

    @NotNull
    @Positive
    private BigDecimal price;

    @NotNull
    @Positive
    private Integer quantity;
}

