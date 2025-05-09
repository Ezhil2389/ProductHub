package com.example.crud.security.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {
    private static final Logger logger = LoggerFactory.getLogger(RateLimitService.class);

    // Maximum number of requests allowed in the window period
    @Value("${rate.limit.max-requests:100}")
    private int maxRequests;

    // Time window in seconds
    @Value("${rate.limit.window-seconds:60}")
    private int windowSeconds;
    
    // Comma-separated list of whitelisted IPs (not subject to rate limiting)
    @Value("${rate.limit.ip-whitelist:127.0.0.1,0:0:0:0:0:0:0:1}")
    private String ipWhitelist;
    
    // Higher limit for API endpoints that are less sensitive
    @Value("${rate.limit.public-endpoints.max-requests:300}")
    private int publicEndpointMaxRequests;
    
    // Tracks request timestamps by IP
    private final Map<String, SlidingWindow> requestLog = new ConcurrentHashMap<>();
    
    // Set of whitelisted IP addresses
    private Set<String> whitelistedIps = new HashSet<>();
    
    // Initialize whitelist after properties are set
    public void initializeWhitelist() {
        if (ipWhitelist != null && !ipWhitelist.isEmpty()) {
            whitelistedIps.addAll(Arrays.asList(ipWhitelist.split(",")));
            logger.info("Rate limit whitelist initialized with {} IPs", whitelistedIps.size());
        }
    }

    /**
     * Checks if the request from the given IP is allowed based on rate limits
     * @param clientIp The client's IP address
     * @return true if request is allowed, false if rate limit exceeded
     */
    public boolean isAllowed(String clientIp) {
        // Initialize whitelist if not already done
        if (whitelistedIps.isEmpty()) {
            initializeWhitelist();
        }
        
        // Check if IP is whitelisted
        if (whitelistedIps.contains(clientIp)) {
            return true;
        }
        
        SlidingWindow window = requestLog.computeIfAbsent(clientIp, k -> new SlidingWindow());
        return window.tryAcquire(maxRequests);
    }
    
    /**
     * Checks if the request from the given IP is allowed based on endpoint type
     * @param clientIp The client's IP address
     * @param request The HTTP request to determine endpoint type
     * @return true if request is allowed, false if rate limit exceeded
     */
    public boolean isAllowed(String clientIp, HttpServletRequest request) {
        // Initialize whitelist if not already done
        if (whitelistedIps.isEmpty()) {
            initializeWhitelist();
        }
        
        // Check if IP is whitelisted
        if (whitelistedIps.contains(clientIp)) {
            return true;
        }
        
        SlidingWindow window = requestLog.computeIfAbsent(clientIp, k -> new SlidingWindow());
        
        // Determine which rate limit to apply based on the endpoint
        String path = request.getRequestURI();
        if (isPublicEndpoint(path)) {
            return window.tryAcquire(publicEndpointMaxRequests);
        } else {
            return window.tryAcquire(maxRequests);
        }
    }
    
    /**
     * Determine if an endpoint should use the higher "public" rate limit
     */
    private boolean isPublicEndpoint(String path) {
        // Endpoints that should have higher limits (public data, less sensitive)
        return path.contains("/products") || 
               path.contains("/categories") ||
               (path.contains("/auth") && !path.contains("/signup"));
    }
    
    /**
     * Add an IP to the whitelist
     * @param ip IP address to whitelist
     */
    public void addToWhitelist(String ip) {
        whitelistedIps.add(ip);
        logger.info("Added IP {} to rate limit whitelist", ip);
    }
    
    /**
     * Remove an IP from the whitelist
     * @param ip IP address to remove from whitelist
     */
    public boolean removeFromWhitelist(String ip) {
        boolean removed = whitelistedIps.remove(ip);
        if (removed) {
            logger.info("Removed IP {} from rate limit whitelist", ip);
        }
        return removed;
    }
    
    /**
     * Get the current whitelist
     */
    public Set<String> getWhitelist() {
        return new HashSet<>(whitelistedIps);
    }
    
    /**
     * Update rate limits at runtime
     */
    public void updateRateLimits(int newMaxRequests, int newWindowSeconds) {
        this.maxRequests = newMaxRequests;
        this.windowSeconds = newWindowSeconds;
        logger.info("Updated rate limits: {} requests per {} seconds", 
                newMaxRequests, newWindowSeconds);
    }

    /**
     * Inner class that implements a sliding window for rate limiting
     */
    private class SlidingWindow {
        private final ConcurrentHashMap<Long, Integer> requestCounts = new ConcurrentHashMap<>();
        
        /**
         * Tries to acquire a permit to proceed with specified limit
         * @return true if request is allowed, false otherwise
         */
        public synchronized boolean tryAcquire(int limit) {
            cleanup();
            
            long currentSecond = Instant.now().getEpochSecond();
            int currentCount = requestCounts.getOrDefault(currentSecond, 0);
            
            // Get total count in the sliding window
            int totalCount = requestCounts.values().stream().mapToInt(Integer::intValue).sum();
            
            if (totalCount >= limit) {
                return false;
            }
            
            // Increment the counter for the current second
            requestCounts.put(currentSecond, currentCount + 1);
            return true;
        }
        
        /**
         * Removes entries older than the window duration
         */
        private void cleanup() {
            long cutoffTime = Instant.now().minus(Duration.ofSeconds(windowSeconds)).getEpochSecond();
            requestCounts.keySet().removeIf(timestamp -> timestamp <= cutoffTime);
        }
    }
} 