package com.agripulse.backend.controller;

import com.agripulse.backend.dto.request.CreateOrderRequest;
import com.agripulse.backend.dto.request.TransitionOrderRequest;
import com.agripulse.backend.dto.response.OrderResponse;
import com.agripulse.backend.security.JwtUserDetails;
import com.agripulse.backend.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> list(Authentication auth) {
        return ResponseEntity.ok(orderService.list(
                (String) auth.getPrincipal(), roleOf(auth)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> get(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(orderService.get(
                id, (String) auth.getPrincipal(), roleOf(auth)));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(Authentication auth,
                                                @Valid @RequestBody CreateOrderRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.create((String) auth.getPrincipal(), req));
    }

    @PostMapping("/{id}/transitions")
    public ResponseEntity<OrderResponse> transition(@PathVariable String id,
                                                    Authentication auth,
                                                    @Valid @RequestBody TransitionOrderRequest req) {
        return ResponseEntity.ok(orderService.transition(
                id, (String) auth.getPrincipal(), roleOf(auth), req));
    }

    private String roleOf(Authentication auth) {
        return ((JwtUserDetails) auth.getDetails()).getRole();
    }
}
