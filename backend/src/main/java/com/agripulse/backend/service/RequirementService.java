package com.agripulse.backend.service;

import com.agripulse.backend.dto.request.CreateRequirementRequest;
import com.agripulse.backend.dto.request.UpdateRequirementStatusRequest;
import com.agripulse.backend.dto.response.RequirementResponse;
import com.agripulse.backend.model.Produce;
import com.agripulse.backend.model.Requirement;
import com.agripulse.backend.model.User;
import com.agripulse.backend.model.enums.NotificationKind;
import com.agripulse.backend.model.enums.RequirementStatus;
import com.agripulse.backend.model.enums.Role;
import com.agripulse.backend.repository.ProduceRepository;
import com.agripulse.backend.repository.RequirementRepository;
import com.agripulse.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class RequirementService {

    private final RequirementRepository requirementRepository;
    private final UserRepository userRepository;
    private final ProduceRepository produceRepository;
    private final NotificationService notificationService;

    public RequirementService(RequirementRepository requirementRepository,
                              UserRepository userRepository,
                              ProduceRepository produceRepository,
                              NotificationService notificationService) {
        this.requirementRepository = requirementRepository;
        this.userRepository = userRepository;
        this.produceRepository = produceRepository;
        this.notificationService = notificationService;
    }

    public List<RequirementResponse> list() {
        return requirementRepository.findAll().stream().map(RequirementResponse::from).toList();
    }

    public RequirementResponse get(String id) {
        return RequirementResponse.from(findOrThrow(id));
    }

    @Transactional
    public RequirementResponse create(String buyerId, CreateRequirementRequest req) {
        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + buyerId));
        if (req.getPriceMinPerKg().compareTo(req.getPriceMaxPerKg()) > 0) {
            throw new IllegalArgumentException("priceMinPerKg must not exceed priceMaxPerKg");
        }
        if (req.getDeliveryDeadline().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("deliveryDeadline must not be in the past");
        }

        Requirement r = new Requirement();
        r.setId("r-" + UUID.randomUUID().toString().substring(0, 8));
        r.setBuyerId(buyer.getId());
        r.setBuyerCompany(buyer.getCompany());
        r.setProduceName(req.getProduceName().trim());
        r.setCategory(req.getCategory());
        r.setGrade(req.getGrade());
        r.setQuantityKg(req.getQuantityKg());
        r.setUnit(req.getUnit());
        r.setPriceMinPerKg(req.getPriceMinPerKg());
        r.setPriceMaxPerKg(req.getPriceMaxPerKg());
        r.setDeliveryLocation(req.getDeliveryLocation());
        r.setDeliveryDeadline(req.getDeliveryDeadline());
        r.setDescription(req.getDescription());
        r.setStatus(RequirementStatus.OPEN);
        Requirement saved = requirementRepository.save(r);

        notificationService.notifyRole(
                Role.SUPPLIER,
                "New buyer request",
                buyer.getCompany() + " needs "
                        + NotificationService.qty(saved.getQuantityKg()) + " kg "
                        + saved.getProduceName() + " in " + saved.getDeliveryLocation(),
                NotificationKind.INFO,
                "/supplier/requests");

        // Buyer immediately learns the best existing match (same engine as Matches).
        produceRepository.findAll().stream()
                .filter(p -> p.getName().equals(saved.getProduceName()))
                .map(p -> new TopMatch(p,
                        MatchingService.weightedScore(
                                MatchingService.scoreFactors(saved, p))))
                .max((a, b) -> Integer.compare(a.score(), b.score()))
                .ifPresent(top -> notificationService.notifyUser(
                        buyer.getId(),
                        "New match for " + saved.getProduceName(),
                        top.produce().getSupplierName() + " \u00B7 " + top.score() + "% \u00B7 \u20B9"
                                + NotificationService.money(
                                        top.produce().getPricePerKg()) + "/kg",
                        NotificationKind.SUCCESS,
                        "/buyer/matches?requirement=" + saved.getId()));
        return RequirementResponse.from(saved);
    }

    private record TopMatch(Produce produce, int score) {}

    @Transactional
    public RequirementResponse updateStatus(String id, String callerId, boolean callerIsAdmin,
                                            UpdateRequirementStatusRequest req) {
        Requirement r = findOrThrow(id);
        if (!callerIsAdmin && !r.getBuyerId().equals(callerId)) {
            throw new ForbiddenException("Only the owning buyer can modify this requirement");
        }
        r.setStatus(req.getStatus());
        return RequirementResponse.from(requirementRepository.save(r));
    }

    private Requirement findOrThrow(String id) {
        return requirementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + id));
    }
}
