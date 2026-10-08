import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardHeader,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import ExpandMoreTwoToneIcon from '@mui/icons-material/ExpandMoreTwoTone';
import PhoneForwardedTwoToneIcon from '@mui/icons-material/PhoneForwardedTwoTone';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  VoiceCall,
  VoiceEvent,
  VoiceEventStatus,
  VoiceEventType,
  VoiceOpsConfig
} from '../../../models/owns/voiceOps';
import { getWorkOrderUrl } from '../../../utils/urlPaths';
import {
  eventIcons,
  formatTime,
  isTranscript,
  languageName,
  originLabel,
  PaletteKey,
  sourceLabel,
  statusColor
} from './eventMeta';

type Filter = 'all' | 'actions' | 'transcript';

interface Props {
  call: VoiceCall;
  config: VoiceOpsConfig | null;
  dispatching: boolean;
  onCallTechnician: (workOrderId: number) => void;
}

interface SummaryTile {
  key: string;
  label: string;
  icon: ReactNode;
  value: ReactNode | null;
  hint?: string | null;
  color?: PaletteKey;
}

const lastOf = (events: VoiceEvent[], type: VoiceEventType) => {
  for (let i = events.length - 1; i >= 0; i--)
    if (events[i].type === type) return events[i];
  return undefined;
};

