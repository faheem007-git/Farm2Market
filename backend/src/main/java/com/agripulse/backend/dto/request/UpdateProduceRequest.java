package com.agripulse.backend.dto.request;

import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.model.enums.ProduceStatus;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** PATCH semantics: every field optional, null means "no change". */
public class UpdateProduceRequest {

    @Size(max = 100)
    private String name;

    @Size(max = 100)
    private String variety;

    @Size(max = 100)
    private String category;

    private ProduceGrade grade;

    @Positive(message = "quantityKg must be positive")
    private BigDecimal quantityKg;

    @Size(max = 20)
    private String unit;

    @Positive(message = "pricePerKg must be positive")
    private BigDecimal pricePerKg;

    @PositiveOrZero
    private BigDecimal priceRangeMin;

    @PositiveOrZero
    private BigDecimal priceRangeMax;

    @Size(max = 100)
    private String location;

    private LocalDate harvestDate;

    private LocalDate availableFrom;

    private LocalDate availableUntil;

    @Size(max = 2000)
    private String description;

    private ProduceStatus status;

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
    public ProduceStatus getStatus() { return status; }
    public void setStatus(ProduceStatus status) { this.status = status; }
    public String getImageEmoji() { return imageEmoji; }
    public void setImageEmoji(String imageEmoji) { this.imageEmoji = imageEmoji; }
}
