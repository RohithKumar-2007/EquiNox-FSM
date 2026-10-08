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
@Schema(description = "Availability details for a required part")
public class PartAvailabilityItemDTO {
    @Schema(description = "Identifier of the part")
    private Long partId;

    @Schema(description = "Name of the part")
    private String name;

    @Schema(description = "Required quantity")
    private double required;

    @Schema(description = "Total stock quantity")
    private double stock;

    @Schema(description = "Reserved quantity")
    private int reserved;

    @Schema(description = "Available quantity (stock - reserved)")
    private double available;

    @Schema(description = "Availability status: AVAILABLE, SHORTAGE, or RESERVED")
    private String status;

    @Schema(description = "Quantity short if status is SHORTAGE, else 0")
    private double shortage;
}
