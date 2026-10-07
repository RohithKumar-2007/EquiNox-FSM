import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SecurityIcon from '@mui/icons-material/Security';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PersonIcon from '@mui/icons-material/Person';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useOrchestration } from './useOrchestration';
import { useNavigate } from 'react-router-dom';

export default function DemoControllerBar() {
  const {
    state,
    setRole,
    resetDemoData,
    validateRequest,
    approveAndAssign,
    acceptJob,
    updateTravelStatus,
    startService,
    triggerTechnicianDropout,
    reassignTechnician,
    submitCompletion,
    verifyAndComplete
  } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  const mainRequest = state.requests.find((r) => r.id === 'sr-1042') || state.requests[0];

  const handleRunScene = (sceneNum: number) => {
    if (!mainRequest) return;
    const reqId = mainRequest.id;

    switch (sceneNum) {
      case 1:
        // Scene 1: Request Created
        setRole('CUSTOMER');
        navigate('/app/orchestration/command-center');
        break;
      case 2:
        // Scene 2: Automated Validation
        setRole('MANAGER');
        validateRequest(reqId);
        navigate(`/app/orchestration/requests/${reqId}`);
        break;
      case 3:
        // Scene 3: Intelligent Matching & Approval
        setRole('MANAGER');
        if (mainRequest.status === 'NEW') validateRequest(reqId);
        approveAndAssign(reqId, 'tech-b', 'Operations Manager');
        navigate(`/app/orchestration/requests/${reqId}`);
        break;
      case 4:
        // Scene 4: Technician Execution
        setRole('TECHNICIAN');
        acceptJob(reqId);
        updateTravelStatus(reqId, 'EN_ROUTE');
        setTimeout(() => updateTravelStatus(reqId, 'ON_SITE'), 400);
        setTimeout(() => startService(reqId), 800);
        navigate('/app/orchestration/technician-workspace');
        break;
      case 5:
        // Scene 5: The WOW Moment (Dropout & Auto-Recovery)
        setRole('MANAGER');
        triggerTechnicianDropout(reqId);
        navigate('/app/orchestration/exceptions');
        break;
      case 6:
        // Scene 6: Completion Package Upload
        setRole('TECHNICIAN');
        submitCompletion(reqId, {
          serviceReport:
            'Replaced blown proportional seal and main drive coupling on Hydraulic Pump Assembly HP-800. Flushed hydraulic line, recharged accumulator to 210 Bar. Full diagnostic cycle verified.',
          workObservations:
            'High pressure cavitation observed in secondary circuit. Inlet filter cleaned. No secondary contamination.',
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
          technicianNotes: 'Machine tested with 10 dry cycles and 5 stamping loads. Clean handoff.'
        });
        navigate(`/app/orchestration/requests/${reqId}`);
        break;
      case 7:
        // Scene 7: Verification & Signoff
        setRole('MANAGER');
        verifyAndComplete(reqId, 'Operations Manager', 'All tolerances validated. Pressure steady.');
        navigate(`/app/orchestration/requests/${reqId}`);
        break;
      case 8:
        // Scene 8: Closed-Loop Command Center
        setRole('MANAGER');
        navigate('/app/orchestration/command-center');
        break;
      default:
        break;
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        mb: 2,
        borderRadius: 2,
        background: theme.palette.mode === 'dark' ? '#1e242c' : '#ffffff',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        {/* Left: Persona Switcher */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            size="small"
            label="DATAQUEST 3.0"
            color="primary"
            sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Active Persona:
          </Typography>
          <ButtonGroup size="small" variant="outlined">
            <Button
              variant={state.currentRole === 'MANAGER' ? 'contained' : 'outlined'}
              onClick={() => setRole('MANAGER')}
              startIcon={<SupervisorAccountIcon fontSize="small" />}
            >
              Manager
            </Button>
            <Button
              variant={state.currentRole === 'TECHNICIAN' ? 'contained' : 'outlined'}
              onClick={() => setRole('TECHNICIAN')}
              startIcon={<EngineeringIcon fontSize="small" />}
            >
              Technician
            </Button>
            <Button
              variant={state.currentRole === 'CUSTOMER' ? 'contained' : 'outlined'}
              onClick={() => setRole('CUSTOMER')}
              startIcon={<PersonIcon fontSize="small" />}
            >
              Customer
            </Button>
            <Button
              variant={state.currentRole === 'ADMIN' ? 'contained' : 'outlined'}
              onClick={() => setRole('ADMIN')}
              startIcon={<SecurityIcon fontSize="small" />}
            >
              Admin
            </Button>
          </ButtonGroup>
        </Stack>

        {/* Right: Demo Workflow Stepper */}
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mr: 0.5 }}>
            5-Min Demo:
          </Typography>
          <ButtonGroup size="small" variant="contained" color="secondary">
            <Tooltip title="Scene 1: Customer creates Machine Failure SR-1042">
              <Button onClick={() => handleRunScene(1)}>1. Failure</Button>
            </Tooltip>
            <Tooltip title="Scene 2: Automated 5-point validation">
              <Button onClick={() => handleRunScene(2)}>2. Validate</Button>
            </Tooltip>
            <Tooltip title="Scene 3: Intelligent technician scoring & approval">
              <Button onClick={() => handleRunScene(3)}>3. Match & Assign</Button>
            </Tooltip>
            <Tooltip title="Scene 4: Technician accepts, travels & starts work">
              <Button onClick={() => handleRunScene(4)}>4. Execute</Button>
            </Tooltip>
            <Tooltip title="Scene 5: WOW MOMENT - Technician drop & 1-click reassignment">
              <Button
                color="error"
                startIcon={<WarningAmberIcon fontSize="small" />}
                onClick={() => handleRunScene(5)}
              >
                5. Exception & Reassign
              </Button>
            </Tooltip>
            <Tooltip title="Scene 6: Technician submits completion dossier & photos">
              <Button onClick={() => handleRunScene(6)}>6. Completion</Button>
            </Tooltip>
            <Tooltip title="Scene 7: Two-party completion verification">
              <Button onClick={() => handleRunScene(7)}>7. Verify</Button>
            </Tooltip>
            <Tooltip title="Scene 8: Sealed loop - Closed status, inventory & audit">
              <Button onClick={() => handleRunScene(8)}>8. Audit & Close</Button>
            </Tooltip>
          </ButtonGroup>

          <Tooltip title="Reset demo to initial state">
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => {
                resetDemoData();
                navigate('/app/orchestration/command-center');
              }}
              startIcon={<RestartAltIcon fontSize="small" />}
            >
              Reset Demo
            </Button>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}
