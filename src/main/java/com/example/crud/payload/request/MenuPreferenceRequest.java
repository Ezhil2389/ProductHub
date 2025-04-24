package com.example.crud.payload.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class MenuPreferenceRequest {

    @NotEmpty
    private List<MenuItemPreference> preferences;

    @Data
    public static class MenuItemPreference {
        @NotNull
        private String menuId;
        
        @NotNull
        private Boolean visible;
        
        @NotNull
        private Integer order;

        // Additional menu item fields for full serialization
        private String name;
        private String path;
        private String iconName;
        private String badge;
    }
} 