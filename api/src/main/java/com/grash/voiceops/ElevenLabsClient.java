package com.grash.voiceops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;

/**
 * Calls the ElevenLabs Agents API (signed URLs for browser sessions, Twilio outbound calls) and verifies
 * post-call webhook signatures. The API key stays on the server.
 */
@Component
@Slf4j
public class ElevenLabsClient {

    // Matches the official SDK: reject webhook timestamps older than 30 minutes.
    private static final long WEBHOOK_TOLERANCE_SECONDS = 30 * 60;

    private final String apiKey;
    private final String agentId;
    // Optional second agent for outbound technician calls; falls back to the hotline agent.
    private final String dispatchAgentId;
    private final String phoneNumberId;
    private final String webhookSecret;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public ElevenLabsClient(@Value("${elevenlabs.api-key:}") String apiKey,
                            @Value("${elevenlabs.agent-id:}") String agentId,
                            @Value("${elevenlabs.dispatch-agent-id:}") String dispatchAgentId,
                            @Value("${elevenlabs.phone-number-id:}") String phoneNumberId,
                            @Value("${elevenlabs.webhook-secret:}") String webhookSecret,
                            @Value("${elevenlabs.base-url:https://api.elevenlabs.io}") String baseUrl,
                            ObjectMapper objectMapper) {
        this.apiKey = trim(apiKey);
        this.agentId = trim(agentId);
        this.dispatchAgentId = trim(dispatchAgentId).isEmpty() ? this.agentId : trim(dispatchAgentId);
        this.phoneNumberId = trim(phoneNumberId);
        this.webhookSecret = trim(webhookSecret);
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        this.restClient = RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory).build();
    }

    public boolean canStartBrowserSessions() {
        return !apiKey.isEmpty() && !agentId.isEmpty();
    }

    public boolean canPlaceOutboundCalls() {
        return canStartBrowserSessions() && !phoneNumberId.isEmpty();
    }

    public boolean canVerifyWebhooks() {
        return !webhookSecret.isEmpty();
    }

    public String getAgentId() {
        return agentId;
    }

    public boolean hasSeparateDispatchAgent() {
        return !dispatchAgentId.equals(agentId);
    }

    public String getSignedUrl() {
        JsonNode response = restClient.get()
                .uri(uriBuilder -> uriBuilder.path("/v1/convai/conversation/get-signed-url")
                        .queryParam("agent_id", agentId).build())
                .header("xi-api-key", apiKey)
                .retrieve()
                .body(JsonNode.class);
        if (response == null || !response.hasNonNull("signed_url"))
            throw new IllegalStateException("ElevenLabs returned no signed_url");
        return response.get("signed_url").asText();
    }

    public record OutboundCallResult(boolean success, String message, String conversationId, String callSid) {
    }

    /**
     * Places a real phone call through the Twilio number imported into ElevenLabs. Failures are returned, not
     * hidden, so the panel can show them.
     */
    public OutboundCallResult placeOutboundCall(String toNumber, Map<String, String> dynamicVariables) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("agent_id", dispatchAgentId);
        body.put("agent_phone_number_id", phoneNumberId);
        body.put("to_number", toNumber);
        ObjectNode variables = body.putObject("conversation_initiation_client_data").putObject("dynamic_variables");
        dynamicVariables.forEach(variables::put);
        try {
            JsonNode response = restClient.post()
                    .uri("/v1/convai/twilio/outbound-call")
                    .header("xi-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null) return new OutboundCallResult(false, "Empty response from ElevenLabs", null, null);
            return new OutboundCallResult(response.path("success").asBoolean(false),
                    response.path("message").asText(""),
                    textOrNull(response, "conversation_id"),
                    textOrNull(response, "callSid"));
        } catch (RestClientResponseException e) {
            log.warn("ElevenLabs outbound call failed: {} {}", e.getStatusCode().value(), e.getResponseBodyAsString());
            return new OutboundCallResult(false, "ElevenLabs returned HTTP " + e.getStatusCode().value(), null, null);
        } catch (RestClientException e) {
            log.warn("ElevenLabs outbound call could not be sent", e);
            return new OutboundCallResult(false, "Could not reach ElevenLabs", null, null);
        }
    }

    /**
     * Verifies the ElevenLabs-Signature header ("t=<unix seconds>,v0=<hex HMAC-SHA256 of "t.body">").
     */
    public boolean isValidWebhookSignature(String signatureHeader, String rawBody) {
        if (webhookSecret.isEmpty() || signatureHeader == null || rawBody == null) return false;
        String timestamp = null;
        String signature = null;
        for (String part : signatureHeader.split(",")) {
            String trimmed = part.trim();
            if (trimmed.startsWith("t=")) timestamp = trimmed.substring(2);
            else if (trimmed.startsWith("v0=")) signature = trimmed;
        }
        if (timestamp == null || signature == null) return false;
        long sentAt;
        try {
            sentAt = Long.parseLong(timestamp);
        } catch (NumberFormatException e) {
            return false;
        }
        if (System.currentTimeMillis() / 1000 - sentAt > WEBHOOK_TOLERANCE_SECONDS) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = "v0=" + HexFormat.of().formatHex(
                    mac.doFinal((timestamp + "." + rawBody).getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("Could not verify ElevenLabs webhook signature", e);
            return false;
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
