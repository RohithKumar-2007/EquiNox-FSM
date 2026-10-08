package com.grash.service;

import com.grash.dto.assignment.AutoAssignResponseDTO;
import com.grash.dto.assignment.TechnicianCandidateDTO;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.model.enums.Status;
import com.grash.repository.WorkOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class TechnicianMatchingServiceTest {

    @Mock
    private UserService userService;

    @Mock
    private WorkOrderRepository workOrderRepository;

    @InjectMocks
    private TechnicianMatchingService technicianMatchingService;

    private WorkOrder workOrder;
    private Company company;
    private User currentUser;
    private User tech1;
    private User tech2;
    private Location location;

    @BeforeEach
    void setUp() {
        company = new Company();
        company.setId(1L);

        Role role = new Role();
        role.setEditOtherPermissions(Collections.singleton(PermissionEntity.WORK_ORDERS));
        role.setViewPermissions(Collections.singleton(PermissionEntity.SETTINGS));

        currentUser = new User();
        currentUser.setId(10L);
        currentUser.setCompany(company);
        currentUser.setRole(role);

        location = new Location();
        location.setId(100L);
        location.setName("Site A");

        workOrder = new WorkOrder();
        workOrder.setId(500L);
        workOrder.setCompany(company);
        workOrder.setLocation(location);

        tech1 = new User();
        tech1.setId(101L);
        tech1.setFirstName("Arun");
        tech1.setLastName("Kumar");
        tech1.setEmail("arun@example.com");
        tech1.setCompany(company);
        tech1.setEnabled(true);
        tech1.setLocation(location);

        tech2 = new User();
        tech2.setId(102L);
        tech2.setFirstName("Ravi");
        tech2.setLastName("Kumar");
        tech2.setEmail("ravi@example.com");
        tech2.setCompany(company);
        tech2.setEnabled(true);
        tech2.setLocation(location);
    }

    @Test
    void testGetCandidates_RankingByWorkload() {
        when(userService.findByCompany(anyLong())).thenReturn(Arrays.asList(tech1, tech2));

        // Tech1 has 1 open WO, Tech2 has 4 open WOs
        WorkOrder wo1 = new WorkOrder();
        wo1.setPrimaryUser(tech1);
        wo1.setStatus(Status.OPEN);

        WorkOrder wo2 = new WorkOrder();
        wo2.setPrimaryUser(tech2);
        wo2.setStatus(Status.OPEN);

        WorkOrder wo3 = new WorkOrder();
        wo3.setPrimaryUser(tech2);
        wo3.setStatus(Status.OPEN);

        when(workOrderRepository.findByCompany_Id(anyLong())).thenReturn(Arrays.asList(wo1, wo2, wo3));

        List<TechnicianCandidateDTO> candidates = technicianMatchingService.getCandidatesForWorkOrder(workOrder, currentUser);

        assertEquals(2, candidates.size());
        assertEquals("Arun", candidates.get(0).getFirstName());
        assertEquals(1, candidates.get(0).getRank());
        assertTrue(candidates.get(0).getScore() > candidates.get(1).getScore());
    }

    @Test
    void testSkillFiltering_LacksRequiredSkill_Excluded() {
        Skill electrical = new Skill();
        electrical.setId(5L);
        electrical.setName("ELECTRICAL");
        electrical.setUsers(Collections.singletonList(tech1)); // Only Tech1 has skill

        Request parentReq = new Request();
        parentReq.setRequiredSkill(electrical);
        workOrder.setParentRequest(parentReq);

        when(userService.findByCompany(anyLong())).thenReturn(Arrays.asList(tech1, tech2));
        when(workOrderRepository.findByCompany_Id(anyLong())).thenReturn(Collections.emptyList());

        List<TechnicianCandidateDTO> candidates = technicianMatchingService.getCandidatesForWorkOrder(workOrder, currentUser);

        assertEquals(1, candidates.size());
        assertEquals("Arun", candidates.get(0).getFirstName());
        assertTrue(candidates.get(0).isSkillMatch());
    }

    @Test
    void testAutoAssign_Success() {
        when(userService.findByCompany(anyLong())).thenReturn(Collections.singletonList(tech1));
        when(userService.findById(101L)).thenReturn(Optional.of(tech1));
        when(workOrderRepository.findByCompany_Id(anyLong())).thenReturn(Collections.emptyList());

        AutoAssignResponseDTO response = technicianMatchingService.autoAssignWorkOrder(workOrder, currentUser, false);

        assertTrue(response.isAssigned());
        assertEquals(tech1, workOrder.getPrimaryUser());
        assertNotNull(response.getAssignedTechnician());
    }

    @Test
    void testAutoAssign_AlreadyAssigned_RequiresConfirmation() {
        workOrder.setPrimaryUser(tech2);

        AutoAssignResponseDTO response = technicianMatchingService.autoAssignWorkOrder(workOrder, currentUser, false);

        assertFalse(response.isAssigned());
        assertTrue(response.isRequiresConfirmation());
    }
}
