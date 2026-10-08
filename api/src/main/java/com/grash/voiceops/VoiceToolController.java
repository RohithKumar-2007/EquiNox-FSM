package com.grash.voiceops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.grash.model.User;
import com.grash.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Server tools for the ElevenLabs voice agent. These six endpoints are the only way the agent can read or change
 * CMMS data.
 * <p>
 * Authentication: the X-VoiceOps-Token secret header (see {@link VoiceToolAuthFilter}), or an x-api-key.
 * Conversation: body fields conversation_id / caller_id / call_sid, bound in the ElevenLabs tool config to the
 * system__conversation_id / system__caller_id / system__call_sid dynamic variables. X-Conversation-Id,
 * X-Caller-Id and X-Call-Sid headers are accepted as a fallback.
 * <p>
 * The body is read from the request stream rather than with @RequestBody, so an empty or malformed body gets a
 * structured error instead of an exception.
 */
@RestController
@RequestMapping("/voice-tools")
@Tag(name = "Voice tools", description = "Actions the ElevenLabs voice agent can take")
@RequiredArgsConstructor
@Slf4j
public class VoiceToolController {

    private static final int MAX_BODY_BYTES = 32 * 1024;

    private final VoiceToolService voiceToolService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    private interface Tool {
        Map<String, Object> run(VoiceToolService.CallContext context, JsonNode args, User actor);
    }

    @PostMapping("/find-equipment")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<Map<String, Object>> findEquipment(HttpServletRequest req) {
        return handle(req, voiceToolService::findEquipment);
    }

    @PostMapping("/get-equipment-status")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<Map<String, Object>> getEquipmentStatus(HttpServletRequest req) {
        return handle(req, voiceToolService::getEquipmentStatus);
    }

    @PostMapping("/get-equipment-history")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<Map<String, Object>> getEquipmentHistory(HttpServletRequest req) {
        return handle(req, voiceToolService::getEquipmentHistory);
    }

    @PostMapping("/create-work-order")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<Map<String, Object>> createWorkOrder(HttpServletRequest req) {
        return handle(req, voiceToolService::createWorkOrder);
    }

    @PostMapping("/assign-technician")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<Map<String, Object>> assignTechnician(HttpServletRequest req) {
        return handle(req, voiceToolService::assignTechnician);
    }

    @PostMapping("/escalate-work-order")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity<Map<String, Object>> escalateWorkOrder(HttpServletRequest req) {
        return handle(req, voiceToolService::escalateWorkOrder);
    }

    private ResponseEntity<Map<String, Object>> handle(HttpServletRequest req, Tool tool) {
        User actor = userService.whoami(req);
        ObjectNode args;
        try {
            args = readBody(req);
        } catch (IllegalArgumentException e) {
            log.warn("VoiceOps tool {} rejected: {}", req.getRequestURI(), e.getMessage());
            return ResponseEntity.badRequest().body(error("invalid_input", e.getMessage()));
        }
        VoiceToolService.CallContext context = new VoiceToolService.CallContext(
                take(args, "conversation_id", req.getHeader("X-Conversation-Id")),
                take(args, "caller_id", req.getHeader("X-Caller-Id")),
                take(args, "call_sid", req.getHeader("X-Call-Sid")));
        // Tool failures are part of the conversation (the agent reads them), so they still return 200.
        return ResponseEntity.ok(tool.run(context, args, actor));
    }

    private ObjectNode readBody(HttpServletRequest req) {
        byte[] body;
        try {
            body = req.getInputStream().readNBytes(MAX_BODY_BYTES + 1);
        } catch (IOException e) {
            throw new IllegalArgumentException("The request body could not be read.");
        }
        if (body.length > MAX_BODY_BYTES) throw new IllegalArgumentException("The request body is too large.");
        if (body.length == 0) return objectMapper.createObjectNode();
        JsonNode parsed;
        try {
            parsed = objectMapper.readTree(body);
        } catch (IOException e) {
            throw new IllegalArgumentException("The request body must be a JSON object.");
        }
        if (parsed == null || parsed.isNull() || parsed.isMissingNode()) return objectMapper.createObjectNode();
        if (!parsed.isObject()) throw new IllegalArgumentException("The request body must be a JSON object.");
        return (ObjectNode) parsed;
    }

    /**
     * Removes a context field from the tool arguments, falling back to a header.
     */
    private static String take(ObjectNode args, String field, String fallback) {
        JsonNode value = args.remove(field);
        if (value != null && value.isValueNode() && !value.asText().isBlank()) return value.asText().trim();
        return fallback == null || fallback.isBlank() ? null : fallback.trim();
    }

    private static Map<String, Object> error(String code, String message) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", false);
        response.put("error", Map.of("code", code, "message", message));
        return response;
    }
}
