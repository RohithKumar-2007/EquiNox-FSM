package com.grash.voiceops;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Date;

/**
 * One ElevenLabs conversation (phone call or browser session). Stores the company id directly instead of
 * extending CompanyAudit, because webhook requests from ElevenLabs arrive without a signed-in user.
 */
@Entity
@Table(name = "voice_call")
@Getter
@Setter
@NoArgsConstructor
public class VoiceCall {

    public enum Source {PHONE_INBOUND, PHONE_OUTBOUND, BROWSER, UNKNOWN}

    public enum CallStatus {ACTIVE, ENDED, FAILED}

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false, unique = true)
    private String conversationId;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Source source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CallStatus status;

    @Column(name = "caller_number", length = 64)
    private String callerNumber;

    @Column(name = "caller_user_id")
    private Long callerUserId;

    @Column(length = 16)
    private String language;

    @Column(name = "work_order_id")
    private Long workOrderId;

    @Column(columnDefinition = "text")
    private String summary;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "started_at", nullable = false)
    private Date startedAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "ended_at")
    private Date endedAt;
}
