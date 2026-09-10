package com.agripulse.backend.repository;

import com.agripulse.backend.model.Produce;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProduceRepository extends JpaRepository<Produce, String> {
    List<Produce> findBySupplierId(String supplierId);
    List<Produce> findByNameIgnoreCase(String name);
}
