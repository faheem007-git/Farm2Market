package com.agripulse.backend.repository;

import com.agripulse.backend.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, String> {
    List<Conversation> findByBuyerIdOrderByLastAtDesc(String buyerId);
    List<Conversation> findBySupplierIdOrderByLastAtDesc(String supplierId);
    Optional<Conversation> findByBuyerIdAndSupplierId(String buyerId, String supplierId);
}
