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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties =
        "spring.datasource.url=jdbc:h2:mem:db-notif;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class NotificationApiTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String buyerToken;
    private String supplierToken;

    @BeforeEach
    void login() {
        buyerToken = login("buyer@agripulse.demo", "buyer123");
        supplierToken = login("supplier@agripulse.demo", "supplier123");
        ensureUser("u-b-2", "buyer2@agripulse.demo", "buyer2123", "Second Buyer",
                Role.BUYER, "Second Foods", "Vijayawada");
        ensureUser("u-b-3", "buyer3@agripulse.demo", "buyer3123", "Third Buyer",
                Role.BUYER, "Third Foods", "Guntur");
    }

    private void ensureUser(String id, String email, String password, String name,
                            Role role, String company, String location) {
        if (!users.existsByEmail(email)) {
            users.save(new User(id, email, passwordEncoder.encode(password),
                    name, role, company, location));
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

    private HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    private String feed(String token) {
        ResponseEntity<String> resp = restTemplate.exchange("/api/notifications",
                HttpMethod.GET, new HttpEntity<>(bearer(token)), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        return resp.getBody();
    }

    private String postProduce(String token, String name, double qty, double price) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("grade", "A");
        body.put("quantityKg", qty);
        body.put("pricePerKg", price);
        body.put("location", "Rajahmundry");
        body.put("harvestDate", "2026-09-10");
        body.put("availableUntil", "2026-09-20");
        ResponseEntity<String> resp = restTemplate.exchange("/api/produce",
                HttpMethod.POST, new HttpEntity<>(body, bearer(token)), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return resp.getBody();
    }

    @Test
    void requirementCreateNotifiesSuppliersAndTopMatch() {
        postProduce(supplierToken, "Papaya", 1000, 30);

        Map<String, Object> req = new HashMap<>();
        req.put("produceName", "Papaya");
        req.put("grade", "A");
        req.put("quantityKg", 500);
        req.put("priceMinPerKg", 25);
        req.put("priceMaxPerKg", 35);
        req.put("deliveryLocation", "Hyderabad");
        req.put("deliveryDeadline", "2026-09-25");
        ResponseEntity<String> created = restTemplate.exchange("/api/requirements",
                HttpMethod.POST, new HttpEntity<>(req, bearer(buyerToken)), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        assertThat(feed(supplierToken)).contains("New buyer request")
                .contains("ABC Foods Pvt Ltd needs 500 kg Papaya in Hyderabad");
        assertThat(feed(buyerToken)).contains("New match for Papaya")
                .contains("Ravi FPO");
    }

    @Test
    void produceCreateNotifiesOpenDemand() {
        Map<String, Object> req = new HashMap<>();
        req.put("produceName", "Guava");
        req.put("grade", "B");
        req.put("quantityKg", 800);
        req.put("priceMinPerKg", 15);
        req.put("priceMaxPerKg", 25);
        req.put("deliveryLocation", "Hyderabad");
        req.put("deliveryDeadline", "2026-09-25");
        assertThat(restTemplate.exchange("/api/requirements", HttpMethod.POST,
                new HttpEntity<>(req, bearer(buyerToken)), String.class).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);

        postProduce(supplierToken, "Guava", 2000, 20);

        assertThat(feed(buyerToken)).contains("New match for Guava")
                .contains("Ravi FPO listed 2,000 kg");
    }

    @Test
    void orderLifecycleNotifiesParties() {
        Map<String, Object> order = new HashMap<>();
        order.put("supplierId", "u-supplier-1");
        order.put("produceName", "Tomatoes");
        order.put("grade", "A");
        order.put("quantityKg", 100);
        order.put("pricePerKg", 27);
        order.put("deliveryLocation", "Hyderabad");
        order.put("expectedDelivery", "2026-09-18");
        ResponseEntity<String> created = restTemplate.exchange("/api/orders",
                HttpMethod.POST, new HttpEntity<>(order, bearer(buyerToken)), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String id = created.getBody().split("\"id\":\"")[1].split("\"")[0];

        assertThat(feed(supplierToken)).contains("New order request")
                .contains("ABC Foods Pvt Ltd requested 100 kg Tomatoes (" + id + ")");

        Map<String, Object> move = new HashMap<>();
        move.put("to", "confirmed");
        move.put("note", "Accepted");
        assertThat(restTemplate.exchange("/api/orders/" + id + "/transitions",
                HttpMethod.POST, new HttpEntity<>(move, bearer(supplierToken)),
                String.class).getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(feed(buyerToken)).contains("Order confirmed")
                .contains("100 kg Tomatoes from Ravi FPO");
    }

    @Test
    void chatMessageNotifiesOtherParty() {
        Map<String, Object> conv = new HashMap<>();
        conv.put("supplierId", "u-supplier-1");
        conv.put("subject", "Bell check");
        ResponseEntity<String> opened = restTemplate.exchange("/api/conversations",
                HttpMethod.POST, new HttpEntity<>(conv, bearer(buyerToken)), String.class);
        String id = opened.getBody().split("\"id\":\"")[1].split("\"")[0];

        assertThat(restTemplate.exchange("/api/conversations/" + id + "/messages",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("text", "Hello over the wire"), bearer(buyerToken)),
                String.class).getStatusCode()).isEqualTo(HttpStatus.CREATED);

        assertThat(feed(supplierToken)).contains("New message from ABC Foods Pvt Ltd")
                .contains("Hello over the wire");
    }

    @Test
    void unreadCountReadAllAndVisibility() {
        String token3 = login("buyer3@agripulse.demo", "buyer3123");

        // Fresh buyer: nothing directed, no buyer-audience broadcasts exist.
        assertThat(restTemplate.exchange("/api/notifications/unread",
                HttpMethod.GET, new HttpEntity<>(bearer(token3)), String.class)
                .getBody()).contains("\"count\":0");

        Map<String, Object> req = new HashMap<>();
        req.put("produceName", "Dragonfruit");
        req.put("grade", "A");
        req.put("quantityKg", 50);
        req.put("priceMinPerKg", 100);
        req.put("priceMaxPerKg", 150);
        req.put("deliveryLocation", "Hyderabad");
        req.put("deliveryDeadline", "2026-09-25");
        assertThat(restTemplate.exchange("/api/requirements", HttpMethod.POST,
                new HttpEntity<>(req, bearer(token3)), String.class).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);

        // No produce matches: still zero for the buyer; suppliers got the broadcast.
        assertThat(restTemplate.exchange("/api/notifications/unread",
                HttpMethod.GET, new HttpEntity<>(bearer(token3)), String.class)
                .getBody()).contains("\"count\":0");

        postProduce(supplierToken, "Dragonfruit", 60, 120);

        assertThat(restTemplate.exchange("/api/notifications/unread",
                HttpMethod.GET, new HttpEntity<>(bearer(token3)), String.class)
                .getBody()).contains("\"count\":1");
        assertThat(feed(token3)).contains("New match for Dragonfruit");

        // Visibility: other buyer sees none of it; supplier never sees buyer directs.
        String token2 = login("buyer2@agripulse.demo", "buyer2123");
        assertThat(feed(token2)).doesNotContain("Dragonfruit");
        assertThat(feed(supplierToken)).doesNotContain("New match for Dragonfruit");

        assertThat(restTemplate.exchange("/api/notifications/read-all",
                HttpMethod.POST, new HttpEntity<>(bearer(token3)), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(restTemplate.exchange("/api/notifications/unread",
                HttpMethod.GET, new HttpEntity<>(bearer(token3)), String.class)
                .getBody()).contains("\"count\":0");
    }

    @Test
    void anonymousBellAccessIsUnauthorized() {
        assertThat(restTemplate.getForEntity("/api/notifications", String.class)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(restTemplate.getForEntity("/api/notifications/unread", String.class)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
