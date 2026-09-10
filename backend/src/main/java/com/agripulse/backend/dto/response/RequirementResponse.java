package com.agripulse.backend.dto.response;

import com.agripulse.backend.model.Requirement;
import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.model.enums.RequirementStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Exact frontend Requirement contract shape (enums serialize lowercase). */
public class RequirementResponse {
    private String id;
    private String buyerId;
    private String buyerCompany;
    private String produceName;
    private String category;
    private ProduceGrade grade;
    private BigDecimal quantityKg;
    private String unit;
    private BigDecimal priceMinPerKg;
    private BigDecimal priceMaxPerKg;
    private String deliveryLocation;
    private LocalDate deliveryDeadline;
    private String description;
    private RequirementStatus status;
    private Instant createdAt;

    public static RequirementResponse from(Requirement r) {
        RequirementResponse resp = new RequirementResponse();
        resp.id = r.getId();
        resp.buyerId = r.getBuyerId();
        resp.buyerCompany = r.getBuyerCompany();
        resp.produceName = r.getProduceName();
        resp.category = r.getCategory();
        resp.grade = r.getGrade();
        resp.quantityKg = r.getQuantityKg();
        resp.unit = r.getUnit();
        resp.priceMinPerKg = r.getPriceMinPerKg();
        resp.priceMaxPerKg = r.getPriceMaxPerKg();
        resp.deliveryLocation = r.getDeliveryLocation();
        resp.deliveryDeadline = r.getDeliveryDeadline();
        resp.description = r.getDescription();
        resp.status = r.getStatus();
        resp.createdAt = r.getCreatedAt();
        return resp;
    }

    public String getId() { return id; }
    public String getBuyerId() { return buyerId; }
    public String getBuyerCompany() { return buyerCompany; }
    public String getProduceName() { return produceName; }
    public String getCategory() { return category; }
    public ProduceGrade getGrade() { return grade; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public String getUnit() { return unit; }
    public BigDecimal getPriceMinPerKg() { return priceMinPerKg; }
    public BigDecimal getPriceMaxPerKg() { return priceMaxPerKg; }
    public String getDeliveryLocation() { return deliveryLocation; }
    public LocalDate getDeliveryDeadline() { return deliveryDeadline; }
    public String getDescription() { return description; }
    public RequirementStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
