package com.agripulse.backend.dto.request;

import com.agripulse.backend.model.enums.SupplierResponseStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UpsertSupplierResponseRequest {

    @NotBlank(message = "requirementId is required")
    @Size(max = 50)
    private String requirementId;

    /** Admin may respond on behalf of a supplier; suppliers always use their own id. */
    @Size(max = 50)
    private String supplierId;

    @NotNull(message = "status is required")
    private SupplierResponseStatus status;

    public String getRequirementId() { return requirementId; }
    public void setRequirementId(String requirementId) { this.requirementId = requirementId; }
    public String getSupplierId() { return supplierId; }
    public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
    public SupplierResponseStatus getStatus() { return status; }
    public void setStatus(SupplierResponseStatus status) { this.status = status; }
}
