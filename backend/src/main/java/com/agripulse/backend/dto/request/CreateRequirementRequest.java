package com.agripulse.backend.dto.request;

import com.agripulse.backend.model.enums.ProduceGrade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateRequirementRequest {

    @NotBlank(message = "produceName is required")
    @Size(max = 100)
    private String produceName;

    @Size(max = 100)
    private String category;

    @NotNull(message = "grade is required")
    private ProduceGrade grade;

    @NotNull(message = "quantityKg is required")
    @Positive(message = "quantityKg must be positive")
    private BigDecimal quantityKg;

    @Size(max = 20)
    private String unit;

    @NotNull(message = "priceMinPerKg is required")
    @Positive(message = "priceMinPerKg must be positive")
    private BigDecimal priceMinPerKg;

    @NotNull(message = "priceMaxPerKg is required")
    @Positive(message = "priceMaxPerKg must be positive")
    private BigDecimal priceMaxPerKg;

    @NotBlank(message = "deliveryLocation is required")
    @Size(max = 100)
    private String deliveryLocation;

    @NotNull(message = "deliveryDeadline is required")
    private LocalDate deliveryDeadline;

    @Size(max = 2000)
    private String description;

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
}
