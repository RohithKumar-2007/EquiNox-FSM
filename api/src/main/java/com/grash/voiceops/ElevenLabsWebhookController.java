package com.grash.voiceops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.voiceops.VoiceEvent.EventStatus;
import com.grash.voiceops.VoiceEvent.Origin;
import com.grash.voiceops.VoiceEvent.Type;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import static com.grash.voiceops.VoiceOpsService.mapOf;

/**
 * Receives ElevenLabs post-call webhooks. No user is signed in here, so every request must carry a valid
 * ElevenLabs-Signature, and events are only attached to conversations this backend already knows about.
 */
@RestController
@RequestMapping("/voice-ops/webhooks")
@RequiredArgsConstructor
@Slf4j
public class ElevenLabsWebhookController {

    private static final Pattern LANGUAGE_CODE = Pattern.compile("^[a-z]{2,3}(-[a-z0-9]{2,8})?$");

    private final ElevenLabsClient elevenLabsClient;
    private final VoiceOpsService voiceOpsService;
    private final ObjectMapper objectMapper;

    @PostMapping("/elevenlabs")
    public ResponseEntity<Map<String, Object>> receive(@RequestBody byte[] body,
                                                       @RequestHeader(value = "ElevenLabs-Signature", required = false)
                                                       String signature) {
        // Raw bytes: the signature covers the exact body, and byte[] passes the tenant aspect untouched.
        String rawBody = new String(body, StandardCharsets.UTF_8);
        if (!elevenLabsClient.canVerifyWebhooks()) {
            log.warn("ElevenLabs webhook received but ELEVENLABS_WEBHOOK_SECRET is not set; ignoring it");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("success", false));
        }
        if (!elevenLabsClient.isValidWebhookSignature(signature, rawBody)) {
            log.warn("Rejected ElevenLabs webhook with an invalid signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false));
        }
        JsonNode payload;
        try {
            payload = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false));
        }
        String type = payload.path("type").asText("");
        JsonNode data = payload.path("data");
        String conversationId = data.path("conversation_id").asText(null);
        Optional<VoiceCall> call = conversationId == null ? Optional.empty() : voiceOpsService.findCall(conversationId);
        if (call.isEmpty()) {
            // Without a known conversation we can't tell which company it belongs to.
            log.info("ElevenLabs webhook {} for unknown conversation {}; ignored", type, conversationId);
            return ResponseEntity.ok(Map.of("success", true));
        }
        switch (type) {
            case "post_call_transcription" -> handleTranscription(call.get(), data);
            case "call_initiation_failure" -> handleInitiationFailure(call.get(), data);
            default -> log.info("ElevenLabs webhook type {} ignored", type);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    private void handleTranscription(VoiceCall call, JsonNode data) {
        // Browser sessions already streamed their transcript live; don't repeat it.
        boolean transcriptAlreadyLive = voiceOpsService.hasEventFrom(call, Origin.BROWSER_SDK)
                && voiceOpsService.hasEvent(call, Type.USER_SAID);
        if (!transcriptAlreadyLive) {
            for (JsonNode turn : data.path("transcript")) {
                String message = turn.path("message").asText("").trim();
                if (message.isEmpty()) continue;
                boolean isUser = "user".equals(turn.path("role").asText());
                Map<String, Object> detail = mapOf("role", turn.path("role").asText(),
                        "time_in_call_secs", turn.hasNonNull("time_in_call_secs")
                                ? turn.get("time_in_call_secs").asInt() : null);
                voiceOpsService.record(call, isUser ? Type.USER_SAID : Type.AGENT_SAID, Origin.POST_CALL_WEBHOOK,
                        EventStatus.INFO, null, message, detail, null);
                if (!isUser) TranscriptQuestions.extract(message).forEach(question ->
                        voiceOpsService.record(call, Type.QUESTION_ASKED, Origin.POST_CALL_WEBHOOK, EventStatus.INFO,
                                null, question, null, null));
            }
        }
        JsonNode analysis = data.path("analysis");
        JsonNode collected = analysis.path("data_collection_results");
        recordCollectedLanguage(call, collected);
        if (call.getSource() == VoiceCall.Source.PHONE_OUTBOUND) recordDispatchConfirmation(call, collected);
        String summary = analysis.path("transcript_summary").asText(null);
        if (summary != null && !summary.isBlank()) {
            call.setSummary(summary);
            voiceOpsService.record(call, Type.CALL_SUMMARY, Origin.POST_CALL_WEBHOOK, EventStatus.INFO, null, summary,
                    mapOf("call_successful", analysis.path("call_successful").asText(null),
                            "data_collection", analysis.hasNonNull("data_collection_results")
                                    ? objectMapper.convertValue(analysis.get("data_collection_results"), Map.class)
                                    : null), null);
        }
        if (call.getStatus() == VoiceCall.CallStatus.ACTIVE) call.setStatus(VoiceCall.CallStatus.ENDED);
        if (call.getEndedAt() == null) call.setEndedAt(new Date());
        voiceOpsService.saveCall(call);
        JsonNode metadata = data.path("metadata");
        if (!voiceOpsService.hasEvent(call, Type.CALL_ENDED)) {
            voiceOpsService.record(call, Type.CALL_ENDED, Origin.POST_CALL_WEBHOOK, EventStatus.INFO, null,
                    "Call ended" + (metadata.hasNonNull("call_duration_secs")
                            ? " after " + metadata.get("call_duration_secs").asInt() + "s" : ""),
                    mapOf("termination_reason", metadata.path("termination_reason").asText(null)), null);
        }
    }

    /**
     * Data collection item "caller_language" (ISO 639-1 code), configured on the ElevenLabs agent.
     */
    private void recordCollectedLanguage(VoiceCall call, JsonNode collected) {
        String language = collectedText(collected, "caller_language");
        if (language == null || call.getLanguage() != null) return;
        language = language.trim().toLowerCase(Locale.ROOT);
        if (!LANGUAGE_CODE.matcher(language).matches()) return;
        call.setLanguage(language);
        voiceOpsService.saveCall(call);
        String name = Locale.forLanguageTag(language).getDisplayLanguage(Locale.ENGLISH);
        voiceOpsService.record(call, Type.LANGUAGE, Origin.POST_CALL_WEBHOOK, EventStatus.INFO, null,
                "Caller language: " + (name.isBlank() ? language : name) + " (" + language + ")",
                mapOf("language", language, "reported_by", "post-call data collection"), null);
    }

    /**
     * Data collection items "technician_en_route" (boolean) and optional "technician_eta_minutes" (number),
     * configured on the dispatch agent. Records what the technician actually said, or that it wasn't captured.
     */
    private void recordDispatchConfirmation(VoiceCall call, JsonNode collected) {
        if (voiceOpsService.hasEvent(call, Type.DISPATCH_CONFIRMATION)) return;
        String technician = voiceOpsService.callerName(call).orElse("The technician");
        String answer = collectedText(collected, "technician_en_route");
        String eta = collectedText(collected, "technician_eta_minutes");
        Boolean enRoute = answer == null ? null : switch (answer.trim().toLowerCase(Locale.ROOT)) {
            case "true", "yes", "y", "1" -> Boolean.TRUE;
            case "false", "no", "n", "0" -> Boolean.FALSE;
            default -> null;
        };
        String title;
        EventStatus status;
        if (enRoute == null) {
            title = "No confirmation captured from " + technician;
            status = EventStatus.SKIPPED;
        } else if (enRoute) {
            title = technician + " confirmed they are on the way"
                    + (eta != null && eta.matches("[0-9]{1,4}") ? " (ETA " + eta + " min)" : "");
            status = EventStatus.SUCCESS;
        } else {
            title = technician + " said they cannot attend";
            status = EventStatus.FAILED;
        }
        voiceOpsService.record(call, Type.DISPATCH_CONFIRMATION, Origin.POST_CALL_WEBHOOK, status, null, title,
                mapOf("technician_en_route", answer, "technician_eta_minutes", eta,
                        "rationale", collectedRationale(collected, "technician_en_route"),
                        "work_order_id", call.getWorkOrderId()), null);
    }

    /**
     * Reads one data collection result. ElevenLabs sends {"<id>": {"value": ..., "rationale": ...}}; a bare value
     * is accepted too.
     */
    private static String collectedText(JsonNode collected, String id) {
        JsonNode item = collected.path(id);
        JsonNode value = item.isObject() ? item.path("value") : item;
        if (value.isMissingNode() || value.isNull()) return null;
        String text = value.asText("").trim();
        return text.isEmpty() || text.equalsIgnoreCase("null") ? null : text;
    }

    private static String collectedRationale(JsonNode collected, String id) {
        JsonNode rationale = collected.path(id).path("rationale");
        return rationale.isTextual() && !rationale.asText().isBlank() ? rationale.asText() : null;
    }

    private void handleInitiationFailure(VoiceCall call, JsonNode data) {
        String reason = data.path("failure_reason").asText("unknown");
        call.setStatus(VoiceCall.CallStatus.FAILED);
        call.setEndedAt(new Date());
        voiceOpsService.saveCall(call);
        voiceOpsService.record(call, Type.OUTBOUND_CALL, Origin.POST_CALL_WEBHOOK, EventStatus.FAILED, null,
                "Call could not be connected: " + reason, mapOf("failure_reason", reason), null);
    }
}
