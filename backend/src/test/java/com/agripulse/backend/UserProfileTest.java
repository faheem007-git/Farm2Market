package com.agripulse.backend;

import com.agripulse.backend.dto.request.LoginRequest;
import com.agripulse.backend.dto.response.AuthResponse;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:db-profile;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class UserProfileTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private String login(String email, String password) {
        LoginRequest req = new LoginRequest();
        req.setEmail(email);
        req.setPassword(password);
        ResponseEntity<AuthResponse> resp =
                restTemplate.postForEntity("/api/auth/login", req, AuthResponse.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        return resp.getBody().getToken();
    }

    private ResponseEntity<String> patch(String path, String token, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return restTemplate.exchange(path, HttpMethod.PATCH,
                new HttpEntity<>(body, headers), String.class);
    }

    @Test
    void buyerUpdatesOwnProfile() {
        String token = login("buyer@agripulse.demo", "buyer123");
        ResponseEntity<String> resp = patch("/api/users/me", token,
                Map.of("company", "ABC Foods Updated", "phone", "+91 90000 11111",
                        "demandVolumeKgPerMonth", 15000));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).contains("ABC Foods Updated").contains("15000");
    }

    @Test
    void supplierUpdatesOwnProfileButCannotSelfVerify() {
        String token = login("supplier@agripulse.demo", "supplier123");
        ResponseEntity<String> resp = patch("/api/users/me", token,
                Map.of("village", "New Village", "farmSizeAcres", 30,
                        "verified", false, "rating", 5.0));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).contains("New Village").contains("30");
        // Platform-managed fields are ignored for non-admin callers:
        // seed verified=true stays true, seed rating=4.5 stays 4.5.
        assertThat(resp.getBody()).contains("\"verified\":true");
        assertThat(resp.getBody()).doesNotContain("5.0");
    }

    @Test
    void adminUpdatesAnotherUserIncludingTrustFields() {
        String token = login("admin@agripulse.demo", "admin123");
        ResponseEntity<String> resp = patch("/api/users/u-supplier-1", token,
                Map.of("rating", 4.8, "location", "Vijayawada"));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).contains("4.8").contains("Vijayawada");
    }

    @Test
    void anonymousUpdateIsUnauthorized() {
        assertThat(patch("/api/users/me", null, Map.of("company", "X")).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void buyerCannotUpdateAnotherUser() {
        String token = login("buyer@agripulse.demo", "buyer123");
        assertThat(patch("/api/users/u-supplier-1", token,
                Map.of("company", "Hijacked")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void invalidProfileUpdateIsRejected() {
        String token = login("buyer@agripulse.demo", "buyer123");
        ResponseEntity<String> resp = patch("/api/users/me", token,
                Map.of("name", "x".repeat(200), "rating", 99.0,
                        "demandVolumeKgPerMonth", -5));
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(resp.getBody()).contains("name").contains("rating")
                .contains("demandVolumeKgPerMonth");
    }

    @Test
    void unknownUserIsNotFound() {
        String token = login("admin@agripulse.demo", "admin123");
        assertThat(patch("/api/users/u-nope", token, Map.of("company", "X")).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}
