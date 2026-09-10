package com.agripulse.backend;

import com.agripulse.backend.model.Notification;
import com.agripulse.backend.model.PurchaseOrder;
import com.agripulse.backend.model.SupplierResponse;
import com.agripulse.backend.model.enums.NotificationKind;
import com.agripulse.backend.model.enums.OrderStatus;
import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.model.enums.SupplierResponseStatus;
import com.agripulse.backend.repository.NotificationRepository;
import com.agripulse.backend.repository.PurchaseOrderRepository;
import com.agripulse.backend.repository.SupplierResponseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:db-repoquery;DB_CLOSE_DELAY=-1;MODE=MYSQL")
@Transactional
class RepositoryQueryTest {

    @Autowired private PurchaseOrderRepository orders;
    @Autowired private NotificationRepository notifications;
    @Autowired private SupplierResponseRepository responses;

    private PurchaseOrder order(String id, String buyerId, String supplierId, OrderStatus status) {
        PurchaseOrder o = new PurchaseOrder();
        o.setId(id);
        o.setBuyerId(buyerId);
        o.setBuyerCompany("ABC Foods");
        o.setSupplierId(supplierId);
        o.setSupplierName("Ravi FPO");
        o.setProduceName("Tomatoes");
        o.setGrade(ProduceGrade.A);
        o.setQuantityKg(new BigDecimal("100.00"));
        o.setPricePerKg(new BigDecimal("27.00"));
        o.setTotalAmount(new BigDecimal("2700.00"));
        o.setStatus(status);
        o.setDeliveryLocation("Hyderabad");
        o.setExpectedDelivery(LocalDate.parse("2026-09-18"));
        return orders.save(o);
    }

    @Test
    void ordersLookUpByBuyerSupplierAndStatus() {
        order("ORD-1", "u-b-1", "u-s-1", OrderStatus.PLACED);
        order("ORD-2", "u-b-1", "u-s-2", OrderStatus.CONFIRMED);
        order("ORD-3", "u-b-9", "u-s-1", OrderStatus.PLACED);

        assertThat(orders.findByBuyerId("u-b-1")).hasSize(2);
        assertThat(orders.findBySupplierId("u-s-1")).hasSize(2);
        assertThat(orders.findByStatus(OrderStatus.PLACED)).hasSize(2);
        assertThat(orders.findByBuyerIdAndStatus("u-b-1", OrderStatus.PLACED)).hasSize(1);
        assertThat(orders.findBySupplierIdAndStatus("u-s-1", OrderStatus.PLACED)).hasSize(2);
        assertThat(orders.findBySupplierIdAndStatus("u-s-1", OrderStatus.DELIVERED)).isEmpty();
    }

    @Test
    void notificationsLookUpByUserRoleAndReadStatus() {
        Notification direct = new Notification();
        direct.setId("n-d1");
        direct.setUserId("u-b-1");
        direct.setTitle("Direct");
        direct.setBody("direct message");
        direct.setKind(NotificationKind.INFO);
        direct.setRead(false);
        notifications.save(direct);

        Notification broadcast = new Notification();
        broadcast.setId("n-b1");
        broadcast.setUserId("*");
        broadcast.setAudienceRole(Role.SUPPLIER);
        broadcast.setTitle("Broadcast");
        broadcast.setBody("broadcast message");
        broadcast.setKind(NotificationKind.SUCCESS);
        broadcast.setRead(false);
        notifications.save(broadcast);

        assertThat(notifications.findByUserIdAndReadFalseOrderByCreatedAtDesc("u-b-1"))
                .extracting(Notification::getId).containsExactly("n-d1");
        assertThat(notifications.findUnreadFor("u-s-9", Role.SUPPLIER))
                .extracting(Notification::getId).containsExactly("n-b1");
        assertThat(notifications.findUnreadFor("u-b-1", Role.BUYER))
                .extracting(Notification::getId).containsExactly("n-d1");
    }

    @Test
    void supplierResponseUniqueKeyEnforced() {
        responses.save(new SupplierResponse("r-1", "u-s-1", "Ravi FPO",
                SupplierResponseStatus.RESPONDED));

        assertThat(responses.existsByRequirementIdAndSupplierId("r-1", "u-s-1")).isTrue();
        assertThat(responses.existsByRequirementIdAndSupplierId("r-1", "u-s-9")).isFalse();
        // Same requirement, different supplier is allowed.
        responses.save(new SupplierResponse("r-1", "u-s-2", "Other FPO",
                SupplierResponseStatus.RESPONDED));
        assertThat(responses.findByRequirementId("r-1")).hasSize(2);
    }
}
