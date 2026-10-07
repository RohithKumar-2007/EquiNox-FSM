import { Box, styled, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getPriorityLabel } from '../../../utils/formatters';

const LabelWrapper = styled(Box)(
  ({ theme }) => `
    font-size: ${theme.typography.pxToRem(10)};
    font-weight: bold;
    text-transform: uppercase;
    border-radius: ${theme.general.borderRadiusSm};
    padding: ${theme.spacing(0.9, 1.5, 0.7)};
    line-height: 1;
    width: fit-content;
  `
);
export default function PriorityWrapper(props: {
  priority: string | null;
  withSuffix?: boolean;
}) {
  const { priority, withSuffix } = props;
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();
  if (!priority) return null;
  const background =
    priority === 'LOW'
      ? theme.colors.info.main
      : priority === 'HIGH'
      ? theme.colors.error.main
      : theme.colors.warning.main;
  return priority === 'NONE' ? (
    <Typography>{getPriorityLabel(priority, t)}</Typography>
  ) : (
    <LabelWrapper
      sx={{
        background,
        color: theme.palette.getContrastText(background)
      }}
    >
      {t(priority)} {withSuffix ? t('priority') : null}
    </LabelWrapper>
  );
}
