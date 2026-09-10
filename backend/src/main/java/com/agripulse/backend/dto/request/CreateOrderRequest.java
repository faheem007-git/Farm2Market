package com.agripulse.backend.dto.request;

import com.agripulse.backend.model.enums.ProduceGrade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateOrderRequest {

    @Size(max = 100)
    private String matchId;

    @NotBlank(message = "supplierId is required")
    private String supplierId;

    @NotBlank(message = "produceName is required")
    @Size(max = 100)
    private String produceName;

    @NotNull(message = "grade is required")
    private ProduceGrade grade;

    @NotNull(message = "quantityKg is required")
    @Positive(message = "quantityKg must be positive")
    private BigDecimal quantityKg;

    @NotNull(message = "pricePerKg is required")
    @Positive(message = "pricePerKg must be positive")
    private BigDecimal pricePerKg;

    @NotBlank(message = "deliveryLocation is required")
    @Size(max = 100)
    private String deliveryLocation;

    @NotNull(message = "expectedDelivery is required")
    private LocalDate expectedDelivery;

    public String getMatchId() { return matchId; }
    public void setMatchId(String matchId) { this.matchId = matchId; }
    public String getSupplierId() { return supplierId; }
    public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
    public String getProduceName() { return produceName; }
    public void setProduceName(String produceName) { this.produceName = produceName; }
    public ProduceGrade getGrade() { return grade; }
    public void setGrade(ProduceGrade grade) { this.grade = grade; }
    public BigDecimal getQuantityKg() { return quantityKg; }
    public void setQuantityKg(BigDecimal quantityKg) { this.quantityKg = quantityKg; }
    public BigDecimal getPricePerKg() { return pricePerKg; }
    public void setPricePerKg(BigDecimal pricePerKg) { this.pricePerKg = pricePerKg; }
    public String getDeliveryLocation() { return deliveryLocation; }
    public void setDeliveryLocation(String deliveryLocation) { this.deliveryLocation = deliveryLocation; }
    public LocalDate getExpectedDelivery() { return expectedDelivery; }
    public void setExpectedDelivery(LocalDate expectedDelivery) { this.expectedDelivery = expectedDelivery; }
}
