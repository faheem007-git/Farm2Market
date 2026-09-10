package com.agripulse.backend;

import com.agripulse.backend.dto.request.LoginRequest;
import com.agripulse.backend.dto.response.AuthResponse;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:db-authsec;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class AuthSecurityTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    private String login(String email, String password) {
        LoginRequest req = new LoginRequest();
        req.setEmail(email);
        req.setPassword(password);
        ResponseEntity<AuthResponse> resp =
                restTemplate.postForEntity("/api/auth/login", req, AuthResponse.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody().getToken()).isNotBlank();
        return resp.getBody().getToken();
    }

    private ResponseEntity<String> get(String path, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return restTemplate.exchange(path, HttpMethod.GET,
                new HttpEntity<>(headers), String.class);
    }

    @Test
    void validLoginReturnsTokenAndRole() {
        LoginRequest req = new LoginRequest();
        req.setEmail("admin@agripulse.demo");
        req.setPassword("admin123");
        ResponseEntity<AuthResponse> resp =
                restTemplate.postForEntity("/api/auth/login", req, AuthResponse.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody().getUser().getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    void invalidEmailIsUnauthorized() {
        LoginRequest req = new LoginRequest();
        req.setEmail("nobody@agripulse.demo");
        req.setPassword("whatever");
        ResponseEntity<String> resp =
                restTemplate.postForEntity("/api/auth/login", req, String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void invalidPasswordIsUnauthorized() {
        LoginRequest req = new LoginRequest();
        req.setEmail("buyer@agripulse.demo");
        req.setPassword("wrongpassword");
        ResponseEntity<String> resp =
                restTemplate.postForEntity("/api/auth/login", req, String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void missingTokenIsUnauthorized() {
        assertThat(get("/api/users/me", null).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void malformedTokenIsUnauthorized() {
        assertThat(get("/api/users/me", "garbage.not.a.jwt").getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void expiredTokenIsUnauthorized() {
        JwtTokenProvider expiredProvider = new JwtTokenProvider(jwtSecret, -1000L);
        String expired = expiredProvider.generateToken("u-buyer-1",
                "buyer@agripulse.demo", "BUYER");
        assertThat(get("/api/users/me", expired).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void buyerCanReadSelfButNotAdmin() {
        String token = login("buyer@agripulse.demo", "buyer123");
        ResponseEntity<String> me = get("/api/users/me", token);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody()).contains("\"role\":\"buyer\"");
        assertThat(get("/api/admin/ping", token).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void supplierCanReadSelfButNotAdmin() {
        String token = login("supplier@agripulse.demo", "supplier123");
        ResponseEntity<String> me = get("/api/users/me", token);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody()).contains("\"role\":\"supplier\"");
        assertThat(get("/api/admin/ping", token).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void adminCanReachAdminProbe() {
        String token = login("admin@agripulse.demo", "admin123");
        assertThat(get("/api/admin/ping", token).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(get("/api/users/me", token).getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
