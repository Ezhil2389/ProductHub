package com.example.crud.service;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import com.warrenstrange.googleauth.ICredentialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.crud.model.User;
import com.example.crud.repository.UserRepository;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class MfaService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ICredentialRepository credentialRepository;
    
    private final GoogleAuthenticator gAuth;
    
    public MfaService(ICredentialRepository credentialRepository) {
        this.gAuth = new GoogleAuthenticator();
        this.gAuth.setCredentialRepository(credentialRepository);
    }
    
    public String generateSecretKey() {
        final GoogleAuthenticatorKey key = gAuth.createCredentials();
        return key.getKey();
    }
    
    public String generateQrCodeUrl(String secret, String username) {
        return GoogleAuthenticatorQRGenerator.getOtpAuthURL("CRUD App", username, new GoogleAuthenticatorKey.Builder(secret).build());
    }
    
    public boolean verifyCode(String secret, int code) {
        return gAuth.authorize(secret, code);
    }
    
    public List<String> generateRecoveryCodes() {
        SecureRandom random = new SecureRandom();
        return IntStream.range(0, 10)
                .mapToObj(i -> String.format("%012d", Math.abs(random.nextLong() % 1000000000000L)))
                .collect(Collectors.toList());
    }
    
    @Transactional
    public void enableMfaForUser(User user, int code) {
        if (!verifyCode(user.getMfaSecret(), code)) {
            throw new IllegalArgumentException("Invalid MFA code");
        }
        user.setMfaEnabled(true);
        user.setRecoveryCodes(generateRecoveryCodes());
        userRepository.save(user);
    }
    
    @Transactional
    public void disableMfaForUser(User user, int code) {
        if (!verifyCode(user.getMfaSecret(), code)) {
            throw new IllegalArgumentException("Invalid MFA code");
        }
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setRecoveryCodes(null);
        userRepository.save(user);
    }
    
    public boolean validateRecoveryCode(User user, String recoveryCode) {
        List<String> recoveryCodes = user.getRecoveryCodes();
        if (recoveryCodes != null && recoveryCodes.contains(recoveryCode)) {
            recoveryCodes.remove(recoveryCode);
            userRepository.save(user);
            return true;
        }
        return false;
    }
} 