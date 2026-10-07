import { alpha, Box, ButtonBase, Chip, Typography, useTheme } from '@mui/material';
import PrecisionManufacturingTwoToneIcon from '@mui/icons-material/PrecisionManufacturingTwoTone';
import AssignmentTwoToneIcon from '@mui/icons-material/AssignmentTwoTone';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AssistantRecord } from '../../models/owns/assistant';

const STATUS_COLORS: Record<
  string,
  'success' | 'error' | 'warning' | 'info' | 'primary' | 'default'
> = {
  OPERATIONAL: 'success',
  COMPLETE: 'success',
  DOWN: 'error',
  EMERGENCY_SHUTDOWN: 'error',
  OPEN: 'info',
  IN_PROGRESS: 'primary',
  ON_HOLD: 'warning',
  STANDBY: 'warning',
  MODERNIZATION: 'warning',
  INSPECTION_SCHEDULED: 'warning',
  COMMISSIONING: 'info'
};

export default function RecordCard({ record }: { record: AssistantRecord }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isAsset = record.type === 'asset';
  const Icon = isAsset ? PrecisionManufacturingTwoToneIcon : AssignmentTwoToneIcon;

  const open = () =>
    navigate(
      isAsset
        ? `/app/assets/${record.id}/details`
        : `/app/work-orders/${record.id}`
    );

  return (
    <ButtonBase
      onClick={open}
      aria-label={`${t('assistant_open_record', 'Open')} ${record.title}`}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        textAlign: 'left',
        gap: 1.25,
        p: 1.25,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        transition: theme.transitions.create(['border-color', 'box-shadow']),
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 1.5,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: 'primary.main'
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
          {record.title || (isAsset ? t('asset', 'Asset') : t('work_order', 'Work order'))}
        </Typography>
        {record.subtitle && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {record.subtitle}
          </Typography>
        )}
      </Box>
      {record.status && (
        <Chip
          size="small"
          label={t(record.status, record.status.replace(/_/g, ' ').toLowerCase())}
          color={STATUS_COLORS[record.status] ?? 'default'}
          variant="outlined"
          sx={{ flexShrink: 0, textTransform: 'capitalize' }}
        />
      )}
      <ChevronRightRoundedIcon fontSize="small" color="action" />
    </ButtonBase>
  );
}
