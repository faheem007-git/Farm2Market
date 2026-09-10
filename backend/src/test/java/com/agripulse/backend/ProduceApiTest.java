package com.agripulse.backend;

import com.agripulse.backend.dto.response.AuthResponse;
import com.agripulse.backend.dto.request.LoginRequest;
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
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:db-produce;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class ProduceApiTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String supplierToken;
    private String buyerToken;

    @BeforeEach
    void login() {
        supplierToken = login("supplier@agripulse.demo", "supplier123");
        buyerToken = login("buyer@agripulse.demo", "buyer123");
        if (!users.existsByEmail("second@agripulse.demo")) {
            User second = new User("u-s-2", "second@agripulse.demo",
                    passwordEncoder.encode("second123"), "Second FPO",
                    Role.SUPPLIER, "Second FPO", "Guntur");
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
        body.put("name", "Tomatoes");
        body.put("grade", "A");
        body.put("quantityKg", 6000);
        body.put("pricePerKg", 27);
        body.put("location", "Rajahmundry");
        body.put("harvestDate", "2026-09-10");
        body.put("availableUntil", "2026-09-20");
        return body;
    }

    private ResponseEntity<String> post(String token, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return restTemplate.exchange("/api/produce", HttpMethod.POST,
                new HttpEntity<>(body, headers), String.class);
    }

    @Test
    void supplierCreatesProduceWithDerivedFields() {
        ResponseEntity<String> resp = post(supplierToken, validBody());
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(resp.getBody()).contains("\"status\":\"active\"");
        assertThat(resp.getBody()).contains("Ravi FPO"); // supplierName from principal
        // Jackson escapes non-ASCII in JSON: the tomato emoji arrives as literal backslash-u sequence.
        assertThat(resp.getBody()).contains("\\uD83C\\uDF45"); // tomato emoji derived
    }

    @Test
    void getAndListRoundTrip() {
        String created = post(supplierToken, validBody()).getBody();
        String id = created.split("\"id\":\"")[1].split("\"")[0];

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(supplierToken);
        ResponseEntity<String> one = restTemplate.exchange("/api/produce/" + id,
                HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertThat(one.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(one.getBody()).contains("Tomatoes");

        ResponseEntity<String> all = restTemplate.exchange("/api/produce",
                HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertThat(all.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void buyerCannotCreateAndAnonymousCannotCreate() {
        assertThat(post(buyerToken, validBody()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(post(null, validBody()).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void invalidProduceIsRejected() {
        Map<String, Object> missingName = validBody();
        missingName.remove("name");
        assertThat(post(supplierToken, missingName).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> negativeQty = validBody();
        negativeQty.put("quantityKg", -5);
        assertThat(post(supplierToken, negativeQty).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> badDates = validBody();
        badDates.put("availableUntil", "2026-09-01"); // before harvestDate
        assertThat(post(supplierToken, badDates).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> badRange = validBody();
        badRange.put("priceRangeMin", 30);
        badRange.put("priceRangeMax", 20);
        assertThat(post(supplierToken, badRange).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void ownerCanPatchButOtherSupplierCannot() {
        String created = post(supplierToken, validBody()).getBody();
        String id = created.split("\"id\":\"")[1].split("\"")[0];

        HttpHeaders ownerHeaders = new HttpHeaders();
        ownerHeaders.setContentType(MediaType.APPLICATION_JSON);
        ownerHeaders.setBearerAuth(supplierToken);
        ResponseEntity<String> patched = restTemplate.exchange("/api/produce/" + id,
                HttpMethod.PATCH,
                new HttpEntity<>(Map.of("pricePerKg", 28, "status", "sold_out"),
                        ownerHeaders),
                String.class);
        assertThat(patched.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(patched.getBody()).contains("\"status\":\"sold_out\"");

        String otherToken = login("second@agripulse.demo", "second123");
        HttpHeaders otherHeaders = new HttpHeaders();
        otherHeaders.setContentType(MediaType.APPLICATION_JSON);
        otherHeaders.setBearerAuth(otherToken);
        ResponseEntity<String> denied = restTemplate.exchange("/api/produce/" + id,
                HttpMethod.PATCH,
                new HttpEntity<>(Map.of("pricePerKg", 1), otherHeaders),
                String.class);
        assertThat(denied.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(denied.getBody()).contains("owning supplier");
    }

    @Test
    void unknownProduceIsNotFound() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(supplierToken);
        assertThat(restTemplate.exchange("/api/produce/p-nope", HttpMethod.GET,
                new HttpEntity<>(headers), String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}
