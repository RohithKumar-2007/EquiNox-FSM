import {
  alpha,
  Avatar,
  Box,
  Card,
  CardHeader,
  Chip,
  Divider,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { VoiceCall } from '../../../models/owns/voiceOps';
import {
  formatDateTime,
  languageName,
  sourceIcons,
  sourceLabel
} from './eventMeta';

interface Props {
  calls: VoiceCall[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function CallList({ calls, selectedId, onSelect }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const statusChip = (call: VoiceCall) => {
    if (call.status === 'ACTIVE')
      return (
        <Chip
          size="small"
          color="success"
          label={t('voiceops_live', 'Live')}
          sx={{ fontWeight: 'bold' }}
        />
      );
    if (call.status === 'FAILED')
      return (
        <Chip
          size="small"
          color="error"
          variant="outlined"
          label={
            call.connected
              ? t('voiceops_failed', 'Failed')
              : t('voiceops_not_connected', 'Not connected')
          }
        />
      );
    return (
      <Chip
        size="small"
        variant="outlined"
        label={t('voiceops_ended', 'Ended')}
      />
    );
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={t('voiceops_calls', 'Calls')}
        subheader={t('voiceops_calls_subheader', 'Latest 30 conversations')}
        titleTypographyProps={{ variant: 'h4' }}
      />
      <Divider />
      {calls.length === 0 ? (
        <Box sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary">
            {t(
              'voiceops_no_calls',
              'No calls yet. Start a voice session above, or call the maintenance hotline.'
            )}
          </Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ maxHeight: 720, overflowY: 'auto' }}>
          {calls.map((call) => {
            const selected = call.id === selectedId;
            const who = call.callerName ?? call.callerNumber;
            const details = [
              formatDateTime(call.startedAt),
              languageName(call.language),
              call.workOrderId ? `WO #${call.workOrderId}` : null
            ].filter(Boolean);
            return (
              <ListItemButton
                key={call.id}
                selected={selected}
                onClick={() => onSelect(call.id)}
                sx={{
                  py: 1.5,
                  borderLeft: `4px solid ${
                    selected ? theme.palette.primary.main : 'transparent'
                  }`
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: alpha(
                        call.status === 'ACTIVE'
                          ? theme.palette.success.main
                          : theme.palette.primary.main,
                        0.12
                      ),
                      color:
                        call.status === 'ACTIVE'
                          ? theme.palette.success.main
                          : theme.palette.primary.main
                    }}
                  >
                    {sourceIcons[call.source]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="h6" component="span">
                      {sourceLabel(call, t)}
                      {who ? ` · ${who}` : ''}
                    </Typography>
                  }
                  secondary={details.join(' · ')}
                />
                <Box sx={{ ml: 1 }}>{statusChip(call)}</Box>
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Card>
  );
}
