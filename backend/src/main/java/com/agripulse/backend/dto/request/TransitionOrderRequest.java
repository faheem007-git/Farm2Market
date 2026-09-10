package com.agripulse.backend.dto.request;

import com.agripulse.backend.model.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class TransitionOrderRequest {

    @NotNull(message = "to is required")
    private OrderStatus to;

    @Size(max = 500, message = "note must be at most 500 characters")
    private String note;

    public OrderStatus getTo() { return to; }
    public void setTo(OrderStatus to) { this.to = to; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
