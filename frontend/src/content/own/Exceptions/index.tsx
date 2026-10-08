import { FC, useEffect, useState } from 'react';
import {
  Box,
  Card,
  Container,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
  Tooltip,
  Paper,
  CircularProgress,
  useTheme
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import SearchTwoToneIcon from '@mui/icons-material/SearchTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import PlayArrowTwoToneIcon from '@mui/icons-material/PlayArrowTwoTone';
import WarningAmberTwoToneIcon from '@mui/icons-material/WarningAmberTwoTone';
import BuildTwoToneIcon from '@mui/icons-material/BuildTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import SpeedTwoToneIcon from '@mui/icons-material/SpeedTwoTone';
import { useDispatch, useSelector } from 'src/store';
import {
  getExceptions,
  getExceptionStats,
  runSlaScan,
  simulateTechnicianUnavailable,
  simulatePartShortage
} from 'src/slices/workOrderException';
import { WorkOrderException, ExceptionType, ExceptionStatus, ExceptionSeverity } from 'src/models/owns/workOrderException';
import ExceptionStatsCards from './ExceptionStatsCards';
import ExceptionDetailsModal from './ExceptionDetailsModal';
import { format } from 'date-fns';
import { CustomSnackBarContext } from 'src/contexts/CustomSnackBarContext';
import { useContext } from 'react';

const ExceptionsPage: FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);

  const { exceptions, stats, loading, actionLoading } = useSelector(
    (state) => state.workOrderExceptions
  );

  const [selectedException, setSelectedException] = useState<WorkOrderException | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  useEffect(() => {
    dispatch(getExceptions());
    dispatch(getExceptionStats());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(getExceptions());
    dispatch(getExceptionStats());
    showSnackBar('Exceptions list refreshed', 'info');
  };

  const handleRunScan = () => {
    dispatch(runSlaScan())
      .then(() => showSnackBar('SLA & scheduling scan complete', 'success'))
      .catch(() => showSnackBar('Scan failed', 'error'));
  };

  const handleSimulateDropout = () => {
    dispatch(simulateTechnicianUnavailable())
      .then((res: any) => {
        showSnackBar(
          `Demo: Technician dropout detected! ${res?.length || 1} Work Order(s) automatically reassigned.`,
          'success'
        );
      })
      .catch((err: any) => showSnackBar(err.message || 'Simulation failed', 'error'));
  };

  const handleSimulatePartShortage = () => {
    dispatch(simulatePartShortage())
      .then(() => showSnackBar('Demo: Part shortage exception logged!', 'warning'))
      .catch((err: any) => showSnackBar(err.message || 'Simulation failed', 'error'));
  };

  const filteredExceptions = exceptions.filter((ex) => {
    if (typeFilter !== 'ALL' && ex.exceptionType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && ex.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && ex.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ex.workOrderTitle?.toLowerCase().includes(q);
      const matchCustomId = ex.workOrderCustomId?.toLowerCase().includes(q);
      const matchDesc = ex.description?.toLowerCase().includes(q);
      const matchTech =
        ex.previousTechnician?.firstName?.toLowerCase().includes(q) ||
        ex.replacementTechnician?.firstName?.toLowerCase().includes(q);
      if (!matchTitle && !matchCustomId && !matchDesc && !matchTech) return false;
    }
    return true;
  });

  const getTypeChip = (type: ExceptionType) => {
    switch (type) {
      case 'TECH_UNAVAILABLE':
        return <Chip label="Tech Unavailable" color="error" size="small" />;
      case 'DOUBLE_BOOKING':
        return <Chip label="Double Booking" color="warning" size="small" />;
      case 'CAPACITY_CONFLICT':
        return <Chip label="Capacity Conflict" sx={{ bgcolor: '#ff9800', color: '#fff' }} size="small" />;
      case 'SLA_BREACH':
        return <Chip label="SLA Breach" color="error" variant="outlined" size="small" />;
      case 'DUE_DATE_BREACH':
        return <Chip label="Due Date Breach" color="warning" variant="outlined" size="small" />;
      case 'PART_SHORTAGE':
        return <Chip label="Part Shortage" color="info" size="small" />;
      default:
        return <Chip label={type} size="small" />;
    }
  };

  const getStatusChip = (status: ExceptionStatus) => {
    switch (status) {
      case 'RESOLVED':
        return <Chip label="Resolved" color="success" size="small" />;
      case 'MANUAL_INTERVENTION_REQUIRED':
        return <Chip label="Manual Action Needed" color="error" size="small" />;
      case 'OPEN':
      default:
        return <Chip label="Open" color="warning" size="small" />;
    }
  };

  return (
    <>
      <Helmet>
        <title>SLA & Exception Management - Equinox CMMS</title>
      </Helmet>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Page Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h2" component="h1" gutterBottom>
              SLA + Exception Engine
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              Real-time conflict detection, SLA monitoring, and automated technician reassignment
            </Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SpeedTwoToneIcon />}
              onClick={handleRunScan}
              disabled={loading || actionLoading}
            >
              Run SLA Scan
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<PlayArrowTwoToneIcon />}
              onClick={handleSimulateDropout}
              disabled={actionLoading}
            >
              Simulate Tech Dropout
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<BuildTwoToneIcon />}
              onClick={handleSimulatePartShortage}
              disabled={actionLoading}
            >
              Simulate Part Shortage
            </Button>
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshTwoToneIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Box mb={3}>
          <ExceptionStatsCards stats={stats} />
        </Box>

        {/* Filter Controls */}
        <Card sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by Work Order, Technician, Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchTwoToneIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={2.5}>
              <TextField
                select
                fullWidth
                size="small"
                label="Exception Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Types</MenuItem>
                <MenuItem value="TECH_UNAVAILABLE">Tech Unavailable</MenuItem>
                <MenuItem value="DOUBLE_BOOKING">Double Booking</MenuItem>
                <MenuItem value="CAPACITY_CONFLICT">Capacity Conflict</MenuItem>
                <MenuItem value="SLA_BREACH">SLA Breach</MenuItem>
                <MenuItem value="DUE_DATE_BREACH">Due Date Breach</MenuItem>
                <MenuItem value="PART_SHORTAGE">Part Shortage</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2.5}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="RESOLVED">Resolved</MenuItem>
                <MenuItem value="MANUAL_INTERVENTION_REQUIRED">Manual Intervention</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Severities</MenuItem>
                <MenuItem value="CRITICAL">Critical</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={1} textAlign="right">
              <Typography variant="body2" color="textSecondary">
                {filteredExceptions.length} items
              </Typography>
            </Grid>
          </Grid>
        </Card>

        {/* Exceptions Table */}
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Work Order</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Original Tech</TableCell>
                  <TableCell>Replacement Tech</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Detected At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : filteredExceptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="subtitle1" color="textSecondary">
                        No exceptions found matching filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExceptions.map((ex) => (
                    <TableRow key={ex.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          #{ex.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          #{ex.workOrderCustomId || ex.workOrderId}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {ex.workOrderTitle}
                        </Typography>
                      </TableCell>
                      <TableCell>{getTypeChip(ex.exceptionType)}</TableCell>
                      <TableCell>
                        <Chip
                          label={ex.severity}
                          size="small"
                          color={
                            ex.severity === 'CRITICAL'
                              ? 'error'
                              : ex.severity === 'HIGH'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {ex.previousTechnician
                          ? `${ex.previousTechnician.firstName} ${ex.previousTechnician.lastName}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {ex.replacementTechnician ? (
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            {`${ex.replacementTechnician.firstName} ${ex.replacementTechnician.lastName}`}
                          </Typography>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{getStatusChip(ex.status)}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {ex.detectedAt ? format(new Date(ex.detectedAt), 'MMM dd, HH:mm') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details & Actions">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedException(ex);
                              setModalOpen(true);
                            }}
                          >
                            <VisibilityTwoToneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Details & Actions Modal */}
        <ExceptionDetailsModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedException(null);
          }}
          exception={selectedException}
        />
      </Container>
    </>
  );
};

export default ExceptionsPage;
