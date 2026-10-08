package com.grash.dto.validation;

import com.grash.model.enums.ValidationCheckStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Individual check result within pre-approval validation")
public class ValidationCheckDTO {
    @Schema(description = "Check unique identifier code")
    private String code;

    @Schema(description = "Human-readable name of the validation check")
    private String name;

    @Schema(description = "Validation status: PASS, WARNING, or BLOCKED")
    private ValidationCheckStatus status;

    @Schema(description = "Detailed explanatory message")
    private String message;

    @Schema(description = "Required quantity if applicable for part checks")
    private Double requiredQuantity;

    @Schema(description = "Available quantity if applicable for part checks")
    private Double availableQuantity;
}
