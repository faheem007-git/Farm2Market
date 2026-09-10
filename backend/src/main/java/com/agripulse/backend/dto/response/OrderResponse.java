package com.agripulse.backend.dto.response;

import com.agripulse.backend.model.OrderEvent;
import com.agripulse.backend.model.PurchaseOrder;
import com.agripulse.backend.model.enums.OrderStatus;
import com.agripulse.backend.model.enums.ProduceGrade;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** Exact frontend Order contract shape (timeline assembled from OrderEvents). */
public class OrderResponse {
    private String id;
    private String matchId;
    private String buyerId;
    private String buyerCompany;
    private String supplierId;
    private String supplierName;
    private String produceName;
    private ProduceGrade grade;
    private BigDecimal quantityKg;
    private BigDecimal pricePerKg;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private String deliveryLocation;
    private LocalDate expectedDelivery;
    private Instant createdAt;
    private List<TimelineEntry> timeline;

    public record TimelineEntry(OrderStatus status, String at, String note) {
        static TimelineEntry from(OrderEvent e) {
            String at = e.getAt().atZone(ZoneId.systemDefault())
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
            return new TimelineEntry(e.getStatus(), at, e.getNote());
        }
    }

    public static OrderResponse from(PurchaseOrder o, List<OrderEvent> events) {
        OrderResponse r = new OrderResponse();
        r.id = o.getId();
        r.matchId = o.getMatchId();
        r.buyerId = o.getBuyerId();
        r.buyerCompany = o.getBuyerCompany();
        r.supplierId = o.getSupplierId();
        r.supplierName = o.getSupplierName();
        r.produceName = o.getProduceName();
        r.grade = o.getGrade();
        r.quantityKg = o.getQuantityKg();
        r.pricePerKg = o.getPricePerKg();
        r.totalAmount = o.getTotalAmount();
        r.status = o.getStatus();
        r.deliveryLocation = o.getDeliveryLocation();
        r.expectedDelivery = o.getExpectedDelivery();
        r.createdAt = o.getCreatedAt();
        r.timeline = events.stream().map(TimelineEntry::from).toList();
        return r;
    }

    public String getId() { return id; }
    public String getMatchId() { return matchId; }
    public String getBuyerId() { return buyerId; }
    public String getBuyerCompany() { return buyerCompany; }
    public String getSupplierId() { return supplierId; }
    public String getSupplierName() { return supplierName; }
    public String getProduceName() { return produceName; }
    public ProduceGrade getGrade() { return grade; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public BigDecimal getPricePerKg() { return pricePerKg; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public OrderStatus getStatus() { return status; }
    public String getDeliveryLocation() { return deliveryLocation; }
    public LocalDate getExpectedDelivery() { return expectedDelivery; }
    public Instant getCreatedAt() { return createdAt; }
    public List<TimelineEntry> getTimeline() { return timeline; }
}
