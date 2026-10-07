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
  FormControlLabel,
  Grid,
  Paper,
  Slider,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SecurityIcon from '@mui/icons-material/Security';
import TuneIcon from '@mui/icons-material/Tune';
import HistoryIcon from '@mui/icons-material/History';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';
import { UserRoleType } from 'src/orchestration/types';

export default function AdminPanel() {
  const { state, setRole, resetDemoData, createRequest } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Policy Settings States
  const [warrantyCheck, setWarrantyCheck] = useState<boolean>(true);
  const [operatingHoursCheck, setOperatingHoursCheck] = useState<boolean>(true);
  const [skillMatrixCheck, setSkillMatrixCheck] = useState<boolean>(true);
  const [partLockCheck, setPartLockCheck] = useState<boolean>(true);
  const [concurrentConflictCheck, setConcurrentConflictCheck] = useState<boolean>(true);

  // Scoring Weights
  const [skillWeight, setSkillWeight] = useState<number>(40);
  const [proximityWeight, setProximityWeight] = useState<number>(30);
  const [workloadWeight, setWorkloadWeight] = useState<number>(20);
  const [ratingWeight, setRatingWeight] = useState<number>(10);

  // SLA Configuration States (Minutes)
  const [urgentSla, setUrgentSla] = useState<number>(120);
  const [highSla, setHighSla] = useState<number>(240);
  const [mediumSla, setMediumSla] = useState<number>(480);
  const [lowSla, setLowSla] = useState<number>(1440);

  // Collect all audit entries from all requests
  const allAuditLogs = state.requests.flatMap((req) =>
    req.auditTrail.map((entry) => ({
      ...entry,
      requestId: req.customId
    }))
  ).sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));

  const handleResetConfirm = () => {
    resetDemoData();
    setResetDialogOpen(false);
    setAlertMessage('System state successfully reset to initial baseline.');
  };

  const handleInjectEmergency = () => {
    const newReq = createRequest({
      machineId: 'mach-208',
      siteId: 'site-bangalore',
      title: 'Emergency Spindle Lockup & Overheating',
      description: 'CNC Milling spindle vibration exceeded safety limit (4.8 mm/s). Thermal cutoff triggered.',
      priority: 'URGENT',
      requiredSkill: 'CNC / PLC Controls',
      requiredPartId: 'part-bearing',
      requiredPartQuantity: 1,
      requiredTools: ['Bearing Puller Kit', 'Vibration Analyzer Rig'],
      contactName: 'Bangalore Plant Shift Engineer',
      contactPhone: '+91 98402 99881'
    });
    setAlertMessage(`Injected Emergency Scenario: ${newReq.customId} created at Bangalore Plant B.`);
  };

  const userRoster: { name: string; email: string; role: UserRoleType; access: string; status: string }[] = [
    {
      name: 'Suresh Narayanan',
      email: 'suresh.ops@equinox-fsm.com',
      role: 'MANAGER',
      access: 'Fleet Command, Approvals, Exceptions Desk, Verification',
      status: 'Active'
    },
    {
      name: 'Arjun Raman',
      email: 'arjun.tech@equinox-fsm.com',
      role: 'TECHNICIAN',
      access: 'Field Workspace, Dispatch Telemetry, Signoff Submission',
      status: 'On Site'
    },
    {
      name: 'Priya Sundaram',
      email: 'priya.tech@equinox-fsm.com',
      role: 'TECHNICIAN',
      access: 'Field Workspace, Dispatch Telemetry, Signoff Submission',
      status: 'Available'
    },
    {
      name: 'Vikram Mehta',
      email: 'operator@equinox-fsm.com',
      role: 'CUSTOMER',
      access: 'Plant Operator Portal, Service Intake, Progress Radar, Sign-Off',
      status: 'Active'
    },
    {
      name: 'System Admin (Superuser)',
      email: 'admin@equinox-fsm.com',
      role: 'ADMIN',
      access: 'Global Governance, Engine Tuning, Policy Matrix, Audit Logs',
      status: 'Active'
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <DemoControllerBar />

      {alertMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setAlertMessage(null)}>
          {alertMessage}
        </Alert>
      )}

      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <SecurityIcon color="primary" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                Admin Governance &amp; Orchestration Control Panel
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Configure orchestration policy engines, scoring weight vectors, SLA tiers, and monitor tamper-evident audit logs
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<PlayCircleOutlineIcon />}
            onClick={handleInjectEmergency}
          >
            Inject Emergency Scenario
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<RestartAltIcon />}
            onClick={() => setResetDialogOpen(true)}
          >
            Reset Platform Data
          </Button>
        </Stack>
      </Stack>

      {/* Navigation Tabs */}
      <Paper elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<TuneIcon />} iconPosition="start" label="Engine Policies & Rules" />
          <Tab icon={<SpeedIcon />} iconPosition="start" label="SLA Tier Matrix" />
          <Tab icon={<PeopleAltIcon />} iconPosition="start" label="User Access & Roles" />
          <Tab icon={<HistoryIcon />} iconPosition="start" label={`Audit Log Stream (${allAuditLogs.length})`} />
          <Tab icon={<CheckCircleOutlineIcon />} iconPosition="start" label="Master Fleet Telemetry" />
        </Tabs>
      </Paper>

      {/* TAB 0: ENGINE POLICIES & SCORING WEIGHTS */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* 5-Point Validation Gates */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', border: `1px solid ${theme.palette.divider}` }}>
              <CardHeader
                title="Automated 5-Point Validation Engine"
                subheader="System-enforced pre-dispatch criteria. Requests failing checks require manual override."
              />
              <Divider />
              <CardContent>
                <Stack spacing={2.5}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={warrantyCheck}
                        onChange={(e) => setWarrantyCheck(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Equipment Active Warranty / SLA Contract Check
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Verifies machine serial is active in master fleet database before scheduling dispatches.
                        </Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={operatingHoursCheck}
                        onChange={(e) => setOperatingHoursCheck(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Plant Site Operational Window &amp; Access Check
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Validates site is operational and accessible for scheduled maintenance times.
                        </Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={skillMatrixCheck}
                        onChange={(e) => setSkillMatrixCheck(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Technician Certification Matrix Matching
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Strict requirement: Only assign technicians with verified certification for required subsystem.
                        </Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={partLockCheck}
                        onChange={(e) => setPartLockCheck(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          3-Tier Spare Part Reservation Lock
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Prevents double-booking by immediately moving required parts from Available to Reserved.
                        </Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={concurrentConflictCheck}
                        onChange={(e) => setConcurrentConflictCheck(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Concurrent Dispatch Conflict Detection
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Blocks matching technicians currently engaged in active execution on another machine.
                        </Typography>
                      </Box>
                    }
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Scoring Weight Vectors */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', border: `1px solid ${theme.palette.divider}` }}>
              <CardHeader
                title="Technician Matching Scoring Vector"
                subheader="Tune the intelligent scoring algorithm weights used for automated multi-factor recommendation."
              />
              <Divider />
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Skill &amp; Certification Match Weight
                      </Typography>
                      <Chip size="small" label={`${skillWeight}%`} color="primary" />
                    </Stack>
                    <Slider
                      value={skillWeight}
                      onChange={(_, v) => setSkillWeight(v as number)}
                      min={10}
                      max={70}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Proximity &amp; Travel Distance Weight
                      </Typography>
                      <Chip size="small" label={`${proximityWeight}%`} color="info" />
                    </Stack>
                    <Slider
                      value={proximityWeight}
                      onChange={(_, v) => setProximityWeight(v as number)}
                      min={10}
                      max={60}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Workload &amp; Queue Availability Weight
                      </Typography>
                      <Chip size="small" label={`${workloadWeight}%`} color="warning" />
                    </Stack>
                    <Slider
                      value={workloadWeight}
                      onChange={(_, v) => setWorkloadWeight(v as number)}
                      min={5}
                      max={50}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Past Performance &amp; First-Time-Fix Rating
                      </Typography>
                      <Chip size="small" label={`${ratingWeight}%`} color="success" />
                    </Stack>
                    <Slider
                      value={ratingWeight}
                      onChange={(_, v) => setRatingWeight(v as number)}
                      min={5}
                      max={40}
                      valueLabelDisplay="auto"
                    />
                  </Box>

                  <Alert severity="info" sx={{ mt: 1 }}>
                    Scoring Formula: Score = ({skillWeight}% * Skill) + ({proximityWeight}% * Proximity) + ({workloadWeight}% * Workload) + ({ratingWeight}% * Rating)
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: SLA TIER MATRIX */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardHeader
                title="SLA Severity &amp; Response Resolution Windows"
                subheader="Define maximum acceptable time from request creation to completion sign-off."
              />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, border: `1px solid ${theme.palette.error.main}`, borderRadius: 2 }}>
                      <Typography variant="h4" color="error" sx={{ fontWeight: 700 }}>
                        URGENT
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Plant stoppage / Safety hazard
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        label="SLA Duration (Minutes)"
                        value={urgentSla}
                        onChange={(e) => setUrgentSla(Number(e.target.value))}
                        helperText={`${(urgentSla / 60).toFixed(1)} Hours`}
                      />
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, border: `1px solid ${theme.palette.warning.main}`, borderRadius: 2 }}>
                      <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                        HIGH
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Critical subsystem impairment
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        label="SLA Duration (Minutes)"
                        value={highSla}
                        onChange={(e) => setHighSla(Number(e.target.value))}
                        helperText={`${(highSla / 60).toFixed(1)} Hours`}
                      />
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, border: `1px solid ${theme.palette.info.main}`, borderRadius: 2 }}>
                      <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                        MEDIUM
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Performance degradation / Warning
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        label="SLA Duration (Minutes)"
                        value={mediumSla}
                        onChange={(e) => setMediumSla(Number(e.target.value))}
                        helperText={`${(mediumSla / 60).toFixed(1)} Hours`}
                      />
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        LOW
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Scheduled inspection / Minor fix
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        label="SLA Duration (Minutes)"
                        value={lowSla}
                        onChange={(e) => setLowSla(Number(e.target.value))}
                        helperText={`${(lowSla / 60).toFixed(1)} Hours`}
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 2: USER ACCESS & ROLES */}
      {activeTab === 2 && (
        <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title="User &amp; Role Access Governance Roster"
            subheader="Configured personas with RBAC permission boundaries across the orchestration pipeline."
          />
          <Divider />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>User / Persona</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email Address</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>System Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Operational Permissions</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Quick Switch</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userRoster.map((u, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.role === 'CUSTOMER' ? 'OPERATOR' : u.role}
                        color={
                          u.role === 'ADMIN'
                            ? 'secondary'
                            : u.role === 'MANAGER'
                            ? 'primary'
                            : u.role === 'TECHNICIAN'
                            ? 'info'
                            : 'success'
                        }
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{u.access}</TableCell>
                    <TableCell>
                      <Chip label={u.status} color="success" variant="outlined" size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant={state.currentRole === u.role ? 'contained' : 'outlined'}
                        onClick={() => {
                          setRole(u.role);
                          if (u.role === 'MANAGER') navigate('/app/orchestration/command-center');
                          else if (u.role === 'TECHNICIAN') navigate('/app/orchestration/technician-workspace');
                          else if (u.role === 'CUSTOMER') navigate('/app/orchestration/customer-portal');
                          else navigate('/app/orchestration/admin-panel');
                        }}
                      >
                        {state.currentRole === u.role ? 'Active' : 'Switch'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* TAB 3: AUDIT LOG STREAM */}
      {activeTab === 3 && (
        <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            title="Tamper-Evident System Audit Trail"
            subheader="Cryptographically referenced immutable event sequence across all service requests."
          />
          <Divider />
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Request ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Action Executed</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actor &amp; Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Lifecycle Transition</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Audit Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allAuditLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {log.timestamp}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{log.requestId}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{log.eventType.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${log.actorName} (${log.actorRole})`}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip size="small" label={log.fromStatus} />
                        <Typography variant="caption">→</Typography>
                        <Chip size="small" color="primary" label={log.toStatus} />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{log.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* TAB 4: MASTER FLEET TELEMETRY */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardHeader title="Equipment Fleet Catalog" />
              <Divider />
              <CardContent>
                <Stack spacing={1.5}>
                  {state.machines.map((m) => (
                    <Paper key={m.id} sx={{ p: 1.5, border: `1px solid ${theme.palette.divider}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {m.code}: {m.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {m.siteName} • Type: {m.type}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={m.status}
                          color={m.status === 'OPERATIONAL' ? 'success' : 'error'}
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardHeader title="Field Technician Roster" />
              <Divider />
              <CardContent>
                <Stack spacing={1.5}>
                  {state.technicians.map((t) => (
                    <Paper key={t.id} sx={{ p: 1.5, border: `1px solid ${theme.palette.divider}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {t.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Skills: {t.skills.map((s) => s.skillName).join(', ')} • Rating: {t.rating} / 5.0
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={t.activeStatus.replace('_', ' ')}
                          color={t.activeStatus === 'AVAILABLE' ? 'success' : 'warning'}
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardHeader title="3-Tier Spare Parts Stock" />
              <Divider />
              <CardContent>
                <Stack spacing={1.5}>
                  {state.parts.map((p) => (
                    <Paper key={p.id} sx={{ p: 1.5, border: `1px solid ${theme.palette.divider}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {p.code}: {p.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Warehouse: {p.warehouseLocation} • Min Threshold: {p.minThreshold} units
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <Chip size="small" label={`Avail: ${p.availableStock}`} color="success" />
                          <Chip size="small" label={`Res: ${p.reservedStock}`} color="warning" />
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Confirmation Dialog for Reset */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Reset Orchestration Platform?</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            This will reset all service requests, inventory reservation locks, exception records, and audit events back to the initial factory seed state.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleResetConfirm}>
            Confirm Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
