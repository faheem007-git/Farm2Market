package com.agripulse.backend;

import com.agripulse.backend.model.Produce;
import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.model.enums.ProduceStatus;
import com.agripulse.backend.repository.ProduceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Persists Produce through a REAL MySQL database (local server, create-drop).
 * Requires mysqld on localhost:3306 with the agripulse database/user.
 */
@SpringBootTest
@ActiveProfiles("mysqltest")
@Transactional
class ProduceMysqlTest {

    @Autowired
    private ProduceRepository produceRepository;

    @Test
    void produceRoundTripsThroughMysql() {
        Produce p = new Produce();
        p.setId("p-mysql-1");
        p.setName("Onions");
        p.setGrade(ProduceGrade.B);
        p.setQuantityKg(new BigDecimal("2500.50"));
        p.setPricePerKg(new BigDecimal("22.75"));
        p.setPriceRangeMin(new BigDecimal("20.00"));
        p.setPriceRangeMax(new BigDecimal("25.00"));
        p.setSupplierId("u-s-1");
        p.setSupplierName("Ravi FPO");
        p.setLocation("Nashik");
        p.setHarvestDate(LocalDate.parse("2026-09-08"));
        p.setAvailableFrom(LocalDate.parse("2026-09-08"));
        p.setAvailableUntil(LocalDate.parse("2026-09-25"));
        p.setStatus(ProduceStatus.ACTIVE);
        p.setImageEmoji("\uD83E\uDDC5");
        produceRepository.saveAndFlush(p);

        Produce reloaded = produceRepository.findById("p-mysql-1").orElseThrow();
        assertThat(reloaded.getQuantityKg()).isEqualByComparingTo("2500.50");
        assertThat(reloaded.getPricePerKg()).isEqualByComparingTo("22.75");
        assertThat(reloaded.getGrade()).isEqualTo(ProduceGrade.B);
        assertThat(reloaded.getStatus()).isEqualTo(ProduceStatus.ACTIVE);
        assertThat(reloaded.getAvailableUntil()).isEqualTo(LocalDate.parse("2026-09-25"));
        assertThat(produceRepository.findBySupplierId("u-s-1")).isNotEmpty();
    }
}
