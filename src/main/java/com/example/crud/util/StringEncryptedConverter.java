package com.example.crud.util;

import com.example.crud.service.EncryptionService;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

@Converter
@Component
public class StringEncryptedConverter implements AttributeConverter<String, String> {

    private static ApplicationContext context;

    @Autowired
    public void setApplicationContext(ApplicationContext applicationContext) {
        StringEncryptedConverter.context = applicationContext;
    }

    private EncryptionService getEncryptionService() {
        if (context == null) {
            return null; // This will happen during application startup
        }
        return context.getBean(EncryptionService.class);
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        
        EncryptionService encryptionService = getEncryptionService();
        if (encryptionService == null) {
            return attribute; // During startup/migration, return unencrypted
        }
        
        return encryptionService.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        
        EncryptionService encryptionService = getEncryptionService();
        if (encryptionService == null) {
            return dbData; // During startup/migration, return as is
        }
        
        try {
            return encryptionService.decrypt(dbData);
        } catch (Exception e) {
            // If decryption fails, it might be plain text data
            return dbData;
        }
    }
} 