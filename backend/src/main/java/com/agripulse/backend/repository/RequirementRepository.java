package com.agripulse.backend.repository;

import com.agripulse.backend.model.Requirement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RequirementRepository extends JpaRepository<Requirement, String> {
    List<Requirement> findByBuyerId(String buyerId);
    List<Requirement> findByProduceNameIgnoreCase(String produceName);
}
