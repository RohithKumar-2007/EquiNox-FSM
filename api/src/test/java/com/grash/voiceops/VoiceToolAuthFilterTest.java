package com.grash.voiceops;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grash.security.CustomUserDetail;
import com.grash.security.CustomUserDetailsService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class VoiceToolAuthFilterTest {

    private static final String SECRET = "a-long-enough-tool-secret";
    private static final String SERVICE_EMAIL = "voice-agent@example.com";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static MockHttpServletRequest toolRequest(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/voice-tools/find-equipment");
        if (token != null) request.addHeader(VoiceToolAuthFilter.HEADER, token);
        return request;
    }

    private CustomUserDetailsService serviceAccount(boolean enabled) {
        CustomUserDetail detail = mock(CustomUserDetail.class);
        when(detail.isEnabled()).thenReturn(enabled);
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_CLIENT"))).when(detail).getAuthorities();
        CustomUserDetailsService service = mock(CustomUserDetailsService.class);
        when(service.loadUserByUsername(SERVICE_EMAIL)).thenReturn(detail);
        return service;
    }

    @Test
    void correctTokenAuthenticatesAsTheServiceAccount() throws Exception {
        VoiceToolAuthFilter filter = new VoiceToolAuthFilter(SECRET, SERVICE_EMAIL, serviceAccount(true), objectMapper);
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(toolRequest(SECRET), new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting(Object::toString).containsExactly("ROLE_CLIENT");
    }

    @Test
    void wrongTokenIsRejectedWithStructuredJson() throws Exception {
        VoiceToolAuthFilter filter = new VoiceToolAuthFilter(SECRET, SERVICE_EMAIL, serviceAccount(true), objectMapper);
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(toolRequest("not-the-secret"), response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        JsonNode body = objectMapper.readTree(response.getContentAsString());
        assertThat(body.path("ok").asBoolean(true)).isFalse();
        assertThat(body.path("error").path("code").asText()).isEqualTo("unauthenticated");
        assertThat(chain.getRequest()).isNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void disabledServiceAccountIsRejected() throws Exception {
        VoiceToolAuthFilter filter = new VoiceToolAuthFilter(SECRET, SERVICE_EMAIL, serviceAccount(false), objectMapper);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(toolRequest(SECRET), response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void unconfiguredServerAnswers503() throws Exception {
        VoiceToolAuthFilter filter = new VoiceToolAuthFilter("short", SERVICE_EMAIL, serviceAccount(true), objectMapper);
        assertThat(filter.isConfigured()).isFalse();
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(toolRequest("short"), response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(objectMapper.readTree(response.getContentAsString()).path("error").path("code").asText())
                .isEqualTo("not_configured");
    }

    @Test
    void requestsWithoutTheHeaderFallThroughToNormalAuth() throws Exception {
        CustomUserDetailsService service = serviceAccount(true);
        VoiceToolAuthFilter filter = new VoiceToolAuthFilter(SECRET, SERVICE_EMAIL, service, objectMapper);
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(toolRequest(null), new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(service);
    }

    @Test
    void otherPathsAreIgnoredEvenWithTheHeader() throws Exception {
        CustomUserDetailsService service = serviceAccount(true);
        VoiceToolAuthFilter filter = new VoiceToolAuthFilter(SECRET, SERVICE_EMAIL, service, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/work-orders/1");
        request.addHeader(VoiceToolAuthFilter.HEADER, SECRET);
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(service);
    }
}
