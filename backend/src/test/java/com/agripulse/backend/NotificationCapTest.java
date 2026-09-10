package com.agripulse.backend;

import com.agripulse.backend.model.enums.NotificationKind;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.repository.NotificationRepository;
import com.agripulse.backend.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties =
        "spring.datasource.url=jdbc:h2:mem:db-notifcap;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class NotificationCapTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notifications;

    @Test
    void storeKeepsNewestFiftyOnly() {
        for (int i = 0; i < 55; i++) {
            notificationService.notifyUser("u-cap", "cap-" + i, "body " + i,
                    NotificationKind.INFO, null);
        }
        assertThat(notifications.count()).isEqualTo(50);
        assertThat(notificationService.listFor("u-cap", Role.BUYER))
                .hasSize(50)
                .extracting(n -> n.getTitle())
                .contains("cap-54")
                .doesNotContain("cap-0", "cap-1", "cap-2", "cap-3", "cap-4");
    }

    @Test
    void roleBroadcastVisibleOnlyToThatRole() {
        notificationService.notifyRole(Role.SUPPLIER, "Suppliers only", "s", NotificationKind.INFO, null);
        assertThat(notificationService.listFor("u-x", Role.SUPPLIER)).hasSize(1);
        assertThat(notificationService.listFor("u-x", Role.BUYER)).isEmpty();
        assertThat(notificationService.listFor("u-x", Role.ADMIN)).isEmpty();
    }
}
