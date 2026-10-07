import React, { useState, useEffect } from 'react';
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
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import SendIcon from '@mui/icons-material/Send';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HandymanIcon from '@mui/icons-material/Handyman';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import useAuth from 'src/hooks/useAuth';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';
import { ServiceRequest } from 'src/orchestration/types';

export default function VendorWorkspace() {
  const { user } = useAuth();
  const theme = useTheme();
  const {
    state,
    vendorAcceptContract,
    vendorUpdateMilestone,
    submitCompletion,
    evaluateSla
  } = useOrchestration();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [openCompleteModal, setOpenCompleteModal] = useState<boolean>(false);
  const [contractorNotes, setContractorNotes] = useState<string>(
    'Performed OEM high-pressure rebuild using Bosch Rexroth certified kit. Flushed servo lines, re-calibrated pressure sensors to 250 Bar, and tested continuous stamping cycle.'
  );
  const [oemCertId, setOemCertId] = useState<string>('BR-L5-2026-9941');
  const [replacedPartSerial, setReplacedPartSerial] = useState<string>('REX-SERVO-88902-A');
  const [completionNotice, setCompletionNotice] = useState<string>('');

  // Strict Sandboxing: Filter work orders explicitly assigned to external contractor / vendor agency
  const vendorWorkOrders = state.requests.filter(
    (r) =>
      r.serviceType === 'EXTERNAL' ||
      r.assignedVendorAgency === 'Apex Hydraulics & OEM Automation Ltd' ||
      (r.assignedTechnicianName && r.assignedTechnicianName.includes('Apex Hydraulics'))
  );

  // Auto-select first external work order
  useEffect(() => {
    if (vendorWorkOrders.length > 0 && !selectedReqId) {
      setSelectedReqId(vendorWorkOrders[0].id);
    }
  }, [vendorWorkOrders, selectedReqId]);

  const activeWorkOrder: ServiceRequest | undefined =
    vendorWorkOrders.find((r) => r.id === selectedReqId) || vendorWorkOrders[0];

  const handleAcceptContract = (id: string) => {
    vendorAcceptContract(id);
  };

  const handleUpdateMilestone = (
    id: string,
    milestone: 'EN_ROUTE' | 'ON_SITE' | 'IN_PROGRESS'
  ) => {
    vendorUpdateMilestone(id, milestone);
  };

  const handleConfirmCompletionPackage = () => {
    if (!activeWorkOrder) return;
    submitCompletion(activeWorkOrder.id, {
      serviceReport: `[OEM CONTRACTOR COMPLETION PACKAGE - Apex Hydraulics]\nOEM Sign-Off Certificate: ${oemCertId}\nReplaced OEM Spares Serial: ${replacedPartSerial}\nReport: ${contractorNotes}`,
      workObservations: 'OEM certified calibration rig verified zero pressure decay and optimal phase stability.',
      measurements: [
        { parameter: 'Calibrated System Pressure', value: '250.0', unit: 'Bar', normalRange: '245 - 255' },
        { parameter: 'Operating Temp', value: '48.5', unit: '°C', normalRange: '45 - 65' },
        { parameter: 'Phase Imbalance', value: '0.4', unit: '%', normalRange: '< 2.0' },
        { parameter: 'OEM Rig Diagnostic Check', value: 'PASSED', unit: 'PASS/FAIL', normalRange: 'PASS' }
      ],
      partsUsed: [
        {
          partId: 'part-oem-spindle',
          partName: 'Bosch Rexroth High-Pressure Spindle Seal Kit',
          quantity: 1
        }
      ],
      toolsUsed: ['Bosch Rexroth Calibration Rig', 'Class 0 Fluke Diagnostic Probe'],
      beforePhotoUrl:
        activeWorkOrder.diagnosticSnapshot?.photos?.[0] ||
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      afterPhotoUrl:
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      technicianNotes: `Contractor sign-off completed by Apex Hydraulics. OEM Cert #${oemCertId}.`
    });
    setOpenCompleteModal(false);
    setCompletionNotice(
      `Completion package for ${activeWorkOrder.customId} submitted successfully with OEM certification #${oemCertId}.`
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <DemoControllerBar />

      {/* Contractor Header & Agency Profile */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(2, 136, 209, 0.02) 100%)'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: theme.palette.warning.main,
                  width: 58,
                  height: 58,
                  boxShadow: 2
                }}
              >
                <BusinessIcon sx={{ fontSize: 34, color: '#fff' }} />
              </Avatar>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h3" sx={{ fontWeight: 800 }}>
                    Contractor Console — Apex Hydraulics &amp; OEM Automation Ltd
                  </Typography>
                  <Chip
                    icon={<VerifiedUserIcon />}
                    label="EXTERNAL VENDOR"
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Dedicated sandboxed portal for OEM field service partners. Strictly isolated from plant machinery, internal inventory, and financial balances.
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Chip
                label="SLA Tier: Mission-Critical 120m"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label="MSA #APX-2026-904 Active"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Stack>
          </Grid>
        </Grid>

        {/* OEM Partner Credentials Bar */}
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              CONTRACTED OEM CERTIFICATIONS
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              <Chip label="Bosch Rexroth L5" size="small" color="default" />
              <Chip label="Schuler OEM Partner" size="small" color="default" />
              <Chip label="Hydac ISO-4406" size="small" color="default" />
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              CONTRACT DISPATCH CONTACT
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Marcus Vance (Lead Field Engineer) • +1 (800) 555-APEX
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              ACTIVE DISPATCH QUEUE
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
              {vendorWorkOrders.length} Contract Work Order{vendorWorkOrders.length === 1 ? '' : 's'} Assigned
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {completionNotice && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setCompletionNotice('')}>
          {completionNotice}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{ mb: 3 }}
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label={`Escalated Work Orders (${vendorWorkOrders.length})`} sx={{ fontWeight: 700 }} />
        <Tab label="Contractual SLA &amp; OEM Standards" sx={{ fontWeight: 700 }} />
      </Tabs>

      {/* TAB 0: ESCALATED WORK ORDERS & CONTEXT SNAPSHOT */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Left Column: Work Orders Selector */}
          <Grid item xs={12} md={4}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5 }}>
              Assigned Contractor Dispatches
            </Typography>

            {vendorWorkOrders.length === 0 ? (
              <Card sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Queue Empty
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  No open escalations currently assigned to Apex Hydraulics.
                </Typography>
              </Card>
            ) : (
              <Stack spacing={2}>
                {vendorWorkOrders.map((wo) => {
                  const isSelected = wo.id === activeWorkOrder?.id;
                  const sla = evaluateSla(wo);
                  return (
                    <Card
                      key={wo.id}
                      onClick={() => setSelectedReqId(wo.id)}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        borderRadius: 2,
                        border: isSelected
                          ? `2px solid ${theme.palette.warning.main}`
                          : `1px solid ${theme.palette.divider}`,
                        bgcolor: isSelected
                          ? theme.palette.action.selected
                          : 'background.paper',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          borderColor: theme.palette.warning.light
                        }
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {wo.customId}: {wo.title}
                        </Typography>
                        <Chip
                          label={wo.status.replace('_', ' ')}
                          size="small"
                          color={
                            wo.status === 'COMPLETED'
                              ? 'success'
                              : wo.status === 'IN_PROGRESS'
                              ? 'info'
                              : wo.status === 'ON_SITE'
                              ? 'warning'
                              : 'primary'
                          }
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {wo.machineCode} • {wo.siteName}
                      </Typography>
                      {wo.escalationReason && (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={`Escalation: ${wo.escalationReason}`}
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {sla.displayText}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          Select Ticket →
                        </Typography>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Grid>

          {/* Right Column: Ticket Detail & Context-Preserving Snapshot */}
          <Grid item xs={12} md={8}>
            {activeWorkOrder ? (
              <Stack spacing={3}>
                {/* 1. INTERNAL DIAGNOSTICS SNAPSHOT (TOP MANDATORY CARD) */}
                <Card
                  sx={{
                    borderRadius: 2,
                    border: `2px solid ${theme.palette.warning.main}`,
                    background: 'linear-gradient(180deg, rgba(237, 108, 2, 0.04) 0%, rgba(255, 255, 255, 0.95) 100%)'
                  }}
                >
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                        <HistoryEduIcon />
                      </Avatar>
                    }
                    title={
                      <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.warning.dark }}>
                        INTERNAL DIAGNOSTICS SNAPSHOT (PRE-ESCALATION CONTEXT)
                      </Typography>
                    }
                    subheader="Diagnostic telemetry and defect notes captured by internal plant crew immediately prior to external hand-off."
                  />
                  <Divider />
                  <CardContent>
                    <Grid container spacing={2}>
                      {/* Reason & Meta */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          REASON FOR ESCALATION
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={activeWorkOrder.escalationReason || 'Lack of Specialized Tools'}
                            color="error"
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          ESCALATED BY / TIMESTAMP
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {activeWorkOrder.diagnosticSnapshot?.escalatedBy || 'Arjun Raman (Internal Plant Crew)'} • {activeWorkOrder.diagnosticSnapshot?.escalatedAt || '09:42 AM'}
                        </Typography>
                      </Grid>

                      {/* Diagnostic Notes */}
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          INTERNAL TECHNICIAN DEFECT OBSERVATIONS
                        </Typography>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            mt: 0.5,
                            bgcolor: theme.palette.action.hover,
                            borderRadius: 1.5,
                            borderLeft: `4px solid ${theme.palette.warning.main}`
                          }}
                        >
                          <Typography variant="body2" sx={{ fontStyle: 'italic', fontWeight: 500 }}>
                            "{activeWorkOrder.diagnosticSnapshot?.notes || activeWorkOrder.description}"
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* Captured Telemetry Snapshot */}
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SpeedIcon fontSize="small" color="primary" />
                          PRESERVED SENSOR TELEMETRY READINGS
                        </Typography>
                        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                          {Object.entries(
                            activeWorkOrder.diagnosticSnapshot?.telemetry || {
                              'Working Pressure': '248.5 Bar',
                              'Operating Temp': '68.2 °C',
                              'Phase Imbalance': '14.8 %',
                              'Vibration Level': '2.8 mm/s'
                            }
                          ).map(([param, val]) => (
                            <Grid item xs={6} sm={3} key={param}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 1.5,
                                  border: `1px solid ${theme.palette.divider}`,
                                  textAlign: 'center'
                                }}
                              >
                                <Typography variant="caption" color="text.secondary">
                                  {param}
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: theme.palette.primary.main }}>
                                  {val as string}
                                </Typography>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>

                      {/* Photographic Evidence Attachment */}
                      {activeWorkOrder.diagnosticSnapshot?.photos && activeWorkOrder.diagnosticSnapshot.photos.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CameraAltIcon fontSize="small" color="primary" />
                            ON-SITE INSPECTION PHOTO (INTERNAL CREW EVIDENCE)
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {activeWorkOrder.diagnosticSnapshot.photos.map((url, idx) => (
                              <Box
                                key={idx}
                                component="img"
                                src={url}
                                alt={`Diagnostic Evidence ${idx + 1}`}
                                sx={{
                                  width: 220,
                                  height: 140,
                                  objectFit: 'cover',
                                  borderRadius: 2,
                                  border: `2px solid ${theme.palette.warning.light}`,
                                  boxShadow: 1
                                }}
                              />
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>

                {/* 2. CONTRACTUAL SLA & MILESTONE TRACKER */}
                <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <CardHeader
                    title={
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          Contractual SLA &amp; Milestone Tracker
                        </Typography>
                        <Chip
                          label={`Execution Stage: ${activeWorkOrder.status.replace('_', ' ')}`}
                          color="primary"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Stack>
                    }
                    subheader="Contract-bound response countdown and sequential vendor execution milestones."
                  />
                  <Divider />
                  <CardContent>
                    {/* SLA Progress Bar */}
                    <Box sx={{ mb: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon color="warning" />
                          Contract SLA Countdown: 120 Minutes Response Window
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.warning.dark }}>
                          78% Time Remaining (On Schedule)
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={78}
                        color="success"
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>

                    {/* SEQUENTIAL CONTRACTOR MILESTONE BUTTONS */}
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5, display: 'block' }}>
                      SEQUENTIAL CONTRACTOR ACTIONS:
                    </Typography>

                    <Grid container spacing={2}>
                      {/* 1. Accept Contract */}
                      <Grid item xs={12} sm={6} md={3}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          disabled={activeWorkOrder.status !== 'ASSIGNED'}
                          startIcon={<TaskAltIcon />}
                          onClick={() => handleAcceptContract(activeWorkOrder.id)}
                          sx={{ py: 1.5, fontWeight: 700 }}
                        >
                          [ Accept Contract ]
                        </Button>
                      </Grid>

                      {/* 2. En Route */}
                      <Grid item xs={12} sm={6} md={3}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          disabled={activeWorkOrder.status !== 'ACCEPTED'}
                          startIcon={<DirectionsCarIcon />}
                          onClick={() => handleUpdateMilestone(activeWorkOrder.id, 'EN_ROUTE')}
                          sx={{ py: 1.5, fontWeight: 700 }}
                        >
                          [ En Route ]
                        </Button>
                      </Grid>

                      {/* 3. On-Site */}
                      <Grid item xs={12} sm={6} md={3}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="warning"
                          disabled={activeWorkOrder.status !== 'EN_ROUTE'}
                          startIcon={<LocationOnIcon />}
                          onClick={() => handleUpdateMilestone(activeWorkOrder.id, 'ON_SITE')}
                          sx={{ py: 1.5, fontWeight: 700 }}
                        >
                          [ On-Site ]
                        </Button>
                      </Grid>

                      {/* 4. Submit Completion Package */}
                      <Grid item xs={12} sm={6} md={3}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="info"
                          disabled={!['ON_SITE', 'IN_PROGRESS'].includes(activeWorkOrder.status)}
                          startIcon={<SendIcon />}
                          onClick={() => setOpenCompleteModal(true)}
                          sx={{ py: 1.5, fontWeight: 700 }}
                        >
                          [ Submit Package ]
                        </Button>
                      </Grid>
                    </Grid>

                    {activeWorkOrder.status === 'COMPLETED' && (
                      <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircleIcon />}>
                        Work Order Completed and Verified. OEM Service Dossier submitted for customer warranty archive.
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* 3. Ticket Specifications & Spares Details */}
                <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                  <CardHeader title="Contract Work Order Specifications" />
                  <Divider />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          EQUIPMENT IDENTIFIER
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {activeWorkOrder.machineCode} — High-Pressure CNC Stamping &amp; Milling Cell
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          PLANT LOCATION &amp; ACCESS BAY
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {activeWorkOrder.siteName} (Bay 4-C, Heavy Stamping Wing)
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          REQUIRED OEM SPARES
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {activeWorkOrder.requiredPartName || 'OEM Specialized Replacement Kit'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          SPECIALIZED TOOLS CHECKLIST
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {activeWorkOrder.requiredTools.join(', ')}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Stack>
            ) : (
              <Card sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Select an escalated work order on the left to review its pre-escalation diagnostic snapshot.
                </Typography>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* TAB 1: CONTRACTUAL SLA & OEM STANDARDS */}
      {activeTab === 1 && (
        <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title="Contract Terms &amp; OEM Master Service Agreement (MSA)"
            subheader="Contract #APX-2026-904 between EquiNox Industrial Systems and Apex Hydraulics Ltd"
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: theme.palette.action.hover, borderRadius: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    SLA Response Commitment
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tier 1 Mission-Critical: Mandatory 120-minute on-site arrival following dispatch confirmation. Violation penalty applies at $500/hour past window.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: theme.palette.action.hover, borderRadius: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    OEM Tooling &amp; Calibration
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All repairs to high-pressure servo cylinders must utilize ISO-4406 calibrated instruments and genuine Bosch Rexroth / Schuler spares.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: theme.palette.action.hover, borderRadius: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    Digital Hand-Off Protocol
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Context-preserving diagnostic snapshots must be verified on-site. Any variance in pre-escalation sensor readings must be logged in completion dossiers.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Completion Package Modal */}
      <Dialog
        open={openCompleteModal}
        onClose={() => setOpenCompleteModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentTurnedInIcon color="success" />
          Submit Contractor Completion Package &amp; OEM Dossier
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2.5 }}>
            Submit OEM completion report, sign-off license number, and replaced serial numbers. This validates the contractual SLA and updates ticket status to <strong>COMPLETED</strong>.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contractor OEM Certification Number"
                value={oemCertId}
                onChange={(e) => setOemCertId(e.target.value)}
                helperText="Active technician OEM accreditation credential"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Replaced OEM Spares Serial Number"
                value={replacedPartSerial}
                onChange={(e) => setReplacedPartSerial(e.target.value)}
                helperText="Serial tag scanned on installed hardware component"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Contractor Completion Report &amp; Calibration Notes"
                value={contractorNotes}
                onChange={(e) => setContractorNotes(e.target.value)}
                sx={{ mb: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                CALIBRATION READINGS SUMMARY
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Chip label="Calibrated Pressure: 250.0 Bar" color="success" size="small" />
                <Chip label="Operating Temp: 48.5 °C" color="success" size="small" />
                <Chip label="Phase Imbalance: 0.4 %" color="success" size="small" />
                <Chip label="Diagnostic Check: PASSED" color="success" size="small" />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCompleteModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmCompletionPackage}
            startIcon={<CheckCircleIcon />}
          >
            Confirm &amp; Submit Completion Package
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
