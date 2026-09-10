package com.agripulse.backend.dto.response;

import com.agripulse.backend.model.SupplierResponse;
import com.agripulse.backend.model.enums.SupplierResponseStatus;
import java.time.Instant;

/** Exact frontend SupplierResponse shape. */
public record SupplierResponseResponse(
        String requirementId,
        String supplierId,
        String supplierName,
        SupplierResponseStatus status,
        Instant updatedAt) {

    public static SupplierResponseResponse from(SupplierResponse r) {
        return new SupplierResponseResponse(r.getRequirementId(), r.getSupplierId(),
                r.getSupplierName(), r.getStatus(), r.getUpdatedAt());
    }
}
