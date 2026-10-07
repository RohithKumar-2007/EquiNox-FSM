import React from 'react';
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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';

export default function MachinesHub() {
  const { state } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <DemoControllerBar />

      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/orchestration/command-center')}
          variant="outlined"
          size="small"
        >
          Command Center
        </Button>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            Industrial Equipment &amp; Machinery Fleet
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Machine profiles, operational availability, service history, and real-time maintenance status
          </Typography>
        </Box>
      </Stack>

      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <PrecisionManufacturingIcon color="primary" />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                Equipment Directory ({state.machines.length})
              </Typography>
            </Stack>
          }
          subheader="Registered machinery under active condition monitoring"
        />
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Machine Code</TableCell>
                <TableCell>Name &amp; Type</TableCell>
                <TableCell>Manufacturer &amp; Model</TableCell>
                <TableCell>Plant Site</TableCell>
                <TableCell>Eligibility</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Active Request</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.machines.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell sx={{ fontWeight: 800 }}>{m.code}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {m.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{m.manufacturer}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.model} | S/N: {m.serialNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{m.siteName}</TableCell>
                  <TableCell>
                    <Chip size="small" label={m.eligibilityStatus} color="success" />
                  </TableCell>
                  <TableCell>
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
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    {m.activeRequestId ? (
                      <Chip
                        size="small"
                        label="SR-1042 Active"
                        color="error"
                        clickable
                        onClick={() => navigate(`/app/orchestration/requests/${m.activeRequestId}`)}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        None
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        if (m.activeRequestId) {
                          navigate(`/app/orchestration/requests/${m.activeRequestId}`);
                        } else {
                          navigate('/app/orchestration/create-request');
                        }
                      }}
                    >
                      {m.activeRequestId ? 'View Ticket' : 'Request Service'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
}
