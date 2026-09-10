package com.agripulse.backend.controller;

import com.agripulse.backend.dto.request.LoginRequest;
import com.agripulse.backend.dto.response.AuthResponse;
import com.agripulse.backend.dto.response.UserResponse;
import com.agripulse.backend.model.User;
import com.agripulse.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication auth) {
        User user = authService.getCurrentUser((String) auth.getPrincipal());
        return ResponseEntity.ok(UserResponse.from(user));
    }
}
