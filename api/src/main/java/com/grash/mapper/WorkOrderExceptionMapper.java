package com.grash.mapper;

import com.grash.dto.exception.WorkOrderExceptionShowDTO;
import com.grash.model.WorkOrderException;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {UserMapper.class})
public interface WorkOrderExceptionMapper {
    @Mapping(target = "workOrderId", source = "workOrder.id")
    @Mapping(target = "workOrderTitle", source = "workOrder.title")
    @Mapping(target = "workOrderCustomId", source = "workOrder.customId")
    @Mapping(target = "workOrderPriority", source = "workOrder.priority")
    @Mapping(target = "workOrderStatus", source = "workOrder.status")
    @Mapping(target = "previousTechnician", source = "previousTechnician")
    @Mapping(target = "replacementTechnician", source = "replacementTechnician")
    WorkOrderExceptionShowDTO toShowDto(WorkOrderException model);
}
