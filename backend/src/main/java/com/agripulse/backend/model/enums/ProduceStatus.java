package com.agripulse.backend.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Serializes lowercase to match the frontend contract (active/sold_out). */
public enum ProduceStatus {
    ACTIVE("active"),
    SOLD_OUT("sold_out");

    private final String value;

    ProduceStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ProduceStatus from(String value) {
        for (ProduceStatus s : values()) {
            if (s.value.equalsIgnoreCase(value)) {
                return s;
            }
        }
        throw new IllegalArgumentException("Unknown produce status: " + value);
    }
}
