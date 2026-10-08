package com.grash.service;

import com.grash.dto.validation.PreApprovalValidationResultDTO;
import com.grash.dto.validation.ValidationCheckDTO;
import com.grash.model.*;
import com.grash.model.enums.Priority;
import com.grash.model.enums.ValidationCheckStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PreApprovalValidationService {

    private final UserService userService;

    @Transactional(readOnly = true)
    public PreApprovalValidationResultDTO validateRequest(Request request) {
        List<ValidationCheckDTO> checks = new ArrayList<>();

        // CHECK 1 — Asset Existence
        checks.add(validateAssetExistence(request));

        // CHECK 2 — Asset State
        checks.add(validateAssetState(request));

        // CHECK 3 — Location Consistency
        checks.add(validateLocationConsistency(request));

        // CHECK 4 — Priority Validation
        checks.add(validatePriority(request));

        // CHECK 5 — Required Technician Skill Availability
        checks.add(validateTechnicianSkill(request));

        // CHECK 6 — Spare-Part Availability
        checks.addAll(validatePartAvailability(request));

        boolean isOverallValid = checks.stream()
                .noneMatch(c -> c.getStatus() == ValidationCheckStatus.BLOCKED);

        return PreApprovalValidationResultDTO.builder()
                .requestId(request.getId())
                .customId(request.getCustomId())
                .valid(isOverallValid)
                .validatedAt(new Date())
                .checks(checks)
                .build();
    }

    private ValidationCheckDTO validateAssetExistence(Request request) {
        if (request.getAsset() == null) {
            return ValidationCheckDTO.builder()
                    .code("ASSET_EXISTS")
                    .name("Asset exists")
                    .status(ValidationCheckStatus.BLOCKED)
                    .message("No asset is associated with this maintenance request.")
                    .build();
        }
        return ValidationCheckDTO.builder()
                .code("ASSET_EXISTS")
                .name("Asset exists")
                .status(ValidationCheckStatus.PASS)
                .message("Asset " + request.getAsset().getName() + " was found.")
                .build();
    }

    private ValidationCheckDTO validateAssetState(Request request) {
        Asset asset = request.getAsset();
        if (asset == null) {
            return ValidationCheckDTO.builder()
                    .code("ASSET_STATE")
                    .name("Asset state")
                    .status(ValidationCheckStatus.BLOCKED)
                    .message("Asset is missing; cannot verify asset state.")
                    .build();
        }
        if (asset.isArchived()) {
            return ValidationCheckDTO.builder()
                    .code("ASSET_STATE")
                    .name("Asset state")
                    .status(ValidationCheckStatus.BLOCKED)
                    .message("Asset " + asset.getName() + " is archived.")
                    .build();
        }
        if (asset.getStatus() != null && asset.getStatus().isReallyDown()) {
            return ValidationCheckDTO.builder()
                    .code("ASSET_STATE")
                    .name("Asset state")
                    .status(ValidationCheckStatus.WARNING)
                    .message("Asset " + asset.getName() + " is currently reported as DOWN (" + asset.getStatus() + ").")
                    .build();
        }
        return ValidationCheckDTO.builder()
                .code("ASSET_STATE")
                .name("Asset state")
                .status(ValidationCheckStatus.PASS)
                .message("Asset " + asset.getName() + " is eligible for maintenance (Status: " + asset.getStatus() + ").")
                .build();
    }

    private ValidationCheckDTO validateLocationConsistency(Request request) {
        Location reqLoc = request.getLocation();
        Asset asset = request.getAsset();
        Location assetLoc = asset != null ? asset.getLocation() : null;

        if (assetLoc != null && reqLoc != null && !reqLoc.getId().equals(assetLoc.getId())) {
            return ValidationCheckDTO.builder()
                    .code("LOCATION_MATCH")
                    .name("Location matches")
                    .status(ValidationCheckStatus.BLOCKED)
                    .message("Request location (" + reqLoc.getName() + ") does not match asset registered location (" + assetLoc.getName() + ").")
                    .build();
        }
        if (reqLoc == null && assetLoc != null) {
            return ValidationCheckDTO.builder()
                    .code("LOCATION_MATCH")
                    .name("Location matches")
                    .status(ValidationCheckStatus.WARNING)
                    .message("Request location is unspecified, though asset belongs to location " + assetLoc.getName() + ".")
                    .build();
        }
        return ValidationCheckDTO.builder()
                .code("LOCATION_MATCH")
                .name("Location matches")
                .status(ValidationCheckStatus.PASS)
                .message("Request location is consistent with asset location.")
                .build();
    }

    private ValidationCheckDTO validatePriority(Request request) {
        Priority priority = request.getPriority();
        if (priority == null || priority == Priority.NONE) {
            return ValidationCheckDTO.builder()
                    .code("PRIORITY_VALID")
                    .name("Priority configured")
                    .status(ValidationCheckStatus.BLOCKED)
                    .message("Priority is missing or unassigned (NONE). A valid priority is required.")
                    .build();
        }
        return ValidationCheckDTO.builder()
                .code("PRIORITY_VALID")
                .name("Priority configured")
                .status(ValidationCheckStatus.PASS)
                .message("Priority is configured as " + priority.name() + ".")
                .build();
    }

    private ValidationCheckDTO validateTechnicianSkill(Request request) {
        Skill requiredSkill = request.getRequiredSkill();
        if (requiredSkill == null) {
            return ValidationCheckDTO.builder()
                    .code("TECHNICIAN_SKILL")
                    .name("Required technician skill")
                    .status(ValidationCheckStatus.PASS)
                    .message("No specific technician skill is required for this request.")
                    .build();
        }

        Company company = request.getCompany();
        java.util.Collection<User> companyUsers = userService.findByCompany(company.getId());

        boolean qualifiedTechAvailable = companyUsers.stream()
                .anyMatch(u -> u.isEnabled() && requiredSkill.getUsers().stream().anyMatch(su -> su.getId().equals(u.getId())));

        if (qualifiedTechAvailable) {
            return ValidationCheckDTO.builder()
                    .code("TECHNICIAN_SKILL")
                    .name("Required technician skill")
                    .status(ValidationCheckStatus.PASS)
                    .message("At least one qualified technician with skill '" + requiredSkill.getName() + "' is available.")
                    .build();
        } else {
            return ValidationCheckDTO.builder()
                    .code("TECHNICIAN_SKILL")
                    .name("Required technician skill")
                    .status(ValidationCheckStatus.BLOCKED)
                    .message("No available technician possesses the required skill '" + requiredSkill.getName() + "'.")
                    .build();
        }
    }

    private List<ValidationCheckDTO> validatePartAvailability(Request request) {
        List<ValidationCheckDTO> partChecks = new ArrayList<>();
        List<PartQuantity> requiredParts = request.getRequiredParts();

        if (requiredParts == null || requiredParts.isEmpty()) {
            partChecks.add(ValidationCheckDTO.builder()
                    .code("PART_AVAILABILITY")
                    .name("Spare parts available")
                    .status(ValidationCheckStatus.PASS)
                    .message("No required spare parts specified for this request.")
                    .build());
            return partChecks;
        }

        for (PartQuantity pq : requiredParts) {
            Part part = pq.getPart();
            double reqQty = pq.getQuantity();
            double availQty = part != null ? part.getQuantity() : 0.0;
            String partName = part != null ? part.getName() : "Unknown Part";

            if (availQty < reqQty) {
                partChecks.add(ValidationCheckDTO.builder()
                        .code("PART_AVAILABILITY_" + (part != null ? part.getId() : "0"))
                        .name("Spare parts available (" + partName + ")")
                        .status(ValidationCheckStatus.BLOCKED)
                        .message(partName + " requires " + reqQty + " units but only " + availQty + " is available.")
                        .requiredQuantity(reqQty)
                        .availableQuantity(availQty)
                        .build());
            } else {
                partChecks.add(ValidationCheckDTO.builder()
                        .code("PART_AVAILABILITY_" + (part != null ? part.getId() : "0"))
                        .name("Spare parts available (" + partName + ")")
                        .status(ValidationCheckStatus.PASS)
                        .message(partName + " requires " + reqQty + " units and " + availQty + " is available in stock.")
                        .requiredQuantity(reqQty)
                        .availableQuantity(availQty)
                        .build());
            }
        }
        return partChecks;
    }
}
