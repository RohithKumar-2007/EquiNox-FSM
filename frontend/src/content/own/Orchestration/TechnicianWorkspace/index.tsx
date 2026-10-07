import React, { useState } from 'react';
import {
  Alert,
  Avatar,
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
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import BuildIcon from '@mui/icons-material/Build';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import LanOutlinedIcon from '@mui/icons-material/LanOutlined';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';

export default function TechnicianWorkspace() {
  const {
    state,
    acceptJob,
    updateTravelStatus,
    startService,
    triggerTechnicianDropout,
    submitCompletion,
    evaluateSla,
    escalateToVendor
  } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [openCompleteModal, setOpenCompleteModal] = useState<boolean>(false);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [workNotes, setWorkNotes] = useState<string>(
    'Replaced hydraulic pump seal assembly HP-800. Flushed line and pressure tested to 250 Bar.'
  );

  // Escalation to External Vendor State
  const [openEscalateModal, setOpenEscalateModal] = useState<boolean>(false);
  const [escalateReqId, setEscalateReqId] = useState<string>('');
  const [escalateReason, setEscalateReason] = useState<string>('Lack of Specialized Tools');
  const [diagnosticNotes, setDiagnosticNotes] = useState<string>(
    'High-pressure hydraulic seal failure detected under 240 Bar pressure test. Plant crew lacks OEM calibration rig and Bosch Rexroth proprietary diagnostic probes.'
  );
  const [targetAgency, setTargetAgency] = useState<string>('Apex Hydraulics & OEM Automation Ltd');
  const [telemetryPressure, setTelemetryPressure] = useState<string>('248.5 Bar');
  const [telemetryTemp, setTelemetryTemp] = useState<string>('68.2 °C');
  const [telemetryVibration, setTelemetryVibration] = useState<string>('2.8 mm/s');
  const [photoUrl, setPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
  );
  const [isSubmittingEscalation, setIsSubmittingEscalation] = useState<boolean>(false);
  const [escalationFeedback, setEscalationFeedback] = useState<string>('');

  const handleOpenEscalate = (reqId: string) => {
    setEscalateReqId(reqId);
    setOpenEscalateModal(true);
  };

  const handleConfirmEscalation = async () => {
    if (!escalateReqId) return;
    setIsSubmittingEscalation(true);
    try {
      const payload = {
        reason: escalateReason,
        notes: diagnosticNotes,
        telemetry: {
          'Working Pressure': telemetryPressure,
          'Operating Temp': telemetryTemp,
          'Vibration Level': telemetryVibration,
          'Fault Code': 'E-HYD-77'
        },
        photos: [photoUrl],
        targetAgency
      };

      escalateToVendor(escalateReqId, payload);

      try {
        await fetch(`/api/orchestration/work-orders/${escalateReqId}/escalate-to-vendor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
          },
          body: JSON.stringify({
            reason: escalateReason,
            diagnosticNotes: diagnosticNotes,
            telemetryData: payload.telemetry,
            photoUrls: payload.photos,
            targetVendorAgency: targetAgency
          })
        });
      } catch (apiErr) {
        console.warn('API notification fallback:', apiErr);
      }

      setEscalationFeedback(
        `Ticket successfully escalated to external vendor (${targetAgency}). Context preserved and pushed to Exceptions Desk queue.`
      );
      setOpenEscalateModal(false);
    } finally {
      setIsSubmittingEscalation(false);
    }
  };

  // Active technician profile
  const techProfile = state.technicians.find((t) => t.id === 'tech-b') || state.technicians[0];

  // Filter requests assigned to this tech or in progress
  const myAssignments = state.requests.filter((r) =>
    ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'].includes(r.status)
  );

  const handleOpenComplete = (reqId: string) => {
    setSelectedReqId(reqId);
    setOpenCompleteModal(true);
  };

  const handleConfirmCompletion = () => {
    if (!selectedReqId) return;
    submitCompletion(selectedReqId, {
      serviceReport: workNotes,
      workObservations: 'Tested under stamping load. Pressure output stable at 248.5 Bar.',
      measurements: [
        { parameter: 'Working Pressure', value: '248.5', unit: 'Bar', normalRange: '240 - 255' },
        { parameter: 'Operating Temp', value: '54.2', unit: '°C', normalRange: '45 - 65' },
        { parameter: 'Flow Rate', value: '118.0', unit: 'L/min', normalRange: '110 - 125' },
        { parameter: 'Vibration Level', value: '1.2', unit: 'mm/s', normalRange: '< 2.5' }
      ],
      partsUsed: [{ partId: 'part-pump', partName: 'Hydraulic Pump Assembly 250 Bar', quantity: 1 }],
      toolsUsed: ['Hydraulic Service Kit', 'Digital Pressure Gauge Rig'],
      beforePhotoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      afterPhotoUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      technicianNotes: 'All checks passed.'
    });
    setOpenCompleteModal(false);
    navigate(`/app/orchestration/requests/${selectedReqId}`);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <DemoControllerBar />

      {escalationFeedback && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setEscalationFeedback('')}>
          {escalationFeedback}
        </Alert>
      )}

      {/* Header & Technician Badge */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          background: theme.palette.mode === 'dark' ? '#1c222b' : '#f8fafd'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: theme.palette.primary.main,
                  width: 56,
                  height: 56,
                  fontSize: 24,
                  fontWeight: 'bold'
                }}
              >
                AR
              </Avatar>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {techProfile ? techProfile.name : 'Arjun Raman'}
                  </Typography>
                  <Chip
                    size="small"
                    label="Certified Specialist"
                    color="primary"
                    sx={{ fontWeight: 'bold' }}
                  />
                  <Chip
                    size="small"
                    label={techProfile ? techProfile.activeStatus.replace('_', ' ') : 'ON SITE'}
                    color={techProfile?.activeStatus === 'AVAILABLE' ? 'success' : 'info'}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Certifications: {techProfile?.skills?.map((s) => s.skillName).join(', ') || 'Hydraulics, Mechanical Systems'}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            >
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  CURRENT BASE LOCATION
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={{ sm: 'flex-end' }}>
                  <LocationOnIcon fontSize="small" color="primary" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Chennai Industrial Corridor (Plant A)
                  </Typography>
                </Stack>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

              <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  PERFORMANCE RATING
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {techProfile?.rating || 4.9} / 5.0 ★
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={<EngineeringIcon />}
            iconPosition="start"
            label={`Active Dispatches & Tasks (${myAssignments.length})`}
          />
          <Tab
            icon={<AssignmentIcon />}
            iconPosition="start"
            label={`All Operations Pipeline (${state.requests.length})`}
          />
        </Tabs>
      </Paper>

      {/* TAB 0: ACTIVE DISPATCHES */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {myAssignments.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ p: 5, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 1.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  No Active Dispatches Right Now
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 600, mx: 'auto' }}>
                  You are currently available for new field dispatches. You can check the operations pipeline or review plant equipment requests.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 3 }}
                  onClick={() => setActiveTab(1)}
                  startIcon={<AssignmentIcon />}
                >
                  View Operations Pipeline
                </Button>
              </Card>
            </Grid>
          ) : (
            myAssignments.map((req) => {
              const sla = evaluateSla(req);
              return (
                <Grid item xs={12} md={6} key={req.id}>
                  <Card sx={{ height: '100%', border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column' }}>
                    <CardHeader
                      title={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            {req.customId}: {req.title}
                          </Typography>
                          <Chip
                            label={req.priority}
                            color={req.priority === 'URGENT' ? 'error' : 'warning'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Stack>
                      }
                      subheader={`${req.machineCode} — ${req.siteName}`}
                    />
                    <Divider />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack spacing={2}>
                        <Typography variant="body2" color="text.secondary">
                          {req.description}
                        </Typography>

                        {/* SLA health display */}
                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: 1.5,
                            background: theme.palette.action.hover,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <AccessTimeIcon color="primary" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {sla.displayText}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            SLA Window: {req.slaDurationMinutes}m
                          </Typography>
                        </Paper>

                        {/* Required Parts and Tools */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Reserved Spare Parts &amp; Tooling:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {req.requiredPartName || 'None'} ({req.requiredPartQuantity}x) • {req.requiredTools.join(', ')}
                          </Typography>
                        </Box>

                        {/* Current Status Badge */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Current Execution Phase:
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={req.status.replace('_', ' ')}
                              color="primary"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>
                        </Box>

                        {/* SEQUENTIAL ACTION HUD */}
                        <Box sx={{ pt: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
                            Sequential Telemetry Dispatch Actions:
                          </Typography>

                          <Stack spacing={1}>
                            {req.status === 'ASSIGNED' && (
                              <Stack direction="row" spacing={1}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  fullWidth
                                  onClick={() => acceptJob(req.id)}
                                >
                                  [ ACCEPT DISPATCH ]
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  onClick={() => triggerTechnicianDropout(req.id)}
                                >
                                  [ DECLINE ]
                                </Button>
                              </Stack>
                            )}

                            {req.status === 'ACCEPTED' && (
                              <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                onClick={() => updateTravelStatus(req.id, 'EN_ROUTE')}
                              >
                                [ EN ROUTE — START TRAVEL ]
                              </Button>
                            )}

                            {req.status === 'EN_ROUTE' && (
                              <Button
                                variant="contained"
                                color="warning"
                                fullWidth
                                onClick={() => updateTravelStatus(req.id, 'ON_SITE')}
                              >
                                [ ON SITE — ARRIVED AT PLANT ]
                              </Button>
                            )}

                            {req.status === 'ON_SITE' && (
                              <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                onClick={() => startService(req.id)}
                              >
                                [ START WORK — CONNECT TELEMETRY ]
                              </Button>
                            )}

                            {req.status === 'IN_PROGRESS' && (
                              <Button
                                variant="contained"
                                color="success"
                                fullWidth
                                startIcon={<SendIcon />}
                                onClick={() => handleOpenComplete(req.id)}
                              >
                                [ COMPLETE JOB &amp; SUBMIT DOSSIER ]
                              </Button>
                            )}

                            {/* Context-Preserving Hand-off to Contractor */}
                            {['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'].includes(req.status) && (
                              <Button
                                variant="outlined"
                                color="warning"
                                fullWidth
                                sx={{
                                  fontWeight: 700,
                                  borderWidth: 2,
                                  borderStyle: 'dashed',
                                  '&:hover': { borderWidth: 2, borderStyle: 'solid' }
                                }}
                                startIcon={<BusinessIcon />}
                                onClick={() => handleOpenEscalate(req.id)}
                              >
                                [ Escalate to External Vendor ]
                              </Button>
                            )}
                          </Stack>
                        </Box>

                        {/* Dropout / Reassignment Report Button */}
                        {['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'].includes(req.status) && (
                          <Box sx={{ pt: 0.5 }}>
                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              fullWidth
                              startIcon={<WarningAmberIcon />}
                              onClick={() => triggerTechnicianDropout(req.id)}
                            >
                              Report Field Delay / Emergency Reassignment
                            </Button>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })
          )}
        </Grid>
      )}

      {/* TAB 1: ALL OPERATIONS PIPELINE */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {state.requests.map((req) => (
            <Grid item xs={12} md={6} key={req.id}>
              <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
                <CardHeader
                  title={
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {req.customId}: {req.title}
                      </Typography>
                      <Chip
                        label={req.status.replace('_', ' ')}
                        color={
                          req.status === 'COMPLETED'
                            ? 'success'
                            : req.status === 'IN_PROGRESS'
                            ? 'info'
                            : req.status === 'NEW'
                            ? 'warning'
                            : 'primary'
                        }
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Stack>
                  }
                  subheader={`${req.machineCode} • ${req.siteName} • Priority: ${req.priority}`}
                />
                <Divider />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {req.description}
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}
                    >
                      View 19-Step Lifecycle
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Completion Modal */}
      <Dialog open={openCompleteModal} onClose={() => setOpenCompleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Service Completion &amp; Evidence</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirm replacement parts, enter technician service notes, and submit evidence package to manager verification gate.
          </Typography>
          <TextField
            fullWidth
            label="Service Report Summary"
            multiline
            rows={4}
            value={workNotes}
            onChange={(e) => setWorkNotes(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Alert severity="info" icon={<AddPhotoAlternateIcon />}>
            High-resolution Before &amp; After diagnostic photos attached from mobile inspection camera.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompleteModal(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleConfirmCompletion}>
            Submit to Verification Gate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Escalate to External Vendor Modal */}
      <Dialog
        open={openEscalateModal}
        onClose={() => !isSubmittingEscalation && setOpenEscalateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="warning" />
          Escalate to External Vendor — Context-Preserving Hand-off
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2.5 }}>
            Escalating ticket <strong>{escalateReqId}</strong> will change service type to <strong>EXTERNAL</strong>, capture your current diagnostic telemetry into an immutable snapshot, and push the ticket into the <strong>Exceptions Desk</strong> for external vendor assignment.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 1 }}>
                <InputLabel id="escalate-reason-label">Escalation Rationale / Reason</InputLabel>
                <Select
                  labelId="escalate-reason-label"
                  label="Escalation Rationale / Reason"
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                >
                  <MenuItem value="Lack of Specialized Tools">Lack of Specialized Tools</MenuItem>
                  <MenuItem value="Active OEM Warranty">Active OEM Warranty</MenuItem>
                  <MenuItem value="Beyond Skill Scope">Beyond Skill Scope</MenuItem>
                  <MenuItem value="Proprietary Calibration Rig Required">Proprietary Calibration Rig Required</MenuItem>
                  <MenuItem value="High-Voltage / Hazardous System Certification Required">High-Voltage / Hazardous System Certification Required</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 1 }}>
                <InputLabel id="target-vendor-agency-label">Target External Contractor / OEM Agency</InputLabel>
                <Select
                  labelId="target-vendor-agency-label"
                  label="Target External Contractor / OEM Agency"
                  value={targetAgency}
                  onChange={(e) => setTargetAgency(e.target.value)}
                >
                  <MenuItem value="Apex Hydraulics & OEM Automation Ltd">
                    Apex Hydraulics & OEM Automation Ltd (Tier 1 SLA)
                  </MenuItem>
                  <MenuItem value="Schuler Press Engineering Services">
                    Schuler Press Engineering Services (OEM Direct)
                  </MenuItem>
                  <MenuItem value="Siemens Industrial Drives & Automation">
                    Siemens Industrial Drives & Automation
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Technician Diagnostic Observations & Defect Notes"
                value={diagnosticNotes}
                onChange={(e) => setDiagnosticNotes(e.target.value)}
                helperText="Preserved in the context snapshot so the contractor does not need to re-diagnose."
                sx={{ mb: 1 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon fontSize="small" color="primary" />
                Live Diagnostic Telemetry Snapshot:
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Working Pressure"
                value={telemetryPressure}
                onChange={(e) => setTelemetryPressure(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Operating Temp"
                value={telemetryTemp}
                onChange={(e) => setTelemetryTemp(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Vibration Level"
                value={telemetryVibration}
                onChange={(e) => setTelemetryVibration(e.target.value)}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CameraAltIcon fontSize="small" color="primary" />
                On-Site Photographic Evidence (URL / Camera Link):
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Photo Evidence URL"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              {photoUrl && (
                <Box
                  component="img"
                  src={photoUrl}
                  alt="Diagnostic Snapshot"
                  sx={{
                    width: '100%',
                    maxHeight: 180,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid #ccc'
                  }}
                />
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEscalateModal(false)} disabled={isSubmittingEscalation}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmEscalation}
            disabled={isSubmittingEscalation}
            startIcon={<LanOutlinedIcon />}
          >
            {isSubmittingEscalation ? 'Packaging Snapshot...' : 'Confirm Escalation & Route to Exceptions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
