package com.example.crud.controller;

import com.example.crud.config.CacheConfig;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.stats.CacheStats;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/cache")
@PreAuthorize("hasRole('ADMIN')")
public class CacheController {

    private final CacheManager cacheManager;
    
    @Autowired
    public CacheController(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }
    
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getCacheMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        List<Map<String, Object>> caches = new ArrayList<>();
        
        Collection<String> cacheNames = Arrays.asList(
            CacheConfig.USERS_CACHE, 
            CacheConfig.PRODUCTS_CACHE, 
            CacheConfig.CATEGORIES_CACHE
        );
        
        for (String cacheName : cacheNames) {
            Map<String, Object> cacheMetrics = new HashMap<>();
            cacheMetrics.put("name", cacheName);
            
            // Get the specific cache
            org.springframework.cache.Cache springCache = cacheManager.getCache(cacheName);
            
            if (springCache instanceof CaffeineCache) {
                CaffeineCache caffeineCache = (CaffeineCache) springCache;
                Cache<Object, Object> nativeCache = caffeineCache.getNativeCache();
                
                // Get cache statistics
                CacheStats stats = nativeCache.stats();
                
                // Add metrics
                cacheMetrics.put("size", nativeCache.estimatedSize());
                cacheMetrics.put("hitCount", stats.hitCount());
                cacheMetrics.put("missCount", stats.missCount());
                cacheMetrics.put("hitRate", stats.hitRate());
                cacheMetrics.put("evictionCount", stats.evictionCount());
                cacheMetrics.put("evictionWeight", stats.evictionWeight());
                cacheMetrics.put("loadSuccessCount", stats.loadSuccessCount());
                cacheMetrics.put("loadFailureCount", stats.loadFailureCount());
                cacheMetrics.put("totalLoadTime", stats.totalLoadTime());
                cacheMetrics.put("averageLoadPenalty", stats.averageLoadPenalty());
                
                caches.add(cacheMetrics);
            }
        }
        
        metrics.put("caches", caches);
        metrics.put("totalCaches", caches.size());
        
        return ResponseEntity.ok(metrics);
    }
    
    @PostMapping("/actions/clear-all")
    public ResponseEntity<Map<String, String>> clearAllCaches() {
        Map<String, String> response = new HashMap<>();
        
        Collection<String> cacheNames = Arrays.asList(
            CacheConfig.USERS_CACHE, 
            CacheConfig.PRODUCTS_CACHE, 
            CacheConfig.CATEGORIES_CACHE
        );
        
        for (String cacheName : cacheNames) {
            org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
            }
        }
        
        response.put("status", "success");
        response.put("message", "All caches have been cleared");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/actions/clear/{cacheName}")
    public ResponseEntity<Map<String, String>> clearCache(@PathVariable String cacheName) {
        Map<String, String> response = new HashMap<>();
        
        org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
            response.put("status", "success");
            response.put("message", "Cache '" + cacheName + "' has been cleared");
            return ResponseEntity.ok(response);
        } else {
            response.put("status", "error");
            response.put("message", "Cache '" + cacheName + "' not found");
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @PutMapping("/config/{cacheName}")
    public ResponseEntity<Map<String, Object>> updateCacheConfig(
            @PathVariable String cacheName,
            @RequestParam(required = false) Long expireAfterWrite,
            @RequestParam(required = false) Integer maximumSize) {
        
        Map<String, Object> response = new HashMap<>();
        
        // For now, just return a notification that the cache would be reconfigured
        // In a real implementation, you would need a custom mechanism to update
        // cache configuration at runtime
        
        response.put("name", cacheName);
        
        if (expireAfterWrite != null) {
            response.put("expireAfterWrite", TimeUnit.MILLISECONDS.toMinutes(expireAfterWrite) + " minutes");
        }
        
        if (maximumSize != null) {
            response.put("maximumSize", maximumSize);
        }
        
        response.put("message", "Cache configuration updated (Note: In a real implementation, this would require custom runtime configuration handling)");
        return ResponseEntity.ok(response);
    }
} 