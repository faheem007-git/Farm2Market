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
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:db-req;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class RequirementApiTest {

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

    /** Canonical audit scenario: ABC Foods, 5000 kg Tomatoes A @ ₹25-30, Hyderabad, 2026-09-15. */
    private Map<String, Object> canonicalBody() {
        Map<String, Object> body = new HashMap<>();
        body.put("produceName", "Tomatoes");
        body.put("grade", "A");
        body.put("quantityKg", 5000);
        body.put("priceMinPerKg", 25);
        body.put("priceMaxPerKg", 30);
        body.put("deliveryLocation", "Hyderabad");
        body.put("deliveryDeadline", "2026-09-15");
        return body;
    }

    private ResponseEntity<String> post(String token, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return restTemplate.exchange("/api/requirements", HttpMethod.POST,
                new HttpEntity<>(body, headers), String.class);
    }

    @Test
    void buyerCreatesCanonicalRequirement() {
        ResponseEntity<String> resp = post(buyerToken, canonicalBody());
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(resp.getBody()).contains("\"status\":\"open\"");
        assertThat(resp.getBody()).contains("ABC Foods Pvt Ltd");
        assertThat(resp.getBody()).contains("5000");
        assertThat(resp.getBody()).contains("2026-09-15");
    }

    @Test
    void getAndListRoundTrip() {
        String created = post(buyerToken, canonicalBody()).getBody();
        String id = created.split("\"id\":\"")[1].split("\"")[0];

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(buyerToken);
        ResponseEntity<String> one = restTemplate.exchange("/api/requirements/" + id,
                HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertThat(one.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(one.getBody()).contains("Tomatoes");

        ResponseEntity<String> missing = restTemplate.exchange("/api/requirements/r-nope",
                HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertThat(missing.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void supplierCannotCreateAndAnonymousCannotCreate() {
        assertThat(post(supplierToken, canonicalBody()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(post(null, canonicalBody()).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void invalidRequirementIsRejected() {
        Map<String, Object> negativeQty = canonicalBody();
        negativeQty.put("quantityKg", -100);
        assertThat(post(buyerToken, negativeQty).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> invertedRange = canonicalBody();
        invertedRange.put("priceMinPerKg", 30);
        invertedRange.put("priceMaxPerKg", 25);
        assertThat(post(buyerToken, invertedRange).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> pastDeadline = canonicalBody();
        pastDeadline.put("deliveryDeadline", "2020-01-01");
        assertThat(post(buyerToken, pastDeadline).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> missingName = canonicalBody();
        missingName.remove("produceName");
        assertThat(post(buyerToken, missingName).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void ownerCanChangeStatusButOtherBuyerCannot() {
        String created = post(buyerToken, canonicalBody()).getBody();
        String id = created.split("\"id\":\"")[1].split("\"")[0];

        HttpHeaders ownerHeaders = new HttpHeaders();
        ownerHeaders.setContentType(MediaType.APPLICATION_JSON);
        ownerHeaders.setBearerAuth(buyerToken);
        ResponseEntity<String> updated = restTemplate.exchange(
                "/api/requirements/" + id + "/status", HttpMethod.PATCH,
                new HttpEntity<>(Map.of("status", "matched"), ownerHeaders), String.class);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updated.getBody()).contains("\"status\":\"matched\"");

        String otherToken = login("buyer2@agripulse.demo", "buyer2123");
        HttpHeaders otherHeaders = new HttpHeaders();
        otherHeaders.setContentType(MediaType.APPLICATION_JSON);
        otherHeaders.setBearerAuth(otherToken);
        ResponseEntity<String> denied = restTemplate.exchange(
                "/api/requirements/" + id + "/status", HttpMethod.PATCH,
                new HttpEntity<>(Map.of("status", "cancelled"), otherHeaders), String.class);
        assertThat(denied.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<String> badStatus = restTemplate.exchange(
                "/api/requirements/" + id + "/status", HttpMethod.PATCH,
                new HttpEntity<>(Map.of("status", "bogus"), ownerHeaders), String.class);
        assertThat(badStatus.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
