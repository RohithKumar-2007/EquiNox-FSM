package com.grash.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.grash.model.abstracts.CompanyAudit;
import com.grash.model.enums.ExceptionSeverity;
import com.grash.model.enums.ExceptionStatus;
import com.grash.model.enums.ExceptionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.Date;

@Entity
@Table(name = "work_order_exception")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Work order exception entity for tracking SLA and operational issues")
public class WorkOrderException extends CompanyAudit {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @Schema(description = "Affected work order")
    private WorkOrder workOrder;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Schema(description = "Exception type", requiredMode = Schema.RequiredMode.REQUIRED)
    private ExceptionType exceptionType;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Schema(description = "Current status of the exception", requiredMode = Schema.RequiredMode.REQUIRED)
    private ExceptionStatus status = ExceptionStatus.OPEN;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Schema(description = "Severity level", requiredMode = Schema.RequiredMode.REQUIRED)
    private ExceptionSeverity severity = ExceptionSeverity.MEDIUM;

    @NotNull
    @Schema(description = "Timestamp when the exception was detected", requiredMode = Schema.RequiredMode.REQUIRED)
    private Date detectedAt;

    @Column(length = 1000)
    @Schema(description = "Description and details of the problem")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @Schema(description = "Previous technician assigned to the work order")
    private User previousTechnician;

    @ManyToOne(fetch = FetchType.LAZY)
    @Schema(description = "Replacement technician reassigned to the work order")
    private User replacementTechnician;

    @Schema(description = "Timestamp when the exception was resolved")
    private Date resolvedAt;

    @Column(length = 2000)
    @Schema(description = "Resolution notes")
    private String resolutionNotes;

    @Builder.Default
    @Schema(description = "Whether the exception was automatically resolved by the engine")
    private boolean autoResolved = false;

    @Builder.Default
    @Schema(description = "Number of automatic reassignment retry attempts")
    private int retryCount = 0;

    @Builder.Default
    @Schema(description = "Whether notifications have been dispatched for this exception")
    private boolean notificationSent = false;
}
