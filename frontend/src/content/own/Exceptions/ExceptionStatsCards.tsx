import { FC } from 'react';
import { Box, Card, CardContent, Grid, Typography, useTheme } from '@mui/material';
import WarningAmberTwoToneIcon from '@mui/icons-material/WarningAmberTwoTone';
import ErrorOutlineTwoToneIcon from '@mui/icons-material/ErrorOutlineTwoTone';
import CheckCircleOutlineTwoToneIcon from '@mui/icons-material/CheckCircleOutlineTwoTone';
import HandymanTwoToneIcon from '@mui/icons-material/HandymanTwoTone';
import ListAltTwoToneIcon from '@mui/icons-material/ListAltTwoTone';
import { ExceptionStats } from 'src/models/owns/workOrderException';

interface ExceptionStatsCardsProps {
  stats: ExceptionStats | null;
}

const ExceptionStatsCards: FC<ExceptionStatsCardsProps> = ({ stats }) => {
  const theme = useTheme();

  const cards = [
    {
      title: 'Total Exceptions',
      value: stats?.total ?? 0,
      icon: <ListAltTwoToneIcon fontSize="large" color="primary" />,
      color: theme.colors.primary.main,
      bg: theme.colors.primary.lighter
    },
    {
      title: 'Open Issues',
      value: stats?.open ?? 0,
      icon: <WarningAmberTwoToneIcon fontSize="large" color="warning" />,
      color: theme.colors.warning.main,
      bg: theme.colors.warning.lighter
    },
    {
      title: 'Critical Severity',
      value: stats?.critical ?? 0,
      icon: <ErrorOutlineTwoToneIcon fontSize="large" color="error" />,
      color: theme.colors.error.main,
      bg: theme.colors.error.lighter
    },
    {
      title: 'Auto-Resolved',
      value: stats?.autoResolved ?? 0,
      icon: <CheckCircleOutlineTwoToneIcon fontSize="large" color="success" />,
      color: theme.colors.success.main,
      bg: theme.colors.success.lighter
    },
    {
      title: 'Manual Intervention',
      value: stats?.manualInterventionRequired ?? 0,
      icon: <HandymanTwoToneIcon fontSize="large" sx={{ color: '#d32f2f' }} />,
      color: '#d32f2f',
      bg: '#ffebee'
    }
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card, index) => (
        <Grid item xs={12} sm={6} md={2.4} key={index}>
          <Card sx={{ height: '100%', boxShadow: theme.shadows[1] }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="textSecondary" fontWeight="bold" textTransform="uppercase">
                    {card.title}
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 0.5, color: card.color, fontWeight: 'bold' }}>
                    {card.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: card.bg
                  }}
                >
                  {card.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ExceptionStatsCards;
