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
        "spring.datasource.url=jdbc:h2:mem:db-chat;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class ChatApiTest {

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
        // One fresh supplier per test: threads are idempotent per buyer/supplier
        // pair, so each test needs its own pair for an isolated thread.
        ensureSupplier("u-s-a", "sa@agripulse.demo", "Supplier A");
        ensureSupplier("u-s-b", "sb@agripulse.demo", "Supplier B");
        ensureSupplier("u-s-c", "sc@agripulse.demo", "Supplier C");
    }

    private void ensureSupplier(String id, String email, String company) {
        if (!users.existsByEmail(email)) {
            User s = new User(id, email, passwordEncoder.encode("supplier123"),
                    company, Role.SUPPLIER, company, "Guntur");
            users.save(s);
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

    private String openThread() {
        return openThread("u-supplier-1", "5000 kg Tomatoes");
    }

    private String openThread(String supplierId, String subject) {
        Map<String, Object> body = new HashMap<>();
        body.put("supplierId", supplierId);
        body.put("subject", subject);
        ResponseEntity<String> resp = restTemplate.exchange("/api/conversations",
                HttpMethod.POST, new HttpEntity<>(body, bearer(buyerToken)), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(resp.getBody()).contains("\"unreadBuyer\":0")
                .contains("\"unreadSupplier\":0");
        return resp.getBody().split("\"id\":\"")[1].split("\"")[0];
    }

    private ResponseEntity<String> send(String id, String token, String text) {
        return restTemplate.exchange("/api/conversations/" + id + "/messages",
                HttpMethod.POST, new HttpEntity<>(Map.of("text", text), bearer(token)),
                String.class);
    }

    private String thread(String id, String token) {
        ResponseEntity<String> resp = restTemplate.exchange("/api/conversations",
                HttpMethod.GET, new HttpEntity<>(bearer(token)), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        // Extract the single thread object for this id from the list.
        String body = resp.getBody();
        int start = body.indexOf("\"id\":\"" + id + "\"");
        assertThat(start).isGreaterThanOrEqualTo(0);
        int objStart = body.lastIndexOf("{", start);
        int depth = 0;
        int end = objStart;
        for (; end < body.length(); end++) {
            if (body.charAt(end) == '{') depth++;
            if (body.charAt(end) == '}') {
                depth--;
                if (depth == 0) break;
            }
        }
        return body.substring(objStart, end + 1);
    }

    @Test
    void openThreadIsIdempotentPerPair() {
        String first = openThread("u-s-c", "First subject");
        assertThat(first).startsWith("c-u-s-c-");

        // Same pair, different subject: existing thread returned unchanged.
        String second = openThread("u-s-c", "Different subject");
        assertThat(second).isEqualTo(first);

        HttpHeaders headers = bearer(buyerToken);
        ResponseEntity<String> resp = restTemplate.exchange("/api/conversations",
                HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertThat(thread(first, buyerToken)).contains("First subject");
    }

    @Test
    void messageCountersMoveForOtherPartyOnly() {
        String id = openThread();

        // Supplier writes: buyer unread goes to 1, supplier stays 0.
        assertThat(send(id, supplierToken, "Dispatch tomorrow").getStatusCode())
                .isEqualTo(HttpStatus.CREATED);
        assertThat(thread(id, buyerToken)).contains("\"unreadBuyer\":1");
        assertThat(thread(id, supplierToken)).contains("\"unreadSupplier\":0")
                .contains("Dispatch tomorrow");

        // Buyer writes: supplier unread goes to 1, buyer stays 1.
        assertThat(send(id, buyerToken, "Noted, thanks").getStatusCode())
                .isEqualTo(HttpStatus.CREATED);
        assertThat(thread(id, supplierToken)).contains("\"unreadSupplier\":1");
        assertThat(thread(id, buyerToken)).contains("\"unreadBuyer\":1");
    }

    @Test
    void readSemanticsMatchFrontendAsymmetry() {
        String sbToken = login("sb@agripulse.demo", "supplier123");
        String id = openThread("u-s-b", "Read check");
        send(id, sbToken, "Dispatch tomorrow");
        send(id, buyerToken, "Noted");

        // Buyer read: counter zeroed AND every message flagged read.
        assertThat(restTemplate.exchange("/api/conversations/" + id + "/read",
                HttpMethod.POST, new HttpEntity<>(bearer(buyerToken)), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(thread(id, buyerToken)).contains("\"unreadBuyer\":0");
        ResponseEntity<String> msgs = restTemplate.exchange(
                "/api/conversations/" + id + "/messages", HttpMethod.GET,
                new HttpEntity<>(bearer(buyerToken)), String.class);
        assertThat(msgs.getBody()).doesNotContain("\"read\":false");

        // Supplier read zeroes only their counter; message flags untouched.
        assertThat(thread(id, sbToken)).contains("\"unreadSupplier\":1");
        assertThat(restTemplate.exchange("/api/conversations/" + id + "/read",
                HttpMethod.POST, new HttpEntity<>(bearer(sbToken)), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(thread(id, sbToken)).contains("\"unreadSupplier\":0");
    }

    @Test
    void strangerIsolationAndMissingThread() {
        String id = openThread("u-s-a", "Stranger check");
        String stranger = login("buyer2@agripulse.demo", "buyer2123");
        HttpHeaders h = bearer(stranger);

        assertThat(restTemplate.exchange("/api/conversations", HttpMethod.GET,
                new HttpEntity<>(h), String.class).getBody()).doesNotContain(id);
        assertThat(restTemplate.exchange("/api/conversations/" + id + "/messages",
                HttpMethod.GET, new HttpEntity<>(h), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(send(id, stranger, "hijack").getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(restTemplate.exchange("/api/conversations/" + id + "/read",
                HttpMethod.POST, new HttpEntity<>(h), String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        // Sending to a nonexistent conversation fails.
        assertThat(send("c-nope", buyerToken, "hello").getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        // Blank text rejected.
        ResponseEntity<String> blank = restTemplate.exchange(
                "/api/conversations/" + id + "/messages", HttpMethod.POST,
                new HttpEntity<>(Map.of("text", "   "), bearer(buyerToken)), String.class);
        assertThat(blank.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
