import { FC, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Grid,
  Divider,
  TextField,
  MenuItem,
  CircularProgress,
  useTheme
} from '@mui/material';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import AutorenewTwoToneIcon from '@mui/icons-material/AutorenewTwoTone';
import AssignmentIndTwoToneIcon from '@mui/icons-material/AssignmentIndTwoTone';
import LaunchTwoToneIcon from '@mui/icons-material/LaunchTwoTone';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'src/store';
import { WorkOrderException } from 'src/models/owns/workOrderException';
import {
  resolveException,
  manualReassignException,
  retryAutoReassign
} from 'src/slices/workOrderException';
import { format } from 'date-fns';

interface ExceptionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  exception: WorkOrderException | null;
}

const ExceptionDetailsModal: FC<ExceptionDetailsModalProps> = ({ open, onClose, exception }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { usersMini } = useSelector((state) => state.users);
  const { actionLoading } = useSelector((state) => state.workOrderExceptions);

  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showReassignForm, setShowReassignForm] = useState(false);

  if (!exception) return null;

  const handleResolve = () => {
    dispatch(resolveException(exception.id, resolutionNotes || 'Resolved manually by supervisor.'))
      .then(() => {
        setShowResolveForm(false);
        setResolutionNotes('');
        onClose();
      })
      .catch((err) => console.error(err));
  };

  const handleManualReassign = () => {
    if (!selectedTechId) return;
    dispatch(
      manualReassignException(
        exception.id,
        Number(selectedTechId),
        resolutionNotes || 'Manually reassigned'
      )
    )
      .then(() => {
        setShowReassignForm(false);
        setSelectedTechId('');
        onClose();
      })
      .catch((err) => console.error(err));
  };

  const handleRetry = () => {
    dispatch(retryAutoReassign(exception.id))
      .then(() => onClose())
      .catch((err) => console.error(err));
  };

  const handleViewWorkOrder = () => {
    onClose();
    navigate(`/app/work-orders/${exception.workOrderId}`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4">
            Exception #{exception.id} — {exception.exceptionType.replace('_', ' ')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Work Order #{exception.workOrderCustomId || exception.workOrderId}: {exception.workOrderTitle}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Chip
            label={exception.severity}
            color={
              exception.severity === 'CRITICAL'
                ? 'error'
                : exception.severity === 'HIGH'
                ? 'warning'
                : 'primary'
            }
            size="small"
          />
          <Chip
            label={exception.status.replace('_', ' ')}
            color={
              exception.status === 'RESOLVED'
                ? 'success'
                : exception.status === 'MANUAL_INTERVENTION_REQUIRED'
                ? 'error'
                : 'warning'
            }
            size="small"
          />
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: theme.colors.alpha.black[5], borderRadius: 1 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Problem Description
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
                {exception.description}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary" textTransform="uppercase">
              Previous Technician
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              {exception.previousTechnician
                ? `${exception.previousTechnician.firstName} ${exception.previousTechnician.lastName}`
                : 'Unassigned'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary" textTransform="uppercase">
              Replacement Technician
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5, color: theme.colors.success.main }}>
              {exception.replacementTechnician
                ? `${exception.replacementTechnician.firstName} ${exception.replacementTechnician.lastName}`
                : 'None Assigned'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary" textTransform="uppercase">
              Detected Timestamp
            </Typography>
            <Typography variant="body2">
              {exception.detectedAt
                ? format(new Date(exception.detectedAt), 'MMM dd, yyyy HH:mm:ss')
                : 'N/A'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary" textTransform="uppercase">
              Resolution Status
            </Typography>
            <Typography variant="body2">
              {exception.autoResolved
                ? 'Auto-resolved by Engine'
                : exception.status === 'RESOLVED'
                ? 'Manually Resolved'
                : 'Pending Resolution'}
            </Typography>
          </Grid>

          {exception.resolutionNotes && (
            <Grid item xs={12}>
              <Box sx={{ p: 1.5, bgcolor: theme.colors.success.lighter, borderRadius: 1 }}>
                <Typography variant="caption" color="success.dark" fontWeight="bold">
                  Resolution Notes
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {exception.resolutionNotes}
                </Typography>
              </Box>
            </Grid>
          )}

          {showResolveForm && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, border: `1px solid ${theme.colors.primary.main}`, borderRadius: 1 }}>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  Resolve Exception
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Enter resolution notes..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  size="small"
                />
                <Box mt={1} display="flex" gap={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => setShowResolveForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={handleResolve}
                    disabled={actionLoading}
                  >
                    Confirm Resolution
                  </Button>
                </Box>
              </Box>
            </Grid>
          )}

          {showReassignForm && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, border: `1px solid ${theme.colors.warning.main}`, borderRadius: 1 }}>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  Manual Technician Reassignment
                </Typography>
                <TextField
                  select
                  fullWidth
                  label="Select Replacement Technician"
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(Number(e.target.value))}
                  size="small"
                  sx={{ mb: 1 }}
                >
                  {usersMini.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  placeholder="Optional assignment notes..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  size="small"
                />
                <Box mt={1} display="flex" gap={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => setShowReassignForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={handleManualReassign}
                    disabled={!selectedTechId || actionLoading}
                  >
                    Assign & Resolve
                  </Button>
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          startIcon={<LaunchTwoToneIcon />}
          onClick={handleViewWorkOrder}
          variant="outlined"
          size="small"
        >
          View Work Order
        </Button>
        <Box display="flex" gap={1}>
          {exception.status !== 'RESOLVED' && (
            <>
              <Button
                startIcon={<AutorenewTwoToneIcon />}
                onClick={handleRetry}
                variant="outlined"
                color="secondary"
                size="small"
                disabled={actionLoading}
              >
                Retry Auto-Assign
              </Button>
              <Button
                startIcon={<AssignmentIndTwoToneIcon />}
                onClick={() => {
                  setShowReassignForm(true);
                  setShowResolveForm(false);
                }}
                variant="outlined"
                color="warning"
                size="small"
                disabled={actionLoading}
              >
                Reassign
              </Button>
              <Button
                startIcon={<CheckCircleTwoToneIcon />}
                onClick={() => {
                  setShowResolveForm(true);
                  setShowReassignForm(false);
                }}
                variant="contained"
                color="success"
                size="small"
                disabled={actionLoading}
              >
                Resolve
              </Button>
            </>
          )}
          <Button onClick={onClose} variant="text" size="small">
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ExceptionDetailsModal;
