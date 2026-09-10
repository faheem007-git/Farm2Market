package com.agripulse.backend.dto.response;

import com.agripulse.backend.model.ChatMessage;
import com.agripulse.backend.model.Conversation;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Exact frontend Conversation/Message contract shapes. */
public class ChatDtos {

    static final DateTimeFormatter STAMP =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public static String stamp(Instant at) {
        return at.atZone(ZoneId.systemDefault()).format(STAMP);
    }

    public record ConversationResponse(
            String id,
            String buyerId,
            String buyerCompany,
            String supplierId,
            String supplierName,
            String subject,
            String lastMessage,
            String lastAt,
            int unreadBuyer,
            int unreadSupplier) {

        public static ConversationResponse from(Conversation c) {
            return new ConversationResponse(c.getId(), c.getBuyerId(),
                    c.getBuyerCompany(), c.getSupplierId(), c.getSupplierName(),
                    c.getSubject(), c.getLastMessage(), stamp(c.getLastAt()),
                    c.getUnreadBuyer(), c.getUnreadSupplier());
        }
    }

    public record MessageResponse(
            String id,
            String conversationId,
            String senderId,
            String senderName,
            String text,
            String sentAt,
            boolean read) {

        public static MessageResponse from(ChatMessage m) {
            return new MessageResponse(m.getId(), m.getConversationId(),
                    m.getSenderId(), m.getSenderName(), m.getText(),
                    stamp(m.getSentAt()), m.isRead());
        }
    }
}
