import { alpha, Box, Button, Typography, useTheme } from '@mui/material';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import { useTranslation } from 'react-i18next';
import {
  AssistantPendingAction,
  AssistantRecord
} from '../../models/owns/assistant';
import RecordCard from './RecordCard';

export interface ActionState {
  action: AssistantPendingAction;
  state: 'pending' | 'working' | 'confirmed' | 'cancelled';
  error?: string;
  result?: string;
  record?: AssistantRecord;
}

/**
 * Preview of a change the assistant prepared. Nothing is saved until the user clicks Confirm.
 */
export default function ActionPreview({
  actionState,
  onConfirm,
  onCancel
}: {
  actionState: ActionState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { action, state, error, result, record } = actionState;

  return (
    <Box
      sx={{
        border: `1px solid ${
          state === 'confirmed'
            ? theme.palette.success.main
            : alpha(theme.palette.primary.main, 0.4)
        }`,
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {action.kind === 'CREATE_WORK_ORDER'
            ? t('assistant_preview_create_wo', 'New work order')
            : t('assistant_preview_change_status', 'Change work order status')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {state === 'confirmed'
            ? t('assistant_saved', 'Saved')
            : state === 'cancelled'
            ? t('assistant_cancelled', 'Cancelled')
            : t('assistant_preview', 'Preview · not saved')}
        </Typography>
      </Box>
      <Box
        component="dl"
        sx={{
          m: 0,
          px: 1.5,
          py: 1,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          columnGap: 1.5,
          rowGap: 0.5
        }}
      >
        {Object.entries(action.fields).map(([label, value]) => (
          <Box key={label} sx={{ display: 'contents' }}>
            <Typography component="dt" variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
      {error && (
        <Typography variant="body2" color="error" sx={{ px: 1.5, pb: 1 }}>
          {error}
        </Typography>
      )}
      {(state === 'pending' || state === 'working') && (
        <Box sx={{ display: 'flex', gap: 1, px: 1.5, pb: 1.5 }}>
          <Button
            variant="contained"
            size="small"
            onClick={onConfirm}
            disabled={state === 'working'}
          >
            {t('assistant_confirm', 'Confirm')}
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={onCancel}
            disabled={state === 'working'}
          >
            {t('cancel', 'Cancel')}
          </Button>
        </Box>
      )}
      {state === 'confirmed' && (
        <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CheckCircleTwoToneIcon fontSize="small" color="success" />
            <Typography variant="body2">{result}</Typography>
          </Box>
          {record && <RecordCard record={record} />}
        </Box>
      )}
    </Box>
  );
}
