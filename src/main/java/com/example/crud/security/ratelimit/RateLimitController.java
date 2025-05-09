package com.example.crud.security.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/rate-limits")
@PreAuthorize("hasRole('ADMIN')")
public class RateLimitController {

    @Autowired
    private RateLimitService rateLimitService;
    
    @Value("${rate.limit.max-requests}")
    private int maxRequests;
    
    @Value("${rate.limit.window-seconds}")
    private int windowSeconds;
    
    @Value("${rate.limit.public-endpoints.max-requests}")
    private int publicEndpointMaxRequests;
    
    /**
     * Get current rate limit configurations
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getRateLimitConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("maxRequestsPerWindow", maxRequests);
        config.put("publicEndpointMaxRequests", publicEndpointMaxRequests);
        config.put("windowSeconds", windowSeconds);
        
        return ResponseEntity.ok(config);
    }
    
    /**
     * Update rate limit configuration
     */
    @PutMapping("/config")
    public ResponseEntity<Map<String, Object>> updateRateLimitConfig(
            @RequestParam(required = false) Integer maxRequests,
            @RequestParam(required = false) Integer windowSeconds) {
        
        Map<String, Object> result = new HashMap<>();
        
        // Update only if parameters are provided
        if (maxRequests != null && windowSeconds != null) {
            rateLimitService.updateRateLimits(maxRequests, windowSeconds);
            this.maxRequests = maxRequests;
            this.windowSeconds = windowSeconds;
            
            result.put("status", "success");
            result.put("message", "Rate limits updated successfully");
            result.put("maxRequestsPerWindow", maxRequests);
            result.put("windowSeconds", windowSeconds);
        } else {
            result.put("status", "error");
            result.put("message", "Both maxRequests and windowSeconds must be provided");
        }
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Get IP whitelist
     */
    @GetMapping("/whitelist")
    public ResponseEntity<Set<String>> getWhitelist() {
        return ResponseEntity.ok(rateLimitService.getWhitelist());
    }
    
    /**
     * Add IP to whitelist
     */
    @PostMapping("/whitelist/{ip}")
    public ResponseEntity<Map<String, Object>> addToWhitelist(@PathVariable String ip) {
        rateLimitService.addToWhitelist(ip);
        
        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "IP " + ip + " added to whitelist");
        result.put("whitelist", rateLimitService.getWhitelist());
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Remove IP from whitelist
     */
    @DeleteMapping("/whitelist/{ip}")
    public ResponseEntity<Map<String, Object>> removeFromWhitelist(@PathVariable String ip) {
        boolean removed = rateLimitService.removeFromWhitelist(ip);
        
        Map<String, Object> result = new HashMap<>();
        if (removed) {
            result.put("status", "success");
            result.put("message", "IP " + ip + " removed from whitelist");
        } else {
            result.put("status", "error");
            result.put("message", "IP " + ip + " not found in whitelist");
        }
        result.put("whitelist", rateLimitService.getWhitelist());
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Test endpoint to check if rate limiting is working
     */
    @GetMapping("/test")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Map<String, Object>> testRateLimit(HttpServletRequest request) {
        String clientIp = getClientIP(request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("clientIp", clientIp);
        response.put("allowed", "Request allowed - Rate limit not exceeded");
        response.put("timestamp", System.currentTimeMillis());
        
        return ResponseEntity.ok(response);
    }
    
    private String getClientIP(HttpServletRequest request) {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            return xForwardedForHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
} 