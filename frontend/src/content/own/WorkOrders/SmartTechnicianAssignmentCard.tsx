import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import AutoAwesomeTwoToneIcon from '@mui/icons-material/AutoAwesomeTwoTone';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import PersonTwoToneIcon from '@mui/icons-material/PersonTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { useDispatch } from '../../../store';
import { autoAssignTechnician, getTechnicianCandidates, editWorkOrder } from '../../../slices/workOrder';
import { TechnicianCandidate } from '../../../models/owns/technicianCandidate';
import WorkOrder from '../../../models/owns/workOrder';

interface SmartTechnicianAssignmentCardProps {
  workOrder: WorkOrder;
  onAssigned?: () => void;
}

export default function SmartTechnicianAssignmentCard({
  workOrder,
  onAssigned
}: SmartTechnicianAssignmentCardProps) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [candidates, setCandidates] = useState<TechnicianCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const fetchCandidates = () => {
    if (workOrder && workOrder.id) {
      setLoading(true);
      dispatch(getTechnicianCandidates(workOrder.id))
        .then((res) => setCandidates(res || []))
        .catch(() => setCandidates([]))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [workOrder?.id]);

  const handleAutoAssign = (overwrite: boolean = false) => {
    setAssigning(true);
    dispatch(autoAssignTechnician(workOrder.id, overwrite))
      .then((res) => {
        if (res.requiresConfirmation) {
          setConfirmOpen(true);
        } else if (res.assigned) {
          fetchCandidates();
          if (onAssigned) onAssigned();
        }
      })
      .finally(() => setAssigning(false));
  };

  const handleManualAssign = (candidate: TechnicianCandidate) => {
    setAssigning(true);
    dispatch(editWorkOrder(workOrder.id, { ...workOrder, primaryUser: { id: candidate.technicianId } }))
      .then(() => {
        fetchCandidates();
        if (onAssigned) onAssigned();
      })
      .finally(() => setAssigning(false));
  };

  const bestCandidate = candidates.length > 0 ? candidates[0] : null;
  const otherCandidates = candidates.length > 1 ? candidates.slice(1) : [];

  return (
    <Card sx={{ mb: 3, border: 1, borderColor: 'primary.main' }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <AutoAwesomeTwoToneIcon />
          </Avatar>
        }
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              startIcon={<RefreshTwoToneIcon />}
              onClick={fetchCandidates}
              disabled={loading}
            >
              Refresh Candidates
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={assigning || candidates.length === 0}
              startIcon={assigning ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <AutoAwesomeTwoToneIcon />}
              onClick={() => handleAutoAssign(false)}
            >
              Auto-Assign Best
            </Button>
          </Stack>
        }
        title={<Typography variant="h4">Smart Technician Auto-Assignment</Typography>}
        subheader="Intelligent candidate ranking based on skills, location, shift, and workload"
      />
      <Divider />
      <CardContent>
        {loading && !candidates.length ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={3}>
            <CircularProgress size={24} />
            <Typography sx={{ ml: 2 }}>Calculating technician candidate rankings...</Typography>
          </Box>
        ) : !candidates.length ? (
          <Typography color="text.secondary" align="center" py={2}>
            No eligible technician candidates found for this work order.
          </Typography>
        ) : (
          <Stack spacing={3}>
            {/* BEST MATCH RECOMMENDED CANDIDATE */}
            {bestCandidate && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: theme.colors.alpha.black[5],
                  border: 1,
                  borderColor: 'success.main'
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ bgcolor: 'success.main', width: 44, height: 44 }}>
                      <PersonTwoToneIcon />
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h4">
                          {bestCandidate.firstName} {bestCandidate.lastName}
                        </Typography>
                        <Chip
                          label={`BEST MATCH (Score: ${bestCandidate.score}/100)`}
                          color="success"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {bestCandidate.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    color="success"
                    disabled={assigning}
                    onClick={() => handleManualAssign(bestCandidate)}
                  >
                    Assign Top Match
                  </Button>
                </Stack>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Explainable Recommendation Factors:
                </Typography>
                <Stack spacing={0.5}>
                  {bestCandidate.reasons.map((reason, idx) => (
                    <Box key={idx} display="flex" alignItems="center" gap={1}>
                      <CheckCircleTwoToneIcon color="success" fontSize="small" />
                      <Typography variant="body2">{reason}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* OTHER ELIGIBLE CANDIDATES */}
            {otherCandidates.length > 0 && (
              <Box>
                <Typography variant="h5" gutterBottom>
                  Other Eligible Candidates
                </Typography>
                <List disablePadding>
                  {otherCandidates.map((candidate, idx) => (
                    <React.Fragment key={candidate.technicianId}>
                      <ListItem
                        secondaryAction={
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={assigning}
                            onClick={() => handleManualAssign(candidate)}
                          >
                            Assign
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'info.main' }}>{candidate.firstName.charAt(0)}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="h6">
                                #{candidate.rank} {candidate.firstName} {candidate.lastName}
                              </Typography>
                              <Chip label={`Score: ${candidate.score}`} size="small" variant="outlined" />
                            </Stack>
                          }
                          secondary={candidate.reasons.join(' • ')}
                        />
                      </ListItem>
                      {idx < otherCandidates.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}
          </Stack>
        )}
      </CardContent>

      {/* CONFIRM OVERWRITE DIALOG */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Technician Reassignment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This work order is already assigned to a technician ({workOrder.primaryUser?.firstName} {workOrder.primaryUser?.lastName}). Do you want to reassign it to the top recommended technician ({bestCandidate?.firstName} {bestCandidate?.lastName})?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setConfirmOpen(false);
              handleAutoAssign(true);
            }}
          >
            Reassign
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
