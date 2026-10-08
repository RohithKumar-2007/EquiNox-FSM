package com.grash.voiceops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.security.CustomUserDetail;
import com.grash.security.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * Authenticates ElevenLabs tool requests on /voice-tools/**. The agent sends the shared secret
 * ELEVENLABS_TOOL_SECRET in the X-VoiceOps-Token header (stored as a secret header in the ElevenLabs tool config).
 * The request then runs as the service account ELEVENLABS_SERVICE_USER_EMAIL, so that account's role decides
 * what the agent may do. Requests without the header fall through to the normal JWT / API key authentication.
 */
@Component
@Slf4j
public class VoiceToolAuthFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-VoiceOps-Token";

    private final byte[] secret;
    private final String serviceUserEmail;
    private final CustomUserDetailsService userDetailsService;
    private final ObjectMapper objectMapper;

    public VoiceToolAuthFilter(@Value("${elevenlabs.tool-secret:}") String secret,
                               @Value("${elevenlabs.service-user-email:}") String serviceUserEmail,
                               CustomUserDetailsService userDetailsService,
                               ObjectMapper objectMapper) {
        this.secret = secret == null ? new byte[0] : secret.trim().getBytes(StandardCharsets.UTF_8);
        this.serviceUserEmail = serviceUserEmail == null ? "" : serviceUserEmail.trim();
        this.userDetailsService = userDetailsService;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return secret.length >= 16 && !serviceUserEmail.isEmpty();
    }

    @Override
    protected boolean shouldNotFilter(@NotNull HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !path.startsWith("/voice-tools/");
    }

    @Override
    protected void doFilterInternal(@NotNull HttpServletRequest request, @NotNull HttpServletResponse response,
                                    @NotNull FilterChain filterChain) throws ServletException, IOException {
        String token = request.getHeader(HEADER);
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }
        if (!isConfigured()) {
            log.warn("VoiceOps tool request rejected: ELEVENLABS_TOOL_SECRET (16+ chars) and "
                    + "ELEVENLABS_SERVICE_USER_EMAIL must be set");
            reject(response, HttpStatus.SERVICE_UNAVAILABLE, "not_configured",
                    "Voice tool authentication is not configured on the server.");
            return;
        }
        if (!MessageDigest.isEqual(secret, token.trim().getBytes(StandardCharsets.UTF_8))) {
            log.warn("VoiceOps tool request rejected: wrong {} from {}", HEADER, request.getRemoteAddr());
            reject(response, HttpStatus.UNAUTHORIZED, "unauthenticated", "Invalid voice tool token.");
            return;
        }
        CustomUserDetail userDetail;
        try {
            userDetail = userDetailsService.loadUserByUsername(serviceUserEmail);
        } catch (RuntimeException e) {
            log.warn("VoiceOps service account {} could not be loaded", serviceUserEmail, e);
            reject(response, HttpStatus.SERVICE_UNAVAILABLE, "not_configured",
                    "The voice agent service account does not exist.");
            return;
        }
        if (!userDetail.isEnabled()) {
            reject(response, HttpStatus.UNAUTHORIZED, "unauthenticated", "The voice agent service account is disabled.");
            return;
        }
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userDetail, null, userDetail.getAuthorities()));
        filterChain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, HttpStatus status, String code, String message)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(),
                Map.of("ok", false, "error", Map.of("code", code, "message", message)));
    }
}
