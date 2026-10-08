package com.grash.service;

import com.grash.model.*;
import com.grash.model.enums.*;
import com.grash.repository.WorkOrderExceptionRepository;
import com.grash.repository.WorkOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ExceptionEngineServiceTest {

    private WorkOrderExceptionRepository exceptionRepository;
    private WorkOrderRepository workOrderRepository;
    private WorkOrderService workOrderService;
    private TechnicianRankingService technicianRankingService;
    private WorkloadService workloadService;
    private WorkOrderHistoryService workOrderHistoryService;
    private NotificationService notificationService;
    private UserService userService;

    private ExceptionEngineService engineService;

    private Company company;
    private User techJohn;
    private User techJane;
    private WorkOrder workOrder;

    @BeforeEach
    void setUp() {
        exceptionRepository = mock(WorkOrderExceptionRepository.class);
        workOrderRepository = mock(WorkOrderRepository.class);
        workOrderService = mock(WorkOrderService.class);
        technicianRankingService = mock(TechnicianRankingService.class);
        workloadService = mock(WorkloadService.class);
        workOrderHistoryService = mock(WorkOrderHistoryService.class);
        notificationService = mock(NotificationService.class);
        userService = mock(UserService.class);

        engineService = new ExceptionEngineService(
                exceptionRepository,
                workOrderRepository,
                workOrderService,
                technicianRankingService,
                workloadService,
                workOrderHistoryService,
                notificationService,
                userService
        );

        company = new Company();
        company.setId(1L);

        techJohn = new User();
        techJohn.setId(10L);
        techJohn.setFirstName("John");
        techJohn.setLastName("Doe");
        techJohn.setCompany(company);
        techJohn.setEnabled(true);
        techJohn.setRole(Role.builder().code(RoleCode.TECHNICIAN).build());

        techJane = new User();
        techJane.setId(20L);
        techJane.setFirstName("Jane");
        techJane.setLastName("Smith");
        techJane.setCompany(company);
        techJane.setEnabled(true);
        techJane.setRole(Role.builder().code(RoleCode.TECHNICIAN).build());

        workOrder = new WorkOrder();
        workOrder.setId(1024L);
        workOrder.setTitle("Pump P-102 Overhaul");
        workOrder.setCompany(company);
        workOrder.setPrimaryUser(techJohn);
        workOrder.setStatus(Status.OPEN);
        workOrder.setPriority(Priority.HIGH);
        workOrder.setCreatedAt(new Date());

        when(exceptionRepository.save(any(WorkOrderException.class))).thenAnswer(invocation -> {
            WorkOrderException ex = invocation.getArgument(0);
            if (ex.getId() == null) ex.setId(999L);
            return ex;
        });
    }

    @Test
    void test1_technicianBecomesUnavailable_autoReassignsAndNotifies() {
        when(userService.findByIdAndCompany(10L, 1L)).thenReturn(Optional.of(techJohn));
        when(workOrderRepository.findByCompany_Id(1L)).thenReturn(Collections.singletonList(workOrder));
        when(exceptionRepository.findActiveByWorkOrderAndType(eq(1024L), eq(ExceptionType.TECH_UNAVAILABLE), anyCollection()))
                .thenReturn(Collections.emptyList());
        when(technicianRankingService.findBestReplacementTechnician(eq(workOrder), anySet()))
                .thenReturn(Optional.of(techJane));

        List<WorkOrderException> result = engineService.detectTechnicianUnavailable(10L, company);

        assertEquals(1, result.size());
        WorkOrderException exception = result.get(0);
        assertEquals(ExceptionType.TECH_UNAVAILABLE, exception.getExceptionType());
        assertEquals(ExceptionStatus.RESOLVED, exception.getStatus());
        assertTrue(exception.isAutoResolved());
        assertEquals(techJane, workOrder.getPrimaryUser());
        assertEquals(techJane, exception.getReplacementTechnician());

        verify(workOrderService).save(workOrder);
        verify(workOrderHistoryService).create(any(WorkOrderHistory.class));
        verify(notificationService, atLeastOnce()).create(any(Notification.class));
    }

    @Test
    void test2_noQualifiedTechnicianAvailable_manualInterventionRequired() {
        when(userService.findByIdAndCompany(10L, 1L)).thenReturn(Optional.of(techJohn));
        when(workOrderRepository.findByCompany_Id(1L)).thenReturn(Collections.singletonList(workOrder));
        when(exceptionRepository.findActiveByWorkOrderAndType(eq(1024L), eq(ExceptionType.TECH_UNAVAILABLE), anyCollection()))
                .thenReturn(Collections.emptyList());
        when(technicianRankingService.findBestReplacementTechnician(eq(workOrder), anySet()))
                .thenReturn(Optional.empty());

        List<WorkOrderException> result = engineService.detectTechnicianUnavailable(10L, company);

        assertEquals(1, result.size());
        WorkOrderException exception = result.get(0);
        assertEquals(ExceptionStatus.MANUAL_INTERVENTION_REQUIRED, exception.getStatus());
        assertFalse(exception.isAutoResolved());
        assertTrue(exception.getDescription().contains("No qualified technician"));
        assertEquals(techJohn, workOrder.getPrimaryUser()); // Unchanged
    }

    @Test
    void test3_duplicateDetection_idempotent() {
        WorkOrderException existing = WorkOrderException.builder()
                .id(1L)
                .workOrder(workOrder)
                .exceptionType(ExceptionType.TECH_UNAVAILABLE)
                .status(ExceptionStatus.OPEN)
                .build();

        when(userService.findByIdAndCompany(10L, 1L)).thenReturn(Optional.of(techJohn));
        when(workOrderRepository.findByCompany_Id(1L)).thenReturn(Collections.singletonList(workOrder));
        when(exceptionRepository.findActiveByWorkOrderAndType(eq(1024L), eq(ExceptionType.TECH_UNAVAILABLE), anyCollection()))
                .thenReturn(Collections.singletonList(existing));

        List<WorkOrderException> result = engineService.detectTechnicianUnavailable(10L, company);

        assertTrue(result.isEmpty());
        verify(exceptionRepository, never()).save(any(WorkOrderException.class));
    }

    @Test
    void test4_doubleBooking_detectedAndReassigned() {
        Date start = new Date(System.currentTimeMillis() + 3600000);
        workOrder.setEstimatedStartDate(start);
        workOrder.setEstimatedDuration(2.0);

        WorkOrder conflictingWO = new WorkOrder();
        conflictingWO.setId(2048L);
        conflictingWO.setTitle("Conflicting Task");
        conflictingWO.setCompany(company);
        conflictingWO.setPrimaryUser(techJohn);
        conflictingWO.setEstimatedStartDate(new Date(start.getTime() + 1800000)); // Overlap by 30 mins
        conflictingWO.setEstimatedDuration(2.0);

        when(workOrderRepository.findByCompany_Id(1L)).thenReturn(Arrays.asList(workOrder, conflictingWO));
        when(exceptionRepository.findActiveByWorkOrderAndType(eq(1024L), eq(ExceptionType.DOUBLE_BOOKING), anyCollection()))
                .thenReturn(Collections.emptyList());
        when(technicianRankingService.findBestReplacementTechnician(eq(workOrder), anySet()))
                .thenReturn(Optional.of(techJane));

        Optional<WorkOrderException> exOpt = engineService.detectDoubleBooking(workOrder);

        assertTrue(exOpt.isPresent());
        WorkOrderException ex = exOpt.get();
        assertEquals(ExceptionType.DOUBLE_BOOKING, ex.getExceptionType());
        assertEquals(techJane, workOrder.getPrimaryUser());
    }

    @Test
    void test5_capacityConflict_detectedAndReassigned() {
        Date start = new Date(System.currentTimeMillis() + 86400000); // Tomorrow
        workOrder.setEstimatedStartDate(start);
        workOrder.setEstimatedDuration(5.0);

        when(workloadService.getUserCapacityForDay(eq(techJohn), any())).thenReturn(480); // 8 hours capacity = 480 min

        WorkOrder otherWO = new WorkOrder();
        otherWO.setId(2050L);
        otherWO.setEstimatedDuration(6.0); // 6h + 5h = 11h = 660 min > 480 min capacity!

        when(workOrderRepository.findByUserAndEstimatedStartDateBetween(eq(10L), any(), any(), eq(1L)))
                .thenReturn(Arrays.asList(workOrder, otherWO));
        when(exceptionRepository.findActiveByWorkOrderAndType(eq(1024L), eq(ExceptionType.CAPACITY_CONFLICT), anyCollection()))
                .thenReturn(Collections.emptyList());
        when(technicianRankingService.findBestReplacementTechnician(eq(workOrder), anySet()))
                .thenReturn(Optional.of(techJane));

        Optional<WorkOrderException> exOpt = engineService.detectCapacityConflict(workOrder);

        assertTrue(exOpt.isPresent());
        WorkOrderException ex = exOpt.get();
        assertEquals(ExceptionType.CAPACITY_CONFLICT, ex.getExceptionType());
        assertEquals(techJane, workOrder.getPrimaryUser());
    }

    @Test
    void test6_slaBreach_detected() {
        // High priority threshold is 240 mins (4h). Set createdAt to 5 hours ago.
        workOrder.setCreatedAt(new Date(System.currentTimeMillis() - 5 * 3600 * 1000L));
        workOrder.setPriority(Priority.HIGH);

        when(exceptionRepository.findActiveByWorkOrderAndType(eq(1024L), eq(ExceptionType.SLA_BREACH), anyCollection()))
                .thenReturn(Collections.emptyList());

        Optional<WorkOrderException> exOpt = engineService.detectSLABreach(workOrder);

        assertTrue(exOpt.isPresent());
        assertEquals(ExceptionType.SLA_BREACH, exOpt.get().getExceptionType());
        assertEquals(ExceptionSeverity.CRITICAL, exOpt.get().getSeverity());
    }

    @Test
    void test7_dueDateBreach_detected() {
        workOrder.setDueDate(new Date(System.currentTimeMillis() - 3600 * 1000L)); // Due 1 hour ago

        when(exceptionRepository.findActiveByWorkOrderAndType(eq(1024L), eq(ExceptionType.DUE_DATE_BREACH), anyCollection()))
                .thenReturn(Collections.emptyList());

        Optional<WorkOrderException> exOpt = engineService.detectDueDateBreach(workOrder);

        assertTrue(exOpt.isPresent());
        assertEquals(ExceptionType.DUE_DATE_BREACH, exOpt.get().getExceptionType());
        assertEquals(ExceptionSeverity.HIGH, exOpt.get().getSeverity());
    }

    @Test
    void test8_reassignmentLoopPrevention_stopsAtMaxThreshold() {
        WorkOrderException exception = WorkOrderException.builder()
                .id(555L)
                .workOrder(workOrder)
                .exceptionType(ExceptionType.TECH_UNAVAILABLE)
                .status(ExceptionStatus.OPEN)
                .retryCount(3) // Already at threshold
                .description("Initial issue")
                .build();

        WorkOrderException result = engineService.triggerAutoReassignment(exception);

        assertEquals(ExceptionStatus.MANUAL_INTERVENTION_REQUIRED, result.getStatus());
        assertTrue(result.getDescription().contains("Reassignment threshold reached"));
        verify(workOrderService, never()).save(workOrder);
    }

    @Test
    void test9_partShortage_createdWithoutAutoReassign() {
        when(exceptionRepository.findActiveByWorkOrderAndType(eq(1024L), eq(ExceptionType.PART_SHORTAGE), anyCollection()))
                .thenReturn(Collections.emptyList());

        WorkOrderException ex = engineService.createPartShortageException(workOrder, "SK-204 Gasket", 2, 0);

        assertEquals(ExceptionType.PART_SHORTAGE, ex.getExceptionType());
        assertEquals(ExceptionStatus.OPEN, ex.getStatus());
        assertFalse(ex.isAutoResolved());
        assertEquals(techJohn, workOrder.getPrimaryUser()); // Technician not changed!
    }
}
