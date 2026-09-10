package com.agripulse.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "conversations", indexes = {
    @Index(columnList = "buyerId"),
    @Index(columnList = "supplierId")
})
public class Conversation {

    @Id
    private String id;

    @Column(nullable = false)
    private String buyerId;

    @Column(nullable = false)
    private String buyerCompany;

    @Column(nullable = false)
    private String supplierId;

    @Column(nullable = false)
    private String supplierName;

    @Column(nullable = false)
    private String subject;

    private String lastMessage;

    @Column(nullable = false)
    private Instant lastAt = Instant.now();

    @Column(nullable = false)
    private int unreadBuyer;

    @Column(nullable = false)
    private int unreadSupplier;

    public Conversation() {}

    public Conversation(String id, String buyerId, String buyerCompany, String supplierId,
                        String supplierName, String subject) {
        this.id = id;
        this.buyerId = buyerId;
        this.buyerCompany = buyerCompany;
        this.supplierId = supplierId;
        this.supplierName = supplierName;
        this.subject = subject;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getBuyerId() { return buyerId; }
    public void setBuyerId(String buyerId) { this.buyerId = buyerId; }
    public String getBuyerCompany() { return buyerCompany; }
    public void setBuyerCompany(String buyerCompany) { this.buyerCompany = buyerCompany; }
    public String getSupplierId() { return supplierId; }
    public void setSupplierId(String supplierId) { this.supplierId = supplierId; }
    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }
    public Instant getLastAt() { return lastAt; }
    public void setLastAt(Instant lastAt) { this.lastAt = lastAt; }
    public int getUnreadBuyer() { return unreadBuyer; }
    public void setUnreadBuyer(int unreadBuyer) { this.unreadBuyer = unreadBuyer; }
    public int getUnreadSupplier() { return unreadSupplier; }
    public void setUnreadSupplier(int unreadSupplier) { this.unreadSupplier = unreadSupplier; }
}
