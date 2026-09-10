package com.agripulse.backend.dto.response;

import com.agripulse.backend.model.Notification;
import com.agripulse.backend.model.enums.NotificationKind;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Exact frontend AppNotification shape (kind serializes lowercase). */
public record NotificationResponse(
        String id,
        String title,
        String body,
        NotificationKind kind,
        String link,
        String createdAt,
        boolean read) {

    public static NotificationResponse from(Notification n) {
        String at = n.getCreatedAt() == null ? null : n.getCreatedAt()
                .atZone(ZoneId.systemDefault())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        return new NotificationResponse(n.getId(), n.getTitle(), n.getBody(),
                n.getKind(), n.getLink(), at, n.isRead());
    }
}
