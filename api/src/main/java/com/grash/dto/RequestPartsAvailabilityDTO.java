package com.grash.dto;

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
@Schema(description = "Overall parts availability for a request")
public class RequestPartsAvailabilityDTO {
    @Schema(description = "Whether all required parts can be successfully reserved")
    private boolean canReserve;

    @Schema(description = "Availability details per required part")
    @Builder.Default
    private List<PartAvailabilityItemDTO> parts = new ArrayList<>();
}
