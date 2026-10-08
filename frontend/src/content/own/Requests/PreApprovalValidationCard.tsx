import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  CircularProgress,
  Tooltip
} from '@mui/material';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';
import WarningTwoToneIcon from '@mui/icons-material/WarningTwoTone';
import RefreshTwoToneIcon from '@mui/icons-material/RefreshTwoTone';
import { PreApprovalValidationResult, ValidationCheck } from '../../../models/owns/request';

interface PreApprovalValidationCardProps {
  validationResult: PreApprovalValidationResult | null;
  loading: boolean;
  onRevalidate: () => void;
}

export default function PreApprovalValidationCard({
  validationResult,
  loading,
  onRevalidate
}: PreApprovalValidationCardProps) {
  if (loading && !validationResult) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
          <Typography sx={{ ml: 2 }}>Running Pre-Approval Validation...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!validationResult) {
    return null;
  }

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircleTwoToneIcon color="success" />;
      case 'WARNING':
        return <WarningTwoToneIcon color="warning" />;
      case 'BLOCKED':
        return <CancelTwoToneIcon color="error" />;
      default:
        return null;
    }
  };

  const getStatusChip = (valid: boolean) => {
    return valid ? (
      <Chip label="PASSED / VALID" color="success" size="small" sx={{ fontWeight: 'bold' }} />
    ) : (
      <Chip label="BLOCKED" color="error" size="small" sx={{ fontWeight: 'bold' }} />
    );
  };

  const formattedTime = new Date(validationResult.validatedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <Card sx={{ mb: 3, border: 1, borderColor: validationResult.valid ? 'success.light' : 'error.light' }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h4">Pre-Approval Validation Engine</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {getStatusChip(validationResult.valid)}
              <Tooltip title="Revalidate Request">
                <span>
                  <IconButton size="small" onClick={onRevalidate} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <RefreshTwoToneIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        }
        subheader={`Last validated at ${formattedTime}`}
      />
      <Divider />
      <CardContent>
        <List disablePadding>
          {validationResult.checks.map((check: ValidationCheck, index: number) => (
            <React.Fragment key={check.code + index}>
              <ListItem sx={{ py: 1, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {renderStatusIcon(check.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="h6" component="span" sx={{ fontWeight: check.status === 'BLOCKED' ? 'bold' : 'normal' }}>
                      {check.name}
                    </Typography>
                  }
                  secondary={check.message}
                />
                {check.status === 'BLOCKED' && (
                  <Chip label="BLOCKED" color="error" variant="outlined" size="small" />
                )}
                {check.status === 'PASS' && (
                  <Chip label="PASS" color="success" variant="outlined" size="small" />
                )}
                {check.status === 'WARNING' && (
                  <Chip label="WARNING" color="warning" variant="outlined" size="small" />
                )}
              </ListItem>
              {index < validationResult.checks.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
