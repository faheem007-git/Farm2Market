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
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:db-order;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class OrderApiTest {

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

    private Map<String, Object> validBody() {
        Map<String, Object> body = new HashMap<>();
        body.put("supplierId", "u-supplier-1");
        body.put("produceName", "Tomatoes");
        body.put("grade", "A");
        body.put("quantityKg", 5000);
        body.put("pricePerKg", 27);
        body.put("deliveryLocation", "Hyderabad");
        body.put("expectedDelivery", "2026-09-18");
        return body;
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    void buyerCreatesOrderWithServerSideTotal() {
        ResponseEntity<String> resp = restTemplate.exchange("/api/orders",
                HttpMethod.POST, new HttpEntity<>(validBody(), bearer(buyerToken)),
                String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(resp.getBody()).contains("\"status\":\"placed\"");
        // 5000 x 27 = 135000 computed server-side (no totalAmount in request).
        assertThat(resp.getBody()).contains("\"totalAmount\":135000");
        assertThat(resp.getBody()).contains("Request placed by ABC Foods Pvt Ltd");
        assertThat(resp.getBody()).contains("\"timeline\":[{");
    }

    @Test
    void supplierSeesTheirOrderButUnrelatedBuyerCannot() {
        String created = restTemplate.exchange("/api/orders", HttpMethod.POST,
                new HttpEntity<>(validBody(), bearer(buyerToken)), String.class).getBody();
        String id = created.split("\"id\":\"")[1].split("\"")[0];

        ResponseEntity<String> supplierView = restTemplate.exchange("/api/orders/" + id,
                HttpMethod.GET, new HttpEntity<>(bearer(supplierToken)), String.class);
        assertThat(supplierView.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(supplierView.getBody()).contains(id);

        ResponseEntity<String> supplierList = restTemplate.exchange("/api/orders",
                HttpMethod.GET, new HttpEntity<>(bearer(supplierToken)), String.class);
        assertThat(supplierList.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(supplierList.getBody()).contains(id);

        String otherToken = login("buyer2@agripulse.demo", "buyer2123");
        assertThat(restTemplate.exchange("/api/orders/" + id, HttpMethod.GET,
                new HttpEntity<>(bearer(otherToken)), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<String> adminView = restTemplate.exchange("/api/orders/" + id,
                HttpMethod.GET, new HttpEntity<>(bearer(adminToken)), String.class);
        assertThat(adminView.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void supplierCannotCreateAndInvalidOrderRejected() {
        assertThat(restTemplate.exchange("/api/orders", HttpMethod.POST,
                new HttpEntity<>(validBody(), bearer(supplierToken)), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        Map<String, Object> negativeQty = validBody();
        negativeQty.put("quantityKg", -2);
        assertThat(restTemplate.exchange("/api/orders", HttpMethod.POST,
                new HttpEntity<>(negativeQty, bearer(buyerToken)), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> unknownSupplier = validBody();
        unknownSupplier.put("supplierId", "u-nope");
        assertThat(restTemplate.exchange("/api/orders", HttpMethod.POST,
                new HttpEntity<>(unknownSupplier, bearer(buyerToken)), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
