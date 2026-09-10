package com.agripulse.backend;

import com.agripulse.backend.model.Produce;
import com.agripulse.backend.model.Requirement;
import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.service.MatchFactors;
import com.agripulse.backend.service.MatchingService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure unit tests for the ported matcher (no Spring context).
 * Every factor plus the canonical 94 case from the audit.
 */
class MatchingServiceTest {

    private Requirement req() {
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
        return r;
    }

    private Produce produce() {
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
        p.setImageEmoji("🍅");
        return p;
    }

    @Test
    void canonicalCaseScores94WithExpectedFactors() {
        MatchFactors f = MatchingService.scoreFactors(req(), produce());
        assertThat(f.getProduct()).isEqualTo(100);
        assertThat(f.getQuantity()).isEqualTo(100);
        assertThat(f.getQuality()).isEqualTo(100);
        assertThat(f.getPrice()).isEqualTo(100);
        assertThat(f.getLocation()).isEqualTo(50);
        assertThat(f.getAvailability()).isEqualTo(80);
        assertThat(MatchingService.weightedScore(f)).isEqualTo(94);
    }

    @Test
    void productFactor() {
        assertThat(MatchingService.scoreFactors(req(), produce()).getProduct()).isEqualTo(100);
        Produce other = produce();
        other.setName("Onions");
        assertThat(MatchingService.scoreFactors(req(), other).getProduct()).isEqualTo(0);
    }

    @Test
    void quantityFactor() {
        Produce half = produce();
        half.setQuantityKg(new BigDecimal("2500"));
        assertThat(MatchingService.scoreFactors(req(), half).getQuantity()).isEqualTo(50);

        Produce exact = produce();
        exact.setQuantityKg(new BigDecimal("5000"));
        assertThat(MatchingService.scoreFactors(req(), exact).getQuantity()).isEqualTo(100);

        // Oversupply caps at 100, never above.
        assertThat(MatchingService.scoreFactors(req(), produce()).getQuantity()).isEqualTo(100);
    }

    @Test
    void qualityFactor() {
        Produce b = produce();
        b.setGrade(ProduceGrade.B);
        assertThat(MatchingService.scoreFactors(req(), b).getQuality()).isEqualTo(60);

        Produce c = produce();
        c.setGrade(ProduceGrade.C);
        assertThat(MatchingService.scoreFactors(req(), c).getQuality()).isEqualTo(25);
    }

    @Test
    void priceFactor() {
        Produce below = produce();
        below.setPricePerKg(new BigDecimal("20"));
        assertThat(MatchingService.scoreFactors(req(), below).getPrice()).isEqualTo(85);

        Produce slightlyAbove = produce();
        slightlyAbove.setPricePerKg(new BigDecimal("33")); // over=0.1 -> 100-20=80
        assertThat(MatchingService.scoreFactors(req(), slightlyAbove).getPrice()).isEqualTo(80);

        Produce farAbove = produce();
        farAbove.setPricePerKg(new BigDecimal("60")); // over=1 -> max(10, -100)=10
        assertThat(MatchingService.scoreFactors(req(), farAbove).getPrice()).isEqualTo(10);
    }

    @Test
    void locationFactor() {
        assertThat(MatchingService.distanceKm("Hyderabad")).isEqualTo(15);
        assertThat(MatchingService.distanceKm("Rajahmundry")).isEqualTo(210);
        assertThat(MatchingService.distanceKm("Nashik")).isEqualTo(560);
        assertThat(MatchingService.distanceKm("UnknownVillage")).isEqualTo(300);

        Produce near = produce();
        near.setLocation("Hyderabad");
        assertThat(MatchingService.scoreFactors(req(), near).getLocation()).isEqualTo(100);

        Produce far = produce();
        far.setLocation("Nashik");
        assertThat(MatchingService.scoreFactors(req(), far).getLocation()).isEqualTo(20);
    }

    @Test
    void availabilityFactor() {
        assertThat(coverPlus(20)).isEqualTo(100);
        assertThat(coverPlus(14)).isEqualTo(100);
        assertThat(coverPlus(10)).isEqualTo(90);
        assertThat(coverPlus(7)).isEqualTo(90);
        assertThat(coverPlus(5)).isEqualTo(80);
        assertThat(coverPlus(3)).isEqualTo(80);
        assertThat(coverPlus(1)).isEqualTo(70);
        assertThat(coverPlus(0)).isEqualTo(70);
        assertThat(coverPlus(-2)).isEqualTo(60);
        assertThat(coverPlus(-3)).isEqualTo(60);
        assertThat(coverPlus(-10)).isEqualTo(25);
    }

    private int coverPlus(int days) {
        Produce p = produce();
        p.setAvailableUntil(LocalDate.parse("2026-09-15").plusDays(days));
        return MatchingService.scoreFactors(req(), p).getAvailability();
    }

    @Test
    void reasonsExplainEveryFactor() {
        List<String> reasons = MatchingService.factorReasons(
                req(), produce(), MatchingService.scoreFactors(req(), produce()));
        assertThat(reasons).hasSize(6);
        assertThat(reasons.get(0)).isEqualTo("Product match: Tomatoes");
        assertThat(reasons.get(1)).contains("100%").contains("5,000 kg needed");
        assertThat(reasons.get(2)).isEqualTo("Grade A as required");
        assertThat(reasons.get(3)).contains("within");
        assertThat(reasons.get(4)).isEqualTo("210 km from Hyderabad");
        assertThat(reasons.get(5)).isEqualTo("Available till 2026-09-20 (need by 2026-09-15)");
    }
}
