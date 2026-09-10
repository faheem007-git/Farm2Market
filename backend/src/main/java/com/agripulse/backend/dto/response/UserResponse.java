package com.agripulse.backend.dto.response;

import com.agripulse.backend.model.User;
import com.agripulse.backend.model.enums.Role;

public class UserResponse {
    private String id;
    private String email;
    private String name;
    private Role role;
    private String company;
    private String location;
    private String phone;
    private String avatarUrl;
    private Integer farmSizeAcres;
    private String village;
    private boolean verified;
    private double rating;
    private Integer demandVolumeKgPerMonth;

    public static UserResponse from(User user) {
        UserResponse r = new UserResponse();
        r.id = user.getId();
        r.email = user.getEmail();
        r.name = user.getName();
        r.role = user.getRole();
        r.company = user.getCompany();
        r.location = user.getLocation();
        r.phone = user.getPhone();
        r.avatarUrl = user.getAvatarUrl();
        r.farmSizeAcres = user.getFarmSizeAcres();
        r.village = user.getVillage();
        r.verified = user.isVerified();
        r.rating = user.getRating();
        r.demandVolumeKgPerMonth = user.getDemandVolumeKgPerMonth();
        return r;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public Role getRole() { return role; }
    public String getCompany() { return company; }
    public String getLocation() { return location; }
    public String getPhone() { return phone; }
    public String getAvatarUrl() { return avatarUrl; }
    public Integer getFarmSizeAcres() { return farmSizeAcres; }
    public String getVillage() { return village; }
    public boolean isVerified() { return verified; }
    public double getRating() { return rating; }
    public Integer getDemandVolumeKgPerMonth() { return demandVolumeKgPerMonth; }
}
