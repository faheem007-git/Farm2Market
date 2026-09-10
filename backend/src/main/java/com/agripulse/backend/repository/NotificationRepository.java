package com.agripulse.backend.repository;

import com.agripulse.backend.model.Notification;
import com.agripulse.backend.model.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrAudienceRoleOrderByCreatedAtDesc(String userId, Role role);

    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(String userId);

    @Query("SELECT n FROM Notification n WHERE (n.userId = :userId OR n.audienceRole = :role) AND n.read = false ORDER BY n.createdAt DESC")
    List<Notification> findUnreadFor(String userId, Role role);

    long countByUserIdAndReadFalse(String userId);

    List<Notification> findAllByOrderByCreatedAtDescIdDesc();

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId OR n.audienceRole = :role")
    void markAllAsRead(String userId, Role role);
}
