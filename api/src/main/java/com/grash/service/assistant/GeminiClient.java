package com.grash.service.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.grash.exception.CustomException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;

/**
 * Calls the Gemini generateContent REST endpoint. The API key never leaves the server.
 */
@Component
@Slf4j
public class GeminiClient {

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public GeminiClient(@Value("${assistant.gemini.api-key:}") String apiKey,
                        @Value("${assistant.gemini.model:gemini-3.8-flash}") String model) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null || model.isBlank() ? "gemini-3.8-flash" : model.trim();
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(120));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public boolean isEnabled() {
        return !apiKey.isEmpty();
    }

    public String getModel() {
        return model;
    }

    public JsonNode generateContent(ObjectNode body) {
        try {
            return restClient.post()
                    .uri(BASE_URL + model + ":generateContent")
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException e) {
            log.warn("Gemini request failed with status {}: {}", e.getStatusCode().value(),
                    e.getResponseBodyAsString());
            throw new CustomException(messageForStatus(e.getStatusCode().value()), HttpStatus.BAD_GATEWAY);
        } catch (ResourceAccessException e) {
            log.warn("Gemini request could not reach the API", e);
            throw new CustomException("The assistant could not reach Gemini. Check the server's internet " +
                    "connection and try again.", HttpStatus.BAD_GATEWAY);
        }
    }

    private String messageForStatus(int status) {
        return switch (status) {
            case 400 -> "Gemini rejected the request. Check that GEMINI_API_KEY and GEMINI_MODEL are valid.";
            case 401, 403 -> "Gemini refused the API key. Check GEMINI_API_KEY.";
            case 404 -> "Gemini model \"" + model + "\" was not found. Check GEMINI_MODEL.";
            case 429 -> "The assistant is receiving too many requests right now. Try again in a minute.";
            default -> "Gemini is unavailable right now. Try again shortly.";
        };
    }
}
