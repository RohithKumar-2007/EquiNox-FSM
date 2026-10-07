import {
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ChatTwoToneIcon from '@mui/icons-material/ChatTwoTone';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { getErrorMessage } from '../../utils/api';
import { useSelector } from '../../store';
import {
  AssistantActionResult,
  AssistantChatResponse,
  AssistantPageContext,
  AssistantPendingAction,
  AssistantRecord,
  AssistantStatus
} from '../../models/owns/assistant';
import ActionPreview, { ActionState } from './ActionPreview';
import MessageText from './MessageText';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  records?: Record<string, AssistantRecord>;
  actions?: ActionState[];
  error?: boolean;
}

const PANEL_WIDTH = 380;

let nextMessageId = 1;

function usePageContext(): {
  context: AssistantPageContext | null;
  label: string | null;
} {
  const { pathname } = useLocation();
  const assetInfos = useSelector((state) => state.assets.assetInfos);
  const singleWorkOrder = useSelector(
    (state) => state.workOrders.singleWorkOrder
  );
  const { t } = useTranslation();

  return useMemo(() => {
    const assetMatch = pathname.match(/^\/app\/assets\/(\d+)/);
    if (assetMatch) {
      const id = Number(assetMatch[1]);
      const asset = assetInfos[id]?.asset;
      const label = asset
        ? [asset.name, asset.customId].filter(Boolean).join(' ')
        : `${t('asset', 'Asset')} #${id}`;
      return { context: { type: 'asset', id }, label };
    }
    const workOrderMatch = pathname.match(/^\/app\/work-orders\/(\d+)/);
    if (workOrderMatch) {
      const id = Number(workOrderMatch[1]);
      const label =
        singleWorkOrder?.id === id
          ? singleWorkOrder.title
          : `${t('work_order', 'Work order')} #${id}`;
      return { context: { type: 'work_order', id }, label };
    }
    return { context: null, label: null };
  }, [pathname, assetInfos, singleWorkOrder, t]);
}

