package com.example.crud.controller;

import com.example.crud.payload.response.MessageResponse;
import com.example.crud.service.DataMigrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private DataMigrationService dataMigrationService;

    @PostMapping("/migrate-data")
    public ResponseEntity<?> migrateData() {
        try {
            dataMigrationService.migrateDataToEncrypted();
            return ResponseEntity.ok(new MessageResponse("Data migration completed successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(new MessageResponse("Error during data migration: " + e.getMessage()));
        }
    }

    @PostMapping("/migrate-product-versions")
    public ResponseEntity<?> migrateProductVersions() {
        try {
            dataMigrationService.migrateProductVersions();
            return ResponseEntity.ok(new MessageResponse("Product version migration completed successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(new MessageResponse("Error during product version migration: " + e.getMessage()));
        }
    }
} 