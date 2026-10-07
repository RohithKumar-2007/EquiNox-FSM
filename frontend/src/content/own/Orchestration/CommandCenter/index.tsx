import React, { useState } from 'react';
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
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EngineeringIcon from '@mui/icons-material/Engineering';
import InventoryIcon from '@mui/icons-material/Inventory';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SpeedIcon from '@mui/icons-material/Speed';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';
import { OrchestrationStatus, RequestPriority } from 'src/orchestration/types';

export default function CommandCenter() {
  const { state, kpis, evaluateSla, triggerTechnicianDropout } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  const getStatusColor = (status: OrchestrationStatus) => {
    switch (status) {
      case 'NEW':
        return 'info';
      case 'VALIDATED':
      case 'APPROVED':
        return 'primary';
      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'secondary';
      case 'EN_ROUTE':
      case 'ON_SITE':
      case 'IN_PROGRESS':
        return 'warning';
      case 'COMPLETION_SUBMITTED':
      case 'VERIFICATION':
        return 'secondary';
      case 'COMPLETED':
        return 'success';
      case 'VALIDATION_FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityChip = (priority: RequestPriority) => {
    switch (priority) {
      case 'URGENT':
        return <Chip size="small" label="URGENT" color="error" sx={{ fontWeight: 'bold' }} />;
      case 'HIGH':
        return <Chip size="small" label="HIGH" color="warning" sx={{ fontWeight: 'bold' }} />;
      case 'MEDIUM':
        return <Chip size="small" label="MEDIUM" color="primary" />;
      default:
        return <Chip size="small" label="LOW" />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* 5-Min Demo Bar */}
      <DemoControllerBar />

      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Operations Command Center
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Industrial Equipment Orchestration Platform — Autonomous Workflow & Resource Control
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ErrorOutlineIcon />}
            onClick={() => navigate('/app/orchestration/exceptions')}
          >
            Exceptions ({state.exceptions.filter((e) => !e.resolved).length})
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => navigate('/app/orchestration/create-request')}
          >
            New Service Request
          </Button>
        </Stack>
      </Stack>

      {/* KPI Cards (Phase 20) */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ height: '100%', borderLeft: `5px solid ${theme.palette.primary.main}` }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                OPEN REQUESTS
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                {kpis.openRequests}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active in pipeline
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ height: '100%', borderLeft: `5px solid ${theme.palette.info.main}` }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                ACTIVE JOBS
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, color: theme.palette.info.main }}>
                {kpis.activeJobs}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Travel / In-Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ height: '100%', borderLeft: `5px solid ${theme.palette.warning.main}` }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                SLA AT RISK
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mt: 0.5,
                  color: kpis.slaAtRisk > 0 ? theme.palette.warning.main : 'text.primary'
                }}
              >
                {kpis.slaAtRisk}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                &lt; 25% duration left
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ height: '100%', borderLeft: `5px solid ${theme.palette.error.main}` }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                SLA BREACHED
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mt: 0.5,
                  color: kpis.slaBreached > 0 ? theme.palette.error.main : 'text.primary'
                }}
              >
                {kpis.slaBreached}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Escalations required
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ height: '100%', borderLeft: `5px solid ${theme.palette.success.main}` }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                AVAILABLE TECHS
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontWeight: 700, mt: 0.5, color: theme.palette.success.main }}
              >
                {kpis.availableTechs}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ready for dispatch
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card
            sx={{
              height: '100%',
              borderLeft: `5px solid ${kpis.lowStockParts > 0 ? theme.palette.warning.dark : theme.palette.divider
                }`
            }}
          >
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                LOW STOCK
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mt: 0.5,
                  color: kpis.lowStockParts > 0 ? theme.palette.warning.dark : 'text.primary'
                }}
              >
                {kpis.lowStockParts}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Below min threshold
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Operations Board */}
      <Grid container spacing={3}>
        {/* Active Service Requests */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AssignmentIcon color="primary" />
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Active Service Requests
                  </Typography>
                </Stack>
              }
              subheader="Complete end-to-end operational pipeline with real-time state telemetry"
            />
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Request ID</TableCell>
                    <TableCell>Machine & Site</TableCell>
                    <TableCell>Issue & Skill</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>SLA Health</TableCell>
                    <TableCell>Technician</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.requests.map((req) => {
                    const sla = evaluateSla(req);
                    return (
                      <TableRow key={req.id} hover sx={{ cursor: 'pointer' }}>
                        <TableCell
                          onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}
                          sx={{ fontWeight: 'bold' }}
                        >
                          {req.customId}
                        </TableCell>
                        <TableCell onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {req.machineCode}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {req.siteName}
                          </Typography>
                        </TableCell>
                        <TableCell onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}>
                          <Typography variant="body2">{req.title}</Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={req.requiredSkill}
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}>
                          {getPriorityChip(req.priority)}
                        </TableCell>
                        <TableCell onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}>
                          <Chip
                            size="small"
                            label={req.status.replace('_', ' ')}
                            color={getStatusColor(req.status)}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}>
                          <Tooltip title={`${sla.remainingMinutes} mins remaining`}>
                            <Box sx={{ width: 100 }}>
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
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                {sla.health === 'BREACHED'
                                  ? 'BREACHED'
                                  : `${sla.remainingMinutes}m left`}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {req.assignedTechnicianName || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate(`/app/orchestration/requests/${req.id}`)}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Real-Time Exceptions & Fleet Health */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Live Exceptions Alert Feed */}
            <Card sx={{ border: `1px solid ${theme.palette.error.light}` }}>
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <WarningIcon color="error" />
                    <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                      Live Exceptions
                    </Typography>
                  </Stack>
                }
                subheader="Active operational disruptions requiring intervention"
              />
              <Divider />
              <CardContent>
                {state.exceptions.filter((e) => !e.resolved).length === 0 ? (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      All operations normal. Zero unresolved exceptions.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {state.exceptions
                      .filter((e) => !e.resolved)
                      .map((exc) => (
                        <Paper
                          key={exc.id}
                          elevation={0}
                          sx={{
                            p: 2,
                            borderRadius: 1.5,
                            border: `1px solid ${theme.palette.error.main}`,
                            background: theme.palette.error.main + '10'
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Chip
                              size="small"
                              label={exc.type.replace('_', ' ')}
                              color="error"
                              sx={{ fontWeight: 'bold' }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {exc.detectedAt}
                            </Typography>
                          </Stack>
                          <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 600 }}>
                            {exc.machineCode} — {exc.requestTitle}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                            {exc.description}
                          </Typography>
                          <Box sx={{ mt: 1.5 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              fullWidth
                              onClick={() => navigate('/app/orchestration/exceptions')}
                            >
                              Open Recovery Desk
                            </Button>
                          </Box>
                        </Paper>
                      ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Equipment Fleet Status Summary */}
            <Card>
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <SpeedIcon color="primary" />
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      Equipment Fleet Overview
                    </Typography>
                  </Stack>
                }
                subheader="Status distribution across monitored plant sites"
              />
              <Divider />
              <CardContent>
                <Stack spacing={2}>
                  {state.machines.map((m) => (
                    <Stack
                      key={m.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {m.code} — {m.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {m.siteName}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={m.status}
                        color={
                          m.status === 'OPERATIONAL'
                            ? 'success'
                            : m.status === 'DOWN'
                              ? 'error'
                              : 'warning'
                        }
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}
