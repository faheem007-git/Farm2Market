package com.agripulse.backend.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Serializes lowercase to match the frontend contract (responded/accepted/rejected). */
public enum SupplierResponseStatus {
    RESPONDED("responded"),
    ACCEPTED("accepted"),
    REJECTED("rejected");

    private final String value;

    SupplierResponseStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static SupplierResponseStatus from(String value) {
        for (SupplierResponseStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown supplier response status: " + value);
    }
}
