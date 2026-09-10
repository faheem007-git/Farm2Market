package com.agripulse.backend.dto.response;

import com.agripulse.backend.model.Produce;
import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.model.enums.ProduceStatus;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Exact frontend Produce contract shape (enums serialize lowercase). */
public class ProduceResponse {
    private String id;
    private String name;
    private String variety;
    private String category;
    private ProduceGrade grade;
    private BigDecimal quantityKg;
    private String unit;
    private BigDecimal pricePerKg;
    private BigDecimal priceRangeMin;
    private BigDecimal priceRangeMax;
    private String supplierId;
    private String supplierName;
    private String location;
    private LocalDate harvestDate;
    private LocalDate availableFrom;
    private LocalDate availableUntil;
    private String description;
    private ProduceStatus status;
    private String imageEmoji;

    public static ProduceResponse from(Produce p) {
        ProduceResponse r = new ProduceResponse();
        r.id = p.getId();
        r.name = p.getName();
        r.variety = p.getVariety();
        r.category = p.getCategory();
        r.grade = p.getGrade();
        r.quantityKg = p.getQuantityKg();
        r.unit = p.getUnit();
        r.pricePerKg = p.getPricePerKg();
        r.priceRangeMin = p.getPriceRangeMin();
        r.priceRangeMax = p.getPriceRangeMax();
        r.supplierId = p.getSupplierId();
        r.supplierName = p.getSupplierName();
        r.location = p.getLocation();
        r.harvestDate = p.getHarvestDate();
        r.availableFrom = p.getAvailableFrom();
        r.availableUntil = p.getAvailableUntil();
        r.description = p.getDescription();
        r.status = p.getStatus();
        r.imageEmoji = p.getImageEmoji();
        return r;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getVariety() { return variety; }
    public String getCategory() { return category; }
    public ProduceGrade getGrade() { return grade; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public String getUnit() { return unit; }
    public BigDecimal getPricePerKg() { return pricePerKg; }
    public BigDecimal getPriceRangeMin() { return priceRangeMin; }
    public BigDecimal getPriceRangeMax() { return priceRangeMax; }
    public String getSupplierId() { return supplierId; }
    public String getSupplierName() { return supplierName; }
    public String getLocation() { return location; }
    public LocalDate getHarvestDate() { return harvestDate; }
    public LocalDate getAvailableFrom() { return availableFrom; }
    public LocalDate getAvailableUntil() { return availableUntil; }
    public String getDescription() { return description; }
    public ProduceStatus getStatus() { return status; }
    public String getImageEmoji() { return imageEmoji; }
}
