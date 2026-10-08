import { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation } from '@elevenlabs/client';
import api, { getErrorMessage } from '../../../utils/api';
import { VoiceCall } from '../../../models/owns/voiceOps';

type Session = Awaited<ReturnType<typeof Conversation.startSession>>;

export type SessionState = 'idle' | 'connecting' | 'live' | 'ending';

interface PendingLine {
  role: 'user' | 'agent';
  text: string;
}

/**
 * A browser voice session with the ElevenLabs agent. The backend issues a signed URL, so the API key never
 * reaches the browser. Transcript lines the SDK reports are forwarded to the backend, which saves them as
 * VoiceOps events and pushes them back to every open panel; the panel itself only shows saved events.
 */
export default function useVoiceSession(
  onRegistered: (call: VoiceCall) => void,
  onError: (message: string) => void
) {
  const [state, setState] = useState<SessionState>('idle');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const registeredRef = useRef(false);
  const endedRef = useRef(false);
  const pendingRef = useRef<PendingLine[]>([]);
  // Posts run one after another so transcript lines keep their order.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const callbacksRef = useRef({ onRegistered, onError });
  callbacksRef.current = { onRegistered, onError };

  const enqueue = (path: string, body: object) => {
    queueRef.current = queueRef.current
      .then(() => api.post(path, body))
      .catch((error) =>
        callbacksRef.current.onError(
          getErrorMessage(error, 'Could not save a voice event')
        )
      );
  };

  const sendLine = (line: PendingLine) =>
    enqueue(
      `voice-ops/browser-calls/${encodeURIComponent(
        conversationIdRef.current
      )}/messages`,
      line
    );

  const finish = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setState('idle');
    setAgentSpeaking(false);
    if (registeredRef.current && conversationIdRef.current) {
      enqueue(
        `voice-ops/browser-calls/${encodeURIComponent(
          conversationIdRef.current
        )}/end`,
        {}
      );
    }
  }, []);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    endedRef.current = false;
    registeredRef.current = false;
    conversationIdRef.current = null;
    pendingRef.current = [];
    setState('connecting');
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      microphone.getTracks().forEach((track) => track.stop());
      const { signedUrl } = await api.post<{ signedUrl: string }>(
        'voice-ops/browser-session',
        {}
      );
      const session = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        onMessage: ({ message, role, source }) => {
          const text = (message ?? '').trim();
          if (!text) return;
          const line: PendingLine = {
            role:
              (role ?? (source === 'ai' ? 'agent' : 'user')) === 'agent'
                ? 'agent'
                : 'user',
            text: text.slice(0, 4000)
          };
          if (registeredRef.current) sendLine(line);
          else pendingRef.current.push(line);
        },
        onModeChange: ({ mode }) => setAgentSpeaking(mode === 'speaking'),
        onDisconnect: () => {
          sessionRef.current = null;
          finish();
        },
        onError: (message) => callbacksRef.current.onError(String(message))
      });
      sessionRef.current = session;
      conversationIdRef.current = session.getId();
      const call = await api.post<VoiceCall>('voice-ops/browser-calls', {
        conversationId: conversationIdRef.current
      });
      registeredRef.current = true;
      pendingRef.current.splice(0).forEach(sendLine);
      setState('live');
      callbacksRef.current.onRegistered(call);
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone access was denied.'
          : getErrorMessage(error, 'Could not start the voice session');
      callbacksRef.current.onError(message);
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) await session.endSession().catch(() => undefined);
      finish();
    }
  }, [finish]);

  const stop = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setState('ending');
    if (session) await session.endSession().catch(() => undefined);
    finish();
  }, [finish]);

  useEffect(
    () => () => {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) session.endSession().catch(() => undefined);
    },
    []
  );

  return { state, agentSpeaking, start, stop };
}
