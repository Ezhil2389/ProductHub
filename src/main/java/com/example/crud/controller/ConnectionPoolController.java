package com.example.crud.controller;

import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/cpool")
@PreAuthorize("hasRole('ADMIN')")
public class ConnectionPoolController {

    private final HikariDataSource dataSource;
    private final Logger logger = LoggerFactory.getLogger(ConnectionPoolController.class);

    @Autowired
    public ConnectionPoolController(DataSource dataSource) {
        // Cast to HikariDataSource to access pool metrics
        this.dataSource = (HikariDataSource) dataSource;
    }

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getPoolMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        HikariPoolMXBean poolProxy = dataSource.getHikariPoolMXBean();

        // Ensure we have fresh metrics
        try {
            // First log the metrics for server-side visibility
            logger.debug("Fetching fresh connection pool metrics");
            logger.debug("Active: {}, Idle: {}, Total: {}, Waiting: {}", 
                poolProxy.getActiveConnections(),
                poolProxy.getIdleConnections(),
                poolProxy.getTotalConnections(),
                poolProxy.getThreadsAwaitingConnection());
            
            // Pool configuration
            metrics.put("poolName", dataSource.getPoolName());
            metrics.put("maximumPoolSize", dataSource.getMaximumPoolSize());
            metrics.put("minimumIdle", dataSource.getMinimumIdle());
            metrics.put("idleTimeout", dataSource.getIdleTimeout());
            metrics.put("maxLifetime", dataSource.getMaxLifetime());
            metrics.put("connectionTimeout", dataSource.getConnectionTimeout());
            metrics.put("validationTimeout", dataSource.getValidationTimeout());
            
            // Runtime metrics
            metrics.put("activeConnections", poolProxy.getActiveConnections());
            metrics.put("idleConnections", poolProxy.getIdleConnections());
            metrics.put("totalConnections", poolProxy.getTotalConnections());
            metrics.put("threadsAwaitingConnection", poolProxy.getThreadsAwaitingConnection());
            
            // Add a timestamp for client-side freshness check
            metrics.put("timestamp", System.currentTimeMillis());
        } catch (Exception e) {
            logger.error("Error fetching pool metrics: {}", e.getMessage());
            metrics.put("error", "Failed to fetch some metrics: " + e.getMessage());
        }

