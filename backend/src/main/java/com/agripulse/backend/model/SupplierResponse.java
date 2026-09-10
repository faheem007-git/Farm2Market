package com.agripulse.backend.model;

import com.agripulse.backend.model.enums.SupplierResponseStatus;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "supplier_responses", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"requirementId", "supplierId"})
}, indexes = {
    @Index(columnList = "supplierId")
})
public class SupplierResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String requirementId;

    @Column(nullable = false)
    private String supplierId;

    @Column(nullable = false)
    private String supplierName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SupplierResponseStatus status = SupplierResponseStatus.RESPONDED;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public SupplierResponse() {}

    public SupplierResponse(String requirementId, String supplierId, String supplierName,
                            SupplierResponseStatus status) {
        this.requirementId = requirementId;
        this.supplierId = supplierId;
        this.supplierName = supplierName;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRequirementId() { return requirementId; }
    public void setRequirementId(String requirementId) { this.requirementId = requirementId; }
    public String getSupplierId() { return supplierId; }
    public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }
    public SupplierResponseStatus getStatus() { return status; }
    public void setStatus(SupplierResponseStatus status) { this.status = status; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
