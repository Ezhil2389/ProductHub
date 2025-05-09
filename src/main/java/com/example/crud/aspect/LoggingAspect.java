package com.example.crud.aspect;

import com.example.crud.service.ApplicationLogService;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Aspect
@Component
@Slf4j
public class LoggingAspect {

    // Flag to prevent recursive logging
    private static final ThreadLocal<AtomicBoolean> loggingInProgress = ThreadLocal.withInitial(() -> new AtomicBoolean(false));
    
    // Maximum length for argument strings to prevent DB column size issues
    private static final int MAX_ARG_LENGTH = 100;

    @Autowired
    private ApplicationLogService applicationLogService;

    @Pointcut("within(@org.springframework.stereotype.Repository *)" +
            " || within(@org.springframework.stereotype.Service *)" +
            " || within(@org.springframework.web.bind.annotation.RestController *)")
    public void springBeanPointcut() {
        // Method is empty as this is just a Pointcut
    }

    // Don't apply aspects to the ApplicationLogService to avoid loops
    @Pointcut("!within(com.example.crud.service.ApplicationLogService)")
    public void notApplicationLogService() {
        // Method is empty as this is just a Pointcut
    }

    // Added pointcut to exclude repository methods from detailed logging
    @Pointcut("!within(@org.springframework.stereotype.Repository *)")
    public void notRepositoryMethods() {
        // Method is empty as this is just a Pointcut
    }
    
    // Skip common service methods like getAllProducts that return large result sets
    @Pointcut("!execution(* com.example.crud.service.ProductService.getAllProducts(..))")
    public void notProductListMethods() {
        // Method is empty as this is just a Pointcut
    }

    @Around("springBeanPointcut() && notApplicationLogService() && notRepositoryMethods() && notProductListMethods()")
    public Object logAround(ProceedingJoinPoint joinPoint) throws Throwable {
        // Skip detailed argument logging for most methods
        try {
            String methodName = joinPoint.getSignature().getName();
            String className = joinPoint.getSignature().getDeclaringTypeName();
            
            // Only log method entry for DEBUG level without arguments and skip common methods
            if (log.isDebugEnabled() && !isCommonMethod(joinPoint) && !isVerboseOutputMethod(className, methodName)) {
                log.debug("Enter: {}.{}()", className, methodName);
            }
            
            Object result = joinPoint.proceed();
            
            // Only log exit for important methods and skip large result sets
            if (log.isDebugEnabled() && !isCommonMethod(joinPoint) && !isVerboseOutputMethod(className, methodName) && !shouldSkipResultLogging(result)) {
                log.debug("Exit: {}.{}() with result = {}", className, methodName, result);
            }
            
            return result;
        } catch (IllegalArgumentException e) {
            // Only log if we're not already in a logging operation
            if (!loggingInProgress.get().get()) {
                try {
                    loggingInProgress.get().set(true);
                    applicationLogService.logWarning("Illegal argument in " + 
                            joinPoint.getSignature().getDeclaringTypeName() + "." + 
                            joinPoint.getSignature().getName());
                } finally {
                    loggingInProgress.get().set(false);
                }
            }
            throw e;
        }
    }

    @AfterThrowing(pointcut = "springBeanPointcut() && notApplicationLogService()", throwing = "e")
    public void logAfterThrowing(JoinPoint joinPoint, Throwable e) {
        // Only log if we're not already in a logging operation
        if (!loggingInProgress.get().get()) {
            try {
                loggingInProgress.get().set(true);
                applicationLogService.logError("Exception in " + 
                        joinPoint.getSignature().getDeclaringTypeName() + "." + 
                        joinPoint.getSignature().getName() + "(): " + 
                        (e.getMessage() != null ? truncateMessage(e.getMessage()) : "null"), e);
            } finally {
                loggingInProgress.get().set(false);
            }
        } else {
            // Just log to console if we're already in a logging operation
            log.error("Exception in {} (not logged to DB to prevent recursion): {}", 
                joinPoint.getSignature().getDeclaringTypeName() + "." + 
                joinPoint.getSignature().getName(), 
                (e.getMessage() != null ? truncateMessage(e.getMessage()) : "null"));
        }
    }
    
    /**
     * Determine if a method is a common method that shouldn't be logged in detail
     */
    private boolean isCommonMethod(JoinPoint joinPoint) {
        String methodName = joinPoint.getSignature().getName();
        return methodName.startsWith("get") || 
               methodName.startsWith("set") || 
               methodName.startsWith("is") ||
               methodName.equals("toString") ||
               methodName.equals("hashCode") ||
               methodName.equals("equals") ||
               methodName.equals("findAll") ||
               methodName.equals("findById") ||
               methodName.equals("save") ||
               methodName.equals("deleteById") ||
               methodName.equals("getAllProducts");
    }
    
    /**
     * Check if method typically returns large data sets that shouldn't be logged
     */
    private boolean isVerboseOutputMethod(String className, String methodName) {
        // Skip SQL queries and large result sets
        return (className.contains("Repository") && !methodName.equals("save")) || 
               (className.contains("ProductService") && methodName.equals("getAllProducts")) ||
               methodName.equals("findByUsername");
    }
    
    /**
     * Determine if we should skip logging this result
     */
    private boolean shouldSkipResultLogging(Object result) {
        if (result == null) {
            return false;
        }
        
        // Skip logging large collections
        if (result instanceof java.util.Collection && ((java.util.Collection<?>) result).size() > 5) {
            return true;
        }
        
        // Skip logging SQL related objects or large strings
        String resultClassName = result.getClass().getName().toLowerCase();
        return resultClassName.contains("sql") || 
               resultClassName.contains("hibernate") ||
               resultClassName.contains("jdbc") ||
               (result instanceof String && ((String) result).length() > 100);
    }
    
    /**
     * Truncate message to prevent excessively long log entries
     */
    private String truncateMessage(String message) {
        if (message != null && message.length() > MAX_ARG_LENGTH) {
            return message.substring(0, MAX_ARG_LENGTH) + "...";
        }
        return message;
    }
    
    /**
     * Sanitize arguments for logging, hiding sensitive data
     */
    private String sanitizeArgs(Object[] args) {
        if (args == null) {
            return "null";
        }
        return Arrays.stream(args)
                .map(arg -> {
                    if (arg == null) {
                        return "null";
                    }
                    
                    // Hide sensitive data
                    if (arg instanceof String && ((String) arg).length() > MAX_ARG_LENGTH) {
                        return ((String) arg).substring(0, 5) + "...";
                    }
                    
                    // For collection types, just show the size
                    if (arg instanceof java.util.Collection) {
                        return "Collection(size=" + ((java.util.Collection<?>) arg).size() + ")";
                    }
                    
                    // Handle arrays
                    if (arg.getClass().isArray()) {
                        return "Array(size=" + java.lang.reflect.Array.getLength(arg) + ")";
                    }
                    
                    // For other objects, use simplified toString
                    String argString = arg.toString();
                    if (argString.length() > MAX_ARG_LENGTH) {
                        return arg.getClass().getSimpleName() + "@" + 
                               Integer.toHexString(System.identityHashCode(arg));
                    }
                    
                    return argString;
                })
                .collect(Collectors.joining(", "));
    }
} 