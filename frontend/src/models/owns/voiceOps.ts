export type VoiceEventType =
  | 'CALL_STARTED'
  | 'LANGUAGE'
  | 'USER_SAID'
  | 'AGENT_SAID'
  | 'QUESTION_ASKED'
  | 'EQUIPMENT_IDENTIFIED'
  | 'SEVERITY'
  | 'TOOL_CALL'
  | 'WORK_ORDER_CREATED'
  | 'TECHNICIAN_ASSIGNED'
  | 'NOTIFICATION'
  | 'ESCALATION'
  | 'OUTBOUND_CALL'
  | 'DISPATCH_CONFIRMATION'
  | 'CALL_SUMMARY'
  | 'CALL_ENDED';

/** Where an event came from. Shown on every row so nothing looks like more than it is. */
export type VoiceEventOrigin =
  | 'TOOL_REQUEST'
  | 'BROWSER_SDK'
  | 'POST_CALL_WEBHOOK'
  | 'BACKEND';

export type VoiceEventStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'INFO';

export interface VoiceEvent {
  id: number;
  callId: number;
  type: VoiceEventType;
  origin: VoiceEventOrigin;
  status: VoiceEventStatus;
  toolName: string | null;
  title: string;
  detail: Record<string, any> | null;
  durationMs: number | null;
  createdAt: string;
}

export type VoiceCallSource =
  | 'PHONE_INBOUND'
  | 'PHONE_OUTBOUND'
  | 'BROWSER'
  | 'UNKNOWN';

export interface VoiceCall {
  id: number;
  conversationId: string | null;
  /** False for an outbound call that was skipped or refused before it connected. */
  connected: boolean;
  source: VoiceCallSource;
  status: 'ACTIVE' | 'ENDED' | 'FAILED';
  callerNumber: string | null;
  callerName: string | null;
  language: string | null;
  workOrderId: number | null;
  summary: string | null;
  startedAt: string;
  endedAt: string | null;
  events: VoiceEvent[];
}

export interface VoiceOpsConfig {
  browserSessions: boolean;
  outboundCalls: boolean;
  webhookVerification: boolean;
  toolAuthentication: boolean;
  autoDispatch: boolean;
  separateDispatchAgent: boolean;
  agentId: string | null;
}

/** Messages pushed on /user/{email}/voiceops. */
export type VoiceOpsMessage =
  | { kind: 'event'; call: VoiceCall; event: VoiceEvent }
  | { kind: 'call'; call: VoiceCall };