export default function CallDetail({
  call,
  config,
  dispatching,
  onCallTechnician
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const events = call.events;

  // Every tile is derived from saved events only; a tile stays empty until its event arrives.
  const tiles = useMemo<SummaryTile[]>(() => {
    const languageEvent = lastOf(events, 'LANGUAGE');
    const equipment = events.find((e) => e.type === 'EQUIPMENT_IDENTIFIED');
    const questions = events.filter((e) => e.type === 'QUESTION_ASKED');
    const severity = lastOf(events, 'SEVERITY');
    const tools = events.filter((e) => e.type === 'TOOL_CALL');
    const failedTools = tools.filter((e) => e.status === 'FAILED').length;
    const lastTool = tools[tools.length - 1];
    const workOrder = lastOf(events, 'WORK_ORDER_CREATED');
    const workOrderId: number | null =
      workOrder?.detail?.work_order_id ?? call.workOrderId;
    const technician = lastOf(events, 'TECHNICIAN_ASSIGNED');
    const notification = lastOf(events, 'NOTIFICATION');
    const confirmation = lastOf(events, 'DISPATCH_CONFIRMATION');
    const outbound = lastOf(events, 'OUTBOUND_CALL');
    const dispatch = confirmation ?? outbound;

    return [
      {
        key: 'language',
        label: t('voiceops_language', 'Language detected'),
        icon: eventIcons.LANGUAGE,
        value: languageName(languageEvent?.detail?.language ?? call.language),
        hint: languageEvent ? originLabel(languageEvent.origin, t) : null
      },
      {
        key: 'equipment',
        label: t('voiceops_equipment', 'Equipment identified'),
        icon: eventIcons.EQUIPMENT_IDENTIFIED,
        value: equipment
          ? [equipment.detail?.name, equipment.detail?.code]
              .filter(Boolean)
              .join(' · ')
          : null,
        hint: equipment?.detail?.location ?? null,
        color: equipment ? 'success' : undefined
      },
      {
        key: 'questions',
        label: t('voiceops_questions', 'Questions asked'),
        icon: eventIcons.QUESTION_ASKED,
        value: questions.length ? String(questions.length) : null,
        hint: questions.length ? questions[questions.length - 1].title : null
      },
      {
        key: 'severity',
        label: t('voiceops_severity', 'Severity'),
        icon: eventIcons.SEVERITY,
        value: severity?.detail?.severity ?? null,
        hint: severity?.detail?.priority
          ? `${t('priority', 'Priority')} ${severity.detail.priority}`
          : null,
        color:
          severity?.detail?.severity === 'CRITICAL' ||
          severity?.detail?.severity === 'HIGH'
            ? 'error'
            : severity
            ? 'warning'
            : undefined
      },
      {
        key: 'tools',
        label: t('voiceops_tools', 'Tool executions'),
        icon: eventIcons.TOOL_CALL,
        value: tools.length
          ? `${tools.length - failedTools} ${t('voiceops_ok', 'ok')}${
              failedTools
                ? ` · ${failedTools} ${t('voiceops_failed_lower', 'failed')}`
                : ''
            }`
          : null,
        hint: lastTool?.toolName ?? null,
        color: failedTools ? 'error' : tools.length ? 'success' : undefined
      },
      {
        key: 'workOrder',
        label: t('voiceops_work_order', 'Work order'),
        icon: eventIcons.WORK_ORDER_CREATED,
        value: workOrderId ? (
          <Link
            component={RouterLink}
            to={getWorkOrderUrl(workOrderId)}
            underline="hover"
          >
            {workOrder?.detail?.code ?? `#${workOrderId}`}
          </Link>
        ) : null,
        hint: workOrder?.detail?.title ?? null,
        color: workOrderId ? 'success' : undefined
      },
      {
        key: 'technician',
        label: t('voiceops_technician', 'Technician'),
        icon: eventIcons.TECHNICIAN_ASSIGNED,
        value: technician?.detail?.technician ?? null,
        hint: technician?.detail?.selection ?? null,
        color: technician ? 'success' : undefined
      },
      {
        key: 'notification',
        label: t('voiceops_notification', 'Notification'),
        icon: eventIcons.NOTIFICATION,
        value: notification
          ? notification.status === 'SUCCESS'
            ? t('voiceops_sent', 'Sent')
            : notification.status === 'SKIPPED'
            ? t('voiceops_skipped', 'Skipped')
            : t('voiceops_failed', 'Failed')
          : null,
        hint: notification?.title ?? null,
        color: notification ? statusColor[notification.status] : undefined
      },
      {
        key: 'dispatch',
        label: t('voiceops_dispatch', 'Technician call'),
        icon: eventIcons.OUTBOUND_CALL,
        value: dispatch
          ? dispatch.type === 'DISPATCH_CONFIRMATION'
            ? dispatch.status === 'SUCCESS'
              ? t('voiceops_on_the_way', 'On the way')
              : dispatch.status === 'FAILED'
              ? t('voiceops_cannot_attend', 'Cannot attend')
              : t('voiceops_no_answer_captured', 'No answer captured')
            : dispatch.status === 'SUCCESS'
            ? t('voiceops_calling', 'Calling')
            : dispatch.status === 'SKIPPED'
            ? t('voiceops_skipped', 'Skipped')
            : t('voiceops_failed', 'Failed')
          : null,
        hint: dispatch?.title ?? null,
        color: dispatch ? statusColor[dispatch.status] : undefined
      }
    ];
  }, [events, call.language, call.workOrderId, t]);

  const visible = events.filter((event) =>
    filter === 'all'
      ? true
      : filter === 'transcript'
      ? isTranscript(event.type)
      : !isTranscript(event.type)
  );

  useEffect(() => {
    const box = scrollRef.current;
    if (box && call.status === 'ACTIVE') box.scrollTop = box.scrollHeight;
  }, [events.length, call.status]);

  const workOrderId: number | null =
    lastOf(events, 'WORK_ORDER_CREATED')?.detail?.work_order_id ??
    call.workOrderId;

  const statusChip = (status: VoiceEventStatus) => {
    if (status === 'INFO') return null;
    const label =
      status === 'SUCCESS'
        ? t('voiceops_ok', 'ok')
        : status === 'FAILED'
        ? t('voiceops_failed_lower', 'failed')
        : t('voiceops_skipped_lower', 'skipped');
    return (
      <Chip
        size="small"
        color={statusColor[status]}
        variant={status === 'SUCCESS' ? 'filled' : 'outlined'}
        label={label}
      />
    );
  };

  const renderTranscript = (event: VoiceEvent) => {
    const agent = event.type === 'AGENT_SAID';
    return (
      <Box
        key={event.id}
        sx={{
          display: 'flex',
          justifyContent: agent ? 'flex-start' : 'flex-end',
          my: 1
        }}
      >
        <Box sx={{ maxWidth: '78%' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: agent ? 'left' : 'right' }}
          >
            {agent
              ? t('voiceops_agent', 'Agent')
              : t('voiceops_caller', 'Caller')}
            {' · '}
            {formatTime(event.createdAt)}
            {' · '}
            {originLabel(event.origin, t)}
          </Typography>
          <Box
            sx={{
              mt: 0.5,
              px: 2,
              py: 1.25,
              borderRadius: 2,
              bgcolor: agent
                ? alpha(theme.palette.primary.main, 0.08)
                : alpha(theme.palette.warning.main, 0.12),
              borderTopLeftRadius: agent ? 4 : undefined,
              borderTopRightRadius: agent ? undefined : 4
            }}
          >
            <Typography variant="body1">{event.title}</Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderAction = (event: VoiceEvent) => {
    const color = theme.palette[statusColor[event.status]].main;
    const open = !!expanded[event.id];
    const meta = [
      formatTime(event.createdAt),
      originLabel(event.origin, t),
      event.toolName,
      event.durationMs != null ? `${event.durationMs} ms` : null
    ].filter(Boolean);
    return (
      <Box key={event.id} sx={{ my: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: alpha(color, 0.12),
              color
            }}
          >
            {eventIcons[event.type]}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                variant="h6"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily:
                    event.type === 'TOOL_CALL'
                      ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
                      : undefined
                }}
              >
                {event.title}
              </Typography>
              {statusChip(event.status)}
              {event.detail && (
                <Tooltip title={t('voiceops_details', 'Details')}>
                  <IconButton
                    size="small"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [event.id]: !open }))
                    }
                    sx={{
                      transform: open ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <ExpandMoreTwoToneIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {meta.join(' · ')}
            </Typography>
            {event.detail && (
              <Collapse in={open} unmountOnExit>
                <Box
                  component="pre"
                  sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.text.primary, 0.04),
                    fontSize: 12,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {JSON.stringify(event.detail, null, 2)}
                </Box>
              </Collapse>
            )}
          </Box>
        </Stack>
      </Box>
    );
  };

  const who = call.callerName ?? call.callerNumber;
  const canDispatch = !!config?.outboundCalls;

  return (
    <Card>
      <CardHeader
        title={`${sourceLabel(call, t)}${who ? ` · ${who}` : ''}`}
        titleTypographyProps={{ variant: 'h4' }}
        subheader={
          call.conversationId
            ? `${t('voiceops_conversation', 'Conversation')} ${
                call.conversationId
              }`
            : t(
                'voiceops_attempt_subheader',
                'This call was not connected. The timeline says why.'
              )
        }
        action={
          workOrderId ? (
            <Tooltip
              title={
                canDispatch
                  ? t(
                      'voiceops_call_technician_hint',
                      "Phone the work order's technician through ElevenLabs"
                    )
                  : t(
                      'voiceops_outbound_not_configured',
                      'Set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID and ELEVENLABS_PHONE_NUMBER_ID to place calls'
                    )
              }
            >
              <span>
                <Button
                  variant="outlined"
                  startIcon={<PhoneForwardedTwoToneIcon />}
                  disabled={!canDispatch || dispatching}
                  onClick={() => onCallTechnician(workOrderId)}
                  sx={{ mt: 1, mr: 1 }}
                >
                  {dispatching
                    ? t('voiceops_calling', 'Calling')
                    : t('voiceops_call_technician', 'Call technician')}
                </Button>
              </span>
            </Tooltip>
          ) : null
        }
      />
      <Divider />
      <Box sx={{ p: 2 }}>
        <Grid container spacing={1.5}>
          {tiles.map((tile) => {
            const color = tile.color ? theme.palette[tile.color].main : null;
            return (
              <Grid item xs={12} sm={6} lg={4} key={tile.key}>
                <Box
                  sx={{
                    height: '100%',
                    p: 1.5,
                    borderRadius: 1,
                    border: `1px solid ${
                      color ? alpha(color, 0.4) : theme.palette.divider
                    }`,
                    bgcolor: color ? alpha(color, 0.05) : 'transparent'
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        color: color ?? theme.palette.text.secondary,
                        display: 'flex'
                      }}
                    >
                      {tile.icon}
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      {tile.label}
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ mt: 0.5 }}>
                    {tile.value ?? (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {t('voiceops_not_yet', 'Not yet')}
                      </Typography>
                    )}
                  </Typography>
                  {tile.hint && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block' }}
                      noWrap
                      title={tile.hint}
                    >
                      {tile.hint}
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
        {call.summary && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.05)
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {t('voiceops_summary', 'Call summary from ElevenLabs')}
            </Typography>
            <Typography variant="body1">{call.summary}</Typography>
          </Box>
        )}
      </Box>
      <Divider />
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: 2, pt: 2 }}
      >
        <Typography variant="h5">
          {t('voiceops_timeline', 'Activity')}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter}
          onChange={(_, value: Filter | null) => value && setFilter(value)}
        >
          <ToggleButton value="all">
            {t('voiceops_filter_all', 'All')}
          </ToggleButton>
          <ToggleButton value="actions">
            {t('voiceops_filter_actions', 'Actions')}
          </ToggleButton>
          <ToggleButton value="transcript">
            {t('voiceops_filter_transcript', 'Transcript')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box
        ref={scrollRef}
        sx={{ px: 2, pb: 2, maxHeight: 560, overflowY: 'auto' }}
      >
        {visible.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
            {t(
              'voiceops_no_events',
              'Nothing recorded yet. Events appear here the moment the backend saves them.'
            )}
          </Typography>
        ) : (
          visible.map((event) =>
            isTranscript(event.type)
              ? renderTranscript(event)
              : renderAction(event)
          )
        )}
      </Box>
    </Card>
  );
}
