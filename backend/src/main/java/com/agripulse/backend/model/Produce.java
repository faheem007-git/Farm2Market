package com.agripulse.backend.model;

import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.model.enums.ProduceStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "produce", indexes = {
    @Index(columnList = "supplierId")
})
public class Produce {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    private String variety;
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProduceGrade grade;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal quantityKg;

    private String unit;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal pricePerKg;

    @Column(precision = 19, scale = 2)
    private BigDecimal priceRangeMin;
    @Column(precision = 19, scale = 2)
    private BigDecimal priceRangeMax;

    @Column(nullable = false)
    private String supplierId;

    @Column(nullable = false)
    private String supplierName;

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private LocalDate harvestDate;

    private LocalDate availableFrom;

    @Column(nullable = false)
    private LocalDate availableUntil;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProduceStatus status = ProduceStatus.ACTIVE;

    @Column(nullable = false)
    private String imageEmoji;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public Produce() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getVariety() { return variety; }
    public void setVariety(String variety) { this.variety = variety; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public ProduceGrade getGrade() { return grade; }
    public void setGrade(ProduceGrade grade) { this.grade = grade; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public void setQuantityKg(BigDecimal quantityKg) { this.quantityKg = quantityKg; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getPricePerKg() { return pricePerKg; }
    public void setPricePerKg(BigDecimal pricePerKg) { this.pricePerKg = pricePerKg; }
    public BigDecimal getPriceRangeMin() { return priceRangeMin; }
    public void setPriceRangeMin(BigDecimal priceRangeMin) { this.priceRangeMin = priceRangeMin; }
    public BigDecimal getPriceRangeMax() { return priceRangeMax; }
    public void setPriceRangeMax(BigDecimal priceRangeMax) { this.priceRangeMax = priceRangeMax; }
    public String getSupplierId() { return supplierId; }
    public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public LocalDate getHarvestDate() { return harvestDate; }
    public void setHarvestDate(LocalDate harvestDate) { this.harvestDate = harvestDate; }
    public LocalDate getAvailableFrom() { return availableFrom; }
    public void setAvailableFrom(LocalDate availableFrom) { this.availableFrom = availableFrom; }
    public LocalDate getAvailableUntil() { return availableUntil; }
    public void setAvailableUntil(LocalDate availableUntil) { this.availableUntil = availableUntil; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ProduceStatus getStatus() { return status; }
    public void setStatus(ProduceStatus status) { this.status = status; }
    public String getImageEmoji() { return imageEmoji; }
    public void setImageEmoji(String imageEmoji) { this.imageEmoji = imageEmoji; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
