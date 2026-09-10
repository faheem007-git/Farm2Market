package com.agripulse.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SendMessageRequest {

    @NotBlank(message = "text is required")
    @Size(max = 2000, message = "text must be at most 2000 characters")
    private String text;

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}
