import { ReactNode } from 'react';
import PhoneInTalkTwoToneIcon from '@mui/icons-material/PhoneInTalkTwoTone';
import TranslateTwoToneIcon from '@mui/icons-material/TranslateTwoTone';
import RecordVoiceOverTwoToneIcon from '@mui/icons-material/RecordVoiceOverTwoTone';
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';
import HelpOutlineTwoToneIcon from '@mui/icons-material/HelpOutlineTwoTone';
import PrecisionManufacturingTwoToneIcon from '@mui/icons-material/PrecisionManufacturingTwoTone';
import WarningAmberTwoToneIcon from '@mui/icons-material/WarningAmberTwoTone';
import BuildTwoToneIcon from '@mui/icons-material/BuildTwoTone';
import AssignmentTwoToneIcon from '@mui/icons-material/AssignmentTwoTone';
import EngineeringTwoToneIcon from '@mui/icons-material/EngineeringTwoTone';
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import PriorityHighTwoToneIcon from '@mui/icons-material/PriorityHighTwoTone';
import PhoneForwardedTwoToneIcon from '@mui/icons-material/PhoneForwardedTwoTone';
import HowToRegTwoToneIcon from '@mui/icons-material/HowToRegTwoTone';
import SummarizeTwoToneIcon from '@mui/icons-material/SummarizeTwoTone';
import CallEndTwoToneIcon from '@mui/icons-material/CallEndTwoTone';
import MicTwoToneIcon from '@mui/icons-material/MicTwoTone';
import GraphicEqTwoToneIcon from '@mui/icons-material/GraphicEqTwoTone';
import {
  VoiceCall,
  VoiceCallSource,
  VoiceEventOrigin,
  VoiceEventStatus,
  VoiceEventType
} from '../../../models/owns/voiceOps';

export type PaletteKey = 'primary' | 'success' | 'error' | 'warning' | 'info';

export const eventIcons: Record<VoiceEventType, ReactNode> = {
  CALL_STARTED: <PhoneInTalkTwoToneIcon fontSize="small" />,
  LANGUAGE: <TranslateTwoToneIcon fontSize="small" />,
  USER_SAID: <RecordVoiceOverTwoToneIcon fontSize="small" />,
  AGENT_SAID: <SmartToyTwoToneIcon fontSize="small" />,
  QUESTION_ASKED: <HelpOutlineTwoToneIcon fontSize="small" />,
  EQUIPMENT_IDENTIFIED: <PrecisionManufacturingTwoToneIcon fontSize="small" />,
  SEVERITY: <WarningAmberTwoToneIcon fontSize="small" />,
  TOOL_CALL: <BuildTwoToneIcon fontSize="small" />,
  WORK_ORDER_CREATED: <AssignmentTwoToneIcon fontSize="small" />,
  TECHNICIAN_ASSIGNED: <EngineeringTwoToneIcon fontSize="small" />,
  NOTIFICATION: <NotificationsActiveTwoToneIcon fontSize="small" />,
  ESCALATION: <PriorityHighTwoToneIcon fontSize="small" />,
  OUTBOUND_CALL: <PhoneForwardedTwoToneIcon fontSize="small" />,
  DISPATCH_CONFIRMATION: <HowToRegTwoToneIcon fontSize="small" />,
  CALL_SUMMARY: <SummarizeTwoToneIcon fontSize="small" />,
  CALL_ENDED: <CallEndTwoToneIcon fontSize="small" />
};

export const sourceIcons: Record<VoiceCallSource, ReactNode> = {
  PHONE_INBOUND: <PhoneInTalkTwoToneIcon />,
  PHONE_OUTBOUND: <PhoneForwardedTwoToneIcon />,
  BROWSER: <MicTwoToneIcon />,
  UNKNOWN: <GraphicEqTwoToneIcon />
};

export const statusColor: Record<VoiceEventStatus, PaletteKey> = {
  SUCCESS: 'success',
  FAILED: 'error',
  SKIPPED: 'warning',
  INFO: 'primary'
};

export const isTranscript = (type: VoiceEventType) =>
  type === 'USER_SAID' || type === 'AGENT_SAID';

export const originLabel = (origin: VoiceEventOrigin, t: any): string => {
  switch (origin) {
    case 'TOOL_REQUEST':
      return t('voiceops_origin_tool', 'Agent tool call');
    case 'BROWSER_SDK':
      return t('voiceops_origin_sdk', 'Voice SDK');
    case 'POST_CALL_WEBHOOK':
      return t('voiceops_origin_webhook', 'Post-call webhook');
    case 'BACKEND':
    default:
      return t('voiceops_origin_backend', 'Backend');
  }
};

export const sourceLabel = (call: VoiceCall, t: any): string => {
  switch (call.source) {
    case 'PHONE_INBOUND':
      return t('voiceops_source_inbound', 'Inbound call');
    case 'PHONE_OUTBOUND':
      return call.connected
        ? t('voiceops_source_outbound', 'Outbound call')
        : t('voiceops_source_outbound_attempt', 'Outbound call attempt');
    case 'BROWSER':
      return t('voiceops_source_browser', 'Browser voice session');
    default:
      return t('voiceops_source_unknown', 'Voice conversation');
  }
};

export const languageName = (code: string | null): string | null => {
  if (!code) return null;
  try {
    const DisplayNames = (Intl as any).DisplayNames;
    if (DisplayNames) {
      const name = new DisplayNames(['en'], { type: 'language' }).of(code);
      if (name && name !== code) return `${name} (${code})`;
    }
  } catch {
    // Unknown code: fall through to the raw value.
  }
  return code;
};

export const formatTime = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
};

export const formatDateTime = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? formatTime(value)
    : date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
};
