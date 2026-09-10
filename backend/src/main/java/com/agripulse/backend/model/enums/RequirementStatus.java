package com.agripulse.backend.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Serializes lowercase to match the frontend contract (open/matched/...). */
public enum RequirementStatus {
    OPEN("open"),
    MATCHED("matched"),
    PENDING("pending"),
    FULFILLED("fulfilled"),
    CLOSED("closed"),
    CANCELLED("cancelled");

    private final String value;

    RequirementStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static RequirementStatus from(String value) {
        for (RequirementStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown requirement status: " + value);
    }
}
