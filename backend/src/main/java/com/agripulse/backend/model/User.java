package com.agripulse.backend.model;

import com.agripulse.backend.model.enums.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users", indexes = {
    @Index(columnList = "role")
})
public class User {

    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String company;

    @Column(nullable = false)
    private String location;

    private String phone;
    private String avatarUrl;

    // Supplier-only fields
    private Integer farmSizeAcres;
    private String village;
    private boolean verified;
    private double rating;

    // Buyer-only fields
    private Integer demandVolumeKgPerMonth;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public User() {}

    public User(String id, String email, String password, String name, Role role,
                String company, String location) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.name = name;
        this.role = role;
        this.company = company;
        this.location = location;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    @JsonIgnore
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public Integer getFarmSizeAcres() { return farmSizeAcres; }
    public void setFarmSizeAcres(Integer farmSizeAcres) { this.farmSizeAcres = farmSizeAcres; }
    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }
    public Integer getDemandVolumeKgPerMonth() { return demandVolumeKgPerMonth; }
    public void setDemandVolumeKgPerMonth(Integer demandVolumeKgPerMonth) { this.demandVolumeKgPerMonth = demandVolumeKgPerMonth; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
