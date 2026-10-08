package com.grash.voiceops;

import com.grash.exception.CustomException;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.enums.Status;
import com.grash.service.WorkOrderService;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.UserService;
import com.grash.voiceops.VoiceEvent.EventStatus;
import com.grash.voiceops.VoiceEvent.Origin;
import com.grash.voiceops.VoiceEvent.Type;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.grash.voiceops.VoiceOpsService.mapOf;

/**
 * API for the VoiceOps panel: configuration status, recent calls with their events, and browser voice sessions.
 */
@RestController
@RequestMapping("/voice-ops")
@Tag(name = "VoiceOps", description = "Voice agent activity")
@RequiredArgsConstructor
@Slf4j
public class VoiceOpsController {

    private final VoiceOpsService voiceOpsService;
    private final ElevenLabsClient elevenLabsClient;
    private final UserService userService;
    private final VoiceToolAuthFilter voiceToolAuthFilter;
    private final VoiceDispatchService voiceDispatchService;
    private final WorkOrderService workOrderService;

    @Data
    @NoArgsConstructor
    public static class BrowserCallRequest {
        @NotBlank
        @Size(max = 255)
        private String conversationId;
    }

    @Data
    @NoArgsConstructor
    public static class BrowserMessageRequest {
        @NotBlank
        @Pattern(regexp = "user|agent")
        private String role;
        @NotBlank
        @Size(max = 4000)
        private String text;
    }

    @GetMapping("/config")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, Object> config(HttpServletRequest req) {
        requireViewer(req);
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("browserSessions", elevenLabsClient.canStartBrowserSessions());
        config.put("outboundCalls", elevenLabsClient.canPlaceOutboundCalls());
        config.put("webhookVerification", elevenLabsClient.canVerifyWebhooks());
        config.put("toolAuthentication", voiceToolAuthFilter.isConfigured());
        config.put("autoDispatch", voiceDispatchService.isAutoDispatchEnabled());
        config.put("separateDispatchAgent", elevenLabsClient.hasSeparateDispatchAgent());
        config.put("agentId", elevenLabsClient.getAgentId().isEmpty() ? null : elevenLabsClient.getAgentId());
        return config;
    }

    @GetMapping("/calls")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public List<Map<String, Object>> calls(HttpServletRequest req) {
        User user = requireViewer(req);
        return voiceOpsService.recentCalls(user.getCompany().getId(), 30);
    }

    @PostMapping("/browser-session")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, Object> browserSession(HttpServletRequest req) {
        requireViewer(req);
        if (!elevenLabsClient.canStartBrowserSessions())
            throw new CustomException("Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID to start voice sessions.",
                    HttpStatus.SERVICE_UNAVAILABLE);
        try {
            return Map.of("signedUrl", elevenLabsClient.getSignedUrl());
        } catch (RestClientException | IllegalStateException e) {
            log.warn("Could not get an ElevenLabs signed URL", e);
            throw new CustomException("ElevenLabs refused the session. Check ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.",
                    HttpStatus.BAD_GATEWAY);
        }
    }

    /**
     * Called by the panel once the ElevenLabs SDK has connected and returned the conversation id.
     */
    @PostMapping("/browser-calls")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, Object> registerBrowserCall(@Valid @RequestBody BrowserCallRequest request,
                                                   HttpServletRequest req) {
        User user = requireViewer(req);
        VoiceCall call = voiceOpsService.getOrCreateCall(request.getConversationId(), user.getCompany().getId(),
                VoiceCall.Source.BROWSER, null, user.getId());
        return voiceOpsService.toCallDto(call, List.of());
    }

    /**
     * Transcript lines delivered by the ElevenLabs SDK in the browser (onMessage).
     */
    @PostMapping("/browser-calls/{conversationId}/messages")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, Object> browserMessage(@PathVariable String conversationId,
                                              @Valid @RequestBody BrowserMessageRequest request,
                                              HttpServletRequest req) {
        User user = requireViewer(req);
        VoiceCall call = voiceOpsService.findCall(conversationId)
                .filter(c -> c.getCompanyId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Unknown conversation", HttpStatus.NOT_FOUND));
        boolean isUser = "user".equals(request.getRole());
        String text = request.getText().trim();
        voiceOpsService.record(call, isUser ? Type.USER_SAID : Type.AGENT_SAID, Origin.BROWSER_SDK, EventStatus.INFO,
                null, text, mapOf("role", request.getRole()), null);
        if (!isUser) TranscriptQuestions.extract(text).forEach(question ->
                voiceOpsService.record(call, Type.QUESTION_ASKED, Origin.BROWSER_SDK, EventStatus.INFO, null,
                        question, null, null));
        return Map.of("success", true);
    }

    @PostMapping("/browser-calls/{conversationId}/end")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, Object> endBrowserCall(@PathVariable String conversationId, HttpServletRequest req) {
        User user = requireViewer(req);
        VoiceCall call = voiceOpsService.findCall(conversationId)
                .filter(c -> c.getCompanyId().equals(user.getCompany().getId()))
                .orElseThrow(() -> new CustomException("Unknown conversation", HttpStatus.NOT_FOUND));
        if (call.getStatus() == VoiceCall.CallStatus.ACTIVE) {
            call.setStatus(VoiceCall.CallStatus.ENDED);
            call.setEndedAt(new java.util.Date());
            voiceOpsService.saveCall(call);
            voiceOpsService.record(call, Type.CALL_ENDED, Origin.BROWSER_SDK, EventStatus.INFO, null,
                    "Browser voice session ended", null, null);
        }
        return Map.of("success", true);
    }

    /**
     * "Call technician" in the panel: places a real outbound ElevenLabs call to the work order's technician.
     */
    @PostMapping("/work-orders/{workOrderId}/call-technician")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Map<String, Object> callTechnician(@PathVariable Long workOrderId, HttpServletRequest req) {
        User user = requireViewer(req);
        WorkOrder workOrder = workOrderService.checkAccessToWorkOrderId(workOrderId, user);
        if (!workOrder.canBeEditedBy(user))
            throw new CustomException("You can't dispatch this work order", HttpStatus.FORBIDDEN);
        if (workOrder.getStatus() == Status.COMPLETE)
            throw new CustomException("This work order is already complete", HttpStatus.BAD_REQUEST);
        return voiceDispatchService.callForWorkOrder(workOrder, user);
    }

    private User requireViewer(HttpServletRequest req) {
        User user = userService.whoami(req);
        if (!user.getRole().getViewPermissions().contains(PermissionEntity.WORK_ORDERS))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return user;
    }
}
