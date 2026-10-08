package com.grash.service;

import com.grash.dto.validation.PreApprovalValidationResultDTO;
import com.grash.dto.validation.ValidationCheckDTO;
import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.AssetStatus;
import com.grash.model.enums.Priority;
import com.grash.model.enums.ValidationCheckStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PreApprovalValidationServiceTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private PreApprovalValidationService validationService;

    private Request request;
    private Company company;
    private Asset asset;
    private Location location;

    @BeforeEach
    void setUp() {
        company = new Company();
        company.setId(1L);

        location = new Location();
        location.setId(10L);
        location.setName("Site A");

        asset = new Asset();
        asset.setId(100L);
        asset.setName("Asset M-104");
        asset.setStatus(AssetStatus.OPERATIONAL);
        asset.setLocation(location);
        asset.setArchived(false);

        request = new Request();
        request.setId(1000L);
        request.setCustomId("SR-1042");
        request.setCompany(company);
        request.setAsset(asset);
        request.setLocation(location);
        request.setPriority(Priority.HIGH);
    }

    @Test
    void testValidRequest_AllPass() {
        PreApprovalValidationResultDTO result = validationService.validateRequest(request);

        assertTrue(result.isValid());
        assertEquals("SR-1042", result.getCustomId());
        assertTrue(result.getChecks().stream().allMatch(c -> c.getStatus() != ValidationCheckStatus.BLOCKED));
    }

    @Test
    void testInvalidAsset_MissingAsset_Blocked() {
        request.setAsset(null);

        PreApprovalValidationResultDTO result = validationService.validateRequest(request);

        assertFalse(result.isValid());
        ValidationCheckDTO assetCheck = result.getChecks().stream()
                .filter(c -> c.getCode().equals("ASSET_EXISTS"))
                .findFirst().orElseThrow();
        assertEquals(ValidationCheckStatus.BLOCKED, assetCheck.getStatus());
    }

    @Test
    void testLocationMismatch_Blocked() {
        Location locationB = new Location();
        locationB.setId(20L);
        locationB.setName("Site B");

        request.setLocation(locationB);

        PreApprovalValidationResultDTO result = validationService.validateRequest(request);

        assertFalse(result.isValid());
        ValidationCheckDTO locCheck = result.getChecks().stream()
                .filter(c -> c.getCode().equals("LOCATION_MATCH"))
                .findFirst().orElseThrow();
        assertEquals(ValidationCheckStatus.BLOCKED, locCheck.getStatus());
    }

    @Test
    void testMissingPriority_Blocked() {
        request.setPriority(Priority.NONE);

        PreApprovalValidationResultDTO result = validationService.validateRequest(request);

        assertFalse(result.isValid());
        ValidationCheckDTO prioCheck = result.getChecks().stream()
                .filter(c -> c.getCode().equals("PRIORITY_VALID"))
                .findFirst().orElseThrow();
        assertEquals(ValidationCheckStatus.BLOCKED, prioCheck.getStatus());
    }

    @Test
    void testNoQualifiedTechnician_Blocked() {
        Skill electricalSkill = new Skill();
        electricalSkill.setId(5L);
        electricalSkill.setName("ELECTRICAL");
        electricalSkill.setUsers(Collections.emptyList());

        request.setRequiredSkill(electricalSkill);
        when(userService.findByCompany(anyLong())).thenReturn(Collections.emptyList());

        PreApprovalValidationResultDTO result = validationService.validateRequest(request);

        assertFalse(result.isValid());
        ValidationCheckDTO skillCheck = result.getChecks().stream()
                .filter(c -> c.getCode().equals("TECHNICIAN_SKILL"))
                .findFirst().orElseThrow();
        assertEquals(ValidationCheckStatus.BLOCKED, skillCheck.getStatus());
    }

    @Test
    void testInsufficientInventory_Blocked() {
        Part bearing = new Part();
        bearing.setId(50L);
        bearing.setName("Bearing");
        bearing.setQuantity(1.0);

        PartQuantity pq = new PartQuantity(bearing, null, null, 2.0);
        request.setRequiredParts(Collections.singletonList(pq));

        PreApprovalValidationResultDTO result = validationService.validateRequest(request);

        assertFalse(result.isValid());
        ValidationCheckDTO partCheck = result.getChecks().stream()
                .filter(c -> c.getCode().startsWith("PART_AVAILABILITY_"))
                .findFirst().orElseThrow();
        assertEquals(ValidationCheckStatus.BLOCKED, partCheck.getStatus());
        assertEquals(2.0, partCheck.getRequiredQuantity());
        assertEquals(1.0, partCheck.getAvailableQuantity());
    }

    @Test
    void testSufficientInventory_Pass() {
        Part bearing = new Part();
        bearing.setId(50L);
        bearing.setName("Bearing");
        bearing.setQuantity(5.0);

        PartQuantity pq = new PartQuantity(bearing, null, null, 2.0);
        request.setRequiredParts(Collections.singletonList(pq));

        PreApprovalValidationResultDTO result = validationService.validateRequest(request);

        assertTrue(result.isValid());
        ValidationCheckDTO partCheck = result.getChecks().stream()
                .filter(c -> c.getCode().startsWith("PART_AVAILABILITY_"))
                .findFirst().orElseThrow();
        assertEquals(ValidationCheckStatus.PASS, partCheck.getStatus());
    }
}
