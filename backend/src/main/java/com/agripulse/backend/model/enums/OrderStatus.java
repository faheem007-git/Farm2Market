package com.agripulse.backend.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Map;
import java.util.Set;

/** Serializes lowercase to match the frontend contract (placed/.../in_transit/...). */
public enum OrderStatus {
    PLACED("placed"),
    CONFIRMED("confirmed"),
    PACKED("packed"),
    SHIPPED("shipped"),
    IN_TRANSIT("in_transit"),
    DELIVERED("delivered"),
    CANCELLED("cancelled");

    private final String value;

    OrderStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static OrderStatus from(String value) {
        for (OrderStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown order status: " + value);
    }

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
        PLACED,    Set.of(CONFIRMED, CANCELLED),
        CONFIRMED, Set.of(PACKED, CANCELLED),
        PACKED,    Set.of(SHIPPED, CANCELLED),
        SHIPPED,   Set.of(IN_TRANSIT, DELIVERED, CANCELLED),
        IN_TRANSIT,Set.of(DELIVERED, CANCELLED),
        DELIVERED, Set.of(),
        CANCELLED, Set.of()
    );

    public Set<OrderStatus> allowedTransitions() {
        return TRANSITIONS.getOrDefault(this, Set.of());
    }

    public boolean canTransitionTo(OrderStatus next) {
        return allowedTransitions().contains(next);
    }
}
