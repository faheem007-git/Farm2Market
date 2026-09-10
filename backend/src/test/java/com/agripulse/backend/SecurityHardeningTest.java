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

/**
 * Horizontal (cross-user) + vertical (cross-role) authorization matrix.
 * Isolated database; second buyer/supplier provisioned here.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties =
        "spring.datasource.url=jdbc:h2:mem:db-sechard;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class SecurityHardeningTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String buyer1;
    private String buyer2;
    private String supplier1;
    private String supplier2;
    private String admin;

    @BeforeEach
    void setup() {
        buyer1 = login("buyer@agripulse.demo", "buyer123");
        supplier1 = login("supplier@agripulse.demo", "supplier123");
        admin = login("admin@agripulse.demo", "admin123");
        buyer2 = loginExtra("u-b-2", "buyer2@agripulse.demo", "buyer2123",
                "Second Buyer", Role.BUYER, "Second Foods");
        supplier2 = loginExtra("u-s-2", "second@agripulse.demo", "second123",
                "Second FPO", Role.SUPPLIER, "Second FPO");
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

    private String loginExtra(String id, String email, String password, String name,
                              Role role, String company) {
        if (!users.existsByEmail(email)) {
            users.save(new User(id, email, passwordEncoder.encode(password),
                    name, role, company, "Guntur"));
        }
        return login(email, password);
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    private ResponseEntity<String> call(String path, HttpMethod method,
                                        String token, Map<String, Object> body) {
        HttpHeaders headers = token == null
                ? new HttpHeaders()
                : bearer(token);
        if (token == null) {
            headers.setContentType(MediaType.APPLICATION_JSON);
        }
        return restTemplate.exchange(path, method,
                new HttpEntity<>(body, headers), String.class);
    }

    private String createRequirement() {
        Map<String, Object> body = new HashMap<>();
        body.put("produceName", "Hardening Peas");
        body.put("grade", "A");
        body.put("quantityKg", 100);
        body.put("priceMinPerKg", 10);
        body.put("priceMaxPerKg", 20);
        body.put("deliveryLocation", "Hyderabad");
        body.put("deliveryDeadline", "2026-09-25");
        ResponseEntity<String> resp =
                call("/api/requirements", HttpMethod.POST, buyer1, body);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return resp.getBody().split("\"id\":\"")[1].split("\"")[0];
    }

    private String createProduce() {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "Hardening Peas");
        body.put("grade", "A");
        body.put("quantityKg", 500);
        body.put("pricePerKg", 15);
        body.put("location", "Guntur");
        body.put("harvestDate", "2026-09-10");
        body.put("availableUntil", "2026-09-25");
        ResponseEntity<String> resp =
                call("/api/produce", HttpMethod.POST, supplier1, body);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return resp.getBody().split("\"id\":\"")[1].split("\"")[0];
    }

    @Test
    void buyerCannotModifyAnotherBuyersRequirement() {
        String reqId = createRequirement();
        Map<String, Object> status = Map.of("status", "cancelled");
        // Owner works.
        assertThat(call("/api/requirements/" + reqId + "/status",
                HttpMethod.PATCH, buyer1, status).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        // Other buyer forbidden.
        assertThat(call("/api/requirements/" + reqId + "/status",
                HttpMethod.PATCH, buyer2, status).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        // Supplier forbidden too.
        assertThat(call("/api/requirements/" + reqId + "/status",
                HttpMethod.PATCH, supplier1, status).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void supplierCannotModifyAnotherSuppliersProduce() {
        String produceId = createProduce();
        Map<String, Object> patch = Map.of("pricePerKg", 1);
        assertThat(call("/api/produce/" + produceId, HttpMethod.PATCH,
                supplier2, patch).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call("/api/produce/" + produceId, HttpMethod.PATCH,
                buyer1, patch).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call("/api/produce/" + produceId, HttpMethod.PATCH,
                supplier1, patch).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void verticalRoleGatesHold() {
        Map<String, Object> produce = new HashMap<>();
        produce.put("name", "X");
        produce.put("grade", "A");
        produce.put("quantityKg", 10);
        produce.put("pricePerKg", 10);
        produce.put("location", "Guntur");
        produce.put("harvestDate", "2026-09-10");
        produce.put("availableUntil", "2026-09-25");
        // BUYER-only creation rejected for supplier.
        assertThat(call("/api/requirements", HttpMethod.POST,
                supplier1, new HashMap<>(produce)).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        // SUPPLIER-only creation rejected for buyer.
        assertThat(call("/api/produce", HttpMethod.POST, buyer1, produce)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        // BUYER-only order creation rejected for supplier.
        assertThat(call("/api/orders", HttpMethod.POST, supplier1,
                Map.of("supplierId", "u-supplier-1", "produceName", "X", "grade", "A",
                        "quantityKg", 5, "pricePerKg", 5,
                        "deliveryLocation", "Hyderabad",
                        "expectedDelivery", "2026-09-20")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        // ADMIN-only operations rejected for non-admins.
        assertThat(call("/api/admin/ping", HttpMethod.GET, buyer1, null)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call("/api/admin/ping", HttpMethod.GET, supplier1, null)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call("/api/users/u-buyer-1", HttpMethod.PATCH, buyer1,
                Map.of("company", "Nope")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        // Buyer cannot file supplier responses.
        assertThat(call("/api/supplier-responses", HttpMethod.POST, buyer1,
                Map.of("requirementId", "r-x", "status", "responded")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void unrelatedUsersCannotAccessOrdersAndConversations() {
        Map<String, Object> order = new HashMap<>();
        order.put("supplierId", "u-supplier-1");
        order.put("produceName", "Hardening Peas");
        order.put("grade", "A");
        order.put("quantityKg", 10);
        order.put("pricePerKg", 12);
        order.put("deliveryLocation", "Hyderabad");
        order.put("expectedDelivery", "2026-09-20");
        String orderId = call("/api/orders", HttpMethod.POST, buyer1, order)
                .getBody().split("\"id\":\"")[1].split("\"")[0];

        assertThat(call("/api/orders/" + orderId, HttpMethod.GET,
                buyer2, null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call("/api/orders/" + orderId, HttpMethod.GET,
                supplier2, null).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        Map<String, Object> conv = new HashMap<>();
        conv.put("supplierId", "u-supplier-1");
        conv.put("subject", "Private");
        String convId = call("/api/conversations", HttpMethod.POST, buyer1, conv)
                .getBody().split("\"id\":\"")[1].split("\"")[0];

        assertThat(call("/api/conversations/" + convId + "/messages",
                HttpMethod.GET, buyer2, null).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(call("/api/conversations/" + convId + "/messages",
                HttpMethod.POST, buyer2, Map.of("text", "intrude")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void usersCannotSeeAnothersNotificationsAndPasswordNeverLeaks() {
        Map<String, Object> conv = new HashMap<>();
        conv.put("supplierId", "u-supplier-1");
        conv.put("subject", "Bell privacy");
        String convId = call("/api/conversations", HttpMethod.POST, buyer1, conv)
                .getBody().split("\"id\":\"")[1].split("\"")[0];
        call("/api/conversations/" + convId + "/messages", HttpMethod.POST,
                supplier1, Map.of("text", "private ping"));

        String feed1 = call("/api/notifications", HttpMethod.GET,
                buyer1, null).getBody();
        assertThat(feed1).contains("private ping");
        String feed2 = call("/api/notifications", HttpMethod.GET,
                buyer2, null).getBody();
        assertThat(feed2).doesNotContain("private ping");

        String me = call("/api/users/me", HttpMethod.GET, buyer1, null).getBody();
        assertThat(me).doesNotContain("buyer123");
        assertThat(me.toLowerCase()).doesNotContain("password");
    }

    @Test
    void anonymousAccessIsUnauthorizedEverywhere() {
        assertThat(call("/api/produce", HttpMethod.GET, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(call("/api/requirements", HttpMethod.GET, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(call("/api/orders", HttpMethod.GET, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(call("/api/conversations", HttpMethod.GET, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(call("/api/notifications", HttpMethod.GET, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(call("/api/supplier-responses", HttpMethod.GET, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(call("/api/users/me", HttpMethod.GET, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
