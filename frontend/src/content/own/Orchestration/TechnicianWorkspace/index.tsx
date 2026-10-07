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
  Paper,
  Stack,
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
    evaluateSla
  } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  const [openCompleteModal, setOpenCompleteModal] = useState<boolean>(false);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [workNotes, setWorkNotes] = useState<string>(
    'Replaced hydraulic pump seal assembly HP-800. Flushed line and pressure tested to 250 Bar.'
  );

  // Filter requests that are assigned, in travel, or in progress
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

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          Technician Execution Workspace
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Active field assignments, sequential dispatch HUD, parts logging, and telemetry reporting
        </Typography>
      </Box>

      {/* Assignments list */}
      <Grid container spacing={3}>
        {myAssignments.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 50, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                No Pending Assignments
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                You are currently free and available for new dispatch requests.
              </Typography>
            </Card>
          </Grid>
        ) : (
          myAssignments.map((req) => {
            const sla = evaluateSla(req);
            return (
              <Grid item xs={12} md={6} key={req.id}>
                <Card sx={{ height: '100%', border: `1px solid ${theme.palette.divider}` }}>
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
                  <CardContent>
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
                          Reserved Spare Parts:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {req.requiredPartName || 'None'} ({req.requiredPartQuantity}x)
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
                          Telemetry Dispatch Actions:
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
                                [ ACCEPT JOB ]
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
                            <Stack direction="row" spacing={1}>
                              <Button
                                variant="contained"
                                color="success"
                                fullWidth
                                startIcon={<SendIcon />}
                                onClick={() => handleOpenComplete(req.id)}
                              >
                                [ COMPLETE JOB &amp; SUBMIT ]
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      </Box>

                      {/* Dropout Simulation Button */}
                      {['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'].includes(
                        req.status
                      ) && (
                        <Box sx={{ pt: 1 }}>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            fullWidth
                            startIcon={<WarningAmberIcon />}
                            onClick={() => triggerTechnicianDropout(req.id)}
                          >
                            Simulate Emergency Dropout (Triggers WOW Recovery)
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
    </Container>
  );
}
