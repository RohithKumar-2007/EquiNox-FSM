import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import api from '../utils/api';
import { WorkOrderException, ExceptionStats } from '../models/owns/workOrderException';

const basePath = 'work-order-exceptions';

interface WorkOrderExceptionState {
  exceptions: WorkOrderException[];
  workOrderExceptions: { [workOrderId: number]: WorkOrderException[] };
  stats: ExceptionStats | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: WorkOrderExceptionState = {
  exceptions: [],
  workOrderExceptions: {},
  stats: null,
  loading: false,
  actionLoading: false,
  error: null
};

const slice = createSlice({
  name: 'workOrderExceptions',
  initialState,
  reducers: {
    getExceptionsSuccess(state, action: PayloadAction<WorkOrderException[]>) {
      state.exceptions = action.payload;
      state.loading = false;
    },
    getStatsSuccess(state, action: PayloadAction<ExceptionStats>) {
      state.stats = action.payload;
    },
    getWorkOrderExceptionsSuccess(
      state,
      action: PayloadAction<{ workOrderId: number; exceptions: WorkOrderException[] }>
    ) {
      state.workOrderExceptions[action.payload.workOrderId] = action.payload.exceptions;
    },
    updateExceptionSuccess(state, action: PayloadAction<WorkOrderException>) {
      const updated = action.payload;
      state.exceptions = state.exceptions.map((ex) => (ex.id === updated.id ? updated : ex));
      if (updated.workOrderId && state.workOrderExceptions[updated.workOrderId]) {
        state.workOrderExceptions[updated.workOrderId] = state.workOrderExceptions[
          updated.workOrderId
        ].map((ex) => (ex.id === updated.id ? updated : ex));
      }
      state.actionLoading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setActionLoading(state, action: PayloadAction<boolean>) {
      state.actionLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
      state.actionLoading = false;
    }
  }
});

export const { reducer } = slice;

export const getExceptions = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.setLoading(true));
  try {
    const response = await api.get<WorkOrderException[]>(basePath);
    dispatch(slice.actions.getExceptionsSuccess(response));
  } catch (err: any) {
    dispatch(slice.actions.setError(err.message || 'Failed to fetch exceptions'));
  }
};

export const getExceptionStats = (): AppThunk => async (dispatch) => {
  try {
    const response = await api.get<ExceptionStats>(`${basePath}/stats`);
    dispatch(slice.actions.getStatsSuccess(response));
  } catch (err: any) {
    console.error('Failed to fetch exception stats', err);
  }
};

export const getExceptionsByWorkOrder = (workOrderId: number): AppThunk => async (dispatch) => {
  try {
    const response = await api.get<WorkOrderException[]>(`${basePath}/work-order/${workOrderId}`);
    dispatch(slice.actions.getWorkOrderExceptionsSuccess({ workOrderId, exceptions: response }));
  } catch (err: any) {
    console.error('Failed to fetch WO exceptions', err);
  }
};

export const resolveException =
  (id: number, resolutionNotes: string): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setActionLoading(true));
    try {
      const response = await api.post<WorkOrderException>(`${basePath}/${id}/resolve`, {
        resolutionNotes
      });
      dispatch(slice.actions.updateExceptionSuccess(response));
      dispatch(getExceptionStats());
      return response;
    } catch (err: any) {
      dispatch(slice.actions.setError(err.message || 'Failed to resolve exception'));
      throw err;
    }
  };

export const manualReassignException =
  (id: number, technicianId: number, notes?: string): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setActionLoading(true));
    try {
      const response = await api.post<WorkOrderException>(`${basePath}/${id}/reassign`, {
        technicianId,
        notes
      });
      dispatch(slice.actions.updateExceptionSuccess(response));
      dispatch(getExceptionStats());
      return response;
    } catch (err: any) {
      dispatch(slice.actions.setError(err.message || 'Failed to reassign technician'));
      throw err;
    }
  };

export const retryAutoReassign =
  (id: number): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setActionLoading(true));
    try {
      const response = await api.post<WorkOrderException>(`${basePath}/${id}/retry`, {});
      dispatch(slice.actions.updateExceptionSuccess(response));
      dispatch(getExceptionStats());
      return response;
    } catch (err: any) {
      dispatch(slice.actions.setError(err.message || 'Failed to retry auto reassignment'));
      throw err;
    }
  };

export const runSlaScan = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.setLoading(true));
  try {
    await api.post<WorkOrderException[]>(`${basePath}/scan`, {});
    dispatch(getExceptions());
    dispatch(getExceptionStats());
  } catch (err: any) {
    dispatch(slice.actions.setError(err.message || 'Failed to scan work orders'));
  }
};

export const simulateTechnicianUnavailable =
  (technicianId?: number, workOrderId?: number): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setActionLoading(true));
    try {
      const params = new URLSearchParams();
      if (technicianId) params.append('technicianId', technicianId.toString());
      if (workOrderId) params.append('workOrderId', workOrderId.toString());
      const query = params.toString() ? `?${params.toString()}` : '';

      const response = await api.post<WorkOrderException[]>(
        `${basePath}/simulate/technician-unavailable${query}`,
        {}
      );
      dispatch(getExceptions());
      dispatch(getExceptionStats());
      return response;
    } catch (err: any) {
      dispatch(slice.actions.setError(err.message || 'Simulation failed'));
      throw err;
    }
  };

export const simulatePartShortage =
  (workOrderId?: number, partName?: string): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setActionLoading(true));
    try {
      const params = new URLSearchParams();
      if (workOrderId) params.append('workOrderId', workOrderId.toString());
      if (partName) params.append('partName', partName);
      const query = params.toString() ? `?${params.toString()}` : '';

      const response = await api.post<WorkOrderException>(
        `${basePath}/simulate/part-shortage${query}`,
        {}
      );
      dispatch(getExceptions());
      dispatch(getExceptionStats());
      return response;
    } catch (err: any) {
      dispatch(slice.actions.setError(err.message || 'Simulation failed'));
      throw err;
    }
  };

export default slice;
