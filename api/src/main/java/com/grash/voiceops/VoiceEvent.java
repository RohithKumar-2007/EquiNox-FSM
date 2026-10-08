package com.grash.voiceops;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;

/**
 * Something that actually happened during a voice call: a tool request handled by this backend, a transcript
 * line reported by the ElevenLabs SDK or post-call webhook, or the result of a notification or outbound call.
 */
@Entity
@Table(name = "voice_event")
@Getter
@Setter
@NoArgsConstructor
public class VoiceEvent {

    public enum Type {
        CALL_STARTED, LANGUAGE, USER_SAID, AGENT_SAID, QUESTION_ASKED, EQUIPMENT_IDENTIFIED, SEVERITY,
        TOOL_CALL, WORK_ORDER_CREATED, TECHNICIAN_ASSIGNED, NOTIFICATION, ESCALATION, OUTBOUND_CALL,
        DISPATCH_CONFIRMATION, CALL_SUMMARY, CALL_ENDED
    }

    /**
     * Where the event came from, shown in the panel so nothing is presented as more than it is.
     */
    public enum Origin {TOOL_REQUEST, BROWSER_SDK, POST_CALL_WEBHOOK, BACKEND}

    public enum EventStatus {SUCCESS, FAILED, SKIPPED, INFO}

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "call_id", nullable = false)
    private Long callId;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Type type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Origin origin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status;

    @Column(name = "tool_name", length = 64)
    private String toolName;

    @Column(nullable = false, length = 500)
    private String title;

    // JSON object with the event's details.
    @Column(columnDefinition = "text")
    private String detail;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false)
    private Date createdAt;
}
