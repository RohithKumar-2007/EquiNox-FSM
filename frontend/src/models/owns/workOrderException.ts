import { UserMiniDTO } from '../user';
import { Priority } from './workOrder';

export type ExceptionType =
  | 'TECH_UNAVAILABLE'
  | 'PART_SHORTAGE'
  | 'SLA_BREACH'
  | 'DUE_DATE_BREACH'
  | 'DOUBLE_BOOKING'
  | 'CAPACITY_CONFLICT';

export type ExceptionStatus = 'OPEN' | 'RESOLVED' | 'MANUAL_INTERVENTION_REQUIRED';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WorkOrderException {
  id: number;
  workOrderId: number;
  workOrderTitle: string;
  workOrderCustomId: string;
  workOrderPriority: Priority;
  workOrderStatus: string;
  exceptionType: ExceptionType;
  status: ExceptionStatus;
  severity: ExceptionSeverity;
  detectedAt: string;
  description: string;
  previousTechnician: UserMiniDTO | null;
  replacementTechnician: UserMiniDTO | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  autoResolved: boolean;
  retryCount: number;
  notificationSent: boolean;
  createdAt: string;
}

export interface ExceptionStats {
  total: number;
  open: number;
  critical: number;
  autoResolved: number;
  manualInterventionRequired: number;
}
