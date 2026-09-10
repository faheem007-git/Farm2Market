package com.agripulse.backend.repository;

import com.agripulse.backend.model.OrderEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderEventRepository extends JpaRepository<OrderEvent, Long> {
    List<OrderEvent> findByOrderIdOrderByAtAsc(String orderId);
}
