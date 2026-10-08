package com.grash.controller;

import com.grash.advancedsearch.SearchCriteria;
import com.grash.advancedsearch.SpecificationBuilder;
import com.grash.dto.exception.*;
import com.grash.exception.CustomException;
import com.grash.mapper.WorkOrderExceptionMapper;
import com.grash.model.Company;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.WorkOrderException;
import com.grash.model.enums.ExceptionSeverity;
import com.grash.model.enums.ExceptionStatus;
import com.grash.model.enums.RoleCode;
import com.grash.model.enums.Status;
import com.grash.repository.WorkOrderExceptionRepository;
import com.grash.repository.WorkOrderRepository;
import com.grash.service.ExceptionEngineService;
import com.grash.service.UserService;
import com.grash.service.WorkOrderService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/work-order-exceptions")
@Tag(name = "Work Order Exceptions", description = "Operations for SLA and exception management")
@RequiredArgsConstructor
@Slf4j
public class WorkOrderExceptionController {

    private final WorkOrderExceptionRepository exceptionRepository;
    private final ExceptionEngineService exceptionEngineService;
    private final WorkOrderExceptionMapper exceptionMapper;
    private final UserService userService;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderService workOrderService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<List<WorkOrderExceptionShowDTO>> getAll(HttpServletRequest req) {
        User user = userService.whoami(req);
        List<WorkOrderException> exceptions = exceptionRepository.findRecentByCompany(user.getCompany().getId());
        return ResponseEntity.ok(exceptions.stream().map(exceptionMapper::toShowDto).collect(Collectors.toList()));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<ExceptionStatsDTO> getStats(HttpServletRequest req) {
        User user = userService.whoami(req);
        Long companyId = user.getCompany().getId();

        long total = exceptionRepository.countByCompany_Id(companyId);
        long open = exceptionRepository.countByCompany_IdAndStatus(companyId, ExceptionStatus.OPEN);
        long critical = exceptionRepository.countByCompany_IdAndSeverityAndStatus(companyId, ExceptionSeverity.CRITICAL, ExceptionStatus.OPEN);
        long autoResolved = exceptionRepository.countByCompany_IdAndAutoResolvedTrue(companyId);
        long manualRequired = exceptionRepository.countByCompany_IdAndStatus(companyId, ExceptionStatus.MANUAL_INTERVENTION_REQUIRED);

        return ResponseEntity.ok(ExceptionStatsDTO.builder()
                .total(total)
                .open(open)
                .critical(critical)
                .autoResolved(autoResolved)
                .manualInterventionRequired(manualRequired)
                .build());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<WorkOrderExceptionShowDTO> getById(@PathVariable Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        WorkOrderException exception = exceptionRepository.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Exception not found", HttpStatus.NOT_FOUND));
        return ResponseEntity.ok(exceptionMapper.toShowDto(exception));
    }

    @GetMapping("/work-order/{workOrderId}")
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<List<WorkOrderExceptionShowDTO>> getByWorkOrder(@PathVariable Long workOrderId, HttpServletRequest req) {
        User user = userService.whoami(req);
        Collection<WorkOrderException> list = exceptionRepository.findByWorkOrder_IdAndCompany_Id(workOrderId, user.getCompany().getId());
        return ResponseEntity.ok(list.stream().map(exceptionMapper::toShowDto).collect(Collectors.toList()));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<WorkOrderExceptionShowDTO> resolve(
            @PathVariable Long id,
            @RequestBody(required = false) ResolveExceptionDTO dto,
            HttpServletRequest req) {
        User user = userService.whoami(req);
        String notes = dto != null ? dto.getResolutionNotes() : null;
        WorkOrderException resolved = exceptionEngineService.resolveException(id, notes, user);
        return ResponseEntity.ok(exceptionMapper.toShowDto(resolved));
    }

    @PostMapping("/{id}/reassign")
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<WorkOrderExceptionShowDTO> manualReassign(
            @PathVariable Long id,
            @Valid @RequestBody ManualReassignDTO dto,
            HttpServletRequest req) {
        User user = userService.whoami(req);
        WorkOrderException reassigned = exceptionEngineService.manualReassign(id, dto.getTechnicianId(), dto.getNotes(), user);
        return ResponseEntity.ok(exceptionMapper.toShowDto(reassigned));
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<WorkOrderExceptionShowDTO> retry(@PathVariable Long id, HttpServletRequest req) {
        User user = userService.whoami(req);
        WorkOrderException exception = exceptionRepository.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new CustomException("Exception not found", HttpStatus.NOT_FOUND));

        WorkOrderException updated = exceptionEngineService.triggerAutoReassignment(exception);
        return ResponseEntity.ok(exceptionMapper.toShowDto(updated));
    }

    @PostMapping("/scan")
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<List<WorkOrderExceptionShowDTO>> scanWorkOrders(HttpServletRequest req) {
        User user = userService.whoami(req);
        List<WorkOrderException> detected = exceptionEngineService.scanActiveWorkOrders(user.getCompany());
        return ResponseEntity.ok(detected.stream().map(exceptionMapper::toShowDto).collect(Collectors.toList()));
    }

    @PostMapping("/simulate/technician-unavailable")
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<List<WorkOrderExceptionShowDTO>> simulateTechnicianUnavailable(
            @RequestParam(required = false) Long technicianId,
            @RequestParam(required = false) Long workOrderId,
            HttpServletRequest req) {
        User user = userService.whoami(req);
        Company company = user.getCompany();

        Long targetTechId = technicianId;

        if (targetTechId == null && workOrderId != null) {
            WorkOrder wo = workOrderService.findByIdAndCompany(workOrderId, company.getId())
                    .orElseThrow(() -> new CustomException("Work Order not found", HttpStatus.NOT_FOUND));
            if (wo.getPrimaryUser() != null) {
                targetTechId = wo.getPrimaryUser().getId();
            }
        }

        // If still null, find the first active work order with an assigned primary user
        if (targetTechId == null) {
            Collection<WorkOrder> activeWOs = workOrderRepository.findByCompany_Id(company.getId());
            Optional<WorkOrder> targetWO = activeWOs.stream()
                    .filter(wo -> !wo.isArchived() && wo.getStatus() != Status.COMPLETE && wo.getPrimaryUser() != null)
                    .findFirst();

            if (targetWO.isPresent()) {
                targetTechId = targetWO.get().getPrimaryUser().getId();
            } else {
                throw new CustomException("No active work orders with assigned technician found to simulate", HttpStatus.BAD_REQUEST);
            }
        }

        List<WorkOrderException> exceptions = exceptionEngineService.detectTechnicianUnavailable(targetTechId, company);
        return ResponseEntity.ok(exceptions.stream().map(exceptionMapper::toShowDto).collect(Collectors.toList()));
    }

    @PostMapping("/simulate/part-shortage")
    @PreAuthorize("hasAuthority('ROLE_CLIENT')")
    public ResponseEntity<WorkOrderExceptionShowDTO> simulatePartShortage(
            @RequestParam(required = false) Long workOrderId,
            @RequestParam(required = false, defaultValue = "Hydraulic Seal Kit (SK-204)") String partName,
            HttpServletRequest req) {
        User user = userService.whoami(req);
        Company company = user.getCompany();

        WorkOrder targetWO;
        if (workOrderId != null) {
            targetWO = workOrderService.findByIdAndCompany(workOrderId, company.getId())
                    .orElseThrow(() -> new CustomException("Work Order not found", HttpStatus.NOT_FOUND));
        } else {
            targetWO = workOrderRepository.findByCompany_Id(company.getId()).stream()
                    .filter(wo -> !wo.isArchived() && wo.getStatus() != Status.COMPLETE)
                    .findFirst()
                    .orElseThrow(() -> new CustomException("No active work order found to simulate part shortage", HttpStatus.BAD_REQUEST));
        }

        WorkOrderException exception = exceptionEngineService.createPartShortageException(targetWO, partName, 2, 0);
        return ResponseEntity.ok(exceptionMapper.toShowDto(exception));
    }
}
