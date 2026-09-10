package com.agripulse.backend.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Serializes lowercase to match the frontend contract (info/success/warning/error). */
public enum NotificationKind {
    INFO("info"),
    SUCCESS("success"),
    WARNING("warning"),
    ERROR("error");

    private final String value;

    NotificationKind(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static NotificationKind from(String value) {
        for (NotificationKind k : values()) {
            if (k.value.equalsIgnoreCase(value)) {
                return k;
            }
        }
        throw new IllegalArgumentException("Unknown notification kind: " + value);
    }
}
