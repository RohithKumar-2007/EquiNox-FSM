package com.grash.event;

import com.grash.model.enums.AssetStatus;

/**
 * Published whenever an asset's status changes (PATCH, downtime trigger or downtime stop).
 */
public record AssetStatusChangedEvent(Long assetId, Long companyId, AssetStatus previousStatus,
                                      AssetStatus newStatus) {

    public boolean wentDown() {
        return newStatus != null && newStatus.isReallyDown() && (previousStatus == null || !previousStatus.isReallyDown());
    }
}
