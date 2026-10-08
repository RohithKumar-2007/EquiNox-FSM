package com.grash.service;

import com.grash.dto.PartAvailabilityItemDTO;
import com.grash.dto.PartQuantityCompletePatchDTO;
import com.grash.dto.PartShortageItemDTO;
import com.grash.dto.RequestPartsAvailabilityDTO;
import com.grash.exception.CustomException;
import com.grash.exception.PartShortageException;
import com.grash.model.*;
import com.grash.model.enums.NotificationType;
import com.grash.model.enums.PartReservationStatus;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.RoleCode;
import com.grash.repository.PartQuantityRepository;
import com.grash.repository.PartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmartPartsReservationService {

    private final PartRepository partRepository;
    private final PartQuantityRepository partQuantityRepository;
    private final PartTransactionService partTransactionService;
    private final NotificationService notificationService;
    private final UserService userService;
    private final PartService partService;

    /**
     * Checks availability of all required parts for a request.
     */
    @Transactional(readOnly = true)
    public RequestPartsAvailabilityDTO checkPartsAvailability(Request request) {
        Collection<PartQuantity> partQuantities = partQuantityRepository.findByRequest_Id(request.getId());
        if (partQuantities.isEmpty()) {
            return RequestPartsAvailabilityDTO.builder()
                    .canReserve(true)
                    .parts(Collections.emptyList())
                    .build();
        }

        List<PartAvailabilityItemDTO> items = new ArrayList<>();
        boolean canReserveAll = true;

        for (PartQuantity pq : partQuantities) {
            Part part = pq.getPart();
            double required = pq.getQuantity();
            double stock = part.getQuantity();
            int reserved = part.getReservedQuantity();
            double available = partService.getAvailableQuantity(part);

            boolean isAlreadyReserved = PartReservationStatus.RESERVED.equals(pq.getReservationStatus());
            boolean availableEnough = part.isNonStock() || isAlreadyReserved || (available >= required);

            String status;
            double shortage = 0;

            if (isAlreadyReserved) {
                status = "RESERVED";
            } else if (availableEnough) {
                status = "AVAILABLE";
            } else {
                status = "SHORTAGE";
                shortage = Math.max(0, required - available);
                canReserveAll = false;
            }

            items.add(PartAvailabilityItemDTO.builder()
                    .partId(part.getId())
                    .name(part.getName())
                    .required(required)
                    .stock(stock)
                    .reserved(reserved)
                    .available(available)
                    .status(status)
                    .shortage(shortage)
                    .build());
        }

        return RequestPartsAvailabilityDTO.builder()
                .canReserve(canReserveAll)
                .parts(items)
                .build();
    }

    /**
     * Atomically reserves all required parts for a request before approval.
     * Uses pessimistic locking to prevent race conditions and oversubscription.
     * Throws PartShortageException and dispatches notifications if any part cannot be reserved.
     */
    @Transactional
    public void reservePartsForRequest(Request request, User approver) {
        Collection<PartQuantity> partQuantities = partQuantityRepository.findByRequest_Id(request.getId());
        if (partQuantities.isEmpty()) {
            return;
        }

        // Check if all are already reserved (idempotency check)
        boolean allReserved = partQuantities.stream()
                .allMatch(pq -> PartReservationStatus.RESERVED.equals(pq.getReservationStatus()) ||
                                PartReservationStatus.CONSUMED.equals(pq.getReservationStatus()));
        if (allReserved) {
            log.info("Request {} parts are already reserved; skipping duplicate reservation", request.getId());
            return;
        }

        List<PartShortageItemDTO> shortages = new ArrayList<>();
        Map<PartQuantity, Part> lockedParts = new LinkedHashMap<>();

        // 1. Lock each part row and check stock availability atomically
        for (PartQuantity pq : partQuantities) {
            if (PartReservationStatus.RESERVED.equals(pq.getReservationStatus()) ||
                PartReservationStatus.CONSUMED.equals(pq.getReservationStatus())) {
                continue;
            }

            Part lockedPart = partRepository.findByIdWithLock(pq.getPart().getId())
                    .orElseThrow(() -> new CustomException("Part not found: " + pq.getPart().getId(), HttpStatus.NOT_FOUND));
            lockedParts.put(pq, lockedPart);

            if (!lockedPart.isNonStock()) {
                double available = partService.getAvailableQuantity(lockedPart);
                if (available < pq.getQuantity()) {
                    shortages.add(PartShortageItemDTO.builder()
                            .partId(lockedPart.getId())
                            .part(lockedPart.getName())
                            .required(pq.getQuantity())
                            .available(available)
                            .shortage(pq.getQuantity() - available)
                            .build());
                }
            }
        }

        // 2. If any shortage exists, abort reservation atomically and notify responsible users
        if (!shortages.isEmpty()) {
            String requestDisplay = request.getCustomId() != null && !request.getCustomId().isBlank()
                    ? request.getCustomId()
                    : "REQ-" + request.getId();
            notifyShortage(request, approver, requestDisplay, shortages);
            throw new PartShortageException(requestDisplay, request.getId(), shortages);
        }

        // 3. All parts available: atomically reserve all parts
        for (Map.Entry<PartQuantity, Part> entry : lockedParts.entrySet()) {
            PartQuantity pq = entry.getKey();
            Part lockedPart = entry.getValue();

            if (!lockedPart.isNonStock()) {
                int addReserved = (int) Math.round(pq.getQuantity());
                lockedPart.setReservedQuantity(lockedPart.getReservedQuantity() + addReserved);
                partRepository.save(lockedPart);
            }
            pq.setReservationStatus(PartReservationStatus.RESERVED);
            partQuantityRepository.save(pq);
        }
        log.info("Successfully reserved parts for request {}", request.getId());
    }

    /**
     * Transfers/links the reserved parts to the created WorkOrder.
     */
    @Transactional
    public void linkReservedPartsToWorkOrder(Request request, WorkOrder workOrder) {
        Collection<PartQuantity> partQuantities = partQuantityRepository.findByRequest_Id(request.getId());
        for (PartQuantity pq : partQuantities) {
            pq.setWorkOrder(workOrder);
            partQuantityRepository.save(pq);
        }
    }

    /**
     * Consumes reserved parts when the WorkOrder completes.
     * Decreases quantity and reservedQuantity, transitions reservationStatus to CONSUMED,
     * and logs a PartTransaction audit record.
     */
    @Transactional
    public void consumeReservedParts(WorkOrder workOrder) {
        Collection<PartQuantity> partQuantities = partQuantityRepository.findByWorkOrder_Id(workOrder.getId());
        for (PartQuantity pq : partQuantities) {
            if (PartReservationStatus.RESERVED.equals(pq.getReservationStatus())) {
                Part part = partRepository.findByIdWithLock(pq.getPart().getId())
                        .orElse(pq.getPart());
                double qty = pq.getQuantity();

                if (!part.isNonStock()) {
                    part.setQuantity(Math.max(0, part.getQuantity() - qty));
                    part.setReservedQuantity(Math.max(0, part.getReservedQuantity() - (int) Math.round(qty)));
                    partRepository.save(part);
                }

                pq.setReservationStatus(PartReservationStatus.CONSUMED);
                partQuantityRepository.save(pq);

                // Create audit trail in PartTransaction
                PartTransaction pt = new PartTransaction(part, workOrder, qty);
                String woDisplay = workOrder.getCustomId() != null && !workOrder.getCustomId().isBlank()
                        ? workOrder.getCustomId()
                        : "WO-" + workOrder.getId();
                pt.setDescription("Consumed on work order completion (" + woDisplay + ")");
                partTransactionService.create(pt);
                log.info("Consumed {} of part {} for completed work order {}", qty, part.getName(), workOrder.getId());
            }
        }
    }

    /**
     * Releases reserved parts when a Request is cancelled.
     */
    @Transactional
    public void releaseReservedPartsForRequest(Request request) {
        Collection<PartQuantity> partQuantities = partQuantityRepository.findByRequest_Id(request.getId());
        for (PartQuantity pq : partQuantities) {
            if (PartReservationStatus.RESERVED.equals(pq.getReservationStatus())) {
                Part part = partRepository.findByIdWithLock(pq.getPart().getId())
                        .orElse(pq.getPart());
                if (!part.isNonStock()) {
                    int releaseQty = (int) Math.round(pq.getQuantity());
                    part.setReservedQuantity(Math.max(0, part.getReservedQuantity() - releaseQty));
                    partRepository.save(part);
                }
                pq.setReservationStatus(PartReservationStatus.RELEASED);
                partQuantityRepository.save(pq);
                log.info("Released {} reserved of part {} for cancelled request {}", pq.getQuantity(), part.getName(), request.getId());
            }
        }
    }

    /**
     * Releases reserved parts when a WorkOrder is cancelled or deleted before completion.
     */
    @Transactional
    public void releaseReservedPartsForWorkOrder(WorkOrder workOrder) {
        Collection<PartQuantity> partQuantities = partQuantityRepository.findByWorkOrder_Id(workOrder.getId());
        for (PartQuantity pq : partQuantities) {
            if (PartReservationStatus.RESERVED.equals(pq.getReservationStatus())) {
                Part part = partRepository.findByIdWithLock(pq.getPart().getId())
                        .orElse(pq.getPart());
                if (!part.isNonStock()) {
                    int releaseQty = (int) Math.round(pq.getQuantity());
                    part.setReservedQuantity(Math.max(0, part.getReservedQuantity() - releaseQty));
                    partRepository.save(part);
                }
                pq.setReservationStatus(PartReservationStatus.RELEASED);
                partQuantityRepository.save(pq);
                log.info("Released {} reserved of part {} for cancelled work order {}", pq.getQuantity(), part.getName(), workOrder.getId());
            }
        }
    }

    /**
     * Updates/attaches required parts to a request.
     */
    @Transactional
    public Collection<PartQuantity> patchRequestParts(Request request, List<PartQuantityCompletePatchDTO> partsReq) {
        if (request.getWorkOrder() != null) {
            throw new CustomException("Cannot modify parts on an already approved request", HttpStatus.NOT_ACCEPTABLE);
        }
        if (request.isCancelled()) {
            throw new CustomException("Cannot modify parts on a cancelled request", HttpStatus.NOT_ACCEPTABLE);
        }

        Collection<PartQuantity> existing = partQuantityRepository.findByRequest_Id(request.getId());
        Map<Long, PartQuantity> existingByPartId = existing.stream()
                .collect(Collectors.toMap(pq -> pq.getPart().getId(), pq -> pq, (a, b) -> a));

        Set<Long> reqPartIds = partsReq.stream()
                .map(dto -> dto.getPart().getId())
                .collect(Collectors.toSet());

        // Delete removed parts
        for (PartQuantity pq : existing) {
            if (!reqPartIds.contains(pq.getPart().getId())) {
                if (PartReservationStatus.RESERVED.equals(pq.getReservationStatus())) {
                    Part part = pq.getPart();
                    if (!part.isNonStock()) {
                        part.setReservedQuantity(Math.max(0, part.getReservedQuantity() - (int) Math.round(pq.getQuantity())));
                        partRepository.save(part);
                    }
                }
                partQuantityRepository.delete(pq);
            }
        }

        // Add or update parts
        for (PartQuantityCompletePatchDTO dto : partsReq) {
            Long partId = dto.getPart().getId();
            PartQuantity existingPq = existingByPartId.get(partId);
            if (existingPq != null) {
                existingPq.setQuantity(dto.getQuantity());
                partQuantityRepository.save(existingPq);
            } else {
                Part part = partRepository.findById(partId)
                        .orElseThrow(() -> new CustomException("Part not found: " + partId, HttpStatus.NOT_FOUND));
                PartQuantity newPq = new PartQuantity(part, request, dto.getQuantity());
                newPq.setCompany(request.getCompany());
                partQuantityRepository.save(newPq);
            }
        }

        return partQuantityRepository.findByRequest_Id(request.getId());
    }

    private void notifyShortage(Request request, User approver, String requestDisplay, List<PartShortageItemDTO> shortages) {
        try {
            Company company = request.getCompany();
            String title = "⚠ PART SHORTAGE";
            StringBuilder sb = new StringBuilder();
            sb.append("Request ").append(requestDisplay).append(" cannot proceed. ");
            for (PartShortageItemDTO item : shortages) {
                sb.append(item.getPart())
                        .append(": Required ").append(item.getRequired())
                        .append(", Available ").append(item.getAvailable())
                        .append(", Shortage ").append(item.getShortage())
                        .append(". ");
            }
            String message = sb.toString();

            Map<Long, User> usersToNotify = new HashMap<>();

            // Add approver
            if (approver != null && approver.isEnabled()) {
                usersToNotify.put(approver.getId(), approver);
            }

            // Add requester
            if (request.getCreatedBy() != null) {
                userService.findById(request.getCreatedBy()).ifPresent(reqUser -> {
                    if (reqUser.isEnabled()) usersToNotify.put(reqUser.getId(), reqUser);
                });
            }

            // Add administrators
            if (company != null) {
                userService.findByCompany(company.getId()).stream()
                        .filter(u -> u.isEnabled() && (
                                RoleCode.LIMITED_ADMIN.equals(u.getRole().getCode()) ||
                                u.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS) ||
                                u.getRole().getViewPermissions().contains(PermissionEntity.PARTS_AND_MULTIPARTS)))
                        .forEach(u -> usersToNotify.put(u.getId(), u));
            }

            List<Notification> notifications = usersToNotify.values().stream()
                    .map(u -> new Notification(message, u, NotificationType.PART, request.getId()))
                    .collect(Collectors.toList());

            notificationService.createMultiple(notifications, true, title);
        } catch (Exception e) {
            log.error("Failed to send shortage notifications: {}", e.getMessage(), e);
        }
    }
}
