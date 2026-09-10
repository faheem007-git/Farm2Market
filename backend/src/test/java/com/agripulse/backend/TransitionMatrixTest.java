package com.agripulse.backend;

import com.agripulse.backend.model.enums.OrderStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exhaustive unit tests for the transition graph (no Spring context).
 * Mirrors ORDER_TRANSITIONS in the frontend one edge at a time.
 */
class TransitionMatrixTest {

    @ParameterizedTest(name = "{0} -> {1} allowed")
    @CsvSource({
        "PLACED, CONFIRMED",
        "PLACED, CANCELLED",
        "CONFIRMED, PACKED",
        "CONFIRMED, CANCELLED",
        "PACKED, SHIPPED",
        "PACKED, CANCELLED",
        "SHIPPED, IN_TRANSIT",
        "SHIPPED, DELIVERED",
        "SHIPPED, CANCELLED",
        "IN_TRANSIT, DELIVERED",
        "IN_TRANSIT, CANCELLED",
    })
    void everyValidEdgeIsAllowed(OrderStatus from, OrderStatus to) {
        assertThat(from.canTransitionTo(to)).isTrue();
        assertThat(from.allowedTransitions()).contains(to);
    }

    @ParameterizedTest(name = "{0} -> {1} rejected")
    @CsvSource({
        "PLACED, PACKED",
        "PLACED, SHIPPED",
        "PLACED, IN_TRANSIT",
        "PLACED, DELIVERED",
        "CONFIRMED, CONFIRMED",
        "CONFIRMED, SHIPPED",
        "CONFIRMED, DELIVERED",
        "CONFIRMED, PLACED",
        "PACKED, PACKED",
        "PACKED, DELIVERED",
        "PACKED, CONFIRMED",
        "PACKED, IN_TRANSIT",
        "SHIPPED, SHIPPED",
        "SHIPPED, PACKED",
        "SHIPPED, CONFIRMED",
        "SHIPPED, PLACED",
        "IN_TRANSIT, IN_TRANSIT",
        "IN_TRANSIT, PLACED",
        "IN_TRANSIT, CONFIRMED",
        "IN_TRANSIT, PACKED",
        "IN_TRANSIT, SHIPPED",
        "DELIVERED, PLACED",
        "DELIVERED, CONFIRMED",
        "DELIVERED, PACKED",
        "DELIVERED, SHIPPED",
        "DELIVERED, IN_TRANSIT",
        "DELIVERED, DELIVERED",
        "DELIVERED, CANCELLED",
        "CANCELLED, PLACED",
        "CANCELLED, CONFIRMED",
        "CANCELLED, CANCELLED",
    })
    void everyInvalidEdgeIsRejected(OrderStatus from, OrderStatus to) {
        assertThat(from.canTransitionTo(to)).isFalse();
    }

    @Test
    void terminalStatesHaveNoOutgoingEdges() {
        assertThat(OrderStatus.DELIVERED.allowedTransitions()).isEmpty();
        assertThat(OrderStatus.CANCELLED.allowedTransitions()).isEmpty();
    }

    @Test
    void lowercaseWireValuesRoundTrip() {
        assertThat(OrderStatus.from("in_transit")).isEqualTo(OrderStatus.IN_TRANSIT);
        assertThat(OrderStatus.PLACED.getValue()).isEqualTo("placed");
    }
}
