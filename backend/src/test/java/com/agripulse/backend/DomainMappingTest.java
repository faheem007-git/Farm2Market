package com.agripulse.backend;

import com.agripulse.backend.model.*;
import com.agripulse.backend.model.enums.*;
import com.agripulse.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:db-mapping;DB_CLOSE_DELAY=-1;MODE=MYSQL")
@Transactional
class DomainMappingTest {

    @Autowired private UserRepository users;
    @Autowired private ProduceRepository produceRepo;
    @Autowired private RequirementRepository requirements;
    @Autowired private PurchaseOrderRepository orders;
    @Autowired private OrderEventRepository events;
    @Autowired private SupplierResponseRepository responses;
    @Autowired private ConversationRepository conversations;
    @Autowired private ChatMessageRepository messages;
    @Autowired private NotificationRepository notifications;

    @Test
    void allEntitiesPersistAndReload() {
        long usersBefore = users.count(); // DataInitializer seeds demo users on boot
        User supplier = new User("u-s-1", "s@demo", "pw", "Ravi FPO",
                Role.SUPPLIER, "Ravi FPO", "Rajahmundry");
        supplier.setVerified(true);
        supplier.setRating(4.5);
        users.save(supplier);

        User buyer = new User("u-b-1", "b@demo", "pw", "Buyer",
                Role.BUYER, "ABC Foods", "Hyderabad");
        buyer.setDemandVolumeKgPerMonth(12000);
        users.save(buyer);

        Produce p = new Produce();
        p.setId("p-1");
        p.setName("Tomatoes");
        p.setGrade(ProduceGrade.A);
        p.setQuantityKg(new BigDecimal("6000.00"));
        p.setPricePerKg(new BigDecimal("27.00"));
        p.setSupplierId("u-s-1");
        p.setSupplierName("Ravi FPO");
        p.setLocation("Rajahmundry");
        p.setHarvestDate(LocalDate.parse("2026-09-10"));
        p.setAvailableUntil(LocalDate.parse("2026-09-20"));
        p.setImageEmoji("🍅");
        produceRepo.save(p);

        Requirement r = new Requirement();
        r.setId("r-1");
        r.setBuyerId("u-b-1");
        r.setBuyerCompany("ABC Foods");
        r.setProduceName("Tomatoes");
        r.setGrade(ProduceGrade.A);
        r.setQuantityKg(new BigDecimal("5000.00"));
        r.setPriceMinPerKg(new BigDecimal("25.00"));
        r.setPriceMaxPerKg(new BigDecimal("30.00"));
        r.setDeliveryLocation("Hyderabad");
        r.setDeliveryDeadline(LocalDate.parse("2026-09-15"));
        requirements.save(r);

        PurchaseOrder o = new PurchaseOrder();
        o.setId("ORD-1046");
        o.setBuyerId("u-b-1");
        o.setBuyerCompany("ABC Foods");
        o.setSupplierId("u-s-1");
        o.setSupplierName("Ravi FPO");
        o.setProduceName("Tomatoes");
        o.setGrade(ProduceGrade.A);
        o.setQuantityKg(new BigDecimal("5000.00"));
        o.setPricePerKg(new BigDecimal("27.00"));
        o.setTotalAmount(new BigDecimal("135000.00"));
        o.setDeliveryLocation("Hyderabad");
        o.setExpectedDelivery(LocalDate.parse("2026-09-18"));
        orders.save(o);

        events.save(new OrderEvent("ORD-1046", OrderStatus.PLACED, "Request placed"));

        SupplierResponse resp = new SupplierResponse("r-1", "u-s-1", "Ravi FPO",
                SupplierResponseStatus.RESPONDED);
        responses.save(resp);

        Conversation c = new Conversation("c-1", "u-b-1", "ABC Foods",
                "u-s-1", "Ravi FPO", "Tomatoes 5000kg");
        conversations.save(c);

        ChatMessage m = new ChatMessage();
        m.setId("m-1");
        m.setConversationId("c-1");
        m.setSenderId("u-b-1");
        m.setSenderName("Buyer");
        m.setText("Namaste, is 5000kg available?");
        messages.save(m);

        Notification n = new Notification();
        n.setId("n-1");
        n.setUserId("*");
        n.setAudienceRole(Role.SUPPLIER);
        n.setTitle("New requirement");
        n.setBody("ABC Foods needs Tomatoes");
        n.setKind(NotificationKind.INFO);
        notifications.save(n);

        assertThat(users.count()).isEqualTo(usersBefore + 2);
        assertThat(produceRepo.findById("p-1")).isPresent();
        assertThat(requirements.findById("r-1").orElseThrow().getStatus())
                .isEqualTo(RequirementStatus.OPEN);
        assertThat(orders.findById("ORD-1046").orElseThrow().getTotalAmount())
                .isEqualByComparingTo("135000.00");
        assertThat(events.findByOrderIdOrderByAtAsc("ORD-1046")).hasSize(1);
        assertThat(responses.findByRequirementIdAndSupplierId("r-1", "u-s-1")).isPresent();
        assertThat(conversations.findById("c-1")).isPresent();
        assertThat(messages.findByConversationIdOrderBySentAtAsc("c-1")).hasSize(1);
        assertThat(notifications.findByUserIdOrAudienceRoleOrderByCreatedAtDesc(
                "u-s-1", Role.SUPPLIER)).hasSize(1);
    }

    @Test
    void orderStatusTransitionGraphMatchesContract() {
        assertThat(OrderStatus.PLACED.allowedTransitions())
                .containsExactlyInAnyOrder(OrderStatus.CONFIRMED, OrderStatus.CANCELLED);
        assertThat(OrderStatus.SHIPPED.allowedTransitions())
                .containsExactlyInAnyOrder(OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED,
                        OrderStatus.CANCELLED);
        assertThat(OrderStatus.DELIVERED.allowedTransitions()).isEmpty();
        assertThat(OrderStatus.CANCELLED.allowedTransitions()).isEmpty();
        assertThat(OrderStatus.PLACED.canTransitionTo(OrderStatus.DELIVERED)).isFalse();
        assertThat(Instant.now()).isNotNull();
    }
}
