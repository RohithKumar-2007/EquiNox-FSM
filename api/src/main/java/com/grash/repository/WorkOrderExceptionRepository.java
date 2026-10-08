package com.grash.repository;

import com.grash.model.WorkOrderException;
import com.grash.model.enums.ExceptionSeverity;
import com.grash.model.enums.ExceptionStatus;
import com.grash.model.enums.ExceptionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface WorkOrderExceptionRepository extends JpaRepository<WorkOrderException, Long>, JpaSpecificationExecutor<WorkOrderException> {

    Collection<WorkOrderException> findByCompany_Id(Long companyId);

    Collection<WorkOrderException> findByWorkOrder_IdAndCompany_Id(Long workOrderId, Long companyId);

    Optional<WorkOrderException> findByIdAndCompany_Id(Long id, Long companyId);

    @Query("SELECT e FROM WorkOrderException e WHERE e.workOrder.id = :workOrderId AND e.exceptionType = :exceptionType AND e.status IN :statuses")
    List<WorkOrderException> findActiveByWorkOrderAndType(
            @Param("workOrderId") Long workOrderId,
            @Param("exceptionType") ExceptionType exceptionType,
            @Param("statuses") Collection<ExceptionStatus> statuses
    );

    long countByCompany_Id(Long companyId);

    long countByCompany_IdAndStatus(Long companyId, ExceptionStatus status);

    long countByCompany_IdAndSeverityAndStatus(Long companyId, ExceptionSeverity severity, ExceptionStatus status);

    long countByCompany_IdAndAutoResolvedTrue(Long companyId);

    @Query("SELECT e FROM WorkOrderException e " +
            "LEFT JOIN FETCH e.workOrder " +
            "LEFT JOIN FETCH e.previousTechnician " +
            "LEFT JOIN FETCH e.replacementTechnician " +
            "WHERE e.company.id = :companyId " +
            "ORDER BY e.detectedAt DESC")
    List<WorkOrderException> findRecentByCompany(@Param("companyId") Long companyId);
}
