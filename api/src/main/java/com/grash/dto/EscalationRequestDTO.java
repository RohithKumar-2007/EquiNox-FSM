package com.grash.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Payload for escalating a work order from internal technician to external vendor")
public class EscalationRequestDTO {

    @NotBlank
    @Schema(description = "Escalation rationale (e.g., Lack of Specialized Tools, Active OEM Warranty, Beyond Skill Scope)")
    private String reason;

    @Schema(description = "Detailed field diagnostic observations before escalation")
    private String diagnosticNotes;

    @Schema(description = "Live machine sensor telemetry captured at the time of escalation")
    private Map<String, Object> telemetryData;

    @Schema(description = "Photographic evidence URLs captured on-site")
    private List<String> photoUrls;

    @Schema(description = "Target external contractor or OEM agency name")
    private String targetVendorAgency;
}
