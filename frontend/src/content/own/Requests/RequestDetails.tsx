import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Link,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import CheckTwoToneIcon from '@mui/icons-material/CheckTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import ClearTwoToneIcon from '@mui/icons-material/ClearTwoTone';
import Request, { PreApprovalValidationResult } from '../../../models/owns/request';
import { getPriorityLabel } from '../../../utils/formatters';
import { useDispatch } from '../../../store';
import {
  approveRequest,
  cancelRequest,
  editRequest,
  getPreApprovalValidation
} from '../../../slices/request';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAssetUrl,
  getLocationUrl,
  getTeamUrl,
  getUserUrl
} from '../../../utils/urlPaths';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import ImageViewer from 'react-simple-image-viewer';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import FilesList from '../components/FilesList';
import RequestCancellationModal from './RequestCancellationModal';
import BasicField from '../components/BasicField';
import { AssetStatus, assetStatuses } from '../../../models/owns/asset';
import { getCustomFieldValuesForDetails } from '../type';
import PreApprovalValidationCard from './PreApprovalValidationCard';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import RequestPartsSection from './RequestPartsSection';

interface RequestDetailsProps {
  request: Request;
  handleOpenUpdate: () => void;
  handleOpenDelete: () => void;
  onClose: () => void;
}

export default function RequestDetails({
  request,
  handleOpenUpdate,
  handleOpenDelete,
  onClose
}: RequestDetailsProps) {
  const [approving, setApproving] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<PreApprovalValidationResult | null>(null);
  const [validating, setValidating] = useState<boolean>(false);
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const [showAssetStatuses, setShowAssetStatuses] = useState<boolean>(false);
  const [selectedAssetStatus, setSelectedAssetStatus] = useState<AssetStatus>(
    'INSPECTION_SCHEDULED'
  );
  const {
    hasEditPermission,
    hasDeletePermission,
    hasViewPermission,
    hasCreatePermission,
    user
  } = useAuth();
  const navigate = useNavigate();
  const { getFormattedDate, getUserNameById } = useContext(
    CompanySettingsContext
  );
  const [isImageViewerOpen, setIsImageViewerOpen] = useState<boolean>(false);
  const [openCancellationModal, setOpenCancellationModal] =
    useState<boolean>(false);

  const loadValidation = () => {
    if (request && request.id) {
      setValidating(true);
      dispatch(getPreApprovalValidation(request.id))
        .then((result) => setValidationResult(result))
        .catch(() => setValidationResult(null))
        .finally(() => setValidating(false));
    }
  };

  const [canReserveParts, setCanReserveParts] = useState<boolean>(true);
  const [hasShortage, setHasShortage] = useState<boolean>(false);
  const { showSnackBar } = useContext(CustomSnackBarContext);

  // Re-run validation when the request changes or its parts' availability flips,
  // since the validation includes a spare-parts check.
  useEffect(() => {
    loadValidation();
  }, [request?.id, hasShortage]);

  // Stable callback, so the parts section doesn't refetch availability on every render.
  const handleAvailabilityChange = useCallback(
    (canReserve: boolean, shortages: any[]) => {
      setCanReserveParts(canReserve);
      setHasShortage(shortages.length > 0);
    },
    []
  );

  const onApprove = () => {
    setApproving(true);
    dispatch(
      approveRequest(request.id, request.asset ? selectedAssetStatus : null)
    )
      .then((workOrderId) => {
        showSnackBar('✓ Request Approved & Parts Reserved', 'success');
        navigate(`/app/work-orders/${workOrderId}`);
      })
      .catch((err: any) => {
        const data = err?.response?.data;
        if (data?.status === 'PART_SHORTAGE') {
          showSnackBar(
            '🔴 PART SHORTAGE: Request cannot be approved until all required parts are available.',
            'error'
          );
        } else {
          showSnackBar(err?.response?.data?.message || 'Approval failed', 'error');
        }
      })
      .finally(() => setApproving(false));
  };

  const isApprovalBlocked = validationResult && !validationResult.valid;

  const fieldsToRender = (
    request: Request
  ): { label: string; value: string | number }[] => [
    {
      label: t('contact'),
      value: request.contact
    },
    {
      label: t('description'),
      value: request.description
    },
    {
      label: t('id'),
      value: request.customId
    },
    {
      label: t('priority'),
      value: request.priority
    },
    {
      label: t('due_date'),
      value: getFormattedDate(request.dueDate)
    },
    {
      label: t('estimated_start_date'),
      value: getFormattedDate(request.estimatedStartDate)
    },
    {
      label: t('estimated_duration'),
      value: !!request.estimatedDuration
        ? t('estimated_hours_in_text', { hours: request.estimatedDuration })
        : null
    },
    {
      label: t('category'),
      value: request.category?.name
    },
    {
      label: t('feedback'),
      value: request.cancellationReason
    },
    {
      label: t('created_at'),
      value: getFormattedDate(request.createdAt)
    },
    ...getCustomFieldValuesForDetails(
      request.customFieldValues,
      getFormattedDate
    )
  ];
  return (
    <Grid
      container
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
      padding={4}
    >
      <Grid
        item
        xs={12}
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h2">{request?.title}</Typography>
          {request?.cancelled && (
            <Typography variant="h5">{t('cancelled')}</Typography>
          )}
        </Box>
        <Box>
          {!request.cancelled &&
            hasEditPermission(PermissionEntity.REQUESTS, request) && (
              <IconButton
                style={{ marginRight: 10 }}
                onClick={handleOpenUpdate}
              >
                <EditTwoToneIcon color="primary" />
              </IconButton>
            )}
          {hasDeletePermission(PermissionEntity.REQUESTS, request) && (
            <IconButton onClick={handleOpenDelete}>
              <DeleteTwoToneIcon color="error" />
            </IconButton>
          )}
        </Box>
      </Grid>
      {!request.workOrder && !request.cancelled && (
        <Grid item xs={12}>
          <PreApprovalValidationCard
            validationResult={validationResult}
            loading={validating}
            onRevalidate={loadValidation}
          />
        </Grid>
      )}
      {!showAssetStatuses ? (
        !request.workOrder &&
        !request.cancelled &&
        (hasViewPermission(PermissionEntity.SETTINGS) ||
          user.role.code === 'LIMITED_ADMIN') &&
        hasCreatePermission(PermissionEntity.WORK_ORDERS) && (
          <>
            <Divider />
            <Grid
              item
              xs={12}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'center'
              }}
            >
              <Button
                startIcon={<ClearTwoToneIcon />}
                onClick={() => setOpenCancellationModal(true)}
                variant="outlined"
              >
                {t('reject')}
              </Button>
              {hasShortage ? (
                <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                  <Typography variant="caption" color="error.main" fontWeight="bold">
                    ⚠ Part shortage detected
                  </Typography>
                  <Button
                    variant="contained"
                    color="error"
                    disabled={true}
                    startIcon={<ClearTwoToneIcon />}
                  >
                    {t('cannot_approve') || 'Shortage — Cannot Approve'}
                  </Button>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                  <Typography variant="caption" color="success.main" fontWeight="bold">
                    ✓ All parts available
                  </Typography>
                  <Tooltip title={isApprovalBlocked ? "Approval is blocked because pre-approval validation failed" : ""}>
                    <span>
                  <Button
                    disabled={Boolean(isApprovalBlocked)}
                    startIcon={
                      approving ? (
                        <CircularProgress size="1rem" sx={{ color: 'white' }} />
                      ) : (
                        <CheckTwoToneIcon />
                      )
                    }
                    onClick={() => {
                      if (request.asset) setShowAssetStatuses(true);
                      else onApprove();
                    }}
                    variant="contained"
                    color="primary"
                  >
                    {t('approve_and_reserve') || 'APPROVE & RESERVE'}
                  </Button>
                    </span>
                  </Tooltip>
                </Box>
              )}
            </Grid>
          </>
        )
      ) : (
        <Stack direction={'column'} spacing={2}>
          <Box>
            <Typography fontWeight={'bold'} gutterBottom>
              {t('asset_status')}
            </Typography>
            <Select
              value={selectedAssetStatus}
              onChange={(event) => {
                setSelectedAssetStatus(event.target.value as AssetStatus);
              }}
            >
              {assetStatuses.map((assetStatusConfig) => (
                <MenuItem
                  key={assetStatusConfig.status}
                  value={assetStatusConfig.status}
                >
                  {t(assetStatusConfig.status)}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Stack direction={'row'} spacing={4}>
            <Button
              onClick={() => setShowAssetStatuses(false)}
              variant={'outlined'}
            >
              {t('go_back')}
            </Button>
            <Button
              disabled={Boolean(isApprovalBlocked) || hasShortage}
              startIcon={
                approving ? (
                  <CircularProgress size="1rem" sx={{ color: 'white' }} />
                ) : (
                  <CheckTwoToneIcon />
                )
              }
              variant={'contained'}
              onClick={onApprove}
            >
              {t('approve_and_reserve') || 'APPROVE & RESERVE'}
            </Button>
          </Stack>
        </Stack>
      )}
      {request.workOrder && (
        <Grid item xs={12}>
          <Alert severity="success" sx={{ width: '100%' }}>
            ✓ Request Approved &bull; Parts Reserved &bull; Work Order:{' '}
            <Link href={`/app/work-orders/${request.workOrder.id}`} sx={{ fontWeight: 'bold' }}>
              {request.workOrder.customId || `WO-${request.workOrder.id}`}
            </Link>
          </Alert>
        </Grid>
      )}
      <Divider />
      <Grid item xs={12}>
        <Box>
          <Typography sx={{ mt: 2, mb: 1 }} variant="h4">
            {t('request_details')}
          </Typography>
          <Grid container spacing={2}>
            <>
              {request.image && (
                <Grid
                  item
                  xs={12}
                  lg={12}
                  display="flex"
                  justifyContent="center"
                >
                  <img
                    src={request.image.url}
                    style={{ borderRadius: 5, height: 250, cursor: 'pointer' }}
                    onClick={() => setIsImageViewerOpen(true)}
                  />
                </Grid>
              )}
              {request.requestPortal && (
                <Box
                  sx={{
                    mt: 1,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center'
                  }}
                >
                  <Alert severity={'info'}>
                    {t('requested_from_portal')}{' '}
                    {
                      <Link
                        href={`/app/settings/features/request-portals/${request.requestPortal.id}`}
                      >
                        {request.requestPortal.title}
                      </Link>
                    }
                  </Alert>
                </Box>
              )}
              {fieldsToRender(request).map((field) => (
                <BasicField
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  isPriority={field.label === t('priority')}
                  {...field}
                />
              ))}
              {request?.createdBy && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.colors.alpha.black[70] }}
                  >
                    {t('requested_by')}
                  </Typography>
                  <Link variant="h6" href={getUserUrl(request.createdBy)}>
                    {getUserNameById(request.createdBy)}
                  </Link>
                </Grid>
              )}
              {request?.asset && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.colors.alpha.black[70] }}
                  >
                    {t('asset')}
                  </Typography>
                  <Link variant="h6" href={getAssetUrl(request.asset.id)}>
                    {request.asset.name}
                  </Link>
                </Grid>
              )}
              {request?.location && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.colors.alpha.black[70] }}
                  >
                    {t('location')}
                  </Typography>
                  <Link variant="h6" href={getLocationUrl(request.location.id)}>
                    {request.location.name}
                  </Link>
                </Grid>
              )}
              {request?.primaryUser && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.colors.alpha.black[70] }}
                  >
                    {t('assigned_to')}
                  </Typography>
                  <Link variant="h6" href={getUserUrl(request.primaryUser.id)}>
                    {`${request.primaryUser.firstName} ${request.primaryUser.lastName}`}
                  </Link>
                </Grid>
              )}
              {request?.team && (
                <Grid item xs={12} lg={6}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.colors.alpha.black[70] }}
                  >
                    {t('team')}
                  </Typography>
                  <Link variant="h6" href={getTeamUrl(request.team.id)}>
                    {request.team.name}
                  </Link>
                </Grid>
              )}
              {!!request.files.length && (
                <Grid item xs={12} lg={12}>
                  <Typography
                    variant="h6"
                    sx={{ color: theme.colors.alpha.black[70] }}
                  >
                    {t('files')}
                  </Typography>
                  <FilesList
                    confirmMessage={t(
                      'Are you sure you want to remove this file from this Request ?'
                    )}
                    removeDisabled={
                      !hasEditPermission(PermissionEntity.REQUESTS, request)
                    }
                    files={request.files}
                    onRemove={(id: number) => {
                      dispatch(
                        editRequest(request.id, {
                          ...request,
                          files: request.files.filter((f) => f.id !== id)
                        })
                      );
                    }}
                  />
                </Grid>
              )}
            </>
          </Grid>
          <RequestPartsSection
            request={request}
            canEdit={hasEditPermission(PermissionEntity.REQUESTS, request)}
            onAvailabilityChange={handleAvailabilityChange}
          />
        </Box>
      </Grid>
      {isImageViewerOpen && (
        <div style={{ zIndex: 100 }}>
          <ImageViewer
            src={[request.image.url]}
            currentIndex={0}
            onClose={() => setIsImageViewerOpen(false)}
            disableScroll={true}
            backgroundStyle={{
              backgroundColor: 'rgba(0,0,0,0.9)'
            }}
            closeOnClickOutside={true}
          />
        </div>
      )}
      <RequestCancellationModal
        requestId={request.id}
        open={openCancellationModal}
        onClose={() => setOpenCancellationModal(false)}
        onCancel={() => {
          setOpenCancellationModal(false);
          onClose();
        }}
      />
    </Grid>
  );
}
