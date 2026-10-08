package com.grash.voiceops;

import com.grash.event.AssetStatusChangedEvent;
import com.grash.model.Asset;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.enums.Priority;
import com.grash.model.enums.RoleCode;
import com.grash.model.enums.Status;
import com.grash.repository.AssetRepository;
import com.grash.service.WorkOrderService;
import com.grash.voiceops.VoiceEvent.EventStatus;
import com.grash.voiceops.VoiceEvent.Origin;
import com.grash.voiceops.VoiceEvent.Type;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

import static com.grash.voiceops.VoiceOpsService.mapOf;

/**
 * Places outbound ElevenLabs calls to technicians: when a voice caller's work order is escalated, when someone
 * presses "Call technician" in the VoiceOps panel, and (if ELEVENLABS_AUTO_DISPATCH=true) when equipment goes
 * down. Every attempt, including skipped ones, is recorded as a VoiceOps event with the real outcome.
 */
@Service
@Slf4j
public class VoiceDispatchService {

    private static final Pattern PHONE = Pattern.compile("^\\+?[0-9][0-9 ()-]{5,}$");
    // Don't ring the same technician repeatedly when an asset flaps between up and down.
    private static final long AUTO_DISPATCH_COOLDOWN_MS = 10 * 60 * 1000;

    private final ElevenLabsClient elevenLabsClient;
    private final VoiceOpsService voiceOpsService;
    private final AssetRepository assetRepository;
    private final WorkOrderService workOrderService;
    private final boolean autoDispatchOnAssetDown;
    private final Map<Long, Long> lastAutoDispatchByAsset = new ConcurrentHashMap<>();

    public VoiceDispatchService(ElevenLabsClient elevenLabsClient, VoiceOpsService voiceOpsService,
                                AssetRepository assetRepository, @Lazy WorkOrderService workOrderService,
                                @Value("${elevenlabs.auto-dispatch-on-asset-down:false}") boolean autoDispatchOnAssetDown) {
        this.elevenLabsClient = elevenLabsClient;
        this.voiceOpsService = voiceOpsService;
        this.assetRepository = assetRepository;
        this.workOrderService = workOrderService;
        this.autoDispatchOnAssetDown = autoDispatchOnAssetDown;
    }

    public boolean isAutoDispatchEnabled() {
        return autoDispatchOnAssetDown;
    }

    /**
     * Escalation during a voice call: the outcome is recorded on that call.
     */
    public Map<String, Object> callForEscalation(VoiceCall call, WorkOrder workOrder, String reason) {
        Map<String, String> variables = variables("escalation", workOrder.getAsset(), workOrder, reason);
        return placeCall(call.getCompanyId(), call, "escalate_work_order", workOrder.getPrimaryUser(),
                workOrder.getId(), variables, "escalation of " + label(workOrder));
    }

    /**
     * "Call technician" pressed in the VoiceOps panel.
     */
    public Map<String, Object> callForWorkOrder(WorkOrder workOrder, User requestedBy) {
        User technician = workOrder.getPrimaryUser() != null ? workOrder.getPrimaryUser()
                : workOrder.getAssignedTo().stream().filter(User::isEnabled).findFirst().orElse(null);
        String reason = "Dispatch requested by " + requestedBy.getFullName();
        Map<String, String> variables = variables("dispatch", workOrder.getAsset(), workOrder, reason);
        return placeCall(requestedBy.getCompany().getId(), null, null, technician, workOrder.getId(), variables,
                label(workOrder) + " (requested by " + requestedBy.getFullName() + ")");
    }

    @Async
    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onAssetStatusChanged(AssetStatusChangedEvent event) {
        if (!autoDispatchOnAssetDown || !event.wentDown() || event.companyId() == null) return;
        long now = System.currentTimeMillis();
        Long last = lastAutoDispatchByAsset.get(event.assetId());
        if (last != null && now - last < AUTO_DISPATCH_COOLDOWN_MS) {
            log.info("VoiceOps auto-dispatch for asset {} skipped: called within the last 10 minutes", event.assetId());
            return;
        }
        lastAutoDispatchByAsset.put(event.assetId(), now);
        try {
            Asset asset = assetRepository.findById(event.assetId()).orElse(null);
            if (asset == null || asset.isArchived()) return;
            WorkOrder openWorkOrder = workOrderService.findByAsset(asset.getId()).stream()
                    .filter(wo -> wo.getStatus() != Status.COMPLETE && !wo.isArchived())
                    .max(Comparator.comparing((WorkOrder wo) -> wo.getPriority() == Priority.HIGH)
                            .thenComparing(WorkOrder::getId))
                    .orElse(null);
            User technician = onCallTechnician(asset, openWorkOrder);
            String reason = asset.getName() + " changed to " + event.newStatus().name().replace('_', ' ').toLowerCase();
            Map<String, String> variables = variables("asset_down", asset, openWorkOrder, reason);
            variables.put("asset_status", event.newStatus().name());
            placeCall(event.companyId(), null, null, technician,
                    openWorkOrder == null ? null : openWorkOrder.getId(), variables,
                    asset.getName() + " went " + event.newStatus().name().replace('_', ' ').toLowerCase());
        } catch (RuntimeException e) {
            log.error("VoiceOps auto-dispatch for asset {} failed", event.assetId(), e);
        }
    }

