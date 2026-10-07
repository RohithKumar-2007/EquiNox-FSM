// DataQuest 3.0 - Industrial Equipment Service Orchestration Platform Types

export type OrchestrationStatus =
  | 'NEW'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'VALIDATION_FAILED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ON_SITE'
  | 'IN_PROGRESS'
  | 'COMPLETION_SUBMITTED'
  | 'VERIFICATION'
  | 'COMPLETED';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type MachineOperationalStatus =
  | 'OPERATIONAL'
  | 'UNDER_MAINTENANCE'
  | 'DOWN'
  | 'CRITICAL_FAILURE'
  | 'DECOMMISSIONED';

export type ExceptionType =
  | 'TECHNICIAN_UNAVAILABLE'
  | 'PART_UNAVAILABLE'
  | 'RESOURCE_CONFLICT'
  | 'SLA_AT_RISK'
  | 'SLA_BREACHED'
  | 'APPROVAL_DELAY'
  | 'MACHINE_INELIGIBLE';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SlaHealthStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

export type UserRoleType = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'CUSTOMER';

export interface SiteLocation {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  contactPerson: string;
  contactPhone: string;
}

export interface IndustrialMachine {
  id: string;
  code: string; // e.g. M-104
  name: string; // e.g. Hydraulic Press
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  siteId: string;
  siteName: string;
  status: MachineOperationalStatus;
  eligibilityStatus: 'ELIGIBLE' | 'WARRANTY_EXPIRED' | 'INELIGIBLE';
  installationDate: string;
  lastServiceDate: string;
  nextServiceDate: string;
  activeRequestId?: string;
}

export interface SkillRequirement {
  id: string;
  name: string; // Hydraulics, Electrical, Mechanical, CNC, HVAC, Instrumentation
  category: string;
  minLevelRequired: number; // 1 to 5
}

export interface TechnicianProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  skills: {
    skillName: string;
    level: number; // 1 to 5
    certified: boolean;
  }[];
  currentLocation: {
    latitude: number;
    longitude: number;
    city: string;
  };
  isAvailable: boolean;
  currentWorkload: number; // Count of active jobs
  currentJobId?: string;
  rating: number; // 1.0 to 5.0
  activeStatus: 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SITE' | 'BUSY' | 'OFF_DUTY';
}

export interface SparePartItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unitCost: number;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  consumedStock: number;
  minThreshold: number;
  storageBin: string;
  warehouseLocation: string;
}

export interface PartReservation {
  id: string;
  requestId: string;
  partId: string;
  partName: string;
  quantityReserved: number;
  quantityConsumed: number;
  status: 'RESERVED' | 'CONSUMED' | 'RELEASED';
  reservedAt: string;
  consumedAt?: string;
}

export interface ServiceExceptionRecord {
  id: string;
  requestId: string;
  requestTitle: string;
  machineCode: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  description: string;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolutionAction?: string;
  suggestedAction: string;
  recommendedTechnicianId?: string;
  recommendedPartId?: string;
}

export interface ServiceAuditEvent {
  id: string;
  requestId: string;
  stepNumber: number;
  eventType: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRoleType;
  fromStatus: string;
  toStatus: string;
  summary: string;
  metadata?: Record<string, any>;
}

export interface TechnicianScoringBreakdown {
  technicianId: string;
  technicianName: string;
  totalScore: number;
  rank: number;
  isRecommended: boolean;
  skillScore: number;
  availabilityScore: number;
  locationScore: number;
  workloadScore: number;
  priorityScore: number;
  distanceKm: number;
  estimatedArrivalMins: number;
  reasons: string[];
}

export interface ValidationResult {
  isValid: boolean;
  machineEligible: boolean;
  machineMessage: string;
  siteValid: boolean;
  siteMessage: string;
  priorityValid: boolean;
  priorityMessage: string;
  skillIdentified: boolean;
  skillMessage: string;
  partAvailable: boolean;
  partMessage: string;
  slaCalculated: boolean;
  slaMinutes: number;
  slaMessage: string;
  timestamp: string;
}

export interface CompletionPackage {
  serviceReport: string;
  measurements: { parameter: string; value: string; unit: string; normalRange: string }[];
  workObservations: string;
  partsUsed: { partId: string; partName: string; quantity: number }[];
  toolsUsed: string[];
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  submittedAt: string;
  technicianNotes: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
}

export interface ServiceRequest {
  id: string;
  customId: string; // e.g. SR-1042
  title: string;
  description: string;
  machineId: string;
  machineCode: string;
  machineName: string;
  siteId: string;
  siteName: string;
  priority: RequestPriority;
  requiredSkill: string;
  status: OrchestrationStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  creatorRole: UserRoleType;
  contactName: string;
  contactPhone: string;

  // Validation
  validation?: ValidationResult;

  // Resource requirements
  requiredPartId?: string;
  requiredPartName?: string;
  requiredPartQuantity: number;
  requiredTools: string[];
  estimatedDurationHours: number;

  // Matching & Assignment
  scoringCandidates?: TechnicianScoringBreakdown[];
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedAt?: string;
  acceptedAt?: string;
  enRouteAt?: string;
  onSiteAt?: string;
  inProgressAt?: string;

  // Reservations
  reservations: PartReservation[];

  // SLA
  slaDurationMinutes: number;
  slaDeadline: string; // ISO string
  slaHealth: SlaHealthStatus;

  // Exceptions
  activeExceptions: ServiceExceptionRecord[];

  // Completion
  completionPackage?: CompletionPackage;

  // Audit
  auditTrail: ServiceAuditEvent[];
}
