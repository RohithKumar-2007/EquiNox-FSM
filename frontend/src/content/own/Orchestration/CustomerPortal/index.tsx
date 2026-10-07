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
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BuildIcon from '@mui/icons-material/Build';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';
import { RequestPriority } from 'src/orchestration/types';

export default function CustomerPortal() {
  const { state, createRequest, verifyAndComplete, evaluateSla } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  const [openCreateDialog, setOpenCreateDialog] = useState<boolean>(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('mach-104');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('site-chennai');
  const [title, setTitle] = useState<string>('Hydraulic Pressure Failure');
  const [description, setDescription] = useState<string>(
    'Machine is showing abnormal hydraulic pressure fluctuations and has stopped operating.'
  );
  const [priority, setPriority] = useState<RequestPriority>('URGENT');
  const [requiredSkill, setRequiredSkill] = useState<string>('Hydraulics');

  const handleCreateSubmit = () => {
    const newReq = createRequest({
      machineId: selectedMachineId,
      siteId: selectedSiteId,
      title,
      description,
      priority,
      requiredSkill,
      requiredPartId: 'part-pump',
      requiredPartQuantity: 1,
      requiredTools: ['Hydraulic Service Kit'],
      contactName: 'Operations Staff',
      contactPhone: '+91 98401 23456'
    });
    setOpenCreateDialog(false);
    navigate(`/app/orchestration/requests/${newReq.id}`);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <DemoControllerBar />

      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            Customer Self-Service &amp; Operations Portal
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Submit service requests, monitor live technician travel ETA, and verify completed maintenance
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => setOpenCreateDialog(true)}
        >
          Submit New Service Request
        </Button>
      </Stack>

      {/* Active Service Requests */}
      <Grid container spacing={3}>
        {state.requests.map((req) => {
          const sla = evaluateSla(req);
          const machine = state.machines.find((m) => m.id === req.machineId);

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
                        label={req.status.replace('_', ' ')}
                        color={req.status === 'COMPLETED' ? 'success' : 'primary'}
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

                    {/* Live Tracker Box */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.primary.main}`,
                        background: theme.palette.primary.main + '08'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block' }}>
                        LIVE SERVICE RADAR
                      </Typography>

                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Technician: {req.assignedTechnicianName || 'Evaluating Best Candidate...'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Status: {req.status}
                          </Typography>
                        </Box>
                        {req.assignedTechnicianName && (
                          <Chip
                            size="small"
                            icon={<AccessTimeIcon />}
                            label={req.status === 'EN_ROUTE' ? 'ETA: ~18 mins' : 'On Site'}
                            color="info"
                          />
                        )}
                      </Stack>
                    </Paper>

                    {/* Completion Verification Screen for Customer (Phase 18) */}
                    {req.status === 'COMPLETION_SUBMITTED' && req.completionPackage && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: `2px solid ${theme.palette.success.main}`,
                          background: theme.palette.success.main + '08'
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main' }}>
                          Service Completed — Verification Required
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Technician has uploaded service report and photographic evidence. Please inspect and approve.
                        </Typography>

                        <Button
                          variant="contained"
                          color="success"
                          fullWidth
                          sx={{ mt: 2, fontWeight: 700 }}
                          startIcon={<CheckCircleIcon />}
                          onClick={() => verifyAndComplete(req.id, 'Plant Supervisor (Customer)')}
                        >
                          [ APPROVE COMPLETION &amp; RESTORE MACHINE ]
                        </Button>
                      </Paper>
                    )}

                    <Box sx={{ pt: 1, textAlign: 'right' }}>
                      <Button
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}
                      >
                        View Full 19-Step Orchestration Details
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Creation Dialog (Phase 5) */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Submit Industrial Service Request</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <FormControl fullWidth>
              <InputLabel>Target Machine</InputLabel>
              <Select
                value={selectedMachineId}
                label="Target Machine"
                onChange={(e) => setSelectedMachineId(e.target.value)}
              >
                {state.machines.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.code} — {m.name} ({m.siteName})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Site Location</InputLabel>
              <Select
                value={selectedSiteId}
                label="Site Location"
                onChange={(e) => setSelectedSiteId(e.target.value)}
              >
                {state.sites.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Issue Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Priority Tier</InputLabel>
              <Select
                value={priority}
                label="Priority Tier"
                onChange={(e) => setPriority(e.target.value as RequestPriority)}
              >
                <MenuItem value="URGENT">URGENT (60m SLA)</MenuItem>
                <MenuItem value="HIGH">HIGH (4h SLA)</MenuItem>
                <MenuItem value="MEDIUM">MEDIUM (24h SLA)</MenuItem>
                <MenuItem value="LOW">LOW (72h SLA)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Required Technical Skill</InputLabel>
              <Select
                value={requiredSkill}
                label="Required Technical Skill"
                onChange={(e) => setRequiredSkill(e.target.value)}
              >
                {state.skills.map((s) => (
                  <MenuItem key={s.id} value={s.name}>
                    {s.name} ({s.category})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Problem Description"
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleCreateSubmit}>
            Submit Service Request
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
