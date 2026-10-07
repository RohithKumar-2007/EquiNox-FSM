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
import InventoryIcon from '@mui/icons-material/Inventory';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import DemoControllerBar from 'src/orchestration/DemoControllerBar';
import { useOrchestration } from 'src/orchestration/useOrchestration';

export default function ResourcesHub() {
  const { state } = useOrchestration();
  const theme = useTheme();
  const navigate = useNavigate();

  // Aggregate all active reservations
  const allReservations = state.requests.flatMap((r) => r.reservations || []);

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
            Resources &amp; Spare Parts Management
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            3-tier inventory state machine: Available → Reserved → Consumed (Prevents over-allocation)
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3}>
        {/* Spare Parts Inventory Table */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <InventoryIcon color="primary" />
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Spare Parts Catalog &amp; 3-Tier Ledger
                  </Typography>
                </Stack>
              }
              subheader="Real-time stock balance tracking with automated threshold alerts"
            />
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Part Code &amp; Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="center">Total Stock</TableCell>
                    <TableCell align="center">Available</TableCell>
                    <TableCell align="center">Reserved</TableCell>
                    <TableCell align="center">Consumed</TableCell>
                    <TableCell>Warehouse Bin</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.parts.map((p) => {
                    const isLow = p.availableStock <= p.minThreshold;
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {p.name}
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {p.code} | ₹{p.unitCost.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>
                          {p.totalStock}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={p.availableStock}
                            color={isLow ? 'warning' : 'success'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={p.reservedStock}
                            color={p.reservedStock > 0 ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center" color="text.secondary">
                          {p.consumedStock}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {p.storageBin} ({p.warehouseLocation.split(' ')[0]})
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={isLow ? 'LOW STOCK' : 'NORMAL'}
                            color={isLow ? 'error' : 'success'}
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Active Reservations Ledger */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <BookmarkBorderIcon color="primary" />
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Active Reservations ({allReservations.length})
                  </Typography>
                </Stack>
              }
              subheader="Locked parts tied to in-progress or approved service tickets"
            />
            <Divider />
            <CardContent>
              {allReservations.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No active parts currently locked in reservation.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {allReservations.map((res) => (
                    <Paper
                      key={res.id}
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
                          {res.partName}
                        </Typography>
                        <Chip
                          size="small"
                          label={res.status}
                          color={res.status === 'CONSUMED' ? 'default' : 'warning'}
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Reserved: {res.quantityReserved} unit(s) at {res.reservedAt}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
