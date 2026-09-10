package com.agripulse.backend.service;

import com.agripulse.backend.dto.request.UpsertSupplierResponseRequest;
import com.agripulse.backend.dto.response.SupplierResponseResponse;
import com.agripulse.backend.model.Requirement;
import com.agripulse.backend.model.SupplierResponse;
import com.agripulse.backend.model.User;
import com.agripulse.backend.model.enums.SupplierResponseStatus;
import com.agripulse.backend.repository.RequirementRepository;
import com.agripulse.backend.repository.SupplierResponseRepository;
import com.agripulse.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class SupplierResponseService {

    private final SupplierResponseRepository responses;
    private final RequirementRepository requirements;
    private final UserRepository users;

    public SupplierResponseService(SupplierResponseRepository responses,
                                   RequirementRepository requirements,
                                   UserRepository users) {
        this.responses = responses;
        this.requirements = requirements;
        this.users = users;
    }

    /**
     * Suppliers see their own book; buyers see responses to their own
     * requirements; admin sees everything. Optional filters narrow further.
     */
    public List<SupplierResponseResponse> list(String callerId, String callerRole,
                                               String requirementId, String supplierId) {
        List<SupplierResponse> found;
        if (callerRole.equals("ADMIN")) {
            found = responses.findAll();
        } else if (callerRole.equals("SUPPLIER")) {
            found = responses.findBySupplierId(callerId);
        } else {
            List<String> ownReqIds = requirements.findByBuyerId(callerId).stream()
                    .map(Requirement::getId).toList();
            found = responses.findAll().stream()
                    .filter(r -> ownReqIds.contains(r.getRequirementId()))
                    .toList();
        }
        return found.stream()
                .filter(r -> requirementId == null || r.getRequirementId().equals(requirementId))
                .filter(r -> supplierId == null || r.getSupplierId().equals(supplierId))
                .map(SupplierResponseResponse::from)
                .toList();
    }

    /** Upsert keyed by (requirementId, supplierId); supplier side forced to self. */
    @Transactional
    public SupplierResponseResponse upsert(String callerId, String callerRole,
                                           UpsertSupplierResponseRequest req) {
        // Authorize before touching data: no existence oracle for non-suppliers.
        String requestedId = req.getSupplierId();
        if (!callerRole.equals("ADMIN")) {
            if (!callerRole.equals("SUPPLIER")) {
                throw new ForbiddenException("Only suppliers can respond to requirements");
            }
            requestedId = callerId;
        }
        if (requestedId == null) {
            throw new IllegalArgumentException("supplierId is required");
        }
        final String supplierId = requestedId;
        Requirement requirement = requirements.findById(req.getRequirementId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Requirement not found: " + req.getRequirementId()));
        User supplier = users.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + supplierId));

        SupplierResponse r = responses
                .findByRequirementIdAndSupplierId(requirement.getId(), supplier.getId())
                .orElseGet(() -> new SupplierResponse(requirement.getId(),
                        supplier.getId(), supplier.getCompany(),
                        SupplierResponseStatus.RESPONDED));
        r.setSupplierName(supplier.getCompany());
        r.setStatus(req.getStatus());
        r.setUpdatedAt(Instant.now());
        return SupplierResponseResponse.from(responses.save(r));
    }
}
