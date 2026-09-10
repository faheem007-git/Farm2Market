package com.agripulse.backend;

import com.agripulse.backend.dto.request.LoginRequest;
import com.agripulse.backend.dto.response.AuthResponse;
import com.agripulse.backend.model.User;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties =
        "spring.datasource.url=jdbc:h2:mem:db-fulfill;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class FulfillmentApiTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String buyerToken;
    private String supplierToken;
    private String adminToken;

    @BeforeEach
    void login() {
        buyerToken = login("buyer@agripulse.demo", "buyer123");
        supplierToken = login("supplier@agripulse.demo", "supplier123");
        adminToken = login("admin@agripulse.demo", "admin123");
        if (!users.existsByEmail("buyer2@agripulse.demo")) {
            User second = new User("u-b-2", "buyer2@agripulse.demo",
                    passwordEncoder.encode("buyer2123"), "Second Buyer",
                    Role.BUYER, "Second Foods", "Vijayawada");
            users.save(second);
        }
    }

    private String login(String email, String password) {
        LoginRequest req = new LoginRequest();
        req.setEmail(email);
        req.setPassword(password);
        ResponseEntity<AuthResponse> resp =
                restTemplate.postForEntity("/api/auth/login", req, AuthResponse.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        return resp.getBody().getToken();
    }

    private String createOrder() {
        Map<String, Object> body = new HashMap<>();
        body.put("supplierId", "u-supplier-1");
        body.put("produceName", "Tomatoes");
        body.put("grade", "A");
        body.put("quantityKg", 100);
        body.put("pricePerKg", 27);
        body.put("deliveryLocation", "Hyderabad");
        body.put("expectedDelivery", "2026-09-18");
        ResponseEntity<String> resp = restTemplate.exchange("/api/orders",
                HttpMethod.POST, new HttpEntity<>(body, bearer(buyerToken)), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return resp.getBody().split("\"id\":\"")[1].split("\"")[0];
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    private ResponseEntity<String> move(String id, String token, String to, String note) {
        Map<String, Object> body = new HashMap<>();
        body.put("to", to);
        if (note != null) {
            body.put("note", note);
        }
        return restTemplate.exchange("/api/orders/" + id + "/transitions",
                HttpMethod.POST, new HttpEntity<>(body, bearer(token)), String.class);
    }

    /** Timeline entries each carry "at"; the order-level status does not. */
    private int timelineSize(String body) {
        return body.split("\"at\":\"").length - 1;
    }

    @Test
    void supplierWalksFullFulfillmentPath() {
        String id = createOrder();
        String[] path = {"confirmed", "packed", "shipped", "in_transit", "delivered"};
        for (int i = 0; i < path.length; i++) {
            ResponseEntity<String> resp =
                    move(id, supplierToken, path[i], "step " + path[i]);
            assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(resp.getBody()).contains("\"status\":\"" + path[i] + "\"");
            assertThat(resp.getBody()).contains("step " + path[i]);
            // 1 initial event + one per applied transition.
            assertThat(timelineSize(resp.getBody())).isEqualTo(i + 2);
        }
    }

    @Test
    void sameStatusIsNoOpWithoutNewEvent() {
        String id = createOrder();
        ResponseEntity<String> first = move(id, supplierToken, "placed", null);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(first.getBody()).contains("\"status\":\"placed\"");
        assertThat(timelineSize(first.getBody())).isEqualTo(1);
    }

    @Test
    void invalidEdgesAreRejected() {
        String id = createOrder();
        // Skip ahead: placed -> packed is not an edge.
        assertThat(move(id, supplierToken, "packed", null).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        // Valid edge for setup.
        assertThat(move(id, supplierToken, "confirmed", null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        // Backward: confirmed -> placed is not an edge.
        assertThat(move(id, supplierToken, "placed", null).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        // Same-status: confirmed -> confirmed is a no-op success, no new event.
        ResponseEntity<String> noop = move(id, supplierToken, "confirmed", null);
        assertThat(noop.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(timelineSize(noop.getBody())).isEqualTo(2);
        // Skip ahead: confirmed -> delivered is not an edge.
        assertThat(move(id, supplierToken, "delivered", null).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        // Unknown status value.
        assertThat(move(id, supplierToken, "bogus", null).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void buyerMayOnlyCancelPlaced() {
        String id = createOrder();
        // Buyer cannot drive fulfillment.
        assertThat(move(id, buyerToken, "confirmed", null).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        // Buyer can withdraw a fresh request.
        ResponseEntity<String> cancelled = move(id, buyerToken, "cancelled", "changed mind");
        assertThat(cancelled.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cancelled.getBody()).contains("\"status\":\"cancelled\"");
        assertThat(cancelled.getBody()).contains("changed mind");

        // Buyer cannot cancel once confirmed.
        String id2 = createOrder();
        assertThat(move(id2, supplierToken, "confirmed", null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(move(id2, buyerToken, "cancelled", null).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void supplierMayCancelAndAdminMayMoveAnyEdge() {
        String id = createOrder();
        assertThat(move(id, supplierToken, "confirmed", null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(move(id, supplierToken, "cancelled", "no stock").getStatusCode())
                .isEqualTo(HttpStatus.OK);

        String id2 = createOrder();
        assertThat(move(id2, adminToken, "confirmed", "admin override").getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void strangerCannotTransition() {
        String id = createOrder();
        String stranger = login("buyer2@agripulse.demo", "buyer2123");
        assertThat(move(id, stranger, "cancelled", null).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(move(id, null, "cancelled", null).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void terminalDeliveredRejectsFurtherMovesAndStrangersAreForbidden() {
        String id = createOrder();
        for (String s : new String[]{"confirmed", "packed", "shipped", "in_transit", "delivered"}) {
            assertThat(move(id, supplierToken, s, null).getStatusCode())
                    .isEqualTo(HttpStatus.OK);
        }
        assertThat(move(id, supplierToken, "cancelled", null).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        assertThat(move(id, adminToken, "cancelled", null).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        // Unknown order.
        assertThat(move("ORD-NOPE", supplierToken, "confirmed", null).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}
