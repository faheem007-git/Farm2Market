package com.agripulse.backend.model;

import com.agripulse.backend.model.enums.OrderStatus;
import com.agripulse.backend.model.enums.ProduceGrade;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "purchase_orders", indexes = {
    @Index(columnList = "buyerId"),
    @Index(columnList = "supplierId"),
    @Index(columnList = "status")
})
public class PurchaseOrder {

    @Id
    private String id;

    private String matchId;

    @Column(nullable = false)
    private String buyerId;

    @Column(nullable = false)
    private String buyerCompany;

    @Column(nullable = false)
    private String supplierId;

    @Column(nullable = false)
    private String supplierName;

    @Column(nullable = false)
    private String produceName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProduceGrade grade;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal quantityKg;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal pricePerKg;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PLACED;

    @Column(nullable = false)
    private String deliveryLocation;

    @Column(nullable = false)
    private LocalDate expectedDelivery;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public PurchaseOrder() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMatchId() { return matchId; }
    public void setMatchId(String matchId) { this.matchId = matchId; }
    public String getBuyerId() { return buyerId; }
    public void setBuyerId(String buyerId) { this.buyerId = buyerId; }
    public String getBuyerCompany() { return buyerCompany; }
    public void setBuyerCompany(String buyerCompany) { this.buyerCompany = buyerCompany; }
    public String getSupplierId() { return supplierId; }
    public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }
    public String getProduceName() { return produceName; }
    public void setProduceName(String produceName) { this.produceName = produceName; }
    public ProduceGrade getGrade() { return grade; }
    public void setGrade(ProduceGrade grade) { this.grade = grade; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public void setQuantityKg(BigDecimal quantityKg) { this.quantityKg = quantityKg; }
    public BigDecimal getPricePerKg() { return pricePerKg; }
    public void setPricePerKg(BigDecimal pricePerKg) { this.pricePerKg = pricePerKg; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public String getDeliveryLocation() { return deliveryLocation; }
    public void setDeliveryLocation(String deliveryLocation) { this.deliveryLocation = deliveryLocation; }
    public LocalDate getExpectedDelivery() { return expectedDelivery; }
    public void setExpectedDelivery(LocalDate expectedDelivery) { this.expectedDelivery = expectedDelivery; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
