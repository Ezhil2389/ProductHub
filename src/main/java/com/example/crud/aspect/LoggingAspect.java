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

    @Around("springBeanPointcut() && notApplicationLogService()")
    public Object logAround(ProceedingJoinPoint joinPoint) throws Throwable {
        if (log.isDebugEnabled()) {
            log.debug("Enter: {}.{}() with arguments = {}", 
                    joinPoint.getSignature().getDeclaringTypeName(),
                    joinPoint.getSignature().getName(), 
                    sanitizeArgs(joinPoint.getArgs()));
        }
        
        try {
            Object result = joinPoint.proceed();
            if (log.isDebugEnabled()) {
                log.debug("Exit: {}.{}() with result = {}", 
                        joinPoint.getSignature().getDeclaringTypeName(),
                        joinPoint.getSignature().getName(), 
                        result);
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
     * Sanitize arguments by truncating long strings (likely tokens)
     */
    private String sanitizeArgs(Object[] args) {
        if (args == null) {
            return "null";
        }
        return Arrays.stream(args)
                .map(arg -> {
                    if (arg instanceof String && ((String) arg).length() > MAX_ARG_LENGTH) {
                        // Likely a token or other sensitive data, truncate it
                        return ((String) arg).substring(0, 10) + "..." + 
                               "(truncated, total length: " + ((String) arg).length() + ")";
                    }
                    return String.valueOf(arg);
                })
                .collect(Collectors.joining(", ", "[", "]"));
    }
    
    /**
     * Truncate message to prevent DB column overflow
     */
    private String truncateMessage(String message) {
        if (message == null) {
            return null;
        }
        if (message.length() <= 900) {
            return message;
        }
        return message.substring(0, 897) + "...";
    }
} 