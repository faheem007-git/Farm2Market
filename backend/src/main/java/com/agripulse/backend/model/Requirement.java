package com.agripulse.backend.model;

import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.model.enums.RequirementStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "requirements", indexes = {
    @Index(columnList = "buyerId")
})
public class Requirement {

    @Id
    private String id;

    @Column(nullable = false)
    private String buyerId;

    @Column(nullable = false)
    private String buyerCompany;

    @Column(nullable = false)
    private String produceName;

    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProduceGrade grade;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal quantityKg;

    private String unit;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal priceMinPerKg;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal priceMaxPerKg;

    @Column(nullable = false)
    private String deliveryLocation;

    @Column(nullable = false)
    private LocalDate deliveryDeadline;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequirementStatus status = RequirementStatus.OPEN;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public Requirement() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getBuyerId() { return buyerId; }
    public void setBuyerId(String buyerId) { this.buyerId = buyerId; }
    public String getBuyerCompany() { return buyerCompany; }
    public void setBuyerCompany(String buyerCompany) { this.buyerCompany = buyerCompany; }
    public String getProduceName() { return produceName; }
    public void setProduceName(String produceName) { this.produceName = produceName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public ProduceGrade getGrade() { return grade; }
    public void setGrade(ProduceGrade grade) { this.grade = grade; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public void setQuantityKg(BigDecimal quantityKg) { this.quantityKg = quantityKg; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getPriceMinPerKg() { return priceMinPerKg; }
    public void setPriceMinPerKg(BigDecimal priceMinPerKg) { this.priceMinPerKg = priceMinPerKg; }
    public BigDecimal getPriceMaxPerKg() { return priceMaxPerKg; }
    public void setPriceMaxPerKg(BigDecimal priceMaxPerKg) { this.priceMaxPerKg = priceMaxPerKg; }
    public String getDeliveryLocation() { return deliveryLocation; }
    public void setDeliveryLocation(String deliveryLocation) { this.deliveryLocation = deliveryLocation; }
    public LocalDate getDeliveryDeadline() { return deliveryDeadline; }
    public void setDeliveryDeadline(LocalDate deliveryDeadline) { this.deliveryDeadline = deliveryDeadline; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public RequirementStatus getStatus() { return status; }
    public void setStatus(RequirementStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
