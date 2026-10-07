package com.grash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.dto.license.LicenseEntitlement;
import com.grash.model.*;
import com.grash.model.enums.*;
import com.grash.repository.KeygenRequestTrackerRepository;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StandaloneAccessTest {
    @Test
    void operationalAccessDoesNotRequireExternalLicenseService() {
        var tracker = mock(KeygenRequestTrackerRepository.class);
        var service = new LicenseService(new ObjectMapper(), tracker);
        var state = service.getLicensingState();
        assertTrue(state.isValid());
        assertFalse(state.isHasLicense());
        assertNull(state.getExpirationDate());
        for (var entitlement : LicenseEntitlement.values()) {
            assertTrue(service.hasEntitlement(entitlement));
        }
        verifyNoInteractions(tracker);
    }

    @Test
    void expiredLegacySubscriptionDoesNotBlockExistingAccount() {
        var subscription = Subscription.builder().usersCount(1).activated(false)
                .upgradeNeeded(true).downgradeNeeded(true).endsOn(new Date(0)).build();
        assertTrue(subscription.isActivated());
        assertFalse(subscription.isUpgradeNeeded());
        assertFalse(subscription.isDowngradeNeeded());
        assertNull(subscription.getEndsOn());
        assertEquals(Integer.MAX_VALUE, subscription.getUsersCount());
    }

    @Test
    void featureAccessStillRequiresRolePermission() {
        var company = new Company();
        company.setSubscription(Subscription.builder().subscriptionPlan(new SubscriptionPlan()).build());
        var user = new User();
        user.setCompany(company);
        user.setRole(Role.builder().roleType(RoleType.ROLE_CLIENT).build());
        assertFalse(user.canSeeAnalytics());
        user.getRole().getViewPermissions().add(PermissionEntity.ANALYTICS);
        assertTrue(user.canSeeAnalytics());
        user.setEnabled(false);
        user.setEnabledInSubscription(false);
        assertTrue(user.isEnabledInSubscription());
        assertFalse(user.isEnabled());
    }
}
