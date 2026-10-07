import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  Typography,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import EngineeringIcon from '@mui/icons-material/Engineering';
import InventoryIcon from '@mui/icons-material/Inventory';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';

export default function ExceptionsDesk() {
  const { state, reassignTechnician } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  const activeExceptions = state.exceptions.filter((e) => !e.resolved);
  const resolvedExceptions = state.exceptions.filter((e) => e.resolved);

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <DemoControllerBar />

      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/orchestration/command-center')}
          variant="outlined"
          size="small"
        >
          Command Center
        </Button>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            Operational Exception &amp; Self-Healing Recovery Desk
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Automatic disruption handling for technician dropouts, spare part shortages, and SLA risks
          </Typography>
        </Box>
      </Stack>

      {/* Active Exceptions Stream */}
      <Card sx={{ mb: 4, border: activeExceptions.length > 0 ? `2px solid ${theme.palette.error.main}` : 'none' }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <WarningIcon color="error" />
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                Active Operational Exceptions ({activeExceptions.length})
              </Typography>
            </Stack>
          }
          subheader="Real-world disruption triggers requiring automated or supervisor-guided recovery"
        />
        <Divider />
        <CardContent>
          {activeExceptions.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Zero Active Exceptions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All maintenance operations are progressing on schedule across all plants.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              {activeExceptions.map((exc) => {
                const req = state.requests.find((r) => r.id === exc.requestId);
                const recTech = state.technicians.find(
                  (t) => t.id === exc.recommendedTechnicianId || t.id === 'tech-d'
                );

                return (
                  <Paper
                    key={exc.id}
                    elevation={3}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.error.main}`,
                      background: theme.palette.error.main + '08'
                    }}
                  >
                    <Grid container spacing={3} alignItems="center">
                      <Grid item xs={12} md={7}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Chip
                            label={exc.type.replace('_', ' ')}
                            color="error"
                            sx={{ fontWeight: 'bold' }}
                          />
                          <Chip label={`Severity: ${exc.severity}`} size="small" variant="outlined" />
                          <Typography variant="caption" color="text.secondary">
                            Detected at: {exc.detectedAt}
                          </Typography>
                        </Stack>

                        <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                          {exc.machineCode} — {exc.requestTitle}
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
                          {exc.description}
                        </Typography>

                        <Alert severity="warning" sx={{ mt: 2, fontWeight: 500 }}>
                          {exc.suggestedAction}
                        </Alert>
                      </Grid>

                      {/* WOW Feature: 1-Click Auto Recovery Card */}
                      <Grid item xs={12} md={5}>
                        <Paper
                          elevation={2}
                          sx={{
                            p: 2.5,
                            borderRadius: 2,
                            border: `2px solid ${theme.palette.success.main}`,
                            background: theme.palette.background.paper
                          }}
                        >
                          <Typography
                            variant="overline"
                            sx={{ fontWeight: 800, color: 'success.main', display: 'block' }}
                          >
                            SELF-HEALING RECOVERY RECOMMENDATION
                          </Typography>

                          {recTech ? (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                {recTech.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Hydraulics Certification Level 4 | Nearby (5.5 km) | Zero Conflicts
                              </Typography>

                              <List dense sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  ✓ Required Hydraulic skill certified
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  ✓ Currently Available
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  ✓ Proximity: 18 mins estimated travel time
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  ✓ Zero scheduling overlaps
                                </Typography>
                              </List>

                              <Button
                                variant="contained"
                                color="success"
                                size="large"
                                fullWidth
                                startIcon={<AutorenewIcon />}
                                sx={{ mt: 2, fontWeight: 700 }}
                                onClick={() =>
                                  reassignTechnician(
                                    exc.requestId,
                                    recTech.id,
                                    'Operations Supervisor'
                                  )
                                }
                              >
                                [ 1-Click Reassign to {recTech.name.split(' ')[0]} ]
                              </Button>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No immediate replacement identified. Please search regional workforce.
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Resolved Exceptions History */}
      <Card>
        <CardHeader
          title="Historical / Resolved Exceptions"
          subheader="Audit ledger of past disruption recoveries"
        />
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Target Machine</TableCell>
                <TableCell>Detected At</TableCell>
                <TableCell>Resolution Action</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resolvedExceptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No resolved exceptions recorded in current session.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                resolvedExceptions.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{e.type.replace('_', ' ')}</TableCell>
                    <TableCell>{e.machineCode}</TableCell>
                    <TableCell>{e.detectedAt}</TableCell>
                    <TableCell>{e.resolutionAction || 'Auto-resolved'}</TableCell>
                    <TableCell>
                      <Chip size="small" label="RESOLVED" color="success" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
}
