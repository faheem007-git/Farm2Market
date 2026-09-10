package com.agripulse.backend.repository;

import com.agripulse.backend.model.SupplierResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SupplierResponseRepository extends JpaRepository<SupplierResponse, Long> {
    List<SupplierResponse> findByRequirementId(String requirementId);
    List<SupplierResponse> findBySupplierId(String supplierId);
    Optional<SupplierResponse> findByRequirementIdAndSupplierId(String requirementId, String supplierId);
    boolean existsByRequirementIdAndSupplierId(String requirementId, String supplierId);
}
