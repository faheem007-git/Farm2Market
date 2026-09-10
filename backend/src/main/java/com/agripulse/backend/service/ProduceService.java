package com.agripulse.backend.service;

import com.agripulse.backend.dto.request.CreateProduceRequest;
import com.agripulse.backend.dto.request.UpdateProduceRequest;
import com.agripulse.backend.dto.response.ProduceResponse;
import com.agripulse.backend.model.Produce;
import com.agripulse.backend.model.User;
import com.agripulse.backend.model.enums.NotificationKind;
import com.agripulse.backend.model.enums.ProduceStatus;
import com.agripulse.backend.model.enums.RequirementStatus;
import com.agripulse.backend.repository.ProduceRepository;
import com.agripulse.backend.repository.RequirementRepository;
import com.agripulse.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ProduceService {

    private static final Map<String, String> EMOJI_BY_NAME = Map.of(
        "tomatoes", "\uD83C\uDF45",
        "onions", "\uD83E\uDDC5",
        "green chillies", "\uD83C\uDF36\uFE0F",
        "green chilies", "\uD83C\uDF36\uFE0F"
    );

    private final ProduceRepository produceRepository;
    private final UserRepository userRepository;
    private final RequirementRepository requirementRepository;
    private final NotificationService notificationService;

    public ProduceService(ProduceRepository produceRepository, UserRepository userRepository,
                          RequirementRepository requirementRepository,
                          NotificationService notificationService) {
        this.produceRepository = produceRepository;
        this.userRepository = userRepository;
        this.requirementRepository = requirementRepository;
        this.notificationService = notificationService;
    }

    public List<ProduceResponse> list() {
        return produceRepository.findAll().stream().map(ProduceResponse::from).toList();
    }

    public ProduceResponse get(String id) {
        return ProduceResponse.from(findOrThrow(id));
    }

    @Transactional
    public ProduceResponse create(String supplierId, CreateProduceRequest req) {
        User supplier = userRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + supplierId));
        checkDates(req.getHarvestDate(), req.getAvailableFrom(), req.getAvailableUntil());
        checkPriceRange(req.getPriceRangeMin(), req.getPriceRangeMax());

        Produce p = new Produce();
        p.setId("p-" + UUID.randomUUID().toString().substring(0, 8));
        p.setName(req.getName().trim());
        p.setVariety(req.getVariety());
        p.setCategory(req.getCategory());
        p.setGrade(req.getGrade());
        p.setQuantityKg(req.getQuantityKg());
        p.setUnit(req.getUnit());
        p.setPricePerKg(req.getPricePerKg());
        p.setPriceRangeMin(req.getPriceRangeMin());
        p.setPriceRangeMax(req.getPriceRangeMax());
        p.setSupplierId(supplier.getId());
        p.setSupplierName(supplier.getCompany());
        p.setLocation(req.getLocation());
        p.setHarvestDate(req.getHarvestDate());
        p.setAvailableFrom(req.getAvailableFrom() != null
                ? req.getAvailableFrom() : req.getHarvestDate());
        p.setAvailableUntil(req.getAvailableUntil());
        p.setDescription(req.getDescription());
        p.setStatus(ProduceStatus.ACTIVE);
        p.setImageEmoji(req.getImageEmoji() != null
                ? req.getImageEmoji() : emojiFor(req.getName()));
        Produce saved = produceRepository.save(p);
        // Tell buyers with overlapping open demand - bounded, one per requirement.
        requirementRepository.findAll().stream()
                .filter(r -> (r.getStatus() == RequirementStatus.OPEN
                                || r.getStatus() == RequirementStatus.MATCHED)
                        && r.getProduceName().equals(saved.getName()))
                .forEach(r -> notificationService.notifyUser(
                        r.getBuyerId(),
                        "New match for " + r.getProduceName(),
                        saved.getSupplierName() + " listed "
                                + NotificationService.qty(saved.getQuantityKg()) + " kg @ \u20B9"
                                + NotificationService.money(saved.getPricePerKg()) + "/kg",
                        NotificationKind.SUCCESS,
                        "/buyer/matches?requirement=" + r.getId()));
        return ProduceResponse.from(saved);
    }

    @Transactional
    public ProduceResponse update(String id, String callerId, boolean callerIsAdmin,
                                  UpdateProduceRequest req) {
        Produce p = findOrThrow(id);
        if (!callerIsAdmin && !p.getSupplierId().equals(callerId)) {
            throw new ForbiddenException("Only the owning supplier can modify this produce");
        }

        LocalDate harvest = req.getHarvestDate() != null ? req.getHarvestDate() : p.getHarvestDate();
        LocalDate from = req.getAvailableFrom() != null ? req.getAvailableFrom() : p.getAvailableFrom();
        LocalDate until = req.getAvailableUntil() != null ? req.getAvailableUntil() : p.getAvailableUntil();
        checkDates(harvest, from, until);
        BigDecimal rangeMin = req.getPriceRangeMin() != null ? req.getPriceRangeMin() : p.getPriceRangeMin();
        BigDecimal rangeMax = req.getPriceRangeMax() != null ? req.getPriceRangeMax() : p.getPriceRangeMax();
        checkPriceRange(rangeMin, rangeMax);

        if (req.getName() != null) p.setName(req.getName().trim());
        if (req.getVariety() != null) p.setVariety(req.getVariety());
        if (req.getCategory() != null) p.setCategory(req.getCategory());
        if (req.getGrade() != null) p.setGrade(req.getGrade());
        if (req.getQuantityKg() != null) p.setQuantityKg(req.getQuantityKg());
        if (req.getUnit() != null) p.setUnit(req.getUnit());
        if (req.getPricePerKg() != null) p.setPricePerKg(req.getPricePerKg());
        if (req.getPriceRangeMin() != null) p.setPriceRangeMin(req.getPriceRangeMin());
        if (req.getPriceRangeMax() != null) p.setPriceRangeMax(req.getPriceRangeMax());
        if (req.getLocation() != null) p.setLocation(req.getLocation());
        if (req.getHarvestDate() != null) p.setHarvestDate(req.getHarvestDate());
        if (req.getAvailableFrom() != null) p.setAvailableFrom(req.getAvailableFrom());
        if (req.getAvailableUntil() != null) p.setAvailableUntil(req.getAvailableUntil());
        if (req.getDescription() != null) p.setDescription(req.getDescription());
        if (req.getImageEmoji() != null) p.setImageEmoji(req.getImageEmoji());
        if (req.getStatus() != null) {
            p.setStatus(req.getStatus());
        } else if (p.getQuantityKg().compareTo(BigDecimal.ZERO) <= 0) {
            // Mirrors the frontend isProduceSoldOut rule: zero quantity means sold out.
            p.setStatus(ProduceStatus.SOLD_OUT);
        }
        return ProduceResponse.from(produceRepository.save(p));
    }

    private Produce findOrThrow(String id) {
        return produceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produce not found: " + id));
    }

    private void checkDates(LocalDate harvest, LocalDate from, LocalDate until) {
        if (until.isBefore(harvest)) {
            throw new IllegalArgumentException("availableUntil must not be before harvestDate");
        }
        if (from != null && from.isAfter(until)) {
            throw new IllegalArgumentException("availableFrom must not be after availableUntil");
        }
    }

    private void checkPriceRange(BigDecimal min, BigDecimal max) {
        if (min != null && max != null && min.compareTo(max) > 0) {
            throw new IllegalArgumentException("priceRangeMin must not exceed priceRangeMax");
        }
    }

    static String emojiFor(String name) {
        if (name == null) {
            return "\uD83C\uDF3E";
        }
        return EMOJI_BY_NAME.getOrDefault(name.trim().toLowerCase(), "\uD83C\uDF3E");
    }
}
