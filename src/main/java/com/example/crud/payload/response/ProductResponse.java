package com.example.crud.payload.response;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ProductResponse {
    private Long id;
    private Long version;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer quantity;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdWhen;
    private LocalDateTime updatedWhen;
    
    @Override
    public String toString() {
        return String.format("Product[id=%d, name='%s', price=%.2f, qty=%d]", 
                id, name, price != null ? price.doubleValue() : 0.0, quantity != null ? quantity : 0);
    }
}