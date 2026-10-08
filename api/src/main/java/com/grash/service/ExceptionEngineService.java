package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.*;
import com.grash.repository.WorkOrderExceptionRepository;
import com.grash.repository.WorkOrderRepository;
import com.grash.utils.Helper;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExceptionEngineService {

    private final WorkOrderExceptionRepository exceptionRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderService workOrderService;
    private final TechnicianRankingService technicianRankingService;
    private final WorkloadService workloadService;
    private final WorkOrderHistoryService workOrderHistoryService;
    private final NotificationService notificationService;
    private final UserService userService;

    private static final int MAX_REASSIGNMENT_RETRIES = 3;

    @Transactional
    public List<WorkOrderException> detectTechnicianUnavailable(Long technicianId, Company company) {
        User unavailableTech = userService.findByIdAndCompany(technicianId, company.getId())
                .orElseThrow(() -> new CustomException("Technician not found", HttpStatus.NOT_FOUND));

        Collection<WorkOrder> assignedWOs = workOrderRepository.findByCompany_Id(company.getId()).stream()
                .filter(wo -> !wo.isArchived() && wo.getStatus() != Status.COMPLETE)
                .filter(wo -> wo.getPrimaryUser() != null && wo.getPrimaryUser().getId().equals(technicianId))
                .collect(Collectors.toList());

        List<WorkOrderException> exceptionsCreated = new ArrayList<>();

        for (WorkOrder wo : assignedWOs) {
            // Idempotency check: don't duplicate unresolved TECH_UNAVAILABLE exception
            List<WorkOrderException> activeExceptions = exceptionRepository.findActiveByWorkOrderAndType(
                    wo.getId(),
                    ExceptionType.TECH_UNAVAILABLE,
                    Arrays.asList(ExceptionStatus.OPEN, ExceptionStatus.MANUAL_INTERVENTION_REQUIRED)
            );

            if (!activeExceptions.isEmpty()) {
                log.info("Active TECH_UNAVAILABLE exception already exists for WO {}", wo.getId());
                continue;
            }

            ExceptionSeverity severity = determineSeverity(wo.getPriority());
            String description = String.format("Technician %s became unavailable for Work Order '%s'",
                    unavailableTech.getFullName(), wo.getTitle());

            WorkOrderException exception = WorkOrderException.builder()
                    .workOrder(wo)
                    .exceptionType(ExceptionType.TECH_UNAVAILABLE)
                    .status(ExceptionStatus.OPEN)
                    .severity(severity)
                    .detectedAt(new Date())
                    .description(description)
                    .previousTechnician(unavailableTech)
                    .autoResolved(false)
                    .retryCount(0)
                    .build();
            exception.setCompany(company);

            exception = exceptionRepository.save(exception);
            triggerAutoReassignment(exception);
            exceptionsCreated.add(exception);
        }

        return exceptionsCreated;
    }

    @Transactional
    public WorkOrderException triggerAutoReassignment(WorkOrderException exception) {
        WorkOrder workOrder = exception.getWorkOrder();
        if (workOrder == null || workOrder.getStatus() == Status.COMPLETE) {
            return exception;
        }

        // Loop prevention check
        if (exception.getRetryCount() >= MAX_REASSIGNMENT_RETRIES) {
            log.warn("Max reassignment retry threshold reached ({}) for Exception ID {}",
                    MAX_REASSIGNMENT_RETRIES, exception.getId());
            exception.setStatus(ExceptionStatus.MANUAL_INTERVENTION_REQUIRED);
            exception.setDescription(exception.getDescription() + " | Reassignment threshold reached; manual intervention required.");
            notifyManualInterventionRequired(exception);
            return exceptionRepository.save(exception);
        }

        exception.setRetryCount(exception.getRetryCount() + 1);

        Set<Long> excludedTechIds = new HashSet<>();
        if (exception.getPreviousTechnician() != null) {
            excludedTechIds.add(exception.getPreviousTechnician().getId());
        }
        if (exception.getReplacementTechnician() != null) {
            excludedTechIds.add(exception.getReplacementTechnician().getId());
        }

        Optional<User> bestCandidate = technicianRankingService.findBestReplacementTechnician(workOrder, excludedTechIds);

        if (bestCandidate.isEmpty()) {
            log.info("No qualified replacement technician found for WO {}", workOrder.getId());
            exception.setStatus(ExceptionStatus.MANUAL_INTERVENTION_REQUIRED);
            exception.setDescription(exception.getDescription() + " | No qualified technician currently available.");
            notifyManualInterventionRequired(exception);
            return exceptionRepository.save(exception);
        }

        User replacement = bestCandidate.get();
        User previousTech = workOrder.getPrimaryUser();

        workOrder.setPrimaryUser(replacement);
        workOrderService.save(workOrder);

        // Record in WorkOrder audit history
        String auditText = String.format("Auto-reassigned from %s to %s (%s)",
                previousTech != null ? previousTech.getFullName() : "Unassigned",
                replacement.getFullName(),
                exception.getExceptionType().name());

        try {
            workOrderHistoryService.create(WorkOrderHistory.builder()
                    .workOrder(workOrder)
                    .user(replacement)
                    .name(auditText)
                    .build());
        } catch (Exception e) {
            log.error("Failed to write work order history audit: {}", e.getMessage());
        }

        exception.setReplacementTechnician(replacement);
        exception.setStatus(ExceptionStatus.RESOLVED);
        exception.setAutoResolved(true);
        exception.setResolvedAt(new Date());
        exception.setResolutionNotes(String.format("Auto-reassigned to %s based on qualified technician ranking.", replacement.getFullName()));

        notifyReassignment(workOrder, previousTech, replacement, exception);
        exception.setNotificationSent(true);

        return exceptionRepository.save(exception);
    }

    @Transactional
    public Optional<WorkOrderException> detectDoubleBooking(WorkOrder workOrder) {
        if (workOrder == null || workOrder.getPrimaryUser() == null || workOrder.getEstimatedStartDate() == null) {
            return Optional.empty();
        }

        User tech = workOrder.getPrimaryUser();
        Date start = workOrder.getEstimatedStartDate();
        double durationHours = workOrder.getEstimatedDuration() > 0 ? workOrder.getEstimatedDuration() : 1.0;
        long durationMillis = (long) (durationHours * 3600 * 1000L);
        Date end = new Date(start.getTime() + durationMillis);

        Collection<WorkOrder> techWOs = workOrderRepository.findByCompany_Id(workOrder.getCompany().getId()).stream()
                .filter(wo -> !wo.getId().equals(workOrder.getId()))
                .filter(wo -> !wo.isArchived() && wo.getStatus() != Status.COMPLETE)
                .filter(wo -> wo.getPrimaryUser() != null && wo.getPrimaryUser().getId().equals(tech.getId()))
                .filter(wo -> wo.getEstimatedStartDate() != null)
                .collect(Collectors.toList());

        for (WorkOrder other : techWOs) {
            Date otherStart = other.getEstimatedStartDate();
            double otherDuration = other.getEstimatedDuration() > 0 ? other.getEstimatedDuration() : 1.0;
            Date otherEnd = new Date(otherStart.getTime() + (long) (otherDuration * 3600 * 1000L));

            boolean overlap = start.before(otherEnd) && end.after(otherStart);
            if (overlap) {
                List<WorkOrderException> existing = exceptionRepository.findActiveByWorkOrderAndType(
                        workOrder.getId(), ExceptionType.DOUBLE_BOOKING,
                        Arrays.asList(ExceptionStatus.OPEN, ExceptionStatus.MANUAL_INTERVENTION_REQUIRED)
                );
                if (!existing.isEmpty()) return Optional.empty();

                WorkOrderException exception = WorkOrderException.builder()
                        .workOrder(workOrder)
                        .exceptionType(ExceptionType.DOUBLE_BOOKING)
                        .status(ExceptionStatus.OPEN)
                        .severity(ExceptionSeverity.HIGH)
                        .detectedAt(new Date())
                        .description(String.format("Double-booking: %s has overlapping schedule with WO #%s ('%s')",
                                tech.getFullName(), other.getCustomId() != null ? other.getCustomId() : other.getId(), other.getTitle()))
                        .previousTechnician(tech)
                        .autoResolved(false)
                        .build();
                exception.setCompany(workOrder.getCompany());
                exception = exceptionRepository.save(exception);
                triggerAutoReassignment(exception);
                return Optional.of(exception);
            }
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<WorkOrderException> detectCapacityConflict(WorkOrder workOrder) {
        if (workOrder == null || workOrder.getPrimaryUser() == null || workOrder.getEstimatedStartDate() == null) {
            return Optional.empty();
        }

        User tech = workOrder.getPrimaryUser();
        LocalDate localDate = Helper.dateToLocalDate(workOrder.getEstimatedStartDate());
        int capacityMinutes = workloadService.getUserCapacityForDay(tech, localDate);

        if (capacityMinutes <= 0) {
            return Optional.empty();
        }

        Date dayStart = Helper.localDateToDate(localDate);
        Date dayEnd = Helper.localDateToDate(localDate.plusDays(1));

        Collection<WorkOrder> existingWOs = workOrderRepository.findByUserAndEstimatedStartDateBetween(
                tech.getId(), dayStart, dayEnd, workOrder.getCompany().getId()
        );

        double totalAllocatedMinutes = existingWOs.stream()
                .mapToDouble(wo -> (wo.getEstimatedDuration() > 0 ? wo.getEstimatedDuration() : 1.0) * 60)
                .sum();

        if (totalAllocatedMinutes > capacityMinutes) {
            List<WorkOrderException> existing = exceptionRepository.findActiveByWorkOrderAndType(
                    workOrder.getId(), ExceptionType.CAPACITY_CONFLICT,
                    Arrays.asList(ExceptionStatus.OPEN, ExceptionStatus.MANUAL_INTERVENTION_REQUIRED)
            );
            if (!existing.isEmpty()) return Optional.empty();

            WorkOrderException exception = WorkOrderException.builder()
                    .workOrder(workOrder)
                    .exceptionType(ExceptionType.CAPACITY_CONFLICT)
                    .status(ExceptionStatus.OPEN)
                    .severity(ExceptionSeverity.HIGH)
                    .detectedAt(new Date())
                    .description(String.format("Capacity conflict: %s has %.0f min allocated exceeding shift capacity of %d min",
                            tech.getFullName(), totalAllocatedMinutes, capacityMinutes))
                    .previousTechnician(tech)
                    .autoResolved(false)
                    .build();
            exception.setCompany(workOrder.getCompany());
            exception = exceptionRepository.save(exception);
            triggerAutoReassignment(exception);
            return Optional.of(exception);
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<WorkOrderException> detectSLABreach(WorkOrder workOrder) {
        if (workOrder == null || workOrder.isArchived() || workOrder.getStatus() == Status.COMPLETE) {
            return Optional.empty();
        }

        long elapsedMinutes = (System.currentTimeMillis() - workOrder.getCreatedAt().getTime()) / (60 * 1000);
        long slaThresholdMinutes = getSlaThresholdMinutes(workOrder.getPriority());

        if (elapsedMinutes > slaThresholdMinutes) {
            List<WorkOrderException> existing = exceptionRepository.findActiveByWorkOrderAndType(
                    workOrder.getId(), ExceptionType.SLA_BREACH,
                    Arrays.asList(ExceptionStatus.OPEN, ExceptionStatus.MANUAL_INTERVENTION_REQUIRED, ExceptionStatus.RESOLVED)
            );
            if (!existing.isEmpty()) return Optional.empty();

            WorkOrderException exception = WorkOrderException.builder()
                    .workOrder(workOrder)
                    .exceptionType(ExceptionType.SLA_BREACH)
                    .status(ExceptionStatus.OPEN)
                    .severity(determineSeverity(workOrder.getPriority()))
                    .detectedAt(new Date())
                    .description(String.format("SLA breach: Work Order elapsed %d min exceeding %d min threshold for %s priority",
                            elapsedMinutes, slaThresholdMinutes, workOrder.getPriority()))
                    .previousTechnician(workOrder.getPrimaryUser())
                    .autoResolved(false)
                    .build();
            exception.setCompany(workOrder.getCompany());
            exception = exceptionRepository.save(exception);

            notifySlaBreach(workOrder, exception);
            return Optional.of(exception);
        }
        return Optional.empty();
    }

    @Transactional
    public Optional<WorkOrderException> detectDueDateBreach(WorkOrder workOrder) {
        if (workOrder == null || workOrder.isArchived() || workOrder.getStatus() == Status.COMPLETE || workOrder.getDueDate() == null) {
            return Optional.empty();
        }

        if (workOrder.getDueDate().before(new Date())) {
            List<WorkOrderException> existing = exceptionRepository.findActiveByWorkOrderAndType(
                    workOrder.getId(), ExceptionType.DUE_DATE_BREACH,
                    Arrays.asList(ExceptionStatus.OPEN, ExceptionStatus.MANUAL_INTERVENTION_REQUIRED, ExceptionStatus.RESOLVED)
            );
            if (!existing.isEmpty()) return Optional.empty();

            WorkOrderException exception = WorkOrderException.builder()
                    .workOrder(workOrder)
                    .exceptionType(ExceptionType.DUE_DATE_BREACH)
                    .status(ExceptionStatus.OPEN)
                    .severity(ExceptionSeverity.HIGH)
                    .detectedAt(new Date())
                    .description(String.format("Due date breach: Work Order missed due date of %s",
                            workOrder.getDueDate().toString()))
                    .previousTechnician(workOrder.getPrimaryUser())
                    .autoResolved(false)
                    .build();
            exception.setCompany(workOrder.getCompany());
            exception = exceptionRepository.save(exception);

            notifyDueDateBreach(workOrder, exception);
            return Optional.of(exception);
        }
        return Optional.empty();
    }

    @Transactional
    public WorkOrderException createPartShortageException(WorkOrder workOrder, String partName, int required, int available) {
        List<WorkOrderException> existing = exceptionRepository.findActiveByWorkOrderAndType(
                workOrder.getId(), ExceptionType.PART_SHORTAGE,
                Arrays.asList(ExceptionStatus.OPEN, ExceptionStatus.MANUAL_INTERVENTION_REQUIRED)
        );
        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        WorkOrderException exception = WorkOrderException.builder()
                .workOrder(workOrder)
                .exceptionType(ExceptionType.PART_SHORTAGE)
                .status(ExceptionStatus.OPEN)
                .severity(ExceptionSeverity.HIGH)
                .detectedAt(new Date())
                .description(String.format("Part shortage: Required part '%s' has insufficient stock (Required: %d, Available: %d)",
                        partName, required, available))
                .previousTechnician(workOrder.getPrimaryUser())
                .autoResolved(false)
                .build();
        exception.setCompany(workOrder.getCompany());
        exception = exceptionRepository.save(exception);

        // Per requirement: do NOT auto-reassign technician on part shortage
        notifyPartShortage(workOrder, exception);
        return exception;
    }

    @Transactional
    public List<WorkOrderException> scanActiveWorkOrders(Company company) {
        Collection<WorkOrder> activeWOs = workOrderRepository.findByCompany_Id(company.getId()).stream()
                .filter(wo -> !wo.isArchived() && wo.getStatus() != Status.COMPLETE)
                .collect(Collectors.toList());

        List<WorkOrderException> detected = new ArrayList<>();
        for (WorkOrder wo : activeWOs) {
            detectDueDateBreach(wo).ifPresent(detected::add);
            detectSLABreach(wo).ifPresent(detected::add);
            detectDoubleBooking(wo).ifPresent(detected::add);
            detectCapacityConflict(wo).ifPresent(detected::add);
        }
        return detected;
    }

    @Transactional
    public WorkOrderException resolveException(Long id, String notes, User actingUser) {
        WorkOrderException exception = exceptionRepository.findByIdAndCompany_Id(id, actingUser.getCompany().getId())
                .orElseThrow(() -> new CustomException("Exception not found", HttpStatus.NOT_FOUND));

        exception.setStatus(ExceptionStatus.RESOLVED);
        exception.setResolvedAt(new Date());
        exception.setResolutionNotes(notes != null ? notes : "Manually resolved by " + actingUser.getFullName());
        return exceptionRepository.save(exception);
    }

    @Transactional
    public WorkOrderException manualReassign(Long id, Long technicianId, String notes, User actingUser) {
        WorkOrderException exception = exceptionRepository.findByIdAndCompany_Id(id, actingUser.getCompany().getId())
                .orElseThrow(() -> new CustomException("Exception not found", HttpStatus.NOT_FOUND));

        User replacement = userService.findByIdAndCompany(technicianId, actingUser.getCompany().getId())
                .orElseThrow(() -> new CustomException("Technician not found", HttpStatus.NOT_FOUND));

        WorkOrder workOrder = exception.getWorkOrder();
        User previousTech = workOrder.getPrimaryUser();

        workOrder.setPrimaryUser(replacement);
        workOrderService.save(workOrder);

        String auditText = String.format("Manually reassigned to %s by %s. Notes: %s",
                replacement.getFullName(), actingUser.getFullName(), notes != null ? notes : "");
        workOrderHistoryService.create(WorkOrderHistory.builder()
                .workOrder(workOrder)
                .user(actingUser)
                .name(auditText)
                .build());

        exception.setReplacementTechnician(replacement);
        exception.setStatus(ExceptionStatus.RESOLVED);
        exception.setResolvedAt(new Date());
        exception.setResolutionNotes(auditText);

        notifyReassignment(workOrder, previousTech, replacement, exception);
        return exceptionRepository.save(exception);
    }

    private ExceptionSeverity determineSeverity(Priority priority) {
        if (priority == null) return ExceptionSeverity.MEDIUM;
        switch (priority) {
            case HIGH:
                return ExceptionSeverity.CRITICAL;
            case MEDIUM:
                return ExceptionSeverity.HIGH;
            case LOW:
                return ExceptionSeverity.MEDIUM;
            case NONE:
            default:
                return ExceptionSeverity.LOW;
        }
    }

    private long getSlaThresholdMinutes(Priority priority) {
        if (priority == null) return 1440; // 24h default
        switch (priority) {
            case HIGH:
                return 240; // 4 hours
            case MEDIUM:
                return 1440; // 24 hours
            case LOW:
                return 4320; // 72 hours
            case NONE:
            default:
                return 10080; // 7 days
        }
    }

    private void notifyReassignment(WorkOrder wo, User oldTech, User newTech, WorkOrderException ex) {
        try {
            String msg = String.format("Work Order #%s '%s' automatically reassigned to %s (%s).",
                    wo.getCustomId() != null ? wo.getCustomId() : wo.getId(),
                    wo.getTitle(), newTech.getFullName(), ex.getExceptionType().name());

            notificationService.create(new Notification(msg, newTech, NotificationType.WORK_ORDER, wo.getId()));

            if (oldTech != null && !oldTech.getId().equals(newTech.getId())) {
                notificationService.create(new Notification(
                        String.format("You were unassigned from Work Order #%s due to %s.",
                                wo.getCustomId() != null ? wo.getCustomId() : wo.getId(), ex.getExceptionType().name()),
                        oldTech, NotificationType.WORK_ORDER, wo.getId()));
            }
        } catch (Exception e) {
            log.error("Failed to send reassignment notification: {}", e.getMessage());
        }
    }

    private void notifyManualInterventionRequired(WorkOrderException ex) {
        try {
            WorkOrder wo = ex.getWorkOrder();
            String msg = String.format("Manual intervention required for WO #%s: %s",
                    wo.getCustomId() != null ? wo.getCustomId() : wo.getId(), ex.getDescription());
            Collection<User> managers = userService.findByCompany(wo.getCompany().getId());
            for (User user : managers) {
                if (user.getRole() != null && user.getRole().getCode() == RoleCode.ADMIN) {
                    notificationService.create(new Notification(msg, user, NotificationType.WORK_ORDER, wo.getId()));
                }
            }
        } catch (Exception e) {
            log.error("Failed to notify manual intervention: {}", e.getMessage());
        }
    }

    private void notifySlaBreach(WorkOrder wo, WorkOrderException ex) {
        try {
            String msg = String.format("CRITICAL: SLA breach detected on WO #%s ('%s').",
                    wo.getCustomId() != null ? wo.getCustomId() : wo.getId(), wo.getTitle());
            if (wo.getPrimaryUser() != null) {
                notificationService.create(new Notification(msg, wo.getPrimaryUser(), NotificationType.WORK_ORDER, wo.getId()));
            }
        } catch (Exception e) {
            log.error("Failed to notify SLA breach: {}", e.getMessage());
        }
    }

    private void notifyDueDateBreach(WorkOrder wo, WorkOrderException ex) {
        try {
            String msg = String.format("Due date breached for WO #%s ('%s').",
                    wo.getCustomId() != null ? wo.getCustomId() : wo.getId(), wo.getTitle());
            if (wo.getPrimaryUser() != null) {
                notificationService.create(new Notification(msg, wo.getPrimaryUser(), NotificationType.WORK_ORDER, wo.getId()));
            }
        } catch (Exception e) {
            log.error("Failed to notify due date breach: {}", e.getMessage());
        }
    }

    private void notifyPartShortage(WorkOrder wo, WorkOrderException ex) {
        try {
            String msg = String.format("PART SHORTAGE for WO #%s: %s",
                    wo.getCustomId() != null ? wo.getCustomId() : wo.getId(), ex.getDescription());
            if (wo.getPrimaryUser() != null) {
                notificationService.create(new Notification(msg, wo.getPrimaryUser(), NotificationType.WORK_ORDER, wo.getId()));
            }
        } catch (Exception e) {
            log.error("Failed to notify part shortage: {}", e.getMessage());
        }
    }
}
