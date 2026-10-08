import * as Yup from 'yup';
import type { FC } from 'react';
import { useContext, useState, useEffect } from 'react';
import { Formik } from 'formik';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
  Stack,
  Chip
} from '@mui/material';
import useAuth from 'src/hooks/useAuth';
import useRefMounted from 'src/hooks/useRefMounted';
import { useTranslation } from 'react-i18next';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import VisibilityIcon from '@mui/icons-material/Visibility';
import KeyIcon from '@mui/icons-material/Key';
import { getErrorMessage, isNetworkError } from '../../../../utils/api';
import { ldapEnabled } from '../../../../config';
import { orchestrationStore } from 'src/orchestration/store';

export type UserLoginRole = 'CUSTOMER' | 'INTERNAL_TECHNICIAN' | 'EXTERNAL_VENDOR' | 'ADMIN';

interface LoginJWTProps {
  selectedRole?: UserLoginRole;
}

const DEFAULT_CREDENTIALS: Record<UserLoginRole, { email: string; pass: string; label: string }> = {
  CUSTOMER: {
    email: 'operator@equinox-fsm.com',
    pass: 'pls_change_me',
    label: 'Plant Operator (Ford Plant A)'
  },
  INTERNAL_TECHNICIAN: {
    email: 'technician@equinox-fsm.com',
    pass: 'pls_change_me',
    label: 'Plant Crew Internal Specialist (Arjun Raman)'
  },
  EXTERNAL_VENDOR: {
    email: 'vendor@equinox-fsm.com',
    pass: 'pls_change_me',
    label: 'Contractor & OEM Vendor (Apex Hydraulics Ltd)'
  },
  ADMIN: {
    email: 'admin@equinox-fsm.com',
    pass: 'pls_change_me',
    label: 'System Administrator'
  }
};

const LoginJWT: FC<LoginJWTProps> = ({ selectedRole = 'CUSTOMER' }) => {
  const { login } = useAuth();
  const isMountedRef = useRefMounted();
  const { t }: { t: any } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const creds = DEFAULT_CREDENTIALS[selectedRole] || DEFAULT_CREDENTIALS.CUSTOMER;

  const getTargetRoute = (role: UserLoginRole) => {
    switch (role) {
      case 'CUSTOMER':
        return '/app/orchestration/customer-portal';
      case 'INTERNAL_TECHNICIAN':
        return '/app/orchestration/technician-workspace';
      case 'EXTERNAL_VENDOR':
        return '/app/orchestration/vendor-workspace';
      case 'ADMIN':
        return '/app/orchestration/admin-panel';
      default:
        return '/app/orchestration/command-center';
    }
  };

  return (
    <Formik
      enableReinitialize
      initialValues={{
        email: creds.email,
        password: creds.pass,
        submit: null
      }}
      validationSchema={Yup.object().shape({
        email: Yup.string()
          .email(t('invalid_email') || 'Invalid email')
          .max(255)
          .required(t('required_email') || 'Email is required'),
        password: Yup.string().max(255).required(t('required_password') || 'Password is required')
      })}
      onSubmit={async (values, { setStatus, setSubmitting }): Promise<void> => {
        setSubmitting(true);
        try {
          await login(values.email, values.password, ldapEnabled);

          // Sync active role in orchestration store and localStorage
          orchestrationStore.setRole(selectedRole);
          localStorage.setItem('active_role', selectedRole);

          const roleName = selectedRole === 'CUSTOMER' ? 'OPERATOR' : selectedRole;
          showSnackBar(`Successfully authenticated as ${roleName}`, 'success');

          // Navigate directly to this persona's workspace
          navigate(getTargetRoute(selectedRole));
        } catch (err: any) {
          showSnackBar(
            isNetworkError(err)
              ? t('server_not_reachable')
              : err.status === 403
              ? 'Invalid credentials for this role portal'
              : getErrorMessage(err),
            'error'
          );
          setStatus({ success: false });
        } finally {
          if (isMountedRef.current) {
            setSubmitting(false);
          }
        }
      }}
    >
      {({
        errors,
        handleBlur,
        handleChange,
        handleSubmit,
        setFieldValue,
        isSubmitting,
        touched,
        values
      }): JSX.Element => (
        <form noValidate onSubmit={handleSubmit}>
          {/* Quick Credential Pre-fill Badge */}
          <Box
            sx={{
              p: 1.5,
              mb: 2,
              borderRadius: 1.5,
              background: (theme) => theme.palette.action.hover,
              border: (theme) => `1px dashed ${theme.palette.divider}`
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                  DEFAULT {selectedRole === 'CUSTOMER' ? 'OPERATOR' : selectedRole === 'INTERNAL_TECHNICIAN' ? 'PLANT CREW (INTERNAL)' : selectedRole === 'EXTERNAL_VENDOR' ? 'CONTRACTOR (EXTERNAL)' : selectedRole} CREDENTIALS:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {creds.email}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<KeyIcon fontSize="small" />}
                onClick={() => {
                  setFieldValue('email', creds.email);
                  setFieldValue('password', creds.pass);
                }}
              >
                Auto-Fill
              </Button>
            </Stack>
          </Box>

          <TextField
            error={Boolean(touched.email && errors.email)}
            fullWidth
            margin="normal"
            helperText={touched.email && errors.email}
            label={t('email') || 'Email'}
            name="email"
            onBlur={handleBlur}
            onChange={handleChange}
            type="email"
            value={values.email}
            variant="outlined"
          />

          <TextField
            error={Boolean(touched.password && errors.password)}
            fullWidth
            margin="normal"
            helperText={touched.password && errors.password}
            label={t('password') || 'Password'}
            name="password"
            onBlur={handleBlur}
            onChange={handleChange}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={values.password}
            variant="outlined"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    <VisibilityIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <Box
            alignItems="center"
            display={{ xs: 'block', md: 'flex' }}
            justifyContent="space-between"
            sx={{ mt: 1 }}
          >
            <Link component={RouterLink} to="/account/recover-password" variant="body2">
              <b>{t('lost_password') || 'Forgot password?'}</b>
            </Link>
          </Box>

          <Button
            sx={{ mt: 3 }}
            color="primary"
            startIcon={isSubmitting ? <CircularProgress size="1rem" /> : null}
            disabled={isSubmitting}
            type="submit"
            fullWidth
            size="large"
            variant="contained"
          >
            Sign In as {selectedRole === 'CUSTOMER' ? 'Operator' : selectedRole === 'INTERNAL_TECHNICIAN' ? 'Plant Crew' : selectedRole === 'EXTERNAL_VENDOR' ? 'Contractor' : 'Admin'}
          </Button>
        </form>
      )}
    </Formik>
  );
};

export default LoginJWT;
