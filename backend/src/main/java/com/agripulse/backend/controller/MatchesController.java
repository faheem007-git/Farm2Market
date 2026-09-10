package com.agripulse.backend.controller;

import com.agripulse.backend.service.MatchFactors;
import com.agripulse.backend.service.MatchingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/** Stateless computed matches. Nothing here is persisted. */
@RestController
@RequestMapping("/api/matches")
public class MatchesController {

    private final MatchingService matchingService;

    public MatchesController(MatchingService matchingService) {
        this.matchingService = matchingService;
    }

    @GetMapping
    public ResponseEntity<List<MatchResponse>> find(@RequestParam String requirementId) {
        return ResponseEntity.ok(matchingService.findMatches(requirementId).stream()
                .map(MatchResponse::from).toList());
    }

    public record MatchResponse(
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
            MatchFactors factors) {

        static MatchResponse from(MatchingService.ComputedMatch m) {
            return new MatchResponse(m.id(), m.requirementId(), m.produceId(),
                    m.supplierId(), m.supplierName(), m.score(), m.pricePerKg(),
                    m.quantityKg(), m.distanceKm(), m.gradeMatch(), m.reasons(), m.factors());
        }
    }
}
