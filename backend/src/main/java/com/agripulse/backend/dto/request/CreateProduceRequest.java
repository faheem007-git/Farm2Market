package com.agripulse.backend.dto.request;

import com.agripulse.backend.model.enums.ProduceGrade;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateProduceRequest {

    @NotBlank(message = "name is required")
    @Size(max = 100)
    private String name;

    @Size(max = 100)
    private String variety;

    @Size(max = 100)
    private String category;

    @NotNull(message = "grade is required")
    private ProduceGrade grade;

    @NotNull(message = "quantityKg is required")
    @Positive(message = "quantityKg must be positive")
    private BigDecimal quantityKg;

    @Size(max = 20)
    private String unit;

    @NotNull(message = "pricePerKg is required")
    @Positive(message = "pricePerKg must be positive")
    private BigDecimal pricePerKg;

    @PositiveOrZero
    private BigDecimal priceRangeMin;

    @PositiveOrZero
    private BigDecimal priceRangeMax;

    @NotBlank(message = "location is required")
    @Size(max = 100)
    private String location;

    @NotNull(message = "harvestDate is required")
    private LocalDate harvestDate;

    private LocalDate availableFrom;

    @NotNull(message = "availableUntil is required")
    private LocalDate availableUntil;

    @Size(max = 2000)
    private String description;

    @Size(max = 20)
    private String imageEmoji;

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
    public String getImageEmoji() { return imageEmoji; }
    public void setImageEmoji(String imageEmoji) { this.imageEmoji = imageEmoji; }
}
