package com.grash.voiceops;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.model.User;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.UserRepository;
import com.grash.voiceops.VoiceEvent.EventStatus;
import com.grash.voiceops.VoiceEvent.Origin;
import com.grash.voiceops.VoiceEvent.Type;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Stores VoiceOps calls and events and pushes each saved event to the company's users over STOMP
 * (/user/{email}/voiceops). Only events that were persisted are broadcast.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VoiceOpsService {

    static final String ATTEMPT_PREFIX = "attempt-";

    private final VoiceCallRepository voiceCallRepository;
    private final VoiceEventRepository voiceEventRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public synchronized VoiceCall getOrCreateCall(String conversationId, Long companyId, VoiceCall.Source source,
                                                  String callerNumber, Long callerUserId) {
        Optional<VoiceCall> existing = voiceCallRepository.findByConversationId(conversationId);
        if (existing.isPresent()) {
            VoiceCall call = existing.get();
            if (!call.getCompanyId().equals(companyId))
                throw new IllegalStateException("Conversation belongs to another company");
            boolean changed = false;
            if (call.getCallerNumber() == null && callerNumber != null) {
                call.setCallerNumber(callerNumber);
                changed = true;
            }
            if (call.getCallerUserId() == null && callerUserId != null) {
                call.setCallerUserId(callerUserId);
                changed = true;
            }
            if (call.getSource() == VoiceCall.Source.UNKNOWN && source != VoiceCall.Source.UNKNOWN) {
                call.setSource(source);
                changed = true;
            }
            return changed ? voiceCallRepository.save(call) : call;
        }
        VoiceCall call = new VoiceCall();
        call.setConversationId(conversationId);
        call.setCompanyId(companyId);
        call.setSource(source);
        call.setStatus(VoiceCall.CallStatus.ACTIVE);
        call.setCallerNumber(callerNumber);
        call.setCallerUserId(callerUserId);
        call.setStartedAt(new Date());
        VoiceCall saved = voiceCallRepository.save(call);
        record(saved, Type.CALL_STARTED, origin(source), EventStatus.INFO, null,
                describeStart(saved), mapOf("source", source.name(), "caller", callerNumber), null);
        return saved;
    }

    /**
     * Records an outbound call that never connected (skipped or refused before ElevenLabs returned a
     * conversation), so the panel can show why. The id is prefixed "attempt-" and never sent to ElevenLabs.
     */
    public VoiceCall createOutboundAttempt(Long companyId, String phone, Long userId, Long workOrderId) {
        VoiceCall call = new VoiceCall();
        call.setConversationId(ATTEMPT_PREFIX + UUID.randomUUID());
        call.setCompanyId(companyId);
        call.setSource(VoiceCall.Source.PHONE_OUTBOUND);
        call.setStatus(VoiceCall.CallStatus.FAILED);
        call.setCallerNumber(phone);
        call.setCallerUserId(userId);
        call.setWorkOrderId(workOrderId);
        Date now = new Date();
        call.setStartedAt(now);
        call.setEndedAt(now);
        return saveCall(call);
    }

    public Optional<String> callerName(VoiceCall call) {
        return call.getCallerUserId() == null ? Optional.empty()
                : userRepository.findById(call.getCallerUserId()).map(User::getFullName);
    }

    public Optional<VoiceCall> findCall(String conversationId) {
        return voiceCallRepository.findByConversationId(conversationId);
    }

    public VoiceCall saveCall(VoiceCall call) {
        VoiceCall saved = voiceCallRepository.save(call);
        broadcast(saved.getCompanyId(), Map.of("kind", "call", "call", toCallDto(saved, List.of())));
        return saved;
    }

    public VoiceEvent record(VoiceCall call, Type type, Origin origin, EventStatus status, String toolName,
                             String title, Map<String, ?> detail, Long durationMs) {
        VoiceEvent event = new VoiceEvent();
        event.setCallId(call.getId());
        event.setCompanyId(call.getCompanyId());
        event.setType(type);
        event.setOrigin(origin);
        event.setStatus(status);
        event.setToolName(toolName);
        event.setTitle(title.length() > 500 ? title.substring(0, 497) + "..." : title);
        event.setDetail(toJson(detail));
        event.setDurationMs(durationMs);
        event.setCreatedAt(new Date());
        VoiceEvent saved = voiceEventRepository.save(event);
        log.info("VoiceOps [{}] {} {} {}: {}", call.getConversationId(), type, status,
                toolName == null ? "" : toolName, saved.getTitle());
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("kind", "event");
        message.put("call", toCallDto(call, List.of()));
        message.put("event", toEventDto(saved, call));
        broadcast(call.getCompanyId(), message);
        return saved;
    }

    public boolean hasEvent(VoiceCall call, Type type) {
        return voiceEventRepository.existsByCallIdAndType(call.getId(), type);
    }

    public boolean hasEventFrom(VoiceCall call, Origin origin) {
        return voiceEventRepository.existsByCallIdAndOrigin(call.getId(), origin);
    }

    public List<Map<String, Object>> recentCalls(Long companyId, int limit) {
        List<VoiceCall> calls = voiceCallRepository.findByCompanyIdOrderByStartedAtDesc(companyId,
                PageRequest.of(0, limit));
        if (calls.isEmpty()) return List.of();
        Map<Long, List<VoiceEvent>> eventsByCall = voiceEventRepository
                .findByCallIdInOrderByIdAsc(calls.stream().map(VoiceCall::getId).toList())
                .stream().collect(Collectors.groupingBy(VoiceEvent::getCallId));
        return calls.stream().map(call -> toCallDto(call, eventsByCall.getOrDefault(call.getId(), List.of())))
                .toList();
    }

    public Map<String, Object> toCallDto(VoiceCall call, List<VoiceEvent> events) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", call.getId());
        boolean attempt = call.getConversationId().startsWith(ATTEMPT_PREFIX);
        dto.put("conversationId", attempt ? null : call.getConversationId());
        dto.put("connected", !attempt);
        dto.put("source", call.getSource().name());
        dto.put("status", call.getStatus().name());
        dto.put("callerNumber", call.getCallerNumber());
        dto.put("callerName", call.getCallerUserId() == null ? null :
                userRepository.findById(call.getCallerUserId()).map(User::getFullName).orElse(null));
        dto.put("language", call.getLanguage());
        dto.put("workOrderId", call.getWorkOrderId());
        dto.put("summary", call.getSummary());
        dto.put("startedAt", call.getStartedAt());
        dto.put("endedAt", call.getEndedAt());
        dto.put("events", events.stream().map(event -> toEventDto(event, call)).toList());
        return dto;
    }

    private Map<String, Object> toEventDto(VoiceEvent event, VoiceCall call) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", event.getId());
        dto.put("callId", event.getCallId());
        dto.put("type", event.getType().name());
        dto.put("origin", event.getOrigin().name());
        dto.put("status", event.getStatus().name());
        dto.put("toolName", event.getToolName());
        dto.put("title", event.getTitle());
        dto.put("detail", parseJson(event.getDetail()));
        dto.put("durationMs", event.getDurationMs());
        dto.put("createdAt", event.getCreatedAt());
        return dto;
    }

    private void broadcast(Long companyId, Map<String, Object> message) {
        try {
            userRepository.findByCompany_Id(companyId).stream()
                    .filter(user -> user.isEnabled() && user.getRole() != null
                            && user.getRole().getViewPermissions().contains(PermissionEntity.WORK_ORDERS))
                    .forEach(user -> messagingTemplate.convertAndSendToUser(user.getEmail(), "/voiceops", message));
        } catch (RuntimeException e) {
            // The event is already saved; the panel also loads it on refresh.
            log.warn("VoiceOps broadcast failed", e);
        }
    }

    private static Origin origin(VoiceCall.Source source) {
        return source == VoiceCall.Source.BROWSER ? Origin.BROWSER_SDK : Origin.TOOL_REQUEST;
    }

    private static String describeStart(VoiceCall call) {
        return switch (call.getSource()) {
            case PHONE_INBOUND -> "Inbound call" + (call.getCallerNumber() == null ? "" : " from " + call.getCallerNumber());
            case PHONE_OUTBOUND -> "Outbound call" + (call.getCallerNumber() == null ? "" : " to " + call.getCallerNumber());
            case BROWSER -> "Browser voice session started";
            case UNKNOWN -> "Conversation started";
        };
    }

    static Map<String, Object> mapOf(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            if (keyValues[i + 1] != null) map.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        }
        return map;
    }

    private String toJson(Map<String, ?> detail) {
        if (detail == null || detail.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(detail);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private JsonNode parseJson(String json) {
        if (json == null) return null;
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
