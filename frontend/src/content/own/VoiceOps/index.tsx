import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import GraphicEqTwoToneIcon from '@mui/icons-material/GraphicEqTwoTone';
import MicTwoToneIcon from '@mui/icons-material/MicTwoTone';
import StopCircleTwoToneIcon from '@mui/icons-material/StopCircleTwoTone';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import RemoveCircleOutlineTwoToneIcon from '@mui/icons-material/RemoveCircleOutlineTwoTone';
import { useTranslation } from 'react-i18next';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { TitleContext } from '../../../contexts/TitleContext';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import { apiUrl } from '../../../config';
import api, { getErrorMessage } from '../../../utils/api';
import PermissionErrorMessage from '../components/PermissionErrorMessage';
import {
  VoiceCall,
  VoiceEvent,
  VoiceOpsConfig,
  VoiceOpsMessage
} from '../../../models/owns/voiceOps';
import CallList from './CallList';
import CallDetail from './CallDetail';
import useVoiceSession from './useVoiceSession';

const byStartDesc = (a: VoiceCall, b: VoiceCall) =>
  new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();

/**
 * Merges a call (and optionally one new event) pushed by the backend into the list. Pushed call objects carry
 * no events, so the events already held are kept.
 */
const mergeCall = (
  calls: VoiceCall[],
  incoming: VoiceCall,
  event?: VoiceEvent
): VoiceCall[] => {
  const existing = calls.find((call) => call.id === incoming.id);
  let events = incoming.events?.length
    ? incoming.events
    : existing?.events ?? [];
  if (event && !events.some((e) => e.id === event.id))
    events = [...events, event].sort((a, b) => a.id - b.id);
  const merged = { ...incoming, events };
  return [merged, ...calls.filter((call) => call.id !== incoming.id)].sort(
    byStartDesc
  );
};

