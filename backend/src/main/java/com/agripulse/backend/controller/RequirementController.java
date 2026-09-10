package com.agripulse.backend.controller;

import com.agripulse.backend.dto.request.CreateRequirementRequest;
import com.agripulse.backend.dto.request.UpdateRequirementStatusRequest;
import com.agripulse.backend.dto.response.RequirementResponse;
import com.agripulse.backend.service.RequirementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requirements")
public class RequirementController {

    private final RequirementService requirementService;

    public RequirementController(RequirementService requirementService) {
        this.requirementService = requirementService;
    }

    @GetMapping
    public ResponseEntity<List<RequirementResponse>> list() {
        return ResponseEntity.ok(requirementService.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequirementResponse> get(@PathVariable String id) {
        return ResponseEntity.ok(requirementService.get(id));
    }

    @PostMapping
    public ResponseEntity<RequirementResponse> create(Authentication auth,
                                                      @Valid @RequestBody CreateRequirementRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(requirementService.create((String) auth.getPrincipal(), req));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<RequirementResponse> updateStatus(
            @PathVariable String id,
            Authentication auth,
            @Valid @RequestBody UpdateRequirementStatusRequest req) {
        return ResponseEntity.ok(requirementService.updateStatus(
                id, (String) auth.getPrincipal(), isAdmin(auth), req));
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
