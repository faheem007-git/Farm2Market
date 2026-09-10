package com.agripulse.backend;

import com.agripulse.backend.dto.request.LoginRequest;
import com.agripulse.backend.dto.response.AuthResponse;
import com.agripulse.backend.model.enums.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:db-auth;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class AuthIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void loginWithValidCredentialsReturnsToken() {
        LoginRequest req = new LoginRequest();
        req.setEmail("buyer@agripulse.demo");
        req.setPassword("buyer123");

        ResponseEntity<AuthResponse> resp = restTemplate.postForEntity(
                "/api/auth/login", req, AuthResponse.class);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).isNotNull();
        assertThat(resp.getBody().getToken()).isNotBlank();
        assertThat(resp.getBody().getUser().getRole()).isEqualTo(Role.BUYER);
        assertThat(resp.getBody().getUser().getCompany()).isEqualTo("ABC Foods Pvt Ltd");
    }

    @Test
    void loginWithInvalidCredentialsReturnsError() {
        LoginRequest req = new LoginRequest();
        req.setEmail("buyer@agripulse.demo");
        req.setPassword("wrongpassword");

        try {
            restTemplate.postForEntity("/api/auth/login", req, AuthResponse.class);
        } catch (Exception e) {
            assertThat(e.getMessage()).contains("Invalid email or password");
        }
    }

    @Test
    void supplierLoginReturnsCorrectProfile() {
        LoginRequest req = new LoginRequest();
        req.setEmail("supplier@agripulse.demo");
        req.setPassword("supplier123");

        ResponseEntity<AuthResponse> resp = restTemplate.postForEntity(
                "/api/auth/login", req, AuthResponse.class);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody().getUser().getRole()).isEqualTo(Role.SUPPLIER);
        assertThat(resp.getBody().getUser().isVerified()).isTrue();
        assertThat(resp.getBody().getUser().getRating()).isEqualTo(4.5);
    }
}