function VoiceOps() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { setTitle } = useContext(TitleContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { user, hasViewPermission } = useAuth();
  const [config, setConfig] = useState<VoiceOpsConfig | null>(null);
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const canView = hasViewPermission(PermissionEntity.WORK_ORDERS);

  useEffect(() => {
    setTitle(t('voice_ops', 'VoiceOps'));
  }, []);

  const loadCalls = useCallback(
    () =>
      api
        .get<VoiceCall[]>('voice-ops/calls')
        .then((result) =>
          setCalls((current) => {
            // Keep events and calls pushed over the socket while the request was in flight.
            const refreshed = result.map((fresh) => {
              const held = current.find((call) => call.id === fresh.id);
              if (!held) return fresh;
              const ids = new Set(fresh.events.map((e) => e.id));
              const extra = held.events.filter((e) => !ids.has(e.id));
              return extra.length
                ? {
                    ...fresh,
                    events: [...fresh.events, ...extra].sort(
                      (a, b) => a.id - b.id
                    )
                  }
                : fresh;
            });
            const pushedOnly = current.filter(
              (call) => !result.some((fresh) => fresh.id === call.id)
            );
            return [...refreshed, ...pushedOnly].sort(byStartDesc);
          })
        )
        .catch((error) =>
          showSnackBar(
            getErrorMessage(
              error,
              t('voiceops_load_failed', 'Could not load calls')
            ),
            'error'
          )
        ),
    []
  );

  useEffect(() => {
    if (!canView) return;
    Promise.all([
      api
        .get<VoiceOpsConfig>('voice-ops/config')
        .then(setConfig)
        .catch(() => setConfig(null)),
      loadCalls()
    ]).finally(() => setLoading(false));
  }, [canView]);

  // Live updates: every event the backend saves is pushed to /user/{email}/voiceops.
  useEffect(() => {
    if (!canView || !user?.email) return;
    const client = Stomp.over(() => new SockJS(`${apiUrl}ws`));
    client.debug = () => undefined;
    client.reconnect_delay = 5000;
    client.connect(
      { token: localStorage.getItem('accessToken') },
      () => {
        setLiveConnected(true);
        client.subscribe(`/user/${user.email}/voiceops`, (message) => {
          const data: VoiceOpsMessage = JSON.parse(message.body);
          setCalls((current) =>
            data.kind === 'event'
              ? mergeCall(current, data.call, data.event)
              : mergeCall(current, data.call)
          );
        });
        // Catch up on anything saved while the socket was down.
        loadCalls();
      },
      () => setLiveConnected(false)
    );
    client.onWebSocketClose = () => setLiveConnected(false);
    return () => {
      setLiveConnected(false);
      try {
        client.deactivate();
      } catch {
        // Already closed.
      }
    };
  }, [canView, user?.email]);

  const session = useVoiceSession(
    (call) => {
      setCalls((current) => mergeCall(current, call));
      setSelectedId(call.id);
    },
    (message) => showSnackBar(message, 'error')
  );

  const selected = useMemo(
    () => calls.find((call) => call.id === selectedId) ?? calls[0] ?? null,
    [calls, selectedId]
  );

  const onCallTechnician = (workOrderId: number) => {
    setDispatching(true);
    api
      .post<{
        status: string;
        technician?: string;
        reason?: string;
        message?: string;
      }>(`voice-ops/work-orders/${workOrderId}/call-technician`, {})
      .then((result) => {
        if (result.status === 'calling')
          showSnackBar(
            t('voiceops_calling_technician', 'Calling {{name}}', {
              name: result.technician
            }),
            'success'
          );
        else
          showSnackBar(
            `${t('voiceops_call_not_placed', 'Call not placed')}: ${
              result.reason ?? result.message ?? result.status
            }`,
            'warning'
          );
      })
      .catch((error) =>
        showSnackBar(
          getErrorMessage(
            error,
            t('voiceops_call_not_placed', 'Call not placed')
          ),
          'error'
        )
      )
      .finally(() => setDispatching(false));
  };

  if (!canView) return <PermissionErrorMessage message={'no_access_wo'} />;

  const configItems: { label: string; ok: boolean; hint: string }[] = config
    ? [
        {
          label: t('voiceops_cfg_browser', 'Browser voice'),
          ok: config.browserSessions,
          hint: 'ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID'
        },
        {
          label: t('voiceops_cfg_tools', 'Tool authentication'),
          ok: config.toolAuthentication,
          hint: 'ELEVENLABS_TOOL_SECRET, ELEVENLABS_SERVICE_USER_EMAIL'
        },
        {
          label: t('voiceops_cfg_outbound', 'Outbound calls'),
          ok: config.outboundCalls,
          hint: 'ELEVENLABS_PHONE_NUMBER_ID'
        },
        {
          label: t('voiceops_cfg_webhook', 'Post-call webhook'),
          ok: config.webhookVerification,
          hint: 'ELEVENLABS_WEBHOOK_SECRET'
        },
        {
          label: t('voiceops_cfg_auto', 'Auto-dispatch on breakdown'),
          ok: config.autoDispatch,
          hint: 'ELEVENLABS_AUTO_DISPATCH=true'
        }
      ]
    : [];

  const sessionBusy =
    session.state === 'connecting' || session.state === 'ending';

  return (
    <>
      <Helmet>
        <title>{t('voice_ops', 'VoiceOps')}</title>
      </Helmet>
      <Box paddingX={4} paddingY={2}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 52,
                      height: 52,
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main
                    }}
                  >
                    <GraphicEqTwoToneIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h3">
                      {t('voice_ops', 'VoiceOps')}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t(
                        'voiceops_subtitle',
                        'What the ElevenLabs voice agent hears and does, as it happens'
                      )}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Chip
                    size="small"
                    variant="outlined"
                    color={liveConnected ? 'success' : 'default'}
                    label={
                      liveConnected
                        ? t('voiceops_live_updates', 'Live updates on')
                        : t('voiceops_live_updates_off', 'Live updates off')
                    }
                  />
                  {session.state === 'live' && (
                    <Chip
                      color={session.agentSpeaking ? 'primary' : 'success'}
                      label={
                        session.agentSpeaking
                          ? t('voiceops_agent_speaking', 'Agent speaking')
                          : t('voiceops_listening', 'Listening')
                      }
                    />
                  )}
                  {session.state === 'live' || session.state === 'ending' ? (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<StopCircleTwoToneIcon />}
                      onClick={session.stop}
                      disabled={sessionBusy}
                    >
                      {t('voiceops_end_session', 'End session')}
                    </Button>
                  ) : (
                    <Tooltip
                      title={
                        config?.browserSessions
                          ? t(
                              'voiceops_start_hint',
                              'Talk to the agent from this browser. Uses your microphone.'
                            )
                          : t(
                              'voiceops_browser_not_configured',
                              'Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID on the server first'
                            )
                      }
                    >
                      <span>
                        <Button
                          variant="contained"
                          startIcon={
                            session.state === 'connecting' ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <MicTwoToneIcon />
                            )
                          }
                          onClick={session.start}
                          disabled={!config?.browserSessions || sessionBusy}
                        >
                          {session.state === 'connecting'
                            ? t('voiceops_connecting', 'Connecting')
                            : t(
                                'voiceops_start_session',
                                'Start voice session'
                              )}
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
              {configItems.length > 0 && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}
                >
                  {configItems.map((item) => (
                    <Tooltip
                      key={item.label}
                      title={
                        item.ok
                          ? t('voiceops_configured', 'Configured')
                          : `${t('voiceops_needs', 'Needs')} ${item.hint}`
                      }
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        color={item.ok ? 'success' : 'default'}
                        icon={
                          item.ok ? (
                            <CheckCircleTwoToneIcon fontSize="small" />
                          ) : (
                            <RemoveCircleOutlineTwoToneIcon fontSize="small" />
                          )
                        }
                        label={item.label}
                      />
                    </Tooltip>
                  ))}
                </Stack>
              )}
            </Card>
          </Grid>
          {loading ? (
            <Grid item xs={12}>
              <Stack alignItems="center" sx={{ py: 6 }}>
                <CircularProgress />
              </Stack>
            </Grid>
          ) : (
            <>
              <Grid item xs={12} md={4}>
                <CallList
                  calls={calls}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelectedId}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                {selected ? (
                  <CallDetail
                    call={selected}
                    config={config}
                    dispatching={dispatching}
                    onCallTechnician={onCallTechnician}
                  />
                ) : (
                  <Card sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>
                      {t('voiceops_empty_title', 'No conversation selected')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {t(
                        'voiceops_empty_body',
                        'When a call comes in, its language, transcript, equipment, severity, tool calls, work order, technician and notifications appear here as the backend records them.'
                      )}
                    </Typography>
                  </Card>
                )}
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    </>
  );
}

export default VoiceOps;
