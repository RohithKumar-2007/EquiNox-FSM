import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import EngineeringIcon from '@mui/icons-material/Engineering';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import SendIcon from '@mui/icons-material/Send';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';
import { OrchestrationStatus } from 'src/orchestration/types';

const WORKFLOW_STEPS: OrchestrationStatus[] = [
  'NEW',
  'VALIDATED',
  'APPROVED',
  'ASSIGNED',
  'ACCEPTED',
  'EN_ROUTE',
  'ON_SITE',
  'IN_PROGRESS',
  'COMPLETION_SUBMITTED',
  'COMPLETED'
];

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    state,
    validateRequest,
    reservePart,
    approveAndAssign,
    acceptJob,
    updateTravelStatus,
    startService,
    triggerTechnicianDropout,
    reassignTechnician,
    submitCompletion,
    verifyAndComplete,
    evaluateSla
  } = useOrchestration();

  const [selectedTechId, setSelectedTechId] = useState<string>('tech-b');
  const [openCompletionModal, setOpenCompletionModal] = useState<boolean>(false);
  const [reportText, setReportText] = useState<string>(
    'Replaced damaged proportional pressure relief seal and main drive coupling on Hydraulic Pump Assembly HP-800. Flushed fluid reservoir and pressure tested to 250 Bar nominal load. No leaks detected.'
  );

  const request = state.requests.find((r) => r.id === id) || state.requests[0];
  if (!request) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h5">Request not found.</Typography>
        <Button onClick={() => navigate('/app/orchestration/command-center')}>Back</Button>
      </Container>
    );
  }

  const machine = state.machines.find((m) => m.id === request.machineId);
  const site = state.sites.find((s) => s.id === request.siteId);
  const part = state.parts.find((p) => p.id === request.requiredPartId);
  const sla = evaluateSla(request);

  // Active step index
  const activeStepIndex = WORKFLOW_STEPS.indexOf(request.status);
  const currentStep = activeStepIndex !== -1 ? activeStepIndex : 1;

  const handleApprove = () => {
    approveAndAssign(request.id, selectedTechId, 'Operations Manager');
  };

  const handleCompleteSubmission = () => {
    submitCompletion(request.id, {
      serviceReport: reportText,
      workObservations: 'Excessive heat dissipation noted at inlet valve. Pressure calibrated.',
      measurements: [
        { parameter: 'Working Pressure', value: '248.5', unit: 'Bar', normalRange: '240 - 255' },
        { parameter: 'Operating Temp', value: '54.2', unit: '°C', normalRange: '45 - 65' },
        { parameter: 'Flow Rate', value: '118.0', unit: 'L/min', normalRange: '110 - 125' },
        { parameter: 'Vibration Level', value: '1.2', unit: 'mm/s', normalRange: '< 2.5' }
      ],
      partsUsed: [{ partId: part?.id || 'part-pump', partName: part?.name || 'Hydraulic Pump', quantity: 1 }],
      toolsUsed: request.requiredTools,
      beforePhotoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      afterPhotoUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      technicianNotes: 'Load tested under full stamping cycle. Machine released for verification.'
    });
    setOpenCompletionModal(false);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 5 }}>
      <DemoControllerBar />

      {/* Top Navigation */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/orchestration/command-center')}
          variant="outlined"
          size="small"
        >
          Command Center
        </Button>
        <Typography variant="caption" color="text.secondary">
          Request ID: {request.customId}
        </Typography>
      </Stack>

      {/* Title & Metadata Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {request.customId}: {request.title}
                </Typography>
                <Chip
                  label={request.status.replace('_', ' ')}
                  color={request.status === 'COMPLETED' ? 'success' : 'primary'}
                  sx={{ fontWeight: 'bold' }}
                />
                <Chip label={request.priority} color="error" sx={{ fontWeight: 'bold' }} />
              </Stack>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                {machine?.code} ({machine?.name}) — {site?.name}
              </Typography>
            </Box>

            {/* SLA Badge */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${
                  sla.health === 'ON_TRACK'
                    ? theme.palette.success.main
                    : sla.health === 'AT_RISK'
                    ? theme.palette.warning.main
                    : theme.palette.error.main
                }`,
                background:
                  sla.health === 'ON_TRACK'
                    ? theme.palette.success.main + '10'
                    : sla.health === 'AT_RISK'
                    ? theme.palette.warning.main + '10'
                    : theme.palette.error.main + '10'
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <AccessTimeIcon
                  color={
                    sla.health === 'ON_TRACK'
                      ? 'success'
                      : sla.health === 'AT_RISK'
                      ? 'warning'
                      : 'error'
                  }
                />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {sla.displayText}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Deadline: {new Date(request.slaDeadline).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>

          {/* Stepper Pipeline */}
          <Box sx={{ width: '100%', mt: 4, mb: 1, overflowX: 'auto' }}>
            <Stepper activeStep={currentStep} alternativeLabel>
              {WORKFLOW_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label.replace('_', ' ')}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        </CardContent>
      </Card>

      {/* Main Orchestration Stages Grid */}
      <Grid container spacing={3}>
        {/* Left Column: Lifecycle Operations */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {/* STEP 2 & 3: AUTOMATED VALIDATION STAGE */}
            <Card>
              <CardHeader
                title="STAGE 1 — VALIDATE (Automated 5-Point Validation)"
                subheader="Automated integrity check verifies machine eligibility, site, skills, and spare parts before resource allocation."
                action={
                  request.status === 'NEW' ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => validateRequest(request.id)}
                      startIcon={<FactCheckIcon />}
                    >
                      Run Automated Validation
                    </Button>
                  ) : (
                    <Chip label="VALIDATED" color="success" icon={<CheckCircleIcon />} />
                  )
                }
              />
              <Divider />
              <CardContent>
                {request.validation ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Machine Registered & Eligible"
                            secondary={request.validation.machineMessage}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Site Geo-Coordinates Valid"
                            secondary={request.validation.siteMessage}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Priority & SLA Locked"
                            secondary={request.validation.slaMessage}
                          />
                        </ListItem>
                      </List>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Skill Discipline Identified"
                            secondary={request.validation.skillMessage}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CheckCircleIcon color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Spare Part Available"
                            secondary={request.validation.partMessage}
                          />
                        </ListItem>
                      </List>
                    </Grid>
                  </Grid>
                ) : (
                  <Alert severity="info">
                    Request is in NEW status. Click "Run Automated Validation" to trigger validation engine.
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* STEP 4 & 7: INTELLIGENT MATCHING & APPROVAL STAGE */}
            <Card>
              <CardHeader
                title="STAGE 2 — MATCH (Explainable Resource Allocation)"
                subheader="Multi-factor scoring algorithm evaluates skills, availability, proximity, workload, and priority suitability."
              />
              <Divider />
              <CardContent>
                {request.scoringCandidates && request.scoringCandidates.length > 0 ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Candidate Suitability Ranking &amp; Explainable Recommendations:
                    </Typography>
                    <Stack spacing={2}>
                      {request.scoringCandidates.map((cand) => (
                        <Paper
                          key={cand.technicianId}
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: `2px solid ${
                              cand.isRecommended
                                ? theme.palette.success.main
                                : theme.palette.divider
                            }`,
                            background: cand.isRecommended
                              ? theme.palette.success.main + '08'
                              : 'transparent'
                          }}
                        >
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            spacing={1}
                          >
                            <Box>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                  {cand.technicianName}
                                </Typography>
                                {cand.isRecommended && (
                                  <Chip
                                    size="small"
                                    label="RECOMMENDED"
                                    color="success"
                                    sx={{ fontWeight: 'bold' }}
                                  />
                                )}
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                Proximity: {cand.distanceKm} km | ETA: ~{cand.estimatedArrivalMins} mins
                              </Typography>
                            </Box>

                            <Stack direction="row" alignItems="center" spacing={2}>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="h3" sx={{ fontWeight: 800, color: cand.isRecommended ? 'success.main' : 'text.primary' }}>
                                  {cand.totalScore}
                                  <Typography component="span" variant="caption" color="text.secondary">
                                    /100
                                  </Typography>
                                </Typography>
                              </Box>

                              {['NEW', 'VALIDATED'].includes(request.status) && (
                                <Button
                                  variant={selectedTechId === cand.technicianId ? 'contained' : 'outlined'}
                                  color={cand.isRecommended ? 'success' : 'primary'}
                                  onClick={() => setSelectedTechId(cand.technicianId)}
                                >
                                  {selectedTechId === cand.technicianId ? 'Selected' : 'Select'}
                                </Button>
                              )}
                            </Stack>
                          </Stack>

                          {/* Explainability bullet points */}
                          <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px dashed ${theme.palette.divider}` }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                              Recommendation Rationale:
                            </Typography>
                            <Grid container spacing={1} sx={{ mt: 0.5 }}>
                              {cand.reasons.map((r, i) => (
                                <Grid item xs={12} sm={6} key={i}>
                                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
                                    ✓ {r}
                                  </Typography>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        </Paper>
                      ))}
                    </Stack>

                    {/* Manager Approval Box */}
                    {['NEW', 'VALIDATED'].includes(request.status) && (
                      <Box sx={{ mt: 3, p: 2, borderRadius: 2, background: theme.palette.primary.main + '10' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              Ready for Manager Approval &amp; Assignment
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Approving will reserve required spare parts, lock technician schedule, and dispatch alert.
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleApprove}
                            startIcon={<VerifiedUserIcon />}
                          >
                            Approve &amp; Assign Selected Technician
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Validate the request to generate technician suitability scoring and recommendations.
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* STAGE 3: EXECUTE (Technician Telemetry & Work Execution) */}
            <Card>
              <CardHeader
                title="STAGE 3 — EXECUTE (Technician Dispatch & Telemetry)"
                subheader="Granular tracking from job acceptance through travel, arrival on site, and active repair."
              />
              <Divider />
              <CardContent>
                <Stack spacing={2.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Assigned Technician:
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {request.assignedTechnicianName || 'Pending Assignment'}
                      </Typography>
                    </Box>

                    {/* Sequential Technician Action HUD */}
                    {request.status === 'ASSIGNED' && (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => acceptJob(request.id)}
                      >
                        [Technician] Accept Job
                      </Button>
                    )}

                    {request.status === 'ACCEPTED' && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => updateTravelStatus(request.id, 'EN_ROUTE')}
                      >
                        [Technician] Start Travel (En Route)
                      </Button>
                    )}

                    {request.status === 'EN_ROUTE' && (
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={() => updateTravelStatus(request.id, 'ON_SITE')}
                      >
                        [Technician] Arrived On Site
                      </Button>
                    )}

                    {request.status === 'ON_SITE' && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => startService(request.id)}
                      >
                        [Technician] Begin Service Work
                      </Button>
                    )}

                    {request.status === 'IN_PROGRESS' && (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => setOpenCompletionModal(true)}
                        startIcon={<SendIcon />}
                      >
                        [Technician] Submit Completion Dossier
                      </Button>
                    )}
                  </Stack>

                  {/* Dropout Simulation Trigger */}
                  {['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'].includes(
                    request.status
                  ) && (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        border: `1px dashed ${theme.palette.error.main}`,
                        background: theme.palette.error.main + '08'
                      }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>
                            DEMO SIMULATION: TRIGGER EXCEPTION
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Simulate technician emergency dropout to trigger automated recovery engine.
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<WarningAmberIcon />}
                          onClick={() => triggerTechnicianDropout(request.id)}
                        >
                          Simulate Technician Dropout
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* STAGE 4 & 5: VERIFICATION & COMPLETION GATE */}
            {['COMPLETION_SUBMITTED', 'COMPLETED'].includes(request.status) &&
              request.completionPackage && (
                <Card sx={{ border: `2px solid ${theme.palette.success.main}` }}>
                  <CardHeader
                    title="STAGE 5 — VERIFY (Two-Party Quality Sign-off)"
                    subheader="Review diagnostic measurements, photographic evidence, and parts consumed before restoring equipment status."
                    action={
                      request.status === 'COMPLETED' ? (
                        <Chip label="VERIFIED & CLOSED" color="success" icon={<CheckCircleIcon />} />
                      ) : (
                        <Button
                          variant="contained"
                          color="success"
                          size="large"
                          onClick={() =>
                            verifyAndComplete(request.id, 'Operations Manager')
                          }
                          startIcon={<CheckCircleIcon />}
                        >
                          Verify &amp; Restore Machine Operational
                        </Button>
                      )
                    }
                  />
                  <Divider />
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Technician Work Report:
                    </Typography>
                    <Paper elevation={0} sx={{ p: 2, background: theme.palette.action.hover, mb: 2 }}>
                      <Typography variant="body2">{request.completionPackage.serviceReport}</Typography>
                    </Paper>

                    {/* Before & After Photos */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Photographic Evidence:
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 1, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            BEFORE REPAIR
                          </Typography>
                          <Box
                            component="img"
                            src={request.completionPackage.beforePhotoUrl}
                            alt="Before"
                            sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 1, mt: 0.5 }}
                          />
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 1, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            AFTER REPAIR &amp; CLEANING
                          </Typography>
                          <Box
                            component="img"
                            src={request.completionPackage.afterPhotoUrl}
                            alt="After"
                            sx={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 1, mt: 0.5 }}
                          />
                        </Paper>
                      </Grid>
                    </Grid>

                    {/* Operating Telemetry Measurements */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Post-Service Operating Telemetry:
                    </Typography>
                    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Parameter</TableCell>
                            <TableCell>Measured Value</TableCell>
                            <TableCell>Normal Range</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {request.completionPackage.measurements.map((m, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{m.parameter}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                {m.value} {m.unit}
                              </TableCell>
                              <TableCell color="text.secondary">{m.normalRange}</TableCell>
                              <TableCell>
                                <Chip size="small" label="NORMAL" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
          </Stack>
        </Grid>

        {/* Right Column: Resources & 19-Step Audit Trail */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* 3-Tier Resource Reservation Ledger (Phase 8) */}
            <Card>
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Inventory2Icon color="primary" />
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      Resource &amp; Spare Parts
                    </Typography>
                  </Stack>
                }
                subheader="3-tier inventory state machine: Available -> Reserved -> Consumed"
              />
              <Divider />
              <CardContent>
                {part ? (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {part.name} ({part.code})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Location: {part.warehouseLocation} | Bin: {part.storageBin}
                      </Typography>
                    </Box>

                    {/* Stock Meter */}
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: 'center', background: theme.palette.action.hover }}>
                          <Typography variant="caption" color="text.secondary">
                            AVAILABLE
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                            {part.availableStock}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: 'center', background: theme.palette.action.hover }}>
                          <Typography variant="caption" color="text.secondary">
                            RESERVED
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.main' }}>
                            {part.reservedStock}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={4}>
                        <Paper elevation={0} sx={{ p: 1, textAlign: 'center', background: theme.palette.action.hover }}>
                          <Typography variant="caption" color="text.secondary">
                            CONSUMED
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                            {part.consumedStock}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    <Box sx={{ pt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Required Tools:
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                        {request.requiredTools.map((tool, idx) => (
                          <Chip key={idx} size="small" label={tool} variant="outlined" sx={{ mb: 0.5 }} />
                        ))}
                      </Stack>
                    </Box>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No replacement parts requested for this service ticket.
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* 19-STEP CHRONOLOGICAL AUDIT TRAIL (Phase 19) */}
            <Card>
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <HistoryEduIcon color="primary" />
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      19-Step Audit Trail
                    </Typography>
                  </Stack>
                }
                subheader="Chronological operational event stream with complete traceability"
              />
              <Divider />
              <CardContent sx={{ maxHeight: 520, overflowY: 'auto' }}>
                <Stack spacing={2}>
                  {request.auditTrail.map((ev, index) => (
                    <Box
                      key={ev.id}
                      sx={{
                        pl: 2,
                        borderLeft: `3px solid ${theme.palette.primary.main}`,
                        position: 'relative'
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Chip
                          size="small"
                          label={`Step ${ev.stepNumber}`}
                          color="primary"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {ev.timestamp}
                        </Typography>
                      </Stack>
                      <Typography variant="subtitle2" sx={{ mt: 0.5, fontWeight: 700 }}>
                        {ev.eventType.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Actor: {ev.actorName} ({ev.actorRole})
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                        {ev.summary}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Completion Modal */}
      <Dialog open={openCompletionModal} onClose={() => setOpenCompletionModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit Service Completion Dossier</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Record technician observations, service report, parts consumed, and operating telemetry.
          </Typography>
          <TextField
            fullWidth
            label="Service Report"
            multiline
            rows={4}
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompletionModal(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleCompleteSubmission}>
            Submit Completion Package
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
