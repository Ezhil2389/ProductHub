package com.example.crud.service;

import com.example.crud.model.MenuPreference;
import com.example.crud.model.User;
import com.example.crud.repository.MenuPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuPreferenceService {

    private final MenuPreferenceRepository menuPreferenceRepository;

    public List<MenuPreference> getMenuPreferences(User user) {
        return menuPreferenceRepository.findByUserOrderByDisplayOrder(user);
    }
    
    @Transactional
    public void saveMenuPreferences(User user, List<MenuPreference> preferences) {
        menuPreferenceRepository.deleteAllByUser(user);
        for (MenuPreference preference : preferences) {
            preference.setUser(user);
        }
        menuPreferenceRepository.saveAll(preferences);
    }

    @Transactional
    public void resetMenuPreferences(User user, List<MenuPreference> defaultPreferences) {
        menuPreferenceRepository.deleteAllByUser(user);
        menuPreferenceRepository.saveAll(defaultPreferences);
    }
} 