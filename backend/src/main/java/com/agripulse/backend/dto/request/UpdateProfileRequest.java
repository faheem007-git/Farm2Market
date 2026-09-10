package com.agripulse.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * PATCH semantics: every field is optional, null means "no change".
 * verified/rating are accepted but only applied for ADMIN callers.
 */
public class UpdateProfileRequest {

    @Size(max = 100, message = "name must be at most 100 characters")
    private String name;

    @Size(max = 150, message = "company must be at most 150 characters")
    private String company;

    @Size(max = 100, message = "location must be at most 100 characters")
    private String location;

    @Size(max = 20, message = "phone must be at most 20 characters")
    private String phone;

    @Size(max = 500, message = "avatarUrl must be at most 500 characters")
    private String avatarUrl;

    @PositiveOrZero(message = "demandVolumeKgPerMonth must be zero or positive")
    private Integer demandVolumeKgPerMonth;

    @PositiveOrZero(message = "farmSizeAcres must be zero or positive")
    private Integer farmSizeAcres;

    @Size(max = 100, message = "village must be at most 100 characters")
    private String village;

    private Boolean verified;

    @DecimalMin(value = "0.0", message = "rating must be between 0 and 5")
    @DecimalMax(value = "5.0", message = "rating must be between 0 and 5")
    private Double rating;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public Integer getDemandVolumeKgPerMonth() { return demandVolumeKgPerMonth; }
    public void setDemandVolumeKgPerMonth(Integer v) { this.demandVolumeKgPerMonth = v; }
    public Integer getFarmSizeAcres() { return farmSizeAcres; }
    public void setFarmSizeAcres(Integer v) { this.farmSizeAcres = v; }
    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }
    public Boolean getVerified() { return verified; }
    public void setVerified(Boolean verified) { this.verified = verified; }
    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
}
