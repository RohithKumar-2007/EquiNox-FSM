package com.grash.dto;

import com.grash.model.enums.PartReservationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Schema(description = "DTO for displaying part quantity details in API responses")
public class PartQuantityShowDTO extends AuditShowDTO {

    @Schema(description = "Quantity")
    private double quantity;
    
    @Schema(description = "Part information")
    private PartMiniDTO part;

    @Schema(description = "Reservation status: RESERVED, CONSUMED, RELEASED")
    private PartReservationStatus reservationStatus;
}
