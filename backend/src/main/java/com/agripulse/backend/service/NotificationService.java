package com.agripulse.backend.service;

import com.agripulse.backend.model.Notification;
import com.agripulse.backend.model.enums.NotificationKind;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Single place for all notification logic. Business services call this;
 * controllers never build notifications directly.
 *
 * Mirrors the frontend store: direct items (userId set, no audience),
 * role broadcasts (userId "*", audience set), global cap of 50 newest.
 */
@Service
public class NotificationService {

    /** Matches the frontend NOTIF_CAP: newest 50 win, oldest drop off. */
    static final int CAP = 50;

    /** Indian digit grouping exactly like the frontend toLocaleString("en-IN"). */
    public static String qty(BigDecimal v) {
        NumberFormat in = NumberFormat.getInstance(new Locale("en", "IN"));
        in.setMaximumFractionDigits(2);
        return in.format(v);
    }

    /** Plain price rendering exactly like frontend number interpolation (27, not 27.00). */
    public static String money(BigDecimal v) {
        return v.stripTrailingZeros().toPlainString();
    }

    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    /** Target one user. */
    @Transactional
    public Notification notifyUser(String userId, String title, String body,
                                   NotificationKind kind, String link) {
        Notification n = new Notification();
        n.setId("n-" + UUID.randomUUID().toString().substring(0, 8));
        n.setUserId(userId);
        n.setTitle(title);
        n.setBody(body);
        n.setKind(kind);
        n.setLink(link);
        n.setCreatedAt(Instant.now());
        n.setRead(false);
        notifications.save(n);
        enforceCap();
        return n;
    }

    /** Broadcast to every user with a role. */
    @Transactional
    public Notification notifyRole(Role role, String title, String body,
                                   NotificationKind kind, String link) {
        Notification n = new Notification();
        n.setId("n-" + UUID.randomUUID().toString().substring(0, 8));
        n.setUserId("*");
        n.setAudienceRole(role);
        n.setTitle(title);
        n.setBody(body);
        n.setKind(kind);
        n.setLink(link);
        n.setCreatedAt(Instant.now());
        n.setRead(false);
        notifications.save(n);
        enforceCap();
        return n;
    }

    /** Bell feed: direct + own-role broadcasts, newest first. */
    public List<Notification> listFor(String userId, Role role) {
        return notifications.findByUserIdOrAudienceRoleOrderByCreatedAtDesc(userId, role);
    }

    public long unreadCount(String userId, Role role) {
        return notifications.findUnreadFor(userId, role).size();
    }

    @Transactional
    public void markAllRead(String userId, Role role) {
        notifications.markAllAsRead(userId, role);
    }

    private void enforceCap() {
        List<Notification> all = notifications.findAllByOrderByCreatedAtDescIdDesc();
        if (all.size() > CAP) {
            notifications.deleteAll(all.subList(CAP, all.size()));
        }
    }
}
