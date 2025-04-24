package com.example.crud.controller;

import java.util.List;
import java.math.BigDecimal;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.example.crud.payload.request.ProductRequest;
import com.example.crud.payload.response.MessageResponse;
import com.example.crud.payload.response.ProductResponse;
import com.example.crud.security.services.UserDetailsImpl;
import com.example.crud.service.ProductService;
import com.example.crud.service.ApplicationLogService;

@RestController
@RequestMapping("/products")
public class ProductController {
    @Autowired
    private ProductService productService;
    
    @Autowired
    private ApplicationLogService applicationLogService;

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAllProducts() {
        List<ProductResponse> products = productService.getAllProducts();
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        ProductResponse product = productService.getProductById(id);
        return ResponseEntity.ok(product);
    }

    @GetMapping("/my-products")
    public ResponseEntity<List<ProductResponse>> getMyProducts() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<ProductResponse> products = productService.getProductsByUser(userDetails.getUsername());
        return ResponseEntity.ok(products);
    }

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductRequest productRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        ProductResponse newProduct = productService.createProduct(productRequest, userDetails.getUsername());
        
        applicationLogService.logInfo("User '" + userDetails.getUsername() + "' created new product: '" + 
            newProduct.getName() + "' (ID: " + newProduct.getId() + ") with price " + newProduct.getPrice());
        
        return new ResponseEntity<>(newProduct, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @productSecurity.isProductCreator(#id)")
    public ResponseEntity<ProductResponse> updateProduct(@PathVariable Long id,
                                                         @Valid @RequestBody ProductRequest productRequest) {
        // Get original product before update for logging purposes
        ProductResponse originalProduct = productService.getProductById(id);
        
        ProductResponse updatedProduct = productService.updateProduct(id, productRequest);
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        applicationLogService.logInfo("User '" + userDetails.getUsername() + "' updated product: '" + 
            updatedProduct.getName() + "' (ID: " + updatedProduct.getId() + "). " +
            "Price changed from " + originalProduct.getPrice() + " to " + updatedProduct.getPrice());
        
        return ResponseEntity.ok(updatedProduct);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @productSecurity.isProductCreator(#id)")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        // Get product before deletion for logging
        ProductResponse product = productService.getProductById(id);
        
        productService.deleteProduct(id);
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        applicationLogService.logInfo("User '" + userDetails.getUsername() + "' deleted product: '" + 
            product.getName() + "' (ID: " + product.getId() + ")");
        
        return ResponseEntity.ok(new MessageResponse("Product deleted successfully!"));
    }

    @GetMapping("/search")
    public ResponseEntity<List<ProductResponse>> searchProducts(
            @RequestParam(required = false) String namePattern,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer minQuantity,
            @RequestParam(required = false) Integer maxQuantity,
            @RequestParam(required = false) String createdByUsername) {
        
        List<ProductResponse> products = productService.searchProducts(
                namePattern,
                minPrice,
                maxPrice,
                minQuantity,
                maxQuantity,
                createdByUsername
        );
        
        return ResponseEntity.ok(products);
    }

    @PostMapping("/{id}/lock")
    public ResponseEntity<ProductResponse> lockProduct(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        ProductResponse response = productService.lockProduct(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/unlock")
    public ResponseEntity<ProductResponse> unlockProduct(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        boolean isAdmin = userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        ProductResponse response = productService.unlockProduct(id, userDetails.getUsername(), isAdmin);
        return ResponseEntity.ok(response);
    }
}