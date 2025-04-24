package com.example.crud.repository;

import com.example.crud.model.Product;
import java.math.BigDecimal;
import java.util.List;

public interface ProductCustomRepository {
    List<Product> findProductsByCustomCriteria(
        String namePattern,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        Integer minQuantity,
        Integer maxQuantity,
        String createdByUsername
    );
} 