import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  Container,
  Link,
  styled,
  Typography,
  Tabs,
  Tab,
  Paper,
  Chip,
  Stack,
  useTheme
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import JWTLogin, { UserLoginRole } from '../LoginJWT';
import { useTranslation } from 'react-i18next';
import Logo from 'src/components/LogoSign';
import PersonIcon from '@mui/icons-material/Person';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SecurityIcon from '@mui/icons-material/Security';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import { ldapEnabled } from '../../../../../config';

const Content = styled(Box)(
  () => `
    display: flex;
    flex: 1;
    width: 100%;
`
);

function LoginCover() {
  const { t }: { t: any } = useTranslation();
  const theme = useTheme();

  const [selectedRole, setSelectedRole] = useState<UserLoginRole>('CUSTOMER');

  const handleRoleChange = (_: React.SyntheticEvent, newValue: UserLoginRole) => {
    setSelectedRole(newValue);
  };

  const getRoleHeaderInfo = () => {
    switch (selectedRole) {
      case 'CUSTOMER':
        return {
          title: 'Plant Operator Portal',
          subtitle: 'Submit equipment breakdown requests, track live technician ETA radar, and verify maintenance sign-off.',
          badge: 'PLANT OPERATOR ACCESS',
          chipColor: 'success' as const
        };
      case 'INTERNAL_TECHNICIAN':
        return {
          title: 'Plant Crew Internal Workspace',
          subtitle: 'Access on-site breakdown dispatches, telemetry diagnostics, spare parts stock, and OEM vendor escalation.',
          badge: 'PLANT CREW (INTERNAL) ACCESS',
          chipColor: 'info' as const
        };
      case 'EXTERNAL_VENDOR':
        return {
          title: 'Contractor & OEM Vendor Workspace',
          subtitle: 'Access specialized OEM dispatches, review diagnostic snapshots, contractual SLA milestones, and completion packages.',
          badge: 'CONTRACTOR (EXTERNAL) ACCESS',
          chipColor: 'warning' as const
        };
      case 'ADMIN':
        return {
          title: 'System Administrator Console',
          subtitle: 'Configure automated 5-point validation engines, technician scoring weights, SLA tier policies, and audit logs.',
          badge: 'ADMINISTRATOR ACCESS',
          chipColor: 'secondary' as const
        };
      default:
        return {
          title: 'Portal Sign In',
          subtitle: 'Sign in to access your dashboard.',
          badge: 'ORCHESTRATION PLATFORM',
          chipColor: 'primary' as const
        };
    }
  };

  const info = getRoleHeaderInfo();

  return (
    <>
      <Helmet>
        <title>{`EquiNox FSM — ${selectedRole === 'CUSTOMER' ? 'Operator' : selectedRole === 'INTERNAL_TECHNICIAN' ? 'Plant Crew' : selectedRole === 'EXTERNAL_VENDOR' ? 'Contractor' : selectedRole} Login`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Content>
        <Container
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            py: 4
          }}
          maxWidth="md"
        >
          <Card
            sx={{
              p: { xs: 2.5, sm: 4 },
              my: 2,
              width: '100%',
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
            }}
          >
            <Box textAlign="center" sx={{ mb: 2 }}>
              <Logo />
              <Typography
                variant="h2"
                sx={{
                  mt: 1,
                  mb: 0.5,
                  fontWeight: 700
                }}
              >
                EquiNox Orchestration FSM
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Industrial Equipment Service Orchestration Platform
              </Typography>
            </Box>

            {/* SEPARATE LOGIN TABS FOR OPERATOR, PLANT CREW, CONTRACTOR, AND ADMIN */}
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <Tabs
                value={selectedRole}
                onChange={handleRoleChange}
                variant="fullWidth"
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab
                  value="CUSTOMER"
                  icon={<PersonIcon />}
                  iconPosition="start"
                  label="Operator"
                  sx={{ fontWeight: selectedRole === 'CUSTOMER' ? 700 : 500, fontSize: '0.82rem' }}
                />
                <Tab
                  value="INTERNAL_TECHNICIAN"
                  icon={<EngineeringIcon />}
                  iconPosition="start"
                  label="Plant Crew (Internal)"
                  sx={{ fontWeight: selectedRole === 'INTERNAL_TECHNICIAN' ? 700 : 500, fontSize: '0.82rem' }}
                />
                <Tab
                  value="EXTERNAL_VENDOR"
                  icon={<BusinessCenterIcon />}
                  iconPosition="start"
                  label="Contractor (External)"
                  sx={{ fontWeight: selectedRole === 'EXTERNAL_VENDOR' ? 700 : 500, fontSize: '0.82rem' }}
                />
                <Tab
                  value="ADMIN"
                  icon={<SecurityIcon />}
                  iconPosition="start"
                  label="Admin"
                  sx={{ fontWeight: selectedRole === 'ADMIN' ? 700 : 500, fontSize: '0.82rem' }}
                />
              </Tabs>
            </Paper>

            {/* Role Header Info */}
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Chip
                  size="small"
                  label={info.badge}
                  color={info.chipColor}
                  sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                />
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                {info.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {info.subtitle}
              </Typography>
            </Box>

            {/* Login Form for the selected role */}
            <JWTLogin selectedRole={selectedRole} />

            {!ldapEnabled && (
              <Box my={3} textAlign="center">
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                >
                  Need access to another plant or department?{' '}
                </Typography>
                <Link component={RouterLink} to="/account/register" variant="body2">
                  <b>Contact Administrator</b>
                </Link>
              </Box>
            )}
          </Card>
        </Container>
      </Content>
    </>
  );
}

export default LoginCover;
