package com.grash.service;

import com.grash.dto.PartQuantityCompletePatchDTO;
import com.grash.dto.RequestPartsAvailabilityDTO;
import com.grash.exception.PartShortageException;
import com.grash.model.*;
import com.grash.model.enums.PartReservationStatus;
import com.grash.repository.PartQuantityRepository;
import com.grash.repository.PartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SmartPartsReservationServiceTest {

    @InjectMocks
    private SmartPartsReservationService reservationService;

    @Mock
    private PartRepository partRepository;
    @Mock
    private PartQuantityRepository partQuantityRepository;
    @Mock
    private PartTransactionService partTransactionService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private UserService userService;
    @Mock
    private PartService partService;

    private Company company;
    private User approver;
    private Request request;

    @BeforeEach
    void setUp() {
        company = new Company();
        company.setId(1L);

        approver = new User();
        approver.setId(10L);
        approver.setCompany(company);
        approver.setEnabled(true);

        request = new Request();
        request.setId(100L);
        request.setCustomId("REQ-104");
        request.setCompany(company);
    }

    private Part createPart(Long id, String name, double stock, int reserved) {
        Part part = new Part();
        part.setId(id);
        part.setName(name);
        part.setQuantity(stock);
        part.setReservedQuantity(reserved);
        part.setCompany(company);
        return part;
    }

    private PartQuantity createPartQuantity(Long id, Part part, Request req, double qty) {
        PartQuantity pq = new PartQuantity(part, req, qty);
        pq.setId(id);
        pq.setCompany(company);
        return pq;
    }

    @Test
    @DisplayName("Test 1 — Enough stock: Reservation succeeds and increases reserved quantity")
    void test1_enoughStock_reservationSucceeds() {
        // Stock = 10, Reserved = 2, Required = 3 -> Available = 8 >= 3 -> Succeeds, Reserved becomes 5
        Part belt = createPart(1L, "Motor Belt", 10.0, 2);
        PartQuantity pq = createPartQuantity(101L, belt, request, 3.0);

        when(partQuantityRepository.findByRequest_Id(request.getId())).thenReturn(Collections.singletonList(pq));
        when(partRepository.findByIdWithLock(1L)).thenReturn(Optional.of(belt));
        when(partService.getAvailableQuantity(belt)).thenReturn(8.0);

        reservationService.reservePartsForRequest(request, approver);

        assertEquals(5, belt.getReservedQuantity());
        assertEquals(PartReservationStatus.RESERVED, pq.getReservationStatus());
        verify(partRepository).save(belt);
        verify(partQuantityRepository).save(pq);
    }

    @Test
    @DisplayName("Test 2 — Insufficient stock: Throws PartShortageException and leaves reserved quantity unchanged")
    void test2_insufficientStock_throwsPartShortage() {
        // Stock = 10, Reserved = 8, Required = 3 -> Available = 2 < 3 -> PART_SHORTAGE
        Part belt = createPart(1L, "Motor Belt", 10.0, 8);
        PartQuantity pq = createPartQuantity(101L, belt, request, 3.0);

        when(partQuantityRepository.findByRequest_Id(request.getId())).thenReturn(Collections.singletonList(pq));
        when(partRepository.findByIdWithLock(1L)).thenReturn(Optional.of(belt));
        when(partService.getAvailableQuantity(belt)).thenReturn(2.0);

        PartShortageException ex = assertThrows(PartShortageException.class, () ->
                reservationService.reservePartsForRequest(request, approver)
        );

        assertEquals("PART_SHORTAGE", ex.getStatus());
        assertEquals("HIGH", ex.getSeverity());
        assertEquals(1, ex.getParts().size());
        assertEquals("Motor Belt", ex.getParts().get(0).getPart());
        assertEquals(3.0, ex.getParts().get(0).getRequired());
        assertEquals(2.0, ex.getParts().get(0).getAvailable());
        assertEquals(1.0, ex.getParts().get(0).getShortage());

        // Stock & reserved must remain unchanged
        assertEquals(8, belt.getReservedQuantity());
        verify(partRepository, never()).save(belt);
    }

    @Test
    @DisplayName("Test 3 — Multiple parts, one shortage: Atomic rollback ensures NONE are reserved")
    void test3_multiplePartsOneShortage_noneReserved() {
        // Motor Belt: Stock 10, Reserved 2, Req 2 -> Avail 8 >= 2 (OK)
        // Bearing:    Stock 5,  Reserved 1, Req 1 -> Avail 4 >= 1 (OK)
        // Filter:     Stock 2,  Reserved 1, Req 2 -> Avail 1 < 2  (SHORTAGE!)
        Part belt = createPart(1L, "Motor Belt", 10.0, 2);
        Part bearing = createPart(2L, "Bearing", 5.0, 1);
        Part filter = createPart(3L, "Filter", 2.0, 1);

        PartQuantity pq1 = createPartQuantity(101L, belt, request, 2.0);
        PartQuantity pq2 = createPartQuantity(102L, bearing, request, 1.0);
        PartQuantity pq3 = createPartQuantity(103L, filter, request, 2.0);

        when(partQuantityRepository.findByRequest_Id(request.getId())).thenReturn(Arrays.asList(pq1, pq2, pq3));
        when(partRepository.findByIdWithLock(1L)).thenReturn(Optional.of(belt));
        when(partRepository.findByIdWithLock(2L)).thenReturn(Optional.of(bearing));
        when(partRepository.findByIdWithLock(3L)).thenReturn(Optional.of(filter));

        when(partService.getAvailableQuantity(belt)).thenReturn(8.0);
        when(partService.getAvailableQuantity(bearing)).thenReturn(4.0);
        when(partService.getAvailableQuantity(filter)).thenReturn(1.0); // short

        PartShortageException ex = assertThrows(PartShortageException.class, () ->
                reservationService.reservePartsForRequest(request, approver)
        );

        assertEquals(1, ex.getParts().size());
        assertEquals("Filter", ex.getParts().get(0).getPart());

        // Crucial: Belt and Bearing must NOT have their reservedQuantity changed!
        assertEquals(2, belt.getReservedQuantity());
        assertEquals(1, bearing.getReservedQuantity());
        assertEquals(1, filter.getReservedQuantity());

        assertNull(pq1.getReservationStatus());
        assertNull(pq2.getReservationStatus());
        assertNull(pq3.getReservationStatus());

        verify(partRepository, never()).save(any());
        verify(partQuantityRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test 4 — Work order completion: Stock decreases, reserved decreases, status becomes CONSUMED")
    void test4_completeWorkOrder_consumesReservedParts() {
        // Before completion: Stock = 10, Reserved = 3
        Part belt = createPart(1L, "Motor Belt", 10.0, 3);
        WorkOrder wo = new WorkOrder();
        wo.setId(200L);
        wo.setCustomId("WO-1042");
        wo.setTitle("Fix Hydraulic Pump");

        PartQuantity pq = createPartQuantity(101L, belt, request, 3.0);
        pq.setWorkOrder(wo);
        pq.setReservationStatus(PartReservationStatus.RESERVED);

        when(partQuantityRepository.findByWorkOrder_Id(wo.getId())).thenReturn(Collections.singletonList(pq));
        when(partRepository.findByIdWithLock(1L)).thenReturn(Optional.of(belt));

        reservationService.consumeReservedParts(wo);

        // After completion: Stock = 7, Reserved = 0
        assertEquals(7.0, belt.getQuantity());
        assertEquals(0, belt.getReservedQuantity());
        assertEquals(PartReservationStatus.CONSUMED, pq.getReservationStatus());

        verify(partRepository).save(belt);
        verify(partQuantityRepository).save(pq);
        verify(partTransactionService).create(any(PartTransaction.class));
    }

    @Test
    @DisplayName("Test 5 — Work order / Request cancellation: Stock unchanged, reserved decreases, status becomes RELEASED")
    void test5_cancelRequest_releasesReservedParts() {
        // Before cancellation: Stock = 10, Reserved = 3
        Part belt = createPart(1L, "Motor Belt", 10.0, 3);
        PartQuantity pq = createPartQuantity(101L, belt, request, 3.0);
        pq.setReservationStatus(PartReservationStatus.RESERVED);

        when(partQuantityRepository.findByRequest_Id(request.getId())).thenReturn(Collections.singletonList(pq));
        when(partRepository.findByIdWithLock(1L)).thenReturn(Optional.of(belt));

        reservationService.releaseReservedPartsForRequest(request);

        // After cancellation: Stock = 10 (unchanged), Reserved = 0
        assertEquals(10.0, belt.getQuantity());
        assertEquals(0, belt.getReservedQuantity());
        assertEquals(PartReservationStatus.RELEASED, pq.getReservationStatus());

        verify(partRepository).save(belt);
        verify(partQuantityRepository).save(pq);
    }

    @Test
    @DisplayName("Test 6 — Duplicate approval: Idempotent, parts reserved only once")
    void test6_duplicateApproval_reservedOnlyOnce() {
        Part belt = createPart(1L, "Motor Belt", 10.0, 2);
        PartQuantity pq = createPartQuantity(101L, belt, request, 2.0);
        pq.setReservationStatus(PartReservationStatus.RESERVED); // Already reserved!

        when(partQuantityRepository.findByRequest_Id(request.getId())).thenReturn(Collections.singletonList(pq));

        reservationService.reservePartsForRequest(request, approver);

        // Reserved quantity remains 2, save is not called again
        assertEquals(2, belt.getReservedQuantity());
        verify(partRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test 7 — Concurrency check: available quantity calculation prevents negative or over-reservation")
    void test7_availabilityCalculation_preventsOverReservation() {
        Part part = createPart(1L, "Hydraulic Seal", 10.0, 8);
        when(partService.getAvailableQuantity(part)).thenReturn(2.0);

        PartQuantity pq = createPartQuantity(101L, part, request, 2.0);
        when(partQuantityRepository.findByRequest_Id(request.getId())).thenReturn(Collections.singletonList(pq));
        when(partRepository.findByIdWithLock(1L)).thenReturn(Optional.of(part));

        // First reservation consumes remaining 2
        reservationService.reservePartsForRequest(request, approver);
        assertEquals(10, part.getReservedQuantity());

        // If another request now checks with updated stock (10 - 10 = 0 available)
        when(partService.getAvailableQuantity(part)).thenReturn(0.0);
        Request request2 = new Request();
        request2.setId(200L);
        PartQuantity pq2 = createPartQuantity(102L, part, request2, 2.0);
        when(partQuantityRepository.findByRequest_Id(request2.getId())).thenReturn(Collections.singletonList(pq2));

        assertThrows(PartShortageException.class, () ->
                reservationService.reservePartsForRequest(request2, approver)
        );
    }

    @Test
    @DisplayName("Check availability API returns correct status for available and short parts")
    void testCheckAvailabilityAPI() {
        Part belt = createPart(1L, "Motor Belt", 10.0, 2);
        Part filter = createPart(2L, "Filter", 3.0, 2);

        PartQuantity pq1 = createPartQuantity(101L, belt, request, 3.0);
        PartQuantity pq2 = createPartQuantity(102L, filter, request, 2.0);

        when(partQuantityRepository.findByRequest_Id(request.getId())).thenReturn(Arrays.asList(pq1, pq2));
        when(partService.getAvailableQuantity(belt)).thenReturn(8.0);
        when(partService.getAvailableQuantity(filter)).thenReturn(1.0);

        RequestPartsAvailabilityDTO result = reservationService.checkPartsAvailability(request);

        assertFalse(result.isCanReserve());
        assertEquals(2, result.getParts().size());

        assertEquals("AVAILABLE", result.getParts().get(0).getStatus());
        assertEquals(0.0, result.getParts().get(0).getShortage());

        assertEquals("SHORTAGE", result.getParts().get(1).getStatus());
        assertEquals(1.0, result.getParts().get(1).getShortage());
    }
}
