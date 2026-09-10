package com.agripulse.backend.model;

import com.agripulse.backend.model.enums.NotificationKind;
import com.agripulse.backend.model.enums.Role;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notifications", indexes = {
    @Index(columnList = "userId"),
    @Index(columnList = "audienceRole")
})
public class Notification {

    @Id
    private String id;

    @Column(nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    private Role audienceRole;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationKind kind;

    private String link;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    // "read" is reserved in MySQL 8: explicit non-reserved column name.
    @Column(name = "is_read", nullable = false)
    private boolean read;

    public Notification() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Role getAudienceRole() { return audienceRole; }
    public void setAudienceRole(Role audienceRole) { this.audienceRole = audienceRole; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public NotificationKind getKind() { return kind; }
    public void setKind(NotificationKind kind) { this.kind = kind; }
    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
}
