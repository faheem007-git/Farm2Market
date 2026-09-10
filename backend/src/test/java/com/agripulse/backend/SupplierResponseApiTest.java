package com.agripulse.backend;

import com.agripulse.backend.dto.request.LoginRequest;
import com.agripulse.backend.dto.response.AuthResponse;
import com.agripulse.backend.model.Requirement;
import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.repository.RequirementRepository;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties =
        "spring.datasource.url=jdbc:h2:mem:db-supplierresp;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class SupplierResponseApiTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private RequirementRepository requirements;

    private String buyerToken;
    private String supplierToken;

    @BeforeEach
    void setup() {
        buyerToken = login("buyer@agripulse.demo", "buyer123");
        supplierToken = login("supplier@agripulse.demo", "supplier123");
        requirements.findById("r-sr-1").orElseGet(() -> {
            Requirement r = new Requirement();
            r.setId("r-sr-1");
            r.setBuyerId("u-buyer-1");
            r.setBuyerCompany("ABC Foods Pvt Ltd");
            r.setProduceName("Tomatoes");
            r.setGrade(ProduceGrade.A);
            r.setQuantityKg(new BigDecimal("500"));
            r.setPriceMinPerKg(new BigDecimal("20"));
            r.setPriceMaxPerKg(new BigDecimal("30"));
            r.setDeliveryLocation("Hyderabad");
            r.setDeliveryDeadline(LocalDate.parse("2026-09-25"));
            return requirements.save(r);
        });
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

    @Test
    void supplierUpsertsAndReadsOwnBook() {
        Map<String, Object> body = new HashMap<>();
        body.put("requirementId", "r-sr-1");
        body.put("status", "responded");
        ResponseEntity<String> first = restTemplate.exchange("/api/supplier-responses",
                HttpMethod.POST, new HttpEntity<>(body, bearer(supplierToken)), String.class);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(first.getBody()).contains("\"status\":\"responded\"")
                .contains("Ravi FPO");

        // Same key overwrites instead of duplicating.
        body.put("status", "accepted");
        ResponseEntity<String> second = restTemplate.exchange("/api/supplier-responses",
                HttpMethod.POST, new HttpEntity<>(body, bearer(supplierToken)), String.class);
        assertThat(second.getBody()).contains("\"status\":\"accepted\"");

        ResponseEntity<String> list = restTemplate.exchange(
                "/api/supplier-responses?requirementId=r-sr-1", HttpMethod.GET,
                new HttpEntity<>(bearer(supplierToken)), String.class);
        assertThat(list.getBody().split("\"requirementId\"").length - 1).isEqualTo(1);
    }

    @Test
    void buyerSeesResponsesToOwnRequirementsAndBuyerCannotRespond() {
        Map<String, Object> body = new HashMap<>();
        body.put("requirementId", "r-sr-1");
        body.put("status", "responded");
        assertThat(restTemplate.exchange("/api/supplier-responses", HttpMethod.POST,
                new HttpEntity<>(body, bearer(supplierToken)), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> buyerView = restTemplate.exchange(
                "/api/supplier-responses", HttpMethod.GET,
                new HttpEntity<>(bearer(buyerToken)), String.class);
        assertThat(buyerView.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(buyerView.getBody()).contains("r-sr-1");

        assertThat(restTemplate.exchange("/api/supplier-responses", HttpMethod.POST,
                new HttpEntity<>(body, bearer(buyerToken)), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        assertThat(restTemplate.exchange("/api/supplier-responses", HttpMethod.GET,
                new HttpEntity<>(bearer(supplierToken)), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
