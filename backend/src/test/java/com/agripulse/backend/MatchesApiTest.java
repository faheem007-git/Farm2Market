package com.agripulse.backend;

import com.agripulse.backend.dto.request.LoginRequest;
import com.agripulse.backend.dto.response.AuthResponse;
import com.agripulse.backend.model.Produce;
import com.agripulse.backend.model.Requirement;
import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.repository.ProduceRepository;
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
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:db-matches;DB_CLOSE_DELAY=-1;MODE=MYSQL")
class MatchesApiTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private RequirementRepository requirements;

    @Autowired
    private ProduceRepository produceRepo;

    private String buyerToken;

    @BeforeEach
    void setup() {
        buyerToken = login("buyer@agripulse.demo", "buyer123");

        requirements.findById("r-abc-tomato").orElseGet(() -> {
            Requirement r = new Requirement();
            r.setId("r-abc-tomato");
            r.setBuyerId("u-buyer-1");
            r.setBuyerCompany("ABC Foods Pvt Ltd");
            r.setProduceName("Tomatoes");
            r.setGrade(ProduceGrade.A);
            r.setQuantityKg(new BigDecimal("5000"));
            r.setPriceMinPerKg(new BigDecimal("25"));
            r.setPriceMaxPerKg(new BigDecimal("30"));
            r.setDeliveryLocation("Hyderabad");
            r.setDeliveryDeadline(LocalDate.parse("2026-09-15"));
            return requirements.save(r);
        });

        produceRepo.findById("p-tomato-ravi").orElseGet(() -> {
            Produce p = new Produce();
            p.setId("p-tomato-ravi");
            p.setName("Tomatoes");
            p.setGrade(ProduceGrade.A);
            p.setQuantityKg(new BigDecimal("6000"));
            p.setPricePerKg(new BigDecimal("27"));
            p.setSupplierId("u-supplier-1");
            p.setSupplierName("Ravi FPO");
            p.setLocation("Rajahmundry");
            p.setHarvestDate(LocalDate.parse("2026-09-10"));
            p.setAvailableUntil(LocalDate.parse("2026-09-20"));
            p.setImageEmoji("tomato");
            return produceRepo.save(p);
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

    @Test
    void canonicalMatchScores94() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(buyerToken);
        ResponseEntity<String> resp = restTemplate.exchange(
                "/api/matches?requirementId=r-abc-tomato", HttpMethod.GET,
                new HttpEntity<>(headers), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).contains("\"score\":94");
        assertThat(resp.getBody()).contains("\"id\":\"m-r-abc-tomato-p-tomato-ravi\"");
        assertThat(resp.getBody()).contains("Ravi FPO");
        assertThat(resp.getBody()).contains("\"distanceKm\":210");
        assertThat(resp.getBody()).contains("\"gradeMatch\":true");
    }

    @Test
    void unknownRequirementReturnsEmptyList() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(buyerToken);
        ResponseEntity<String> resp = restTemplate.exchange(
                "/api/matches?requirementId=r-nope", HttpMethod.GET,
                new HttpEntity<>(headers), String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(resp.getBody()).isEqualTo("[]");
    }

    @Test
    void anonymousMatchRequestIsUnauthorized() {
        assertThat(restTemplate.getForEntity(
                "/api/matches?requirementId=r-abc-tomato", String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
