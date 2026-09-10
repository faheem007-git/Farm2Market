package com.agripulse.backend.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Serializes lowercase to match the frontend contract (buyer/supplier/admin). */
public enum Role {
    BUYER("buyer"),
    SUPPLIER("supplier"),
    ADMIN("admin");

    private final String value;

    Role(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static Role from(String value) {
        for (Role r : values()) {
            if (r.value.equalsIgnoreCase(value)) {
                return r;
            }
        }
        throw new IllegalArgumentException("Unknown role: " + value);
    }
}
