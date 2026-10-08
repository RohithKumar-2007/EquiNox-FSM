package com.grash.dto.validation;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Structured pre-approval validation result for a service request")
public class PreApprovalValidationResultDTO {
    @Schema(description = "Request ID")
    private Long requestId;

    @Schema(description = "Request custom ID")
    private String customId;

    @Schema(description = "Overall validity status (true if no BLOCKED checks)")
    private boolean valid;

    @Schema(description = "Timestamp when validation was run")
    private Date validatedAt;

    @Builder.Default
    @Schema(description = "List of individual validation check results")
    private List<ValidationCheckDTO> checks = new ArrayList<>();
}