    /**
     * The person to call when equipment goes down: the open work order's primary user, then the asset's primary
     * user, then the first technician assigned to the asset.
     */
    private User onCallTechnician(Asset asset, WorkOrder openWorkOrder) {
        List<User> candidates = new ArrayList<>();
        if (openWorkOrder != null && openWorkOrder.getPrimaryUser() != null) candidates.add(openWorkOrder.getPrimaryUser());
        if (asset.getPrimaryUser() != null) candidates.add(asset.getPrimaryUser());
        asset.getAssignedTo().stream()
                .filter(u -> u.getRole() != null && (u.getRole().getCode() == RoleCode.TECHNICIAN
                        || u.getRole().getCode() == RoleCode.LIMITED_TECHNICIAN))
                .forEach(candidates::add);
        asset.getAssignedTo().forEach(candidates::add);
        return candidates.stream().filter(User::isEnabled).filter(u -> normalizePhone(u.getPhone()) != null)
                .findFirst()
                .orElse(candidates.stream().filter(User::isEnabled).findFirst().orElse(null));
    }

    private Map<String, Object> placeCall(Long companyId, VoiceCall recordOn, String toolName, User technician,
                                          Long workOrderId, Map<String, String> variables, String purpose) {
        String phone = technician == null ? null : normalizePhone(technician.getPhone());
        String skipReason = technician == null ? "nobody is assigned"
                : phone == null ? technician.getFullName() + " has no valid phone number"
                : !elevenLabsClient.canPlaceOutboundCalls() ? "outbound calling is not configured"
                : null;
        if (skipReason != null) {
            VoiceCall target = recordOn != null ? recordOn : voiceOpsService.createOutboundAttempt(companyId, phone,
                    technician == null ? null : technician.getId(), workOrderId);
            voiceOpsService.record(target, Type.OUTBOUND_CALL, Origin.BACKEND, EventStatus.SKIPPED, toolName,
                    "No technician call for " + purpose + ": " + skipReason,
                    mapOf("technician", technician == null ? null : technician.getFullName(),
                            "missing", elevenLabsClient.canPlaceOutboundCalls() ? null
                                    : "ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID or ELEVENLABS_PHONE_NUMBER_ID"),
                    null);
            return mapOf("status", "skipped", "reason", skipReason);
        }

        variables.put("technician_name", technician.getFirstName() == null ? "" : technician.getFirstName());
        long start = System.currentTimeMillis();
        ElevenLabsClient.OutboundCallResult result = elevenLabsClient.placeOutboundCall(phone, variables);
        long durationMs = System.currentTimeMillis() - start;
        Map<String, Object> detail = mapOf("to", phone, "technician", technician.getFullName(),
                "purpose", variables.get("call_purpose"), "conversation_id", result.conversationId(),
                "call_sid", result.callSid(), "message", result.message());
        String title = result.success() ? "Calling " + technician.getFullName() + " at " + phone + " about " + purpose
                : "Call to " + technician.getFullName() + " failed: " + result.message();

        VoiceCall outbound = null;
        if (result.success() && result.conversationId() != null) {
            outbound = voiceOpsService.getOrCreateCall(result.conversationId(), companyId,
                    VoiceCall.Source.PHONE_OUTBOUND, phone, technician.getId());
            outbound.setWorkOrderId(workOrderId);
            outbound = voiceOpsService.saveCall(outbound);
        }
        VoiceCall target = recordOn != null ? recordOn : outbound != null ? outbound
                : voiceOpsService.createOutboundAttempt(companyId, phone, technician.getId(), workOrderId);
        voiceOpsService.record(target, Type.OUTBOUND_CALL, Origin.BACKEND,
                result.success() ? EventStatus.SUCCESS : EventStatus.FAILED, toolName, title, detail, durationMs);
        return mapOf("status", result.success() ? "calling" : "failed", "technician", technician.getFullName(),
                "message", result.message());
    }

    /**
     * Dynamic variables for the dispatch agent. Every key is always sent so the agent prompt can reference them.
     */
    private static Map<String, String> variables(String purpose, Asset asset, WorkOrder workOrder, String reason) {
        Map<String, String> variables = new LinkedHashMap<>();
        variables.put("call_purpose", purpose);
        variables.put("work_order_id", workOrder == null ? "" : String.valueOf(workOrder.getId()));
        variables.put("work_order_code", workOrder == null || workOrder.getCustomId() == null ? "" : workOrder.getCustomId());
        variables.put("work_order_title", workOrder == null ? "" : workOrder.getTitle());
        variables.put("work_order_priority", workOrder == null || workOrder.getPriority() == null ? ""
                : workOrder.getPriority().name());
        variables.put("equipment", asset == null ? "" : asset.getName());
        variables.put("site", asset != null && asset.getLocation() != null ? asset.getLocation().getName()
                : workOrder != null && workOrder.getLocation() != null ? workOrder.getLocation().getName() : "");
        variables.put("asset_status", asset == null || asset.getStatus() == null ? "" : asset.getStatus().name());
        variables.put("escalation_reason", reason == null ? "" : reason);
        variables.put("technician_name", "");
        return variables;
    }

    private static String label(WorkOrder workOrder) {
        return workOrder.getCustomId() != null ? workOrder.getCustomId() : "work order #" + workOrder.getId();
    }

    static String normalizePhone(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return PHONE.matcher(trimmed).matches() ? trimmed.replaceAll("[ ()-]", "") : null;
    }
}
