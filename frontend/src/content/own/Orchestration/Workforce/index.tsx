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
import EngineeringIcon from '@mui/icons-material/Engineering';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';

export default function WorkforceHub() {
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
            Workforce &amp; Skills Directory
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Technician skill proficiencies, certifications, real-time workload, and dispatch availability
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3}>
        {/* Technicians Table */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EngineeringIcon color="primary" />
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Technician Roster ({state.technicians.length})
                  </Typography>
                </Stack>
              }
              subheader="Active certified engineering personnel across regional clusters"
            />
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Technician Name</TableCell>
                    <TableCell>Certified Skills</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Active Workload</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.technicians.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {t.name}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {t.skills.map((s, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              label={`${s.skillName} (L${s.level})`}
                              color={s.skillName === 'Hydraulics' ? 'primary' : 'default'}
                              sx={{ fontSize: '0.7rem', height: 20, mb: 0.5 }}
                            />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>{t.currentLocation.city}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={`${t.currentWorkload} Jobs`}
                          color={t.currentWorkload === 0 ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>★ {t.rating}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={t.activeStatus}
                          color={
                            t.activeStatus === 'AVAILABLE'
                              ? 'success'
                              : t.activeStatus === 'OFF_DUTY'
                              ? 'error'
                              : 'primary'
                          }
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Skills Catalog */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SchoolIcon color="primary" />
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Skills Catalog ({state.skills.length})
                  </Typography>
                </Stack>
              }
              subheader="Standard industrial technical disciplines"
            />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                {state.skills.map((sk) => (
                  <Paper
                    key={sk.id}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.action.hover
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {sk.name}
                      </Typography>
                      <Chip size="small" label={sk.category} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Minimum Proficiency Required: Level {sk.minLevelRequired}/5
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
