package com.grash.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Details about a specific part shortage")
public class PartShortageItemDTO {
    @Schema(description = "Identifier of the part")
    private Long partId;

    @Schema(description = "Name of the part")
    private String part;

    @Schema(description = "Quantity required by the request")
    private double required;

    @Schema(description = "Quantity currently available in stock (quantity - reservedQuantity)")
    private double available;

    @Schema(description = "Shortage quantity (required - available)")
    private double shortage;
}
