package com.grash.voiceops;

import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.repository.AssetRepository;
import com.grash.service.WorkOrderService;
import com.grash.voiceops.VoiceEvent.EventStatus;
import com.grash.voiceops.VoiceEvent.Origin;
import com.grash.voiceops.VoiceEvent.Type;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * The dispatch service must never report a call that did not happen.
 */
class VoiceDispatchServiceTest {

    private ElevenLabsClient elevenLabsClient;
    private VoiceOpsService voiceOpsService;
    private VoiceDispatchService service;
    private VoiceCall inboundCall;

    @BeforeEach
    void setUp() {
        elevenLabsClient = mock(ElevenLabsClient.class);
        voiceOpsService = mock(VoiceOpsService.class);
        service = new VoiceDispatchService(elevenLabsClient, voiceOpsService, mock(AssetRepository.class),
                mock(WorkOrderService.class), false);
        inboundCall = new VoiceCall();
        inboundCall.setId(1L);
        inboundCall.setCompanyId(7L);
    }

    private static WorkOrder workOrder(User technician) {
        WorkOrder workOrder = new WorkOrder();
        workOrder.setId(42L);
        workOrder.setTitle("Conveyor belt jammed");
        workOrder.setPrimaryUser(technician);
        return workOrder;
    }

    private static User technician(String phone) {
        User user = new User();
        user.setId(9L);
        user.setFirstName("Ravi");
        user.setLastName("Kumar");
        user.setPhone(phone);
        return user;
    }

    @Test
    void skipsAndSaysWhyWhenNobodyIsAssigned() {
        Map<String, Object> result = service.callForEscalation(inboundCall, workOrder(null), "line stopped");

        assertThat(result).containsEntry("status", "skipped");
        verify(voiceOpsService).record(eq(inboundCall), eq(Type.OUTBOUND_CALL), eq(Origin.BACKEND),
                eq(EventStatus.SKIPPED), eq("escalate_work_order"), contains("nobody is assigned"), any(), isNull());
        verify(elevenLabsClient, never()).placeOutboundCall(any(), any());
    }

    @Test
    void skipsWhenTheTechnicianHasNoPhone() {
        Map<String, Object> result = service.callForEscalation(inboundCall, workOrder(technician(null)), "x");

        assertThat(result).containsEntry("status", "skipped");
        verify(voiceOpsService).record(eq(inboundCall), eq(Type.OUTBOUND_CALL), any(), eq(EventStatus.SKIPPED),
                any(), contains("no valid phone number"), any(), isNull());
        verify(elevenLabsClient, never()).placeOutboundCall(any(), any());
    }

    @Test
    void skipsWhenOutboundCallingIsNotConfigured() {
        when(elevenLabsClient.canPlaceOutboundCalls()).thenReturn(false);
        Map<String, Object> result = service.callForEscalation(inboundCall, workOrder(technician("+91 98765 43210")),
                "x");

        assertThat(result).containsEntry("status", "skipped");
        verify(voiceOpsService).record(eq(inboundCall), eq(Type.OUTBOUND_CALL), any(), eq(EventStatus.SKIPPED),
                any(), contains("not configured"), any(), isNull());
        verify(elevenLabsClient, never()).placeOutboundCall(any(), any());
    }

    @Test
    void recordsAFailedCallAsFailed() {
        when(elevenLabsClient.canPlaceOutboundCalls()).thenReturn(true);
        when(elevenLabsClient.placeOutboundCall(eq("+919876543210"), anyMap())).thenReturn(
                new ElevenLabsClient.OutboundCallResult(false, "ElevenLabs returned HTTP 422", null, null));

        Map<String, Object> result = service.callForEscalation(inboundCall, workOrder(technician("+91 98765 43210")),
                "x");

        assertThat(result).containsEntry("status", "failed");
        verify(voiceOpsService).record(eq(inboundCall), eq(Type.OUTBOUND_CALL), any(), eq(EventStatus.FAILED),
                any(), contains("failed"), any(), anyLong());
        verify(voiceOpsService, never()).getOrCreateCall(any(), any(), any(), any(), any());
    }

    @Test
    void successfulCallIsTrackedAsItsOwnOutboundConversation() {
        when(elevenLabsClient.canPlaceOutboundCalls()).thenReturn(true);
        when(elevenLabsClient.placeOutboundCall(eq("+919876543210"), anyMap())).thenReturn(
                new ElevenLabsClient.OutboundCallResult(true, "Success", "conv_out_1", "CA123"));
        VoiceCall outbound = new VoiceCall();
        when(voiceOpsService.getOrCreateCall("conv_out_1", 7L, VoiceCall.Source.PHONE_OUTBOUND, "+919876543210", 9L))
                .thenReturn(outbound);
        when(voiceOpsService.saveCall(outbound)).thenReturn(outbound);

        Map<String, Object> result = service.callForEscalation(inboundCall, workOrder(technician("+91 98765 43210")),
                "line stopped");

        assertThat(result).containsEntry("status", "calling");
        assertThat(outbound.getWorkOrderId()).isEqualTo(42L);
        verify(voiceOpsService).record(eq(inboundCall), eq(Type.OUTBOUND_CALL), any(), eq(EventStatus.SUCCESS),
                any(), contains("Calling Ravi"), any(), anyLong());
    }

    @Test
    void normalizesPhoneNumbers() {
        assertThat(VoiceDispatchService.normalizePhone(" +1 (555) 010-2030 ")).isEqualTo("+15550102030");
        assertThat(VoiceDispatchService.normalizePhone("call me")).isNull();
        assertThat(VoiceDispatchService.normalizePhone("{{system__caller_id}}")).isNull();
        assertThat(VoiceDispatchService.normalizePhone(null)).isNull();
    }
}
