import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';

export default function ControlHub() {
  const { state, evaluateSla } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  // Pending approval requests
  const pendingApprovals = state.requests.filter((r) =>
    ['NEW', 'VALIDATED', 'PENDING_APPROVAL'].includes(r.status)
  );

  // All audit events aggregated
  const allAuditEvents = state.requests
    .flatMap((r) => r.auditTrail || [])
    .slice(0, 30);

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <DemoControllerBar />

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
            Operational Control &amp; SLA Center
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Continuous SLA tracking, pending supervisor approval queues, and end-to-end audit logging
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3}>
        {/* Real-time SLA Monitoring Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AccessTimeIcon color="primary" />
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Real-Time SLA Monitor
                  </Typography>
                </Stack>
              }
              subheader="Active target countdowns and warning thresholds"
            />
            <Divider />
            <CardContent>
              <Stack spacing={2.5}>
                {state.requests.map((req) => {
                  const sla = evaluateSla(req);
                  return (
                    <Paper
                      key={req.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 1.5,
                        border: `1px solid ${theme.palette.divider}`,
                        background: theme.palette.action.hover
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {req.customId}: {req.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Priority: {req.priority} ({req.slaDurationMinutes}m SLA)
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={sla.health.replace('_', ' ')}
                          color={
                            sla.health === 'ON_TRACK'
                              ? 'success'
                              : sla.health === 'AT_RISK'
                              ? 'warning'
                              : 'error'
                          }
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Stack>

                      <Box sx={{ mt: 1.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={sla.percentageRemaining}
                          color={
                            sla.health === 'ON_TRACK'
                              ? 'success'
                              : sla.health === 'AT_RISK'
                              ? 'warning'
                              : 'error'
                          }
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {sla.displayText}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Deadline: {new Date(req.slaDeadline).toLocaleTimeString()}
                          </Typography>
                        </Stack>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Manager Pending Approvals Queue */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <VerifiedUserIcon color="primary" />
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Pending Approvals Queue ({pendingApprovals.length})
                  </Typography>
                </Stack>
              }
              subheader="Validated requests awaiting manager approval and technician assignment"
            />
            <Divider />
            <CardContent>
              {pendingApprovals.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No service requests pending approval.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {pendingApprovals.map((req) => (
                    <Paper
                      key={req.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 1.5,
                        border: `1px solid ${theme.palette.divider}`,
                        background: theme.palette.action.hover
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {req.customId}: {req.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {req.machineCode} — {req.siteName} | Priority: {req.priority}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          endIcon={<ArrowForwardIcon />}
                          onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}
                        >
                          Review &amp; Approve
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Chronological Audit Timeline */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <HistoryEduIcon color="primary" />
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Global 19-Step Audit Event Stream
                  </Typography>
                </Stack>
              }
              subheader="System-wide immutable traceability ledger"
            />
            <Divider />
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Step</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Transition</TableCell>
                    <TableCell>Summary</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allAuditEvents.map((ev) => (
                    <TableRow key={ev.id} hover>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{ev.timestamp}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={`Step ${ev.stepNumber}`}
                          color="primary"
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{ev.eventType.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{ev.actorName} ({ev.actorRole})</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {ev.fromStatus} → {ev.toStatus}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{ev.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
