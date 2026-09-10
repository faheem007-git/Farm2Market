package com.agripulse.backend.controller;

import com.agripulse.backend.dto.response.NotificationResponse;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.security.JwtUserDetails;
import com.agripulse.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> list(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        Role role = Role.from(roleOf(auth));
        return ResponseEntity.ok(notificationService.listFor(userId, role).stream()
                .map(NotificationResponse::from).toList());
    }

    @GetMapping("/unread")
    public ResponseEntity<Map<String, Long>> unread(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        Role role = Role.from(roleOf(auth));
        return ResponseEntity.ok(
                Map.of("count", notificationService.unreadCount(userId, role)));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> readAll(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        Role role = Role.from(roleOf(auth));
        notificationService.markAllRead(userId, role);
        return ResponseEntity.ok().build();
    }

    private String roleOf(Authentication auth) {
        return ((JwtUserDetails) auth.getDetails()).getRole();
    }
}
