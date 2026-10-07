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
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SecurityIcon from '@mui/icons-material/Security';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PersonIcon from '@mui/icons-material/Person';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useOrchestration } from './useOrchestration';
import { useNavigate } from 'react-router-dom';
import useAuth from 'src/hooks/useAuth';

export default function DemoControllerBar() {
  const { state, setRole, resetDemoData } = useOrchestration();
  const { logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  const openExceptionsCount = state.exceptions.filter((e) => !e.resolved).length;

  const handleSelectRole = (
    role: 'MANAGER' | 'TECHNICIAN' | 'CUSTOMER' | 'ADMIN' | 'EXTERNAL_VENDOR'
  ) => {
    setRole(role as any);
    localStorage.setItem('active_role', role);
    switch (role) {
      case 'MANAGER':
        navigate('/app/orchestration/command-center');
        break;
      case 'TECHNICIAN':
        navigate('/app/orchestration/technician-workspace');
        break;
      case 'EXTERNAL_VENDOR':
        navigate('/app/orchestration/vendor-workspace');
        break;
      case 'CUSTOMER':
        navigate('/app/orchestration/customer-portal');
        break;
      case 'ADMIN':
        navigate('/app/orchestration/admin-panel');
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/app');
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 1.5,
        mb: 2.5,
        borderRadius: 2,
        background: theme.palette.mode === 'dark' ? '#1e242c' : '#ffffff',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
      }}
    >
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        alignItems={{ xs: 'flex-start', lg: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        {/* Left: Role identity & Role-specific Navigation */}
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          {state.currentRole === 'CUSTOMER' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<PersonIcon />}
                size="small"
                label="OPERATOR PORTAL"
                color="success"
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Logged in as: Vikram Mehta (Plant Operator)
              </Typography>
            </Stack>
          )}

          {state.currentRole === 'TECHNICIAN' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<EngineeringIcon />}
                size="small"
                label="TECHNICIAN WORKSPACE"
                color="info"
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Logged in as: Arjun Raman (Field Specialist)
              </Typography>
            </Stack>
          )}

          {state.currentRole === 'ADMIN' && (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                icon={<SecurityIcon />}
                size="small"
                label="ADMIN CONSOLE"
                color="secondary"
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
                Superuser Oversight:
              </Typography>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  variant={state.currentRole === 'ADMIN' ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => handleSelectRole('ADMIN')}
                  startIcon={<SecurityIcon fontSize="small" />}
                >
                  Admin Panel
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleSelectRole('MANAGER')}
                  startIcon={<SupervisorAccountIcon fontSize="small" />}
                >
                  Command Center
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleSelectRole('TECHNICIAN')}
                  startIcon={<EngineeringIcon fontSize="small" />}
                >
                  Plant Crew
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => handleSelectRole('EXTERNAL_VENDOR')}
                  startIcon={<EngineeringIcon fontSize="small" />}
                >
                  Contractor (Vendor)
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleSelectRole('CUSTOMER')}
                  startIcon={<PersonIcon fontSize="small" />}
                >
                  Operator View
                </Button>
              </ButtonGroup>
            </Stack>
          )}

          {state.currentRole === 'MANAGER' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<SupervisorAccountIcon />}
                size="small"
                label="MANAGER COMMAND"
                color="primary"
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Fleet Operations &amp; Dispatch Manager
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Right: Quick actions tailored to the logged-in user */}
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          {state.currentRole === 'CUSTOMER' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<AddCircleOutlineIcon fontSize="small" />}
                onClick={() => navigate('/app/orchestration/customer-portal')}
              >
                Submit Request
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate('/app/orchestration/customer-portal')}
              >
                Track Repairs
              </Button>
            </Stack>
          )}

          {state.currentRole === 'TECHNICIAN' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<EngineeringIcon fontSize="small" />}
                onClick={() => navigate('/app/orchestration/technician-workspace')}
              >
                Active Field HUD
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate('/app/orchestration/resources')}
              >
                Spare Parts Stock
              </Button>
            </Stack>
          )}

          {state.currentRole === 'ADMIN' && (
            <Stack direction="row" spacing={1} alignItems="center">
              {openExceptionsCount > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<ErrorOutlineIcon fontSize="small" />}
                  onClick={() => navigate('/app/orchestration/exceptions')}
                >
                  Exceptions ({openExceptionsCount})
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                endIcon={<OpenInNewIcon fontSize="small" />}
                onClick={() => navigate('/app/orchestration/admin-panel')}
              >
                Governance Console
              </Button>
            </Stack>
          )}

          <Tooltip title="Reset platform demo data">
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={() => {
                resetDemoData();
              }}
              startIcon={<RestartAltIcon fontSize="small" />}
            >
              Reset Data
            </Button>
          </Tooltip>

          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<LogoutIcon fontSize="small" />}
            onClick={handleLogout}
          >
            Switch Login / Logout
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
