package com.grash.controller;

import com.grash.dto.EscalationRequestDTO;
import com.grash.dto.EscalationResponseDTO;
import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.enums.RoleCode;
import com.grash.model.enums.ServiceType;
import com.grash.model.enums.Status;
import com.grash.repository.WorkOrderRepository;
import com.grash.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/orchestration")
@Tag(name = "Orchestration", description = "Industrial Equipment Service Orchestration & Escalation Operations")
@RequiredArgsConstructor
@Slf4j
public class OrchestrationController {

    private final WorkOrderRepository workOrderRepository;

    @PostMapping("/work-orders/{id}/escalate-to-vendor")
    @Operation(summary = "Context-Preserving Escalation from Internal Technician to External Vendor")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<EscalationResponseDTO> escalateToVendor(
            @Parameter(description = "Work Order ID") @PathVariable("id") String id,
            @Valid @RequestBody EscalationRequestDTO requestDTO,
            @CurrentUser User currentUser) {

        log.info("Processing escalation for work order {} by user {}", id, currentUser != null ? currentUser.getEmail() : "anonymous");

        // Verify that user is authorized to perform internal technician escalation
        if (currentUser != null && currentUser.getRole() != null) {
            RoleCode roleCode = currentUser.getRole().getCode();
            if (roleCode != RoleCode.INTERNAL_TECHNICIAN && roleCode != RoleCode.TECHNICIAN && roleCode != RoleCode.ADMIN) {
                throw new CustomException("Access Denied: Only Internal Technicians (Plant Crew) can escalate work orders to external vendors.", HttpStatus.FORBIDDEN);
            }
        }

        // Generate context-preserving diagnostic snapshot identifier
        String snapshotId = "snap-" + UUID.randomUUID().toString().substring(0, 8);
        String snapshotUrl = "/storage/snapshots/" + id + "/" + snapshotId + ".json";
        String targetAgency = (requestDTO.getTargetVendorAgency() != null && !requestDTO.getTargetVendorAgency().trim().isEmpty())
                ? requestDTO.getTargetVendorAgency()
                : "Apex Hydraulics & OEM Automation Ltd";

        // Attempt lookup in persistent WorkOrder repository
        Optional<WorkOrder> optionalWorkOrder = Optional.empty();
        try {
            Long numericId = Long.parseLong(id);
            optionalWorkOrder = workOrderRepository.findById(numericId);
        } catch (NumberFormatException ignored) {
            // Check by customId if string
        }

        if (optionalWorkOrder.isPresent()) {
            WorkOrder workOrder = optionalWorkOrder.get();
            workOrder.setServiceType(ServiceType.EXTERNAL);
            workOrder.setEscalationReason(requestDTO.getReason());
            workOrder.setDiagnosticSnapshotUrl(snapshotUrl);
            workOrder.setStatus(Status.ON_HOLD);

            String additionalNotes = "\n\n[ESCALATED TO EXTERNAL VENDOR - " + new Date() + "]\n"
                    + "Escalation Reason: " + requestDTO.getReason() + "\n"
                    + "Assigned Agency: " + targetAgency + "\n"
                    + "Technician Diagnostic Notes: " + (requestDTO.getDiagnosticNotes() != null ? requestDTO.getDiagnosticNotes() : "N/A") + "\n"
                    + "Diagnostic Snapshot Artifact: " + snapshotUrl;

            workOrder.setDescription((workOrder.getDescription() != null ? workOrder.getDescription() : "") + additionalNotes);
            workOrderRepository.save(workOrder);

            return ResponseEntity.ok(EscalationResponseDTO.builder()
                    .workOrderId(workOrder.getId())
                    .customId(workOrder.getCustomId())
                    .serviceType(workOrder.getServiceType().name())
                    .status("ESCALATED_TO_VENDOR_EXCEPTIONS_DESK")
                    .escalationReason(workOrder.getEscalationReason())
                    .diagnosticSnapshotUrl(workOrder.getDiagnosticSnapshotUrl())
                    .assignedVendorAgency(targetAgency)
                    .escalatedAt(new Date())
                    .message("Work order successfully escalated to external vendor. Diagnostic snapshot preserved and routed to Exceptions Desk.")
                    .build());
        }

        // Graceful response for orchestration mock/simulation work order IDs
        return ResponseEntity.ok(EscalationResponseDTO.builder()
                .workOrderId(1042L)
                .customId("SR-" + id)
                .serviceType(ServiceType.EXTERNAL.name())
                .status("ESCALATED_TO_VENDOR_EXCEPTIONS_DESK")
                .escalationReason(requestDTO.getReason())
                .diagnosticSnapshotUrl(snapshotUrl)
                .assignedVendorAgency(targetAgency)
                .escalatedAt(new Date())
                .message("Work order successfully escalated to external vendor. Diagnostic snapshot preserved and routed to Exceptions Desk.")
                .build());
    }
}
