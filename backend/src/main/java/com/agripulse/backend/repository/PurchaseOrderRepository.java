package com.agripulse.backend.repository;

import com.agripulse.backend.model.PurchaseOrder;
import com.agripulse.backend.model.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, String> {
    List<PurchaseOrder> findByBuyerId(String buyerId);
    List<PurchaseOrder> findBySupplierId(String supplierId);
    List<PurchaseOrder> findByStatus(OrderStatus status);
    List<PurchaseOrder> findByBuyerIdAndStatus(String buyerId, OrderStatus status);
    List<PurchaseOrder> findBySupplierIdAndStatus(String supplierId, OrderStatus status);
}
