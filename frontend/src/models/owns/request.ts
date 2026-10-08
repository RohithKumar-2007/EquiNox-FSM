import WorkOrder, { WorkOrderMini } from './workOrder';
import { WorkOrderBase } from './workOrderBase';
import File from './file';

export type ValidationCheckStatus = 'PASS' | 'WARNING' | 'BLOCKED';

export interface ValidationCheck {
  code: string;
  name: string;
  status: ValidationCheckStatus;
  message: string;
  requiredQuantity?: number;
  availableQuantity?: number;
}

export interface PreApprovalValidationResult {
  requestId: number;
  customId: string;
  valid: boolean;
  validatedAt: string;
  checks: ValidationCheck[];
}

export default interface Request extends WorkOrderBase {
  cancelled: boolean;
  cancellationReason: string | null;
  audioDescription: File;
  workOrder: WorkOrderMini;
  customId: string;
  contact: string;
}

