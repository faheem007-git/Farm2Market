package com.agripulse.backend.controller;

import com.agripulse.backend.dto.request.CreateProduceRequest;
import com.agripulse.backend.dto.request.UpdateProduceRequest;
import com.agripulse.backend.dto.response.ProduceResponse;
import com.agripulse.backend.service.ProduceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/produce")
public class ProduceController {

    private final ProduceService produceService;

    public ProduceController(ProduceService produceService) {
        this.produceService = produceService;
    }

    @GetMapping
    public ResponseEntity<List<ProduceResponse>> list() {
        return ResponseEntity.ok(produceService.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProduceResponse> get(@PathVariable String id) {
        return ResponseEntity.ok(produceService.get(id));
    }

    @PostMapping
    public ResponseEntity<ProduceResponse> create(Authentication auth,
                                                  @Valid @RequestBody CreateProduceRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(produceService.create((String) auth.getPrincipal(), req));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ProduceResponse> update(@PathVariable String id,
                                                  Authentication auth,
                                                  @Valid @RequestBody UpdateProduceRequest req) {
        return ResponseEntity.ok(produceService.update(
                id, (String) auth.getPrincipal(), isAdmin(auth), req));
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
