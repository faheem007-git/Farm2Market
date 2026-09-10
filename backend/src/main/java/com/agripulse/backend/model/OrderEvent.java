package com.agripulse.backend.model;

import com.agripulse.backend.model.enums.OrderStatus;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "order_events", indexes = {
    @Index(columnList = "orderId")
})
public class OrderEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    private String note;

    @Column(nullable = false)
    private Instant at = Instant.now();

    public OrderEvent() {}

    public OrderEvent(String orderId, OrderStatus status, String note) {
        this.orderId = orderId;
        this.status = status;
        this.note = note;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getAt() { return at; }
    public void setAt(Instant at) { this.at = at; }
}
