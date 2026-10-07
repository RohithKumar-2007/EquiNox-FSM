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
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';

export default function SitesHub() {
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
            Plant Sites &amp; Facility Locations
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manufacturing plants, geofence coordinates, site assets, and active service engagements
          </Typography>
        </Box>
      </Stack>

      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <LocationOnIcon color="primary" />
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                Monitored Industrial Sites ({state.sites.length})
              </Typography>
            </Stack>
          }
          subheader="Geographic clusters supporting condition-based maintenance"
        />
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Site Code &amp; Name</TableCell>
                <TableCell>City &amp; Address</TableCell>
                <TableCell>Geo-Coordinates (Lat, Long)</TableCell>
                <TableCell>Site Contact</TableCell>
                <TableCell align="center">Registered Machines</TableCell>
                <TableCell align="center">Active Requests</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.sites.map((s) => {
                const machinesCount = state.machines.filter((m) => m.siteId === s.id).length;
                const reqCount = state.requests.filter((r) => r.siteId === s.id && r.status !== 'COMPLETED').length;

                return (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {s.name}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Code: {s.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{s.city}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.address}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {s.latitude.toFixed(4)}° N, {s.longitude.toFixed(4)}° E
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{s.contactPerson}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.contactPhone}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {machinesCount}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={reqCount}
                        color={reqCount > 0 ? 'error' : 'success'}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
}