export default function AssistantWidget() {
  const theme = useTheme();
  const { t } = useTranslation();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { context, label } = usePageContext();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    t('assistant_suggestion_create_wo', 'Create a work order'),
    t('assistant_suggestion_overdue', 'Show overdue maintenance'),
    t('assistant_suggestion_find_asset', 'Find an asset')
  ];

  useEffect(() => {
    if (!open || status) return;
    api
      .get<AssistantStatus>('assistant/status')
      .then((result) => {
        setStatus(result);
        setStatusError(false);
      })
      .catch(() => setStatusError(true));
  }, [open, status]);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, sending, open]);

  useEffect(() => {
    if (open && !mobile) inputRef.current?.focus();
  }, [open, mobile]);

  const enabled = status?.enabled === true;

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending || !enabled) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: nextMessageId++, role: 'user', text: message }
    ]);
    setSending(true);
    try {
      const response = await api.post<AssistantChatResponse>(
        'assistant/chat',
        { conversationId, message, context }
      );
      setConversationId(response.conversationId);
      const records: Record<string, AssistantRecord> = {};
      response.records.forEach((record) => {
        records[`${record.type}:${record.id}`] = record;
      });
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId++,
          role: 'assistant',
          text: response.reply,
          records,
          actions: response.pendingActions.map((action) => ({
            action,
            state: 'pending' as const
          }))
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId++,
          role: 'assistant',
          text: getErrorMessage(
            error,
            t('assistant_error', 'Something went wrong. Please try again.')
          ),
          error: true
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const updateAction = (
    messageId: number,
    actionId: string,
    update: Partial<ActionState>
  ) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id !== messageId
          ? message
          : {
              ...message,
              actions: message.actions?.map((actionState) =>
                actionState.action.id === actionId
                  ? { ...actionState, ...update }
                  : actionState
              )
            }
      )
    );
  };

  const confirmAction = async (
    messageId: number,
    action: AssistantPendingAction
  ) => {
    updateAction(messageId, action.id, { state: 'working', error: undefined });
    try {
      const result = await api.post<AssistantActionResult>(
        `assistant/actions/${action.id}/confirm`,
        { conversationId }
      );
      updateAction(messageId, action.id, {
        state: 'confirmed',
        result: result.message,
        record: result.record
      });
    } catch (error) {
      updateAction(messageId, action.id, {
        state: 'pending',
        error: getErrorMessage(
          error,
          t('assistant_confirm_error', 'Could not save. Please try again.')
        )
      });
    }
  };

  const cancelAction = async (
    messageId: number,
    action: AssistantPendingAction
  ) => {
    updateAction(messageId, action.id, { state: 'working', error: undefined });
    try {
      await api.post(`assistant/actions/${action.id}/cancel`, {
        conversationId
      });
    } catch {
      // The draft is gone either way; nothing was saved.
    }
    updateAction(messageId, action.id, { state: 'cancelled' });
  };

  const closeChat = () => {
    setOpen(false);
    setMessages([]);
    setConversationId(null);
    setInput('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  };

  const statusLabel = statusError
    ? t('assistant_status_unavailable', 'Unavailable')
    : !status
    ? t('assistant_status_connecting', 'Connecting…')
    : enabled
    ? t('assistant_status_online', 'Online')
    : t('assistant_status_not_configured', 'Not set up');
  const statusColor = statusError
    ? theme.palette.error.main
    : enabled
    ? theme.palette.success.main
    : theme.palette.grey[400];

  const assistantBubbleBg = alpha(
    theme.palette.text.primary,
    theme.palette.mode === 'dark' ? 0.12 : 0.06
  );

  if (!open) {
    return (
      <Button
        variant="contained"
        startIcon={<ChatTwoToneIcon />}
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          right: { xs: 16, sm: 24 },
          bottom: { xs: 16, sm: 24 },
          zIndex: theme.zIndex.speedDial,
          borderRadius: 6,
          px: 2.5,
          py: 1.25,
          boxShadow: theme.shadows[6]
        }}
      >
        {t('assistant_open', 'Ask assistant')}
      </Button>
    );
  }

  return (
    <Paper
      elevation={0}
      role="dialog"
      aria-label={t('assistant_title', 'Maintenance Assistant')}
      sx={{
        position: 'fixed',
        zIndex: theme.zIndex.speedDial,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: mobile ? 3 : 4,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: `0 12px 40px ${alpha('#000', 0.18)}`,
        bgcolor: 'background.paper',
        ...(mobile
          ? { top: 8, right: 8, bottom: 8, left: 8 }
          : {
              right: 24,
              bottom: 24,
              width: PANEL_WIDTH,
              height: 'min(620px, calc(100vh - 48px))'
            })
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h5"
            sx={{ color: 'inherit', fontWeight: 700 }}
            noWrap
          >
            {t('assistant_title', 'Maintenance Assistant')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: statusColor,
                boxShadow: `0 0 0 2px ${alpha('#fff', 0.35)}`
              }}
            />
            <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
              {statusLabel}
            </Typography>
          </Box>
        </Box>
        <Tooltip title={t('assistant_minimize', 'Minimize')}>
          <IconButton
            size="small"
            onClick={() => setOpen(false)}
            sx={{ color: 'inherit' }}
            aria-label={t('assistant_minimize', 'Minimize')}
          >
            <RemoveRoundedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('assistant_close', 'Close and clear chat')}>
          <IconButton
            size="small"
            onClick={closeChat}
            sx={{ color: 'inherit' }}
            aria-label={t('assistant_close', 'Close and clear chat')}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {label && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.75,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.06)
          }}
        >
          <VisibilityTwoToneIcon fontSize="small" color="primary" />
          <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
            {t('assistant_viewing', 'Viewing')}: <strong>{label}</strong>
          </Typography>
        </Box>
      )}

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5
        }}
      >
        <Bubble role="assistant" background={assistantBubbleBg}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {t(
              'assistant_welcome',
              'Hi! I can help you find assets, check maintenance tasks, and prepare work orders. What do you need?'
            )}
          </Typography>
        </Bubble>
        {messages.length === 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {suggestions.map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                color="primary"
                variant="outlined"
                clickable
                disabled={!enabled}
                onClick={() => send(suggestion)}
              />
            ))}
          </Box>
        )}
        {status && !enabled && (
          <Typography variant="body2" color="text.secondary">
            {t(
              'assistant_not_configured_hint',
              'The assistant is not set up yet. Add GEMINI_API_KEY to the server configuration and restart the backend.'
            )}
          </Typography>
        )}
        {statusError && (
          <Typography variant="body2" color="error">
            {t(
              'assistant_status_error_hint',
              'Could not reach the assistant. Make sure the backend is running and up to date.'
            )}
          </Typography>
        )}

        {messages.map((message) => (
          <Bubble
            key={message.id}
            role={message.role}
            background={
              message.role === 'user'
                ? theme.palette.primary.main
                : message.error
                ? alpha(theme.palette.error.main, 0.1)
                : assistantBubbleBg
            }
          >
            {message.role === 'user' ? (
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  color: 'primary.contrastText'
                }}
              >
                {message.text}
              </Typography>
            ) : (
              <MessageText
                text={message.text}
                records={message.records ?? {}}
                error={message.error}
              />
            )}
            {message.actions?.map((actionState) => (
              <ActionPreview
                key={actionState.action.id}
                actionState={actionState}
                onConfirm={() => confirmAction(message.id, actionState.action)}
                onCancel={() => cancelAction(message.id, actionState.action)}
              />
            ))}
          </Bubble>
        ))}

        {sending && (
          <Bubble role="assistant" background={assistantBubbleBg}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={14} />
              <Typography variant="body2" color="text.secondary">
                {t('assistant_thinking', 'Looking that up…')}
              </Typography>
            </Box>
          </Bubble>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          p: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={4}
          size="small"
          value={input}
          disabled={!enabled}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t(
            'assistant_placeholder',
            'Ask about assets, maintenance, or work orders…'
          )}
          inputProps={{ maxLength: 4000 }}
        />
        <Tooltip title={t('assistant_send', 'Send')}>
          <span>
            <IconButton
              color="primary"
              onClick={() => send(input)}
              disabled={!enabled || sending || !input.trim()}
              aria-label={t('assistant_send', 'Send')}
            >
              <SendRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Paper>
  );
}

function Bubble({
  role,
  background,
  children
}: {
  role: 'user' | 'assistant';
  background: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
        maxWidth: role === 'user' ? '85%' : '100%',
        bgcolor: background,
        borderRadius: 3,
        borderBottomRightRadius: role === 'user' ? 4 : undefined,
        borderBottomLeftRadius: role === 'assistant' ? 4 : undefined,
        px: 1.5,
        py: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        wordBreak: 'break-word'
      }}
    >
      {children}
    </Box>
  );
}
