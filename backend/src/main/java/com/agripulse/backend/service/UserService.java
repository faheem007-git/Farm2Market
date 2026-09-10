package com.agripulse.backend.service;

import com.agripulse.backend.dto.request.UpdateProfileRequest;
import com.agripulse.backend.dto.response.UserResponse;
import com.agripulse.backend.model.User;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(UserResponse::from).toList();
    }

    public UserResponse getUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return UserResponse.from(user);
    }

    public List<UserResponse> getUsersByRole(Role role) {
        return userRepository.findByRole(role).stream().map(UserResponse::from).toList();
    }

    /**
     * PATCH semantics: only non-null fields are applied.
     * verified/rating are platform-managed and applied only when callerIsAdmin.
     * Role, email and password are never mutable through profiles.
     */
    public UserResponse updateUser(String id, UpdateProfileRequest updates, boolean callerIsAdmin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        if (updates.getName() != null) user.setName(updates.getName());
        if (updates.getCompany() != null) user.setCompany(updates.getCompany());
        if (updates.getLocation() != null) user.setLocation(updates.getLocation());
        if (updates.getPhone() != null) user.setPhone(updates.getPhone());
        if (updates.getAvatarUrl() != null) user.setAvatarUrl(updates.getAvatarUrl());
        if (updates.getDemandVolumeKgPerMonth() != null)
            user.setDemandVolumeKgPerMonth(updates.getDemandVolumeKgPerMonth());
        if (updates.getFarmSizeAcres() != null) user.setFarmSizeAcres(updates.getFarmSizeAcres());
        if (updates.getVillage() != null) user.setVillage(updates.getVillage());
        if (callerIsAdmin) {
            if (updates.getVerified() != null) user.setVerified(updates.getVerified());
            if (updates.getRating() != null) user.setRating(updates.getRating());
        }
        return UserResponse.from(userRepository.save(user));
    }
}
