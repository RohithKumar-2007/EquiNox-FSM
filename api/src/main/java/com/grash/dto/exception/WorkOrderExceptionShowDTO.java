package com.grash.dto.exception;

import com.grash.dto.UserMiniDTO;
import com.grash.model.enums.ExceptionSeverity;
import com.grash.model.enums.ExceptionStatus;
import com.grash.model.enums.ExceptionType;
import com.grash.model.enums.Priority;
import com.grash.model.enums.Status;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkOrderExceptionShowDTO {
    private Long id;
    private Long workOrderId;
    private String workOrderTitle;
    private String workOrderCustomId;
    private Priority workOrderPriority;
    private Status workOrderStatus;
    private ExceptionType exceptionType;
    private ExceptionStatus status;
    private ExceptionSeverity severity;
    private Date detectedAt;
    private String description;
    private UserMiniDTO previousTechnician;
    private UserMiniDTO replacementTechnician;
    private Date resolvedAt;
    private String resolutionNotes;
    private boolean autoResolved;
    private int retryCount;
    private boolean notificationSent;
    private Date createdAt;
}
