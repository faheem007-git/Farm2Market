package com.agripulse.backend.controller;

import com.agripulse.backend.dto.request.UpsertSupplierResponseRequest;
import com.agripulse.backend.dto.response.SupplierResponseResponse;
import com.agripulse.backend.security.JwtUserDetails;
import com.agripulse.backend.service.SupplierResponseService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/supplier-responses")
public class SupplierResponseController {

    private final SupplierResponseService responseService;

    public SupplierResponseController(SupplierResponseService responseService) {
        this.responseService = responseService;
    }

    @GetMapping
    public ResponseEntity<List<SupplierResponseResponse>> list(
            Authentication auth,
            @RequestParam(required = false) String requirementId,
            @RequestParam(required = false) String supplierId) {
        return ResponseEntity.ok(responseService.list(
                (String) auth.getPrincipal(), roleOf(auth), requirementId, supplierId));
    }

    @PostMapping
    public ResponseEntity<SupplierResponseResponse> upsert(
            Authentication auth, @Valid @RequestBody UpsertSupplierResponseRequest req) {
        return ResponseEntity.ok(responseService.upsert(
                (String) auth.getPrincipal(), roleOf(auth), req));
    }

    private String roleOf(Authentication auth) {
        return ((JwtUserDetails) auth.getDetails()).getRole();
    }
}