        return ResponseEntity.ok(metrics);
    }
    
    @PutMapping("/config")
    public ResponseEntity<Map<String, Object>> updatePoolConfig(
            @RequestParam(required = false) Integer maximumPoolSize,
            @RequestParam(required = false) Integer minimumIdle,
            @RequestParam(required = false) Long idleTimeout,
            @RequestParam(required = false) Long connectionTimeout,
            @RequestParam(required = false) Long maxLifetime) {
        
        Map<String, Object> updatedConfig = new HashMap<>();
        
        if (maximumPoolSize != null && maximumPoolSize > 0) {
            dataSource.setMaximumPoolSize(maximumPoolSize);
            updatedConfig.put("maximumPoolSize", maximumPoolSize);
        }
        
        if (minimumIdle != null && minimumIdle >= 0) {
            dataSource.setMinimumIdle(minimumIdle);
            updatedConfig.put("minimumIdle", minimumIdle);
        }
        
        if (idleTimeout != null && idleTimeout > 0) {
            dataSource.setIdleTimeout(idleTimeout);
            updatedConfig.put("idleTimeout", idleTimeout);
        }
        
        if (connectionTimeout != null && connectionTimeout > 0) {
            dataSource.setConnectionTimeout(connectionTimeout);
            updatedConfig.put("connectionTimeout", connectionTimeout);
        }
        
        if (maxLifetime != null && maxLifetime > 0) {
            dataSource.setMaxLifetime(maxLifetime);
            updatedConfig.put("maxLifetime", maxLifetime);
        }
        
        return ResponseEntity.ok(updatedConfig);
    }
    
    @PostMapping("/actions/soft-reset")
    public ResponseEntity<Map<String, String>> softResetPool() {
        HikariPoolMXBean poolProxy = dataSource.getHikariPoolMXBean();
        poolProxy.softEvictConnections();
        
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Pool connections soft reset initiated");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/actions/log-status")
    public ResponseEntity<Map<String, String>> logPoolStatus() {
        HikariPoolMXBean poolProxy = dataSource.getHikariPoolMXBean();
        
        // Generate detailed logging
        logger.info("========== HIKARI CONNECTION POOL STATUS ==========");
        logger.info("Pool Name: {}", dataSource.getPoolName());
        logger.info("Max Pool Size: {}", dataSource.getMaximumPoolSize());
        logger.info("Min Idle: {}", dataSource.getMinimumIdle());
        logger.info("Active Connections: {}", poolProxy.getActiveConnections());
        logger.info("Idle Connections: {}", poolProxy.getIdleConnections());
        logger.info("Total Connections: {}", poolProxy.getTotalConnections());
        logger.info("Threads Awaiting Connection: {}", poolProxy.getThreadsAwaitingConnection());
        logger.info("=================================================");
        
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Connection pool status logged");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/diagnostics/leak-simulation")
    public ResponseEntity<Map<String, String>> simulateConnectionLeak() {
        logger.warn("Starting connection leak simulation - this is for testing purposes only!");
        
        // Get a connection from the pool but don't close it (simulating a leak)
        Thread leakThread = new Thread(() -> {
            try {
                // This is a hack to get a direct connection for testing
                // DO NOT use this approach in production code!
                java.sql.Connection connection = dataSource.getConnection();
                logger.info("Connection leak simulation: Acquired connection but not releasing it");
                
                // Sleep for a while to simulate the leak
                Thread.sleep(60000); // 1 minute
                
                // Eventually close it to avoid actual problems
                connection.close();
                logger.info("Connection leak simulation: Released connection after delay");
            } catch (Exception e) {
                logger.error("Error in connection leak simulation", e);
            }
        });
        leakThread.setDaemon(true);
        leakThread.start();
        
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Connection leak simulation started. Check logs for details.");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/diagnostics/heavy-load")
    public ResponseEntity<Map<String, Object>> simulateHeavyLoad(
            @RequestParam(defaultValue = "5") int concurrentQueries,
            @RequestParam(defaultValue = "1000") int queryTimeMs,
            @RequestParam(defaultValue = "30") int durationSeconds) {
        
        logger.warn("Starting heavy load simulation with {} concurrent queries, {}ms query time for {} seconds", 
                concurrentQueries, queryTimeMs, durationSeconds);
        
        final AtomicInteger activeConnections = new AtomicInteger(0);
        final AtomicInteger completedQueries = new AtomicInteger(0);
        final AtomicInteger failedQueries = new AtomicInteger(0);
        final long startTime = System.currentTimeMillis();
        final long endTime = startTime + (durationSeconds * 1000);
        
        // Create and start worker threads
        List<Thread> workers = new ArrayList<>();
        for (int i = 0; i < concurrentQueries; i++) {
            Thread worker = new Thread(() -> {
                while (System.currentTimeMillis() < endTime) {
                    java.sql.Connection conn = null;
                    try {
                        // Get connection from pool
                        conn = dataSource.getConnection();
                        activeConnections.incrementAndGet();
                        
                        // Execute a real query
                        try (java.sql.Statement stmt = conn.createStatement()) {
                            // Run an actual query that will take some time
                            // First try the PostgreSQL sleep method
                            try {
                                stmt.execute("SELECT pg_sleep(" + (queryTimeMs / 1000.0) + ")");
                            } catch (Exception e) {
                                // Fallback for H2 - run a complex query that will take time
                                stmt.execute("WITH RECURSIVE t(n) AS (" +
                                    "SELECT 1 " +
                                    "UNION ALL " +
                                    "SELECT n+1 FROM t WHERE n < 1000" +
                                    ") " +
                                    "SELECT COUNT(*) FROM t t1, t t2 WHERE t1.n % 10 = t2.n % 10");
                            }
                        }
                        
                        // Simulate processing time
                        Thread.sleep(queryTimeMs);
                        completedQueries.incrementAndGet();
                    } catch (Exception e) {
                        logger.error("Error in heavy load simulation: {}", e.getMessage());
                        failedQueries.incrementAndGet();
                    } finally {
                        if (conn != null) {
                            try {
                                conn.close();
                                activeConnections.decrementAndGet();
                            } catch (Exception e) {
                                logger.error("Error closing connection: {}", e.getMessage());
                            }
                        }
                    }
                    
                    // Small pause between operations
                    try {
                        Thread.sleep(50);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            });
            worker.setDaemon(true);
            worker.start();
            workers.add(worker);
        }
        
        // Start a status logging thread
        Thread statusThread = new Thread(() -> {
            while (System.currentTimeMillis() < endTime) {
                try {
                    logger.info("Simulation status: active={}, completed={}, failed={}, poolActive={}, poolIdle={}, waiting={}",
                            activeConnections.get(),
                            completedQueries.get(),
                            failedQueries.get(),
                            dataSource.getHikariPoolMXBean().getActiveConnections(),
                            dataSource.getHikariPoolMXBean().getIdleConnections(),
                            dataSource.getHikariPoolMXBean().getThreadsAwaitingConnection());
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    break;
                }
            }
        });
        statusThread.setDaemon(true);
        statusThread.start();
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Heavy load simulation started");
        response.put("concurrentQueries", concurrentQueries);
        response.put("queryTimeMs", queryTimeMs);
        response.put("durationSeconds", durationSeconds);
        response.put("estimatedCompletionTime", new Date(endTime));
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/diagnostics/pool-saturation")
    public ResponseEntity<Map<String, Object>> simulatePoolSaturation() {
        // Get current pool size
        int maxPoolSize = dataSource.getMaximumPoolSize();
        int threadCount = maxPoolSize * 2; // Use double the pool size to ensure saturation
        
        logger.warn("Starting pool saturation simulation with {} threads (max pool size: {})", 
                threadCount, maxPoolSize);
        
        // Create CountDownLatch to coordinate thread start and measure when all threads have connections
        final CountDownLatch readyLatch = new CountDownLatch(threadCount);
        final CountDownLatch connectionsAcquiredLatch = new CountDownLatch(threadCount);
        final CountDownLatch releaseLatch = new CountDownLatch(1);
        
        // Track metrics
        final AtomicInteger successfulAcquisitions = new AtomicInteger(0);
        final AtomicInteger failedAcquisitions = new AtomicInteger(0);
        final AtomicLong totalAcquisitionTime = new AtomicLong(0);
        final AtomicLong maxAcquisitionTime = new AtomicLong(0);
        
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            final int threadId = i;
            Thread t = new Thread(() -> {
                java.sql.Connection connection = null;
                
                // Signal thread is ready
                readyLatch.countDown();
                
                try {
                    // Wait for all threads to be ready to start at the same time
                    readyLatch.await();
                    
                    logger.info("Thread {} attempting to acquire connection", threadId);
                    long startTime = System.currentTimeMillis();
                    
                    // Try to get a connection from the pool
                    try {
                        connection = dataSource.getConnection();
                        long acquisitionTime = System.currentTimeMillis() - startTime;
                        
                        // Update metrics
                        totalAcquisitionTime.addAndGet(acquisitionTime);
                        maxAcquisitionTime.updateAndGet(current -> Math.max(current, acquisitionTime));
                        successfulAcquisitions.incrementAndGet();
                        
                        logger.info("Thread {} acquired connection after {}ms", threadId, acquisitionTime);
                        
                        // Signal that this thread has acquired a connection
                        connectionsAcquiredLatch.countDown();
                        
                        // Hold the connection until the release signal
                        releaseLatch.await();
                        
                    } catch (Exception e) {
                        failedAcquisitions.incrementAndGet();
                        logger.error("Thread {} failed to acquire connection: {}", threadId, e.getMessage());
                    }
                    
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    // Always close the connection
                    if (connection != null) {
                        try {
                            connection.close();
                            logger.info("Thread {} released connection", threadId);
                        } catch (Exception e) {
                            logger.error("Error closing connection: {}", e.getMessage());
                        }
                    }
                }
            });
            t.setDaemon(true);
            threads.add(t);
            t.start();
        }
        
        // Start monitoring thread
        Thread monitorThread = new Thread(() -> {
            try {
                // Wait for threads to acquire connections
                boolean allAcquired = connectionsAcquiredLatch.await(15, TimeUnit.SECONDS);
                
                // Get final pool state
                HikariPoolMXBean poolProxy = dataSource.getHikariPoolMXBean();
                int activeConnections = poolProxy.getActiveConnections();
                int idleConnections = poolProxy.getIdleConnections();
                int waitingThreads = poolProxy.getThreadsAwaitingConnection();
                
                logger.info("Pool saturation test results:");
                logger.info("All connections acquired: {}", allAcquired);
                logger.info("Successful acquisitions: {}/{}", successfulAcquisitions.get(), threadCount);
                logger.info("Failed acquisitions: {}", failedAcquisitions.get());
                logger.info("Average acquisition time: {}ms", 
                        successfulAcquisitions.get() > 0 ? 
                        totalAcquisitionTime.get() / successfulAcquisitions.get() : 0);
                logger.info("Maximum acquisition time: {}ms", maxAcquisitionTime.get());
                logger.info("Final pool state - active: {}, idle: {}, waiting: {}", 
                        activeConnections, idleConnections, waitingThreads);
                
                // Signal threads to release connections after 10 seconds
                Thread.sleep(10000);
                releaseLatch.countDown();
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        monitorThread.setDaemon(true);
        monitorThread.start();
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Pool saturation test started with " + threadCount + " threads");
        response.put("maxPoolSize", maxPoolSize);
        response.put("testThreads", threadCount);
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/diagnostics/quick-test")
    public ResponseEntity<Map<String, Object>> quickConnectionTest() {
        // This is a simpler version of heavy load for a quick 15-second test
        final int concurrentQueries = Math.min(dataSource.getMaximumPoolSize() * 2, 20); // At most 20 threads
        final int queryTimeMs = 1000;
        final int durationSeconds = 15;
        
        logger.warn("Starting quick connection test with {} concurrent queries for {} seconds", 
                concurrentQueries, durationSeconds);
                
        // Create and start worker threads to make database queries
        List<Thread> workers = new ArrayList<>();
        for (int i = 0; i < concurrentQueries; i++) {
            Thread worker = new Thread(() -> {
                long endTime = System.currentTimeMillis() + (durationSeconds * 1000);
                while (System.currentTimeMillis() < endTime) {
                    java.sql.Connection conn = null;
                    try {
                        // Get and use a connection
                        conn = dataSource.getConnection();
                        logger.info("Connection acquired successfully");
                        
                        // Hold the connection for a short time
                        try (java.sql.Statement stmt = conn.createStatement()) {
                            // Just run a simple query
                            stmt.execute("SELECT 1");
                        }
                        
                        // Hold connection a bit longer
                        Thread.sleep(queryTimeMs);
                    } catch (Exception e) {
                        logger.error("Error in quick test: {}", e.getMessage());
                    } finally {
                        // Always release the connection
                        if (conn != null) {
                            try {
                                conn.close();
                            } catch (Exception e) {
                                logger.error("Error closing connection: {}", e.getMessage());
                            }
                        }
                    }
                    
                    // Small pause between operations
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            });
            worker.setDaemon(true);
            worker.start();
            workers.add(worker);
        }
        
        // Start a status logging thread
        Thread statusThread = new Thread(() -> {
            long endTime = System.currentTimeMillis() + (durationSeconds * 1000);
            while (System.currentTimeMillis() < endTime) {
                try {
                    HikariPoolMXBean poolProxy = dataSource.getHikariPoolMXBean();
                    logger.info("Quick test pool status - active: {}, idle: {}, waiting: {}, total: {}",
                            poolProxy.getActiveConnections(),
                            poolProxy.getIdleConnections(),
                            poolProxy.getThreadsAwaitingConnection(),
                            poolProxy.getTotalConnections());
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    break;
                }
            }
            logger.info("Quick connection test completed");
        });
        statusThread.setDaemon(true);
        statusThread.start();
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Quick connection test started");
        response.put("concurrentQueries", concurrentQueries);
        response.put("durationSeconds", durationSeconds);
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/diagnostics/extreme-stress")
    public ResponseEntity<Map<String, Object>> extremeStressTest() {
        // This will directly grab and hold connections in a way that's easily visible in the UI
        final int maxConnections = dataSource.getMaximumPoolSize();
        final int durationSeconds = 20;
        
        logger.warn("Starting EXTREME stress test - acquiring and holding {} connections for {} seconds", 
                maxConnections, durationSeconds);
                
        // We'll store connections in a list so we can close them properly
        List<java.sql.Connection> connections = new ArrayList<>();
        AtomicInteger acquiredConnections = new AtomicInteger(0);
        
        // Attempt to acquire and hold all connections
        for (int i = 0; i < maxConnections; i++) {
            final int connectionId = i;
            Thread connectionThread = new Thread(() -> {
                try {
                    logger.info("Thread {} attempting to acquire connection", connectionId);
                    java.sql.Connection conn = dataSource.getConnection();
                    connections.add(conn);
                    
                    int acquired = acquiredConnections.incrementAndGet();
                    logger.info("Thread {} acquired connection ({}/{})", 
                            connectionId, acquired, maxConnections);
                    
                    // Keep the connection active by executing a query every second
                    long endTime = System.currentTimeMillis() + (durationSeconds * 1000);
                    while (System.currentTimeMillis() < endTime) {
                        try (java.sql.Statement stmt = conn.createStatement()) {
                            stmt.execute("SELECT 1");
                            // Sleep for a bit, but keep the connection
                            Thread.sleep(1000);
                        } catch (Exception e) {
                            logger.error("Error executing query on connection {}: {}", 
                                    connectionId, e.getMessage());
                        }
                    }
                } catch (Exception e) {
                    logger.error("Thread {} failed to acquire connection: {}", 
                            connectionId, e.getMessage());
                }
            });
            connectionThread.setDaemon(true);
            connectionThread.start();
        }
        
        // Monitor thread to log status
        Thread monitorThread = new Thread(() -> {
            try {
                for (int i = 0; i < durationSeconds; i++) {
                    Thread.sleep(1000);
                    HikariPoolMXBean poolProxy = dataSource.getHikariPoolMXBean();
                    logger.info("Extreme stress test status - second {}/{} - active: {}, idle: {}, waiting: {}, total: {}",
                            i+1, durationSeconds,
                            poolProxy.getActiveConnections(),
                            poolProxy.getIdleConnections(),
                            poolProxy.getThreadsAwaitingConnection(),
                            poolProxy.getTotalConnections());
                }
                
                // After test duration, close all acquired connections
                logger.warn("Extreme stress test completed - closing {} connections", connections.size());
                for (java.sql.Connection conn : connections) {
                    try {
                        conn.close();
                    } catch (Exception e) {
                        logger.error("Error closing connection: {}", e.getMessage());
                    }
                }
                connections.clear();
                
                // Log final pool state
                HikariPoolMXBean poolProxy = dataSource.getHikariPoolMXBean();
                logger.info("Final pool state - active: {}, idle: {}, waiting: {}, total: {}",
                        poolProxy.getActiveConnections(),
                        poolProxy.getIdleConnections(),
                        poolProxy.getThreadsAwaitingConnection(),
                        poolProxy.getTotalConnections());
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        monitorThread.setDaemon(true);
        monitorThread.start();
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Extreme stress test started - attempting to acquire and hold " + 
                maxConnections + " connections for " + durationSeconds + " seconds");
        response.put("maxConnections", maxConnections);
        response.put("durationSeconds", durationSeconds);
        response.put("note", "Check server logs for real-time updates");
        
        return ResponseEntity.ok(response);
    }
} 