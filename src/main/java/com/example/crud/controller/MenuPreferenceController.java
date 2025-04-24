package com.example.crud.controller;

import com.example.crud.model.MenuPreference;
import com.example.crud.model.User;
import com.example.crud.payload.request.MenuPreferenceRequest;
import com.example.crud.payload.response.MenuPreferenceResponse;
import com.example.crud.service.MenuPreferenceService;
import com.example.crud.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/menu-preferences")
@RequiredArgsConstructor
public class MenuPreferenceController {

    private final MenuPreferenceService menuPreferenceService;
    private final UserService userService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping
    public ResponseEntity<MenuPreferenceResponse> getMenuPreferences() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        User user = userService.getUserByUsername(username);
        
        List<MenuPreference> preferences = menuPreferenceService.getMenuPreferences(user);
        
        // Map to response DTO
        List<MenuPreferenceResponse.MenuItemPreference> items = preferences.stream()
            .map(pref -> MenuPreferenceResponse.MenuItemPreference.builder()
                .menuId(pref.getMenuKey())
                .visible(pref.isExpanded())
                .order(pref.getDisplayOrder())
                .build())
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(new MenuPreferenceResponse(items));
    }

    @PostMapping
    public ResponseEntity<Void> saveMenuPreferences(
            @Valid @RequestBody MenuPreferenceRequest request) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        User user = userService.getUserByUsername(username);
        
        // Map to entity
        List<MenuPreference> preferences = request.getPreferences().stream()
            .map(item -> {
                String menuDataJson = "";
                try {
                    // Serialize all menu item data except order
                    menuDataJson = objectMapper.writeValueAsString(Map.of(
                        "menuId", item.getMenuId(),
                        "visible", item.getVisible(),
                        "name", item.getName(),
                        "path", item.getPath(),
                        "iconName", item.getIconName(),
                        "badge", item.getBadge()
                    ));
                } catch (Exception e) {
                    // handle error, maybe log and skip this item
                }
                return MenuPreference.builder()
                    .user(user)
                    .menuKey(item.getMenuId())
                    .expanded(item.getVisible())
                    .displayOrder(item.getOrder())
                    .menuData(menuDataJson)
                    .build();
            })
            .collect(Collectors.toList());
        
        menuPreferenceService.saveMenuPreferences(user, preferences);
        return ResponseEntity.ok().build();
    }
} 