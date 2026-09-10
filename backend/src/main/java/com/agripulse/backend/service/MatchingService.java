package com.agripulse.backend.service;

import com.agripulse.backend.model.Produce;
import com.agripulse.backend.model.Requirement;
import com.agripulse.backend.model.enums.ProduceGrade;
import com.agripulse.backend.repository.ProduceRepository;
import com.agripulse.backend.repository.RequirementRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Deterministic rule-based matcher (no ML) - an exact port of the frontend
 * algorithm in utils/matching.ts + services.matchingService.
 *
 * Stateless: computed from current Produce + Requirement rows on every call.
 * Nothing is persisted.
 */
@Service
public class MatchingService {

    /** Distances (km) from the buyer's hub (Hyderabad) to growing regions. */
    private static final Map<String, Integer> DISTANCE_KM = Map.of(
        "Hyderabad", 15,
        "Secunderabad", 25,
        "Rajahmundry", 210,
        "Kurnool", 210,
        "Guntur", 270,
        "Nashik", 560
    );

    private static final Map<ProduceGrade, Integer> GRADE_ORDER = Map.of(
        ProduceGrade.A, 0,
        ProduceGrade.B, 1,
        ProduceGrade.C, 2
    );

    private final ProduceRepository produceRepository;
    private final RequirementRepository requirementRepository;

    public MatchingService(ProduceRepository produceRepository,
                           RequirementRepository requirementRepository) {
        this.produceRepository = produceRepository;
        this.requirementRepository = requirementRepository;
    }

    /** Best-first matches for a requirement; empty list when unknown. */
    public List<ComputedMatch> findMatches(String requirementId) {
        return requirementRepository.findById(requirementId)
                .map(req -> produceRepository.findAll().stream()
                        .filter(p -> p.getName().equals(req.getProduceName()))
                        .map(p -> toMatch(requirementId, req, p))
                        .sorted(Comparator.comparingInt(ComputedMatch::score).reversed())
                        .toList())
                .orElse(List.of());
    }

    private static ComputedMatch toMatch(String requirementId, Requirement req, Produce p) {
        MatchFactors factors = scoreFactors(req, p);
        BigDecimal qty = p.getQuantityKg().min(req.getQuantityKg());
        return new ComputedMatch(
                "m-" + requirementId + "-" + p.getId(),
                requirementId,
                p.getId(),
                p.getSupplierId(),
                p.getSupplierName(),
                weightedScore(factors),
                p.getPricePerKg(),
                qty,
                distanceKm(p.getLocation()),
                p.getGrade() == req.getGrade(),
                factorReasons(req, p, factors),
                factors);
    }

    public static MatchFactors scoreFactors(Requirement req, Produce produce) {
        int product = produce.getName().equals(req.getProduceName()) ? 100 : 0;

        double coverage = Math.min(produce.getQuantityKg().doubleValue(),
                req.getQuantityKg().doubleValue()) / req.getQuantityKg().doubleValue();
        int quantity = (int) Math.round(coverage * 100);

        int gradeGap = Math.abs(
                GRADE_ORDER.getOrDefault(produce.getGrade(), 9)
                        - GRADE_ORDER.getOrDefault(req.getGrade(), 9));
        int quality = gradeGap == 0 ? 100 : gradeGap == 1 ? 60 : 25;

        int price;
        double unitPrice = produce.getPricePerKg().doubleValue();
        double min = req.getPriceMinPerKg().doubleValue();
        double max = req.getPriceMaxPerKg().doubleValue();
        if (unitPrice >= min && unitPrice <= max) {
            price = 100;
        } else if (unitPrice < min) {
            price = 85;
        } else {
            double over = (unitPrice - max) / max;
            price = Math.max(10, (int) Math.round(100 - over * 200));
        }

        int km = distanceKm(produce.getLocation());
        int location = km <= 100 ? 100 : km <= 200 ? 75 : km <= 300 ? 50 : km <= 500 ? 35 : 20;

        long coverDays = ChronoUnit.DAYS.between(req.getDeliveryDeadline(), produce.getAvailableUntil());
        int availability = coverDays >= 14 ? 100
                : coverDays >= 7 ? 90
                : coverDays >= 3 ? 80
                : coverDays >= 0 ? 70
                : coverDays >= -3 ? 60
                : 25;

        return new MatchFactors(product, quantity, quality, price, location, availability);
    }

    public static int weightedScore(MatchFactors f) {
        return (int) Math.round(
                (f.getProduct() * 30 + f.getQuantity() * 20 + f.getQuality() * 20
                        + f.getPrice() * 15 + f.getLocation() * 10 + f.getAvailability() * 5)
                        / 100.0);
    }

    public static int distanceKm(String location) {
        return DISTANCE_KM.getOrDefault(location, 300);
    }

    public static List<String> factorReasons(Requirement req, Produce produce, MatchFactors factors) {
        NumberFormat in = NumberFormat.getInstance(new Locale("en", "IN"));
        in.setMaximumFractionDigits(2);
        List<String> reasons = new ArrayList<>();
        reasons.add("Product " + (factors.getProduct() == 100 ? "match" : "mismatch")
                + ": " + produce.getName());
        reasons.add("Quantity covers " + factors.getQuantity() + "% of "
                + in.format(req.getQuantityKg()) + " kg needed");
        reasons.add(factors.getQuality() == 100
                ? "Grade " + produce.getGrade() + " as required"
                : "Grade " + produce.getGrade() + " (needs " + req.getGrade() + ")");
        reasons.add(factors.getPrice() == 100
                ? "\u20B9" + MatchFactors.fmt(produce.getPricePerKg()) + "/kg within \u20B9"
                        + MatchFactors.fmt(req.getPriceMinPerKg()) + "\u2013\u20B9"
                        + MatchFactors.fmt(req.getPriceMaxPerKg())
                : "\u20B9" + MatchFactors.fmt(produce.getPricePerKg()) + "/kg vs band \u20B9"
                        + MatchFactors.fmt(req.getPriceMinPerKg()) + "\u2013\u20B9"
                        + MatchFactors.fmt(req.getPriceMaxPerKg()));
        reasons.add(distanceKm(produce.getLocation()) + " km from " + req.getDeliveryLocation());
        reasons.add("Available till " + produce.getAvailableUntil()
                + " (need by " + req.getDeliveryDeadline() + ")");
        return reasons;
    }

    /** Computed match - a DTO, never persisted. */
    public record ComputedMatch(
            String id,
            String requirementId,
            String produceId,
            String supplierId,
            String supplierName,
            int score,
            BigDecimal pricePerKg,
            BigDecimal quantityKg,
            int distanceKm,
            boolean gradeMatch,
            List<String> reasons,
            MatchFactors factors) {}
}
