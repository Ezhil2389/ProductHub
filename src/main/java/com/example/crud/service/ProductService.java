package com.example.crud.service;

import com.example.crud.model.Product;
import com.example.crud.model.User;
import com.example.crud.payload.request.ProductRequest;
import com.example.crud.payload.response.ProductResponse;
import com.example.crud.repository.ProductRepository;
import com.example.crud.repository.UserRepository;
import com.example.crud.exception.OptimisticLockingException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductService {
    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LogService logService;

    private static final long LOCK_EXPIRY_MINUTES = 5;

    public List<ProductResponse> getAllProducts() {
        return productRepository.findAll().stream()
                .map(this::mapToProductResponse)
                .collect(Collectors.toList());
    }

    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        logService.addLog("READ", "PRODUCT", product.getCreatedBy().getUsername(), 
            "Read product: " + product.getName() + " (ID: " + product.getId() + ")");
        return mapToProductResponse(product);
    }

    public List<ProductResponse> getProductsByUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        return productRepository.findByCreatedBy(user).stream()
                .map(this::mapToProductResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest productRequest, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        Product product = new Product();
        product.setName(productRequest.getName());
        product.setDescription(productRequest.getDescription());
        product.setPrice(productRequest.getPrice());
        product.setQuantity(productRequest.getQuantity());
        product.setCreatedBy(user);
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        product.setCreatedWhen(now);
        product.setUpdatedWhen(now);
        product.setUpdatedBy(null);

        Product savedProduct = productRepository.save(product);
        logService.addLog("CREATE", "PRODUCT", username, 
            "Created new product: " + savedProduct.getName() + " (ID: " + savedProduct.getId() + ")");
        return mapToProductResponse(savedProduct);
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest productRequest) {
        try {
            Product product = productRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

            String oldName = product.getName();
            product.setName(productRequest.getName());
            product.setDescription(productRequest.getDescription());
            product.setPrice(productRequest.getPrice());
            product.setQuantity(productRequest.getQuantity());

            // Set updatedWhen and updatedBy
            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            product.setUpdatedWhen(now);
            // Get current user
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
            product.setUpdatedBy(user);

            Product updatedProduct = productRepository.save(product);

            // Release the lock after successful update
            updatedProduct.setEditingBy(null);
            updatedProduct.setEditingSince(null);
            productRepository.save(updatedProduct);

            logService.addLog("UPDATE", "PRODUCT", product.getCreatedBy().getUsername(), 
                "Updated product: " + oldName + " to " + updatedProduct.getName() + " (ID: " + updatedProduct.getId() + ")");
            return mapToProductResponse(updatedProduct);
        } catch (ObjectOptimisticLockingFailureException ex) {
            throw new OptimisticLockingException(
                "The product has been modified by another user. Please refresh and try again.",
                ex
            );
        }
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        String productName = product.getName();
        String username = product.getCreatedBy().getUsername();
        
        productRepository.deleteById(id);
        logService.addLog("DELETE", "PRODUCT", username, 
            "Deleted product: " + productName + " (ID: " + id + ")");
    }

    public List<ProductResponse> searchProducts(
            String namePattern,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Integer minQuantity,
            Integer maxQuantity,
            String createdByUsername) {
        
        List<Product> products = productRepository.findProductsByCustomCriteria(
                namePattern,
                minPrice,
                maxPrice,
                minQuantity,
                maxQuantity,
                createdByUsername
        );

        logService.addLog("READ", "PRODUCT", 
            SecurityContextHolder.getContext().getAuthentication().getName(),
            "Searched products with criteria: " + 
            "name=" + namePattern + ", " +
            "price=" + minPrice + "-" + maxPrice + ", " +
            "quantity=" + minQuantity + "-" + maxQuantity + ", " +
            "creator=" + createdByUsername);

        return products.stream()
                .map(this::mapToProductResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductResponse lockProduct(Long id, String username) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        boolean lockedByOther = product.getEditingBy() != null && !product.getEditingBy().getUsername().equals(username);
        boolean lockExpired = product.getEditingSince() != null &&
            java.time.Duration.between(product.getEditingSince(), now).toMinutes() >= LOCK_EXPIRY_MINUTES;
        if (lockedByOther && !lockExpired) {
            // Still locked by another user
            return mapToProductResponse(product);
        }
        // Lock is expired or not locked, set new lock
        product.setEditingBy(user);
        product.setEditingSince(now);
        productRepository.save(product);
        return mapToProductResponse(product);
    }

    @Transactional
    public ProductResponse unlockProduct(Long id, String username, boolean isAdmin) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        if (product.getEditingBy() != null &&
            (product.getEditingBy().getUsername().equals(username) || isAdmin)) {
            product.setEditingBy(null);
            product.setEditingSince(null);
            productRepository.save(product);
        }
        return mapToProductResponse(product);
    }

    private ProductResponse mapToProductResponse(Product product) {
        ProductResponse response = new ProductResponse();
        response.setId(product.getId());
        response.setVersion(product.getVersion());
        response.setName(product.getName());
        response.setDescription(product.getDescription());
        response.setPrice(product.getPrice());
        response.setQuantity(product.getQuantity());
        response.setCreatedBy(product.getCreatedBy() != null ? product.getCreatedBy().getUsername() : null);
        response.setUpdatedBy(product.getUpdatedBy() != null ? product.getUpdatedBy().getUsername() : null);
        response.setCreatedWhen(product.getCreatedWhen());
        response.setUpdatedWhen(product.getUpdatedWhen());
        return response;
    }
}