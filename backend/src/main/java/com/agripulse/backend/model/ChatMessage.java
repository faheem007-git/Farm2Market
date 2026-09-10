package com.agripulse.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "chat_messages", indexes = {
    @Index(columnList = "conversationId")
})
public class ChatMessage {

    @Id
    private String id;

    @Column(nullable = false)
    private String conversationId;

    @Column(nullable = false)
    private String senderId;

    @Column(nullable = false)
    private String senderName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    private Instant sentAt = Instant.now();

    // "read" is reserved in MySQL 8: explicit non-reserved column name.
    @Column(name = "is_read", nullable = false)
    private boolean read;

    public ChatMessage() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
}
