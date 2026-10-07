package com.grash.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response returned after successful escalation to external vendor")
public class EscalationResponseDTO {
    private Long workOrderId;
    private String customId;
    private String serviceType;
    private String status;
    private String escalationReason;
    private String diagnosticSnapshotUrl;
    private String assignedVendorAgency;
    private Date escalatedAt;
    private String message;
}
