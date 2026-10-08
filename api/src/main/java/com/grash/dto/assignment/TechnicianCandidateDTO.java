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
@Schema(description = "Technician candidate with match score and explainable ranking reasons")
public class TechnicianCandidateDTO {
    @Schema(description = "Technician user ID")
    private Long technicianId;

    @Schema(description = "First name")
    private String firstName;

    @Schema(description = "Last name")
    private String lastName;

    @Schema(description = "Email address")
    private String email;

    @Schema(description = "Total recommendation score (0-100)")
    private double score;

    @Schema(description = "Rank position (1-based)")
    private int rank;

    @Builder.Default
    @Schema(description = "List of explainable reasons for candidate ranking")
    private List<String> reasons = new ArrayList<>();

    @Schema(description = "Whether the technician satisfies required skills")
    private boolean skillMatch;

    @Schema(description = "Whether the technician belongs to the work order location")
    private boolean sameLocation;

    @Schema(description = "Whether the technician is available")
    private boolean available;

    @Schema(description = "Number of active/open work orders currently assigned")
    private int openWorkOrderCount;

    @Schema(description = "Proximity distance in kilometers if available")
    private Double distanceKm;
}
