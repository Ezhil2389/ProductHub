package com.example.crud.security;

import com.example.crud.model.Product;
import com.example.crud.repository.ProductRepository;
import com.example.crud.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("productSecurity")
public class ProductSecurity {

    @Autowired
    private ProductRepository productRepository;

    public boolean isProductCreator(Long productId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Product product = productRepository.findById(productId).orElse(null);
        if (product == null || product.getCreatedBy() == null) {
            return false;
        }

        return product.getCreatedBy().getId().equals(userDetails.getId());
    }
}