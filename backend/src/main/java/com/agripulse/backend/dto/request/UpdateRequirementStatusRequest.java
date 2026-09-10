package com.agripulse.backend.dto.request;

import com.agripulse.backend.model.enums.RequirementStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateRequirementStatusRequest {

    @NotNull(message = "status is required")
    private RequirementStatus status;

    public RequirementStatus getStatus() { return status; }
    public void setStatus(RequirementStatus status) { this.status = status; }
}
