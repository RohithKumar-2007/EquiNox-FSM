import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import WarningAmberTwoToneIcon from '@mui/icons-material/WarningAmberTwoTone';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import ShoppingCartTwoToneIcon from '@mui/icons-material/ShoppingCartTwoTone';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import Inventory2TwoToneIcon from '@mui/icons-material/Inventory2TwoTone';
import Request from '../../../models/owns/request';
import PartQuantity from '../../../models/owns/partQuantity';
import { PartMiniDTO } from '../../../models/owns/part';
import { useDispatch, useSelector } from '../../../store';
import {
  deletePartQuantity,
  editRequestPartQuantities,
  getPartQuantitiesByRequest,
  getRequestPartsAvailability,
  RequestPartsAvailability
} from '../../../slices/partQuantity';
import SelectParts from '../components/form/SelectParts';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';

interface RequestPartsSectionProps {
  request: Request;
  canEdit: boolean;
  onAvailabilityChange?: (canReserve: boolean, shortageList: any[]) => void;
}

export default function RequestPartsSection({
  request,
  canEdit,
  onAvailabilityChange
}: RequestPartsSectionProps) {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { getFormattedCurrency } = useContext(CompanySettingsContext);

  const { partQuantitiesByRequest, loadingPartQuantities } = useSelector(
    (state) => state.partQuantities
  );

  const [availability, setAvailability] =
    useState<RequestPartsAvailability | null>(null);
  const [loadingAvailability, setLoadingAvailability] =
    useState<boolean>(false);
  const [openSelectParts, setOpenSelectParts] = useState<boolean>(false);
  const [openShortageModal, setOpenShortageModal] = useState<boolean>(false);

  const partQuantities: PartQuantity[] =
    partQuantitiesByRequest[request.id] || [];

  const refreshAvailability = useCallback(() => {
    if (!request?.id) return;
    setLoadingAvailability(true);
    getRequestPartsAvailability(request.id)
      .then((data) => {
        setAvailability(data);
        if (onAvailabilityChange) {
          const shortages = data.parts.filter((p) => p.status === 'SHORTAGE');
          onAvailabilityChange(data.canReserve, shortages);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch parts availability', err);
      })
      .finally(() => setLoadingAvailability(false));
  }, [request?.id, onAvailabilityChange]);

  useEffect(() => {
    if (request?.id) {
      dispatch(getPartQuantitiesByRequest(request.id));
      refreshAvailability();
    }
  }, [request?.id, dispatch, refreshAvailability]);

  const handleQuantityChange = (pq: PartQuantity, newQtyStr: string) => {
    const val = Number(newQtyStr);
    if (isNaN(val) || val < 0) return;
    const updated = partQuantities.map((item) => ({
      part: item.part,
      quantity: item.id === pq.id ? val : item.quantity
    }));
    dispatch(editRequestPartQuantities(request.id, updated))
      .then(() => refreshAvailability())
      .catch(() => showSnackBar(t('error_occurred'), 'error'));
  };

  const handleDeletePart = (pq: PartQuantity) => {
    if (window.confirm(t('confirm_delete_row'))) {
      dispatch(deletePartQuantity(pq.id))
        .then(() => refreshAvailability())
        .catch(() => showSnackBar(t('error_occurred'), 'error'));
    }
  };

  const handleAddParts = (newParts: PartMiniDTO[]) => {
    setOpenSelectParts(false);
    const existingMap = new Map<number, number>();
    partQuantities.forEach((pq) =>
      existingMap.set(pq.part.id, pq.quantity || 1)
    );

    const updated = newParts.map((p) => ({
      part: p as any,
      quantity: existingMap.get(p.id) || 1
    }));

    dispatch(editRequestPartQuantities(request.id, updated))
      .then(() => {
        showSnackBar('Required parts updated', 'success');
        refreshAvailability();
      })
      .catch(() => showSnackBar(t('error_occurred'), 'error'));
  };

  const shortageParts =
    availability?.parts?.filter((p) => p.status === 'SHORTAGE') || [];
  const isApproved = !!request.workOrder;
  const isCancelled = !!request.cancelled;
  const isEditable = canEdit && !isApproved && !isCancelled;

  return (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Inventory2TwoToneIcon color="primary" />
          <Typography variant="h3">
            {t('required_parts') || 'Required Parts & Reservation'}
          </Typography>
          {loadingAvailability && <CircularProgress size={16} />}
        </Box>
        {isEditable && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddTwoToneIcon />}
            onClick={() => setOpenSelectParts(true)}
          >
            {t('add_part') || 'Add Required Part'}
          </Button>
        )}
      </Box>

      {/* Part Shortage Banner Card */}
      {shortageParts.length > 0 && !isApproved && (
        <Card
          sx={{
            mb: 2,
            border: '2px solid',
            borderColor: 'error.main',
            backgroundColor: 'rgba(211, 47, 47, 0.04)'
          }}
        >
          <CardContent sx={{ pb: '16px !important' }}>
            <Box display="flex" alignItems="flex-start" gap={1.5}>
              <WarningAmberTwoToneIcon
                color="error"
                sx={{ fontSize: 32, mt: 0.5 }}
              />
              <Box flex={1}>
                <Typography variant="h4" color="error.dark" gutterBottom>
                  🔴 PART SHORTAGE DETECTED
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  This service request cannot proceed or be approved until the
                  following parts are restocked in inventory:
                </Typography>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  {shortageParts.map((shortage) => (
                    <Box
                      key={shortage.partId}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        p: 1.25,
                        backgroundColor: 'background.paper',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'error.light'
                      }}
                    >
                      <Box>
                        <Link
                          href={`/app/inventory/parts/${shortage.partId}`}
                          target="_blank"
                          variant="subtitle1"
                          fontWeight="bold"
                        >
                          {shortage.name}
                        </Link>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Available in Stock: {shortage.available} &nbsp;|&nbsp; Required:{' '}
                          {shortage.required}
                        </Typography>
                      </Box>
                      <Chip
                        label={`Shortage: -${shortage.shortage}`}
                        color="error"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  ))}
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<ShoppingCartTwoToneIcon />}
                    onClick={() => navigate('/app/purchase-orders')}
                  >
                    {t('create_purchase_order') || 'Create Purchase Order'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setOpenShortageModal(true)}
                  >
                    {t('view_details') || 'View Shortage Details'}
                  </Button>
                </Stack>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Parts Table */}
      {partQuantities.length === 0 ? (
        <Alert severity="info" sx={{ mt: 1 }}>
          {t('no_parts_required') ||
            'No spare parts have been specified for this request. Parts can be added prior to approval.'}
        </Alert>
      ) : (
        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('part') || 'Part'}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">
                  {t('required') || 'Required Qty'}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">
                  {t('available_stock') || 'Available in Stock'}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">
                  {t('status') || 'Status'}
                </TableCell>
                {isEditable && (
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">
                    {t('actions') || 'Actions'}
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {partQuantities.map((pq) => {
                const availInfo = availability?.parts?.find(
                  (p) => p.partId === pq.part.id
                );
                const isShort = availInfo?.status === 'SHORTAGE';
                const isRes = pq.reservationStatus === 'RESERVED';
                const isCons = pq.reservationStatus === 'CONSUMED';
                const isRel = pq.reservationStatus === 'RELEASED';

                return (
                  <TableRow key={pq.id} hover>
                    <TableCell>
                      <Link
                        href={`/app/inventory/parts/${pq.part.id}`}
                        target="_blank"
                        variant="subtitle2"
                        fontWeight="bold"
                      >
                        {pq.part.name}
                      </Link>
                      {pq.part.description && (
                        <Typography variant="caption" display="block" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                          {pq.part.description}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {isEditable ? (
                        <TextField
                          type="number"
                          size="small"
                          defaultValue={pq.quantity}
                          inputProps={{ min: 1, style: { textAlign: 'center', width: 60 } }}
                          onBlur={(e) => handleQuantityChange(pq, e.target.value)}
                        />
                      ) : (
                        <Typography variant="body2" fontWeight="bold">
                          {pq.quantity}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={isShort ? 'error.main' : 'text.primary'}
                      >
                        {availInfo != null
                          ? `${availInfo.available} (Stock: ${availInfo.stock})`
                          : '-'}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      {isCons ? (
                        <Chip
                          label="✓ CONSUMED"
                          color="success"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : isRes ? (
                        <Chip
                          label="✓ RESERVED"
                          color="info"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : isRel ? (
                        <Chip
                          label="RELEASED"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : isShort ? (
                        <Chip
                          label={`✗ SHORTAGE (-${availInfo?.shortage})`}
                          color="error"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : (
                        <Chip
                          label="✓ AVAILABLE"
                          color="success"
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                    </TableCell>

                    {isEditable && (
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeletePart(pq)}
                        >
                          <DeleteTwoToneIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Select Parts Modal */}
      {openSelectParts && (
        <SelectParts
          selected={partQuantities.map((pq) => pq.part.id)}
          onChange={handleAddParts}
        />
      )}

      {/* Shortage Dialog Details */}
      <Dialog
        open={openShortageModal}
        onClose={() => setOpenShortageModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          🔴 Part Shortage Report
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The following parts do not have sufficient unreserved inventory to
            satisfy Request {request.customId || `REQ-${request.id}`}:
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Part</TableCell>
                <TableCell align="center">Required</TableCell>
                <TableCell align="center">Available</TableCell>
                <TableCell align="center">Shortage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shortageParts.map((item) => (
                <TableRow key={item.partId}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{item.name}</TableCell>
                  <TableCell align="center">{item.required}</TableCell>
                  <TableCell align="center">{item.available}</TableCell>
                  <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                    {item.shortage}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShortageModal(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setOpenShortageModal(false);
              navigate('/app/purchase-orders');
            }}
          >
            Create Purchase Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
