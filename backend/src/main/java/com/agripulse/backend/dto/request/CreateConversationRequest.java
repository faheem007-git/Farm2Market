package com.agripulse.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateConversationRequest {

    /** Required when the caller is a supplier or admin; ignored for buyer callers. */
    @Size(max = 50)
    private String buyerId;

    /** Required when the caller is a buyer or admin; ignored for supplier callers. */
    @Size(max = 50)
    private String supplierId;

    @NotBlank(message = "subject is required")
    @Size(max = 200, message = "subject must be at most 200 characters")
    private String subject;

    public String getBuyerId() { return buyerId; }
    public void setBuyerId(String buyerId) { this.buyerId = buyerId; }
    public String getSupplierId() { return supplierId; }
    public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
}
