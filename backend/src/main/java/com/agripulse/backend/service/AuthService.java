package com.agripulse.backend.service;

import com.agripulse.backend.dto.request.LoginRequest;
import com.agripulse.backend.dto.response.AuthResponse;
import com.agripulse.backend.dto.response.UserResponse;
import com.agripulse.backend.model.User;
import com.agripulse.backend.repository.UserRepository;
import com.agripulse.backend.security.AuthFailedException;
import com.agripulse.backend.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(AuthFailedException::new);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AuthFailedException();
        }

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(UserResponse.from(user), token);
    }

    public User getCurrentUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
