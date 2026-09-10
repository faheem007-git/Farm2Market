package com.agripulse.backend.service;

import com.agripulse.backend.dto.request.CreateConversationRequest;
import com.agripulse.backend.dto.request.SendMessageRequest;
import com.agripulse.backend.dto.response.ChatDtos.ConversationResponse;
import com.agripulse.backend.dto.response.ChatDtos.MessageResponse;
import com.agripulse.backend.model.ChatMessage;
import com.agripulse.backend.model.Conversation;
import com.agripulse.backend.model.User;
import com.agripulse.backend.model.enums.NotificationKind;
import com.agripulse.backend.repository.ChatMessageRepository;
import com.agripulse.backend.repository.ConversationRepository;
import com.agripulse.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ChatService {

    private final ConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final NotificationService notificationService;

    public ChatService(ConversationRepository conversations,
                       ChatMessageRepository messages,
                       UserRepository users,
                       NotificationService notificationService) {
        this.conversations = conversations;
        this.messages = messages;
        this.users = users;
        this.notificationService = notificationService;
    }

    /** Own threads only; admin sees the directory. Newest activity first. */
    public List<ConversationResponse> list(String callerId, String callerRole) {
        List<Conversation> found = switch (callerRole) {
            case "ADMIN" -> conversations.findAll();
            case "SUPPLIER" -> conversations.findBySupplierIdOrderByLastAtDesc(callerId);
            default -> conversations.findByBuyerIdOrderByLastAtDesc(callerId);
        };
        return found.stream().map(ConversationResponse::from).toList();
    }

    /**
     * One thread per buyer/supplier pair (subject does not split threads).
     * The caller's own side is always taken from the principal, never the body.
     */
    @Transactional
    public ConversationResponse getOrCreate(String callerId, String callerRole,
                                            CreateConversationRequest req) {
        String buyerId;
        String supplierId;
        if (callerRole.equals("ADMIN")) {
            if (req.getBuyerId() == null || req.getSupplierId() == null) {
                throw new IllegalArgumentException("buyerId and supplierId are required");
            }
            buyerId = req.getBuyerId();
            supplierId = req.getSupplierId();
        } else if (callerRole.equals("SUPPLIER")) {
            if (req.getBuyerId() == null) {
                throw new IllegalArgumentException("buyerId is required");
            }
            buyerId = req.getBuyerId();
            supplierId = callerId;
        } else {
            if (req.getSupplierId() == null) {
                throw new IllegalArgumentException("supplierId is required");
            }
            buyerId = callerId;
            supplierId = req.getSupplierId();
        }

        User buyer = users.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + buyerId));
        User supplier = users.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + supplierId));

        return conversations.findByBuyerIdAndSupplierId(buyerId, supplierId)
                .map(ConversationResponse::from)
                .orElseGet(() -> {
                    Conversation c = new Conversation(
                            "c-" + supplierId + "-" + uuid8(),
                            buyer.getId(), buyer.getCompany(),
                            supplier.getId(), supplier.getCompany(),
                            req.getSubject().trim());
                    c.setLastMessage("");
                    c.setLastAt(Instant.now());
                    return ConversationResponse.from(conversations.save(c));
                });
    }

    public List<MessageResponse> messages(String id, String callerId, String callerRole) {
        Conversation c = participantOnly(id, callerId, callerRole);
        return messages.findByConversationIdOrderBySentAtAsc(c.getId()).stream()
                .map(MessageResponse::from).toList();
    }

    @Transactional
    public MessageResponse send(String id, String callerId, String callerRole,
                                SendMessageRequest req) {
        Conversation c = participantOnly(id, callerId, callerRole);
        User sender = users.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + callerId));

        ChatMessage m = new ChatMessage();
        m.setId("m-" + uuid8());
        m.setConversationId(c.getId());
        m.setSenderId(sender.getId());
        m.setSenderName(sender.getCompany() != null ? sender.getCompany() : sender.getName());
        m.setText(req.getText().trim());
        m.setSentAt(Instant.now());
        m.setRead(false);
        messages.save(m);

        // Only the OTHER party's counter moves; the sender's own is untouched.
        boolean isBuyer = callerId.equals(c.getBuyerId());
        c.setLastMessage(m.getText());
        c.setLastAt(m.getSentAt());
        if (isBuyer) {
            c.setUnreadSupplier(c.getUnreadSupplier() + 1);
        } else {
            c.setUnreadBuyer(c.getUnreadBuyer() + 1);
        }
        conversations.save(c);

        // Cross-role ping on the SAME conversation the other side already reads.
        String preview = m.getText().length() > 80
                ? m.getText().substring(0, 80) + "\u2026"
                : m.getText();
        if (isBuyer) {
            notificationService.notifyUser(
                    c.getSupplierId(),
                    "New message from " + c.getBuyerCompany(),
                    preview,
                    NotificationKind.INFO,
                    "/supplier/chat/" + c.getId());
        } else {
            notificationService.notifyUser(
                    c.getBuyerId(),
                    "New message from " + c.getSupplierName(),
                    preview,
                    NotificationKind.INFO,
                    "/buyer/chat/" + c.getId());
        }
        return MessageResponse.from(m);
    }

    /**
     * Buyer read zeroes their counter AND marks the thread's messages read.
     * Supplier read zeroes only their counter (messages untouched).
     */
    @Transactional
    public void markRead(String id, String callerId, String callerRole) {
        Conversation c = participantOnly(id, callerId, callerRole);
        if (callerId.equals(c.getBuyerId())) {
            c.setUnreadBuyer(0);
            conversations.save(c);
            messages.markThreadAsRead(c.getId());
        } else {
            c.setUnreadSupplier(0);
            conversations.save(c);
        }
    }

    /** Message content is private to the two parties; directory listing is admin-visible. */
    private Conversation participantOnly(String id, String callerId, String callerRole) {
        Conversation c = conversations.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Conversation not found: " + id));
        boolean party = callerId.equals(c.getBuyerId()) || callerId.equals(c.getSupplierId());
        if (!party) {
            throw new ForbiddenException("Only conversation participants can access this thread");
        }
        return c;
    }

    private static String uuid8() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
