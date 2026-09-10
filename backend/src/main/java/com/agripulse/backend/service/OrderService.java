package com.agripulse.backend.service;

import com.agripulse.backend.dto.request.CreateOrderRequest;
import com.agripulse.backend.dto.request.TransitionOrderRequest;
import com.agripulse.backend.dto.response.OrderResponse;
import com.agripulse.backend.model.OrderEvent;
import com.agripulse.backend.model.PurchaseOrder;
import com.agripulse.backend.model.User;
import com.agripulse.backend.model.enums.NotificationKind;
import com.agripulse.backend.model.enums.OrderStatus;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.repository.OrderEventRepository;
import com.agripulse.backend.repository.PurchaseOrderRepository;
import com.agripulse.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private final PurchaseOrderRepository orderRepository;
    private final OrderEventRepository eventRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public OrderService(PurchaseOrderRepository orderRepository,
                        OrderEventRepository eventRepository,
                        UserRepository userRepository,
                        NotificationService notificationService) {
        this.orderRepository = orderRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    /** Buyer sees own orders, supplier sees own, admin sees all. */
    public List<OrderResponse> list(String callerId, String callerRole) {
        List<PurchaseOrder> orders = switch (callerRole) {
            case "ADMIN" -> orderRepository.findAll();
            case "SUPPLIER" -> orderRepository.findBySupplierId(callerId);
            default -> orderRepository.findByBuyerId(callerId);
        };
        return orders.stream().map(this::withTimeline).toList();
    }

    public OrderResponse get(String id, String callerId, String callerRole) {
        PurchaseOrder o = findOrThrow(id);
        if (!callerRole.equals("ADMIN")
                && !o.getBuyerId().equals(callerId)
                && !o.getSupplierId().equals(callerId)) {
            throw new ForbiddenException("Only the order parties can view this order");
        }
        return withTimeline(o);
    }

    @Transactional
    public OrderResponse create(String buyerId, CreateOrderRequest req) {
        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + buyerId));
        User supplier = userRepository.findById(req.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Supplier not found: " + req.getSupplierId()));

        PurchaseOrder o = new PurchaseOrder();
        o.setId("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        o.setMatchId(req.getMatchId());
        o.setBuyerId(buyer.getId());
        o.setBuyerCompany(buyer.getCompany());
        o.setSupplierId(supplier.getId());
        o.setSupplierName(supplier.getCompany());
        o.setProduceName(req.getProduceName().trim());
        o.setGrade(req.getGrade());
        o.setQuantityKg(req.getQuantityKg());
        o.setPricePerKg(req.getPricePerKg());
        // Server-side total. Any client-supplied total is not accepted by the DTO.
        o.setTotalAmount(req.getQuantityKg().multiply(req.getPricePerKg()));
        o.setStatus(OrderStatus.PLACED);
        o.setDeliveryLocation(req.getDeliveryLocation());
        o.setExpectedDelivery(req.getExpectedDelivery());
        orderRepository.save(o);

        eventRepository.save(new OrderEvent(o.getId(), OrderStatus.PLACED,
                "Request placed by " + buyer.getCompany()));
        notificationService.notifyRole(
                Role.SUPPLIER,
                "New order request",
                buyer.getCompany() + " requested "
                        + NotificationService.qty(o.getQuantityKg()) + " kg "
                        + o.getProduceName() + " (" + o.getId() + ")",
                NotificationKind.INFO,
                "/supplier/orders");
        return withTimeline(o);
    }

    /**
     * Applies a state-machine transition. Rules (ported from the frontend):
     * - same status: success, no-op, no new timeline entry;
     * - otherwise the edge must exist in the transition graph, else rejected;
     * - supplier (own orders): any valid edge, including cancel;
     * - buyer (own orders): only placed -> cancelled ("Cancel request");
     * - admin: any valid edge;
     * - non-parties: forbidden.
     * Every applied transition appends an OrderEvent; order.status is authoritative.
     */
    @Transactional
    public OrderResponse transition(String id, String callerId, String callerRole,
                                    TransitionOrderRequest req) {
        PurchaseOrder o = findOrThrow(id);
        boolean admin = callerRole.equals("ADMIN");
        boolean isBuyer = o.getBuyerId().equals(callerId);
        boolean isSupplier = o.getSupplierId().equals(callerId);
        if (!admin && !isBuyer && !isSupplier) {
            throw new ForbiddenException("Only the order parties can modify this order");
        }

        OrderStatus from = o.getStatus();
        OrderStatus to = req.getTo();
        if (from == to) {
            return withTimeline(o);
        }
        if (!from.canTransitionTo(to)) {
            throw new IllegalArgumentException(
                    "Invalid transition from " + from.getValue() + " to " + to.getValue());
        }
        if (!admin) {
            if (isSupplier) {
                // Suppliers drive fulfillment and may cancel at any open stage.
            } else {
                // Buyer: only withdrawal of a fresh request.
                if (!(from == OrderStatus.PLACED && to == OrderStatus.CANCELLED)) {
                    throw new ForbiddenException(
                            "Buyers may only cancel a placed request");
                }
            }
        }

        o.setStatus(to);
        orderRepository.save(o);
        eventRepository.save(new OrderEvent(o.getId(), to, req.getNote()));
        notificationService.notifyUser(
                o.getBuyerId(),
                "Order " + to.getValue().replace('_', ' '),
                o.getId() + " \u00B7 " + NotificationService.qty(o.getQuantityKg())
                        + " kg " + o.getProduceName() + " from " + o.getSupplierName(),
                to == OrderStatus.CANCELLED ? NotificationKind.WARNING : NotificationKind.SUCCESS,
                "/buyer/orders/" + o.getId());
        return withTimeline(o);
    }

    private PurchaseOrder findOrThrow(String id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + id));
    }

    private OrderResponse withTimeline(PurchaseOrder o) {
        return OrderResponse.from(o, eventRepository.findByOrderIdOrderByAtAsc(o.getId()));
    }
}
