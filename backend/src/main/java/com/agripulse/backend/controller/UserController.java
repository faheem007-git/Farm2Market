package com.agripulse.backend.controller;

import com.agripulse.backend.dto.request.UpdateProfileRequest;
import com.agripulse.backend.dto.response.UserResponse;
import com.agripulse.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication auth) {
        return ResponseEntity.ok(userService.getUser((String) auth.getPrincipal()));
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> list() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> get(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    /** Self-service profile edit. Ownership is inherent: only the caller's own id is used. */
    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateMe(Authentication auth,
                                                 @Valid @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(
                userService.updateUser((String) auth.getPrincipal(), req, isAdmin(auth)));
    }

    /** Admin-only profile edit (role gate in SecurityConfig). */
    @PatchMapping("/{id}")
    public ResponseEntity<UserResponse> updateByAdmin(@PathVariable String id,
                                                      @Valid @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(userService.updateUser(id, req, true));
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
