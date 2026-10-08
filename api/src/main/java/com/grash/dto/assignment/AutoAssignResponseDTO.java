package com.grash.dto.assignment;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Result of automatic technician assignment operation")
public class AutoAssignResponseDTO {
    @Schema(description = "Whether a technician was successfully assigned")
    private boolean assigned;

    @Schema(description = "Work Order ID")
    private Long workOrderId;

    @Schema(description = "Assigned technician details")
    private TechnicianCandidateDTO assignedTechnician;

    @Schema(description = "Summary message")
    private String message;

    @Builder.Default
    @Schema(description = "Explanatory reasons for assignment")
    private List<String> reasons = new ArrayList<>();

    @Schema(description = "Whether reassignment confirmation is required because a technician is already assigned")
    private boolean requiresConfirmation;
}
