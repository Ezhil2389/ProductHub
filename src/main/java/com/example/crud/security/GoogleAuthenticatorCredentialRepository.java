package com.example.crud.security;

import com.warrenstrange.googleauth.ICredentialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.example.crud.repository.UserRepository;
import com.example.crud.model.User;

import java.util.List;

@Component
public class GoogleAuthenticatorCredentialRepository implements ICredentialRepository {
    
    @Autowired
    private UserRepository userRepository;

    @Override
    public String getSecretKey(String username) {
        return userRepository.findByUsername(username)
                .map(User::getMfaSecret)
                .orElse(null);
    }

    @Override
    public void saveUserCredentials(String username,
                                  String secretKey,
                                  int validationCode,
                                  List<Integer> scratchCodes) {
        userRepository.findByUsername(username).ifPresent(user -> {
            user.setMfaSecret(secretKey);
            userRepository.save(user);
        });
    }
} 