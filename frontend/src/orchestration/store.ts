// DataQuest 3.0 - Orchestration State Management Store
// Manages real-time state, 19-step workflow transitions, and localStorage persistence

import {
  IndustrialMachine,
  SiteLocation,
  SkillRequirement,
  TechnicianProfile,
  SparePartItem,
  ServiceRequest,
  ServiceExceptionRecord,
  UserRoleType,
  CompletionPackage,
  TechnicianScoringBreakdown
} from './types';
import {
  INITIAL_MACHINES,
  INITIAL_PARTS,
  INITIAL_REQUESTS,
  INITIAL_SITES,
  INITIAL_SKILLS,
  INITIAL_TECHNICIANS
} from './seedData';
import {
  validateServiceRequest,
  rankTechniciansForRequest,
  detectResourceConflicts,
  evaluateSlaHealth,
  createTechnicianDropoutException,
  createAuditLogEntry
} from './engines';

const STORAGE_KEY = 'DATAQUEST_ORCHESTRATION_STATE_V1';

export interface OrchestrationState {
  currentRole: UserRoleType;
  machines: IndustrialMachine[];
  sites: SiteLocation[];
  skills: SkillRequirement[];
  technicians: TechnicianProfile[];
  parts: SparePartItem[];
  requests: ServiceRequest[];
  exceptions: ServiceExceptionRecord[];
}

type Listener = () => void;

class OrchestrationStore {
  private state: OrchestrationState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = this.loadFromStorage() || this.getDefaultState();
  }

  private getDefaultState(): OrchestrationState {
    return {
      currentRole: 'MANAGER',
      machines: [...INITIAL_MACHINES],
      sites: [...INITIAL_SITES],
      skills: [...INITIAL_SKILLS],
      technicians: [...INITIAL_TECHNICIANS],
      parts: [...INITIAL_PARTS],
      requests: [...INITIAL_REQUESTS],
      exceptions: []
    };
  }

  private loadFromStorage(): OrchestrationState | null {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        return JSON.parse(serialized);
      }
    } catch (e) {
      console.warn('Failed to load orchestration state from localStorage', e);
    }
    return null;
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save orchestration state to localStorage', e);
    }
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): OrchestrationState {
    return this.state;
  }

  public setRole(role: UserRoleType) {
    this.state.currentRole = role;
    this.notify();
  }

  public resetDemoData() {
    this.state = this.getDefaultState();
    this.notify();
  }

  // ==========================================
  // WORKFLOW ACTION 1: CREATE REQUEST (Step 1)
  // ==========================================
  public createRequest(data: {
    machineId: string;
    siteId: string;
    title: string;
    description: string;
    priority: any;
    requiredSkill: string;
    requiredPartId?: string;
    requiredPartQuantity?: number;
    requiredTools?: string[];
    contactName?: string;
    contactPhone?: string;
  }): ServiceRequest {
    const machine = this.state.machines.find((m) => m.id === data.machineId);
    const site = this.state.sites.find((s) => s.id === data.siteId);
    const part = this.state.parts.find((p) => p.id === data.requiredPartId);

    const nextIdNumber = 1042 + this.state.requests.length;
    const customId = `SR-${nextIdNumber}`;
    const id = `sr-${nextIdNumber}`;

    const slaDurationMinutes =
      data.priority === 'URGENT'
        ? 60
        : data.priority === 'HIGH'
        ? 240
        : data.priority === 'MEDIUM'
        ? 1440
        : 4320;

    const newRequest: ServiceRequest = {
      id,
      customId,
      title: data.title,
      description: data.description,
      machineId: data.machineId,
      machineCode: machine?.code || 'M-UNKNOWN',
      machineName: machine?.name || 'Machine',
      siteId: data.siteId,
      siteName: site?.name || 'Site',
      priority: data.priority,
      requiredSkill: data.requiredSkill,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.contactName || 'Plant Operator',
      creatorRole: 'CUSTOMER',
      contactName: data.contactName || 'Operations Team',
      contactPhone: data.contactPhone || '+91 98401 00000',
      requiredPartId: data.requiredPartId,
      requiredPartName: part?.name,
      requiredPartQuantity: data.requiredPartQuantity || 1,
      requiredTools: data.requiredTools || ['Standard Diagnostic Rig'],
      estimatedDurationHours: 1.5,
      slaDurationMinutes,
      slaDeadline: new Date(Date.now() + slaDurationMinutes * 60 * 1000).toISOString(),
      slaHealth: 'ON_TRACK',
      reservations: [],
      activeExceptions: [],
      auditTrail: [
        createAuditLogEntry(
          id,
          1,
          'REQUEST_CREATED',
          '-',
          'NEW',
          data.contactName || 'Plant Operator',
          'CUSTOMER',
          `Service Request ${customId} registered for ${machine?.code || 'Machine'} (${data.title})`
        )
      ]
    };

    if (machine) {
      machine.status = 'DOWN';
      machine.activeRequestId = id;
    }

    this.state.requests.unshift(newRequest);
    this.notify();
    return newRequest;
  }

  // ==========================================
  // WORKFLOW ACTION 2: VALIDATE (Step 2 & 3)
  // ==========================================
  public validateRequest(requestId: string): ServiceRequest | undefined {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return undefined;

    const machine = this.state.machines.find((m) => m.id === request.machineId);
    const site = this.state.sites.find((s) => s.id === request.siteId);
    const part = this.state.parts.find((p) => p.id === request.requiredPartId);

    const validation = validateServiceRequest(
      request,
      machine,
      site,
      part,
      this.state.skills
    );
    request.validation = validation;

    // Compute candidate recommendations
    request.scoringCandidates = rankTechniciansForRequest(
      request,
      this.state.technicians,
      site
    );

    if (validation.isValid) {
      request.status = 'VALIDATED';
      request.auditTrail.push(
        createAuditLogEntry(
          request.id,
          2,
          'AUTOMATED_VALIDATION_PASSED',
          'NEW',
          'VALIDATED',
          'System Validation Engine',
          'ADMIN',
          '5-point automated check passed: Machine, Site, Skill, Part, and SLA verified.'
        )
      );
      request.auditTrail.push(
        createAuditLogEntry(
          request.id,
          3,
          'RESOURCE_REQUIREMENTS_IDENTIFIED',
          'VALIDATED',
          'VALIDATED',
          'System Resource Planner',
          'ADMIN',
          `Resource plan finalized: Skill: ${request.requiredSkill}, Part: ${request.requiredPartName || 'None'}, Tools: ${request.requiredTools.join(', ')}`
        )
      );
    } else {
      request.status = 'VALIDATION_FAILED';
      request.auditTrail.push(
        createAuditLogEntry(
          request.id,
          2,
          'VALIDATION_FAILED',
          'NEW',
          'VALIDATION_FAILED',
          'System Validation Engine',
          'ADMIN',
          'Validation failed. Exception logged requiring triage.'
        )
      );
    }

    request.updatedAt = new Date().toISOString();
    this.notify();
    return request;
  }

  // ==========================================
  // WORKFLOW ACTION 3: RESERVE PARTS (Step 5)
  // ==========================================
  public reservePart(requestId: string, partId: string, quantity: number) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const part = this.state.parts.find((p) => p.id === partId);
    if (!request || !part || part.availableStock < quantity) return false;

    part.availableStock -= quantity;
    part.reservedStock += quantity;

    const reservation = {
      id: `res-${Date.now()}`,
      requestId,
      partId,
      partName: part.name,
      quantityReserved: quantity,
      quantityConsumed: 0,
      status: 'RESERVED' as const,
      reservedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    request.reservations.push(reservation);
    request.auditTrail.push(
      createAuditLogEntry(
        requestId,
        5,
        'PART_RESERVED',
        request.status,
        request.status,
        'Inventory Manager',
        'MANAGER',
        `Reserved ${quantity}x ${part.name} (Stock: ${part.totalStock}, Reserved: ${part.reservedStock}, Available: ${part.availableStock})`
      )
    );

    this.notify();
    return true;
  }

  // ==========================================
  // WORKFLOW ACTION 4: APPROVE & ASSIGN (Step 7 & 8)
  // ==========================================
  public approveAndAssign(
    requestId: string,
    technicianId: string,
    managerName = 'Operations Manager'
  ) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const tech = this.state.technicians.find((t) => t.id === technicianId);
    if (!request || !tech) return;

    // Conflict check
    const part = this.state.parts.find((p) => p.id === request.requiredPartId);
    const conflict = detectResourceConflicts(tech, request, part);
    if (conflict.hasConflict) {
      alert(`Conflict Detected: ${conflict.conflictMessage}`);
    }

    // Auto-reserve part if not yet reserved
    if (request.requiredPartId && request.reservations.length === 0) {
      this.reservePart(
        request.id,
        request.requiredPartId,
        request.requiredPartQuantity
      );
    }

    request.status = 'ASSIGNED';
    request.assignedTechnicianId = tech.id;
    request.assignedTechnicianName = tech.name;
    request.assignedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    tech.activeStatus = 'ASSIGNED';
    tech.currentJobId = request.id;

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        7,
        'MANAGER_APPROVED',
        'VALIDATED',
        'APPROVED',
        managerName,
        'MANAGER',
        `Manager approved request and selected recommended candidate: ${tech.name}`
      )
    );

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        8,
        'TECHNICIAN_ASSIGNED',
        'APPROVED',
        'ASSIGNED',
        managerName,
        'MANAGER',
        `Technician ${tech.name} officially assigned. Dispatch alert sent to technician mobile HUD.`
      )
    );

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        9,
        'NOTIFICATION_DISPATCHED',
        'ASSIGNED',
        'ASSIGNED',
        'Notification Service',
        'ADMIN',
        `Urgent dispatch notification sent to ${tech.name} (${tech.phone})`
      )
    );

    this.notify();
  }

  // ==========================================
  // WORKFLOW ACTION 5: ACCEPT / DECLINE (Step 10)
  // ==========================================
  public acceptJob(requestId: string) {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return;

    request.status = 'ACCEPTED';
    request.acceptedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        10,
        'TECHNICIAN_ACCEPTED',
        'ASSIGNED',
        'ACCEPTED',
        request.assignedTechnicianName || 'Technician',
        'TECHNICIAN',
        'Technician accepted urgent job assignment on mobile terminal.'
      )
    );

    this.notify();
  }

  // ==========================================
  // WORKFLOW ACTION 6: TRAVEL TELEMETRY (Step 11)
  // ==========================================
  public updateTravelStatus(requestId: string, newStatus: 'EN_ROUTE' | 'ON_SITE') {
    const request = this.state.requests.find((r) => r.id === requestId);
    const tech = this.state.technicians.find((t) => t.id === request?.assignedTechnicianId);
    if (!request) return;

    const prevStatus = request.status;
    request.status = newStatus;

    if (newStatus === 'EN_ROUTE') {
      request.enRouteAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (tech) tech.activeStatus = 'EN_ROUTE';
      request.auditTrail.push(
        createAuditLogEntry(
          request.id,
          11,
          'TECHNICIAN_EN_ROUTE',
          prevStatus,
          'EN_ROUTE',
          request.assignedTechnicianName || 'Technician',
          'TECHNICIAN',
          'Technician dispatched and en route to customer plant site.'
        )
      );
    } else if (newStatus === 'ON_SITE') {
      request.onSiteAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (tech) tech.activeStatus = 'ON_SITE';
      request.auditTrail.push(
        createAuditLogEntry(
          request.id,
          11,
          'TECHNICIAN_ON_SITE',
          prevStatus,
          'ON_SITE',
          request.assignedTechnicianName || 'Technician',
          'TECHNICIAN',
          'Technician arrived on site at Chennai Plant A and cleared security.'
        )
      );
    }

    this.notify();
  }

  // ==========================================
  // WORKFLOW ACTION 7: START SERVICE (Step 12)
  // ==========================================
  public startService(requestId: string) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const tech = this.state.technicians.find((t) => t.id === request?.assignedTechnicianId);
    if (!request) return;

    const prevStatus = request.status;
    request.status = 'IN_PROGRESS';
    request.inProgressAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (tech) tech.activeStatus = 'BUSY';

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        12,
        'SERVICE_STARTED',
        prevStatus,
        'IN_PROGRESS',
        request.assignedTechnicianName || 'Technician',
        'TECHNICIAN',
        'Physical servicing initiated. Diagnostic telemetry connected to hydraulic manifold.'
      )
    );

    this.notify();
  }

  // ==========================================
  // WORKFLOW ACTION 8: TRIGGER EXCEPTION (The WOW Feature) (Phase 15)
  // ==========================================
  public triggerTechnicianDropout(requestId: string) {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return;

    const droppedTechId = request.assignedTechnicianId;
    const droppedTechName = request.assignedTechnicianName || 'Assigned Technician';

    // Mark previous technician unavailable
    const droppedTech = this.state.technicians.find((t) => t.id === droppedTechId);
    if (droppedTech) {
      droppedTech.activeStatus = 'OFF_DUTY';
      droppedTech.isAvailable = false;
    }

    // Run recovery matching engine excluding the dropped technician
    const site = this.state.sites.find((s) => s.id === request.siteId);
    const rankedReplacements = rankTechniciansForRequest(
      request,
      this.state.technicians,
      site,
      droppedTechId
    );

    const bestReplacement = rankedReplacements[0];

    const exception = createTechnicianDropoutException(
      request,
      droppedTechName,
      bestReplacement
    );

    request.activeExceptions.push(exception);
    this.state.exceptions.unshift(exception);

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        15,
        'EXCEPTION_TECHNICIAN_UNAVAILABLE',
        request.status,
        request.status,
        droppedTechName,
        'TECHNICIAN',
        `EMERGENCY ALERT: Technician ${droppedTechName} reported unavailable. Recovery engine automatically triggered.`
      )
    );

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        15,
        'RECOVERY_RECOMMENDATION_GENERATED',
        request.status,
        request.status,
        'Self-Healing Recovery Engine',
        'ADMIN',
        `Recovery recommendation: Reassign to ${bestReplacement.technicianName} (Score: ${bestReplacement.totalScore}%, ETA: ${bestReplacement.estimatedArrivalMins}m)`
      )
    );

    this.notify();
  }

  // ==========================================
  // WORKFLOW ACTION 9: AUTO-REASSIGN (1-Click Recovery) (Phase 15)
  // ==========================================
  public reassignTechnician(
    requestId: string,
    replacementTechId: string,
    managerName = 'Operations Manager'
  ) {
    const request = this.state.requests.find((r) => r.id === requestId);
    const newTech = this.state.technicians.find((t) => t.id === replacementTechId);
    if (!request || !newTech) return;

    const prevTechName = request.assignedTechnicianName;
    request.assignedTechnicianId = newTech.id;
    request.assignedTechnicianName = newTech.name;
    request.status = 'ASSIGNED';

    newTech.activeStatus = 'ASSIGNED';
    newTech.isAvailable = true;

    // Resolve exception
    const exc = request.activeExceptions.find(
      (e) => e.type === 'TECHNICIAN_UNAVAILABLE' && !e.resolved
    );
    if (exc) {
      exc.resolved = true;
      exc.resolvedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      exc.resolutionAction = `Reassigned from ${prevTechName} to ${newTech.name}`;
    }

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        15,
        'ONE_CLICK_REASSIGNMENT_EXECUTED',
        'EXCEPTION',
        'ASSIGNED',
        managerName,
        'MANAGER',
        `One-click recovery executed. Reassigned to ${newTech.name}. High-priority alert sent to technician.`
      )
    );

    this.notify();
  }

  // ==========================================
  // WORKFLOW ACTION 10: SUBMIT COMPLETION (Step 16)
  // ==========================================
  public submitCompletion(requestId: string, pkg: CompletionPackage) {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return;

    request.status = 'COMPLETION_SUBMITTED';
    request.completionPackage = pkg;

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        16,
        'COMPLETION_SUBMITTED',
        'IN_PROGRESS',
        'COMPLETION_SUBMITTED',
        request.assignedTechnicianName || 'Technician',
        'TECHNICIAN',
        'Technician uploaded work dossier: report, before/after photographic proof, and measurements.'
      )
    );

    this.notify();
  }

  // ==========================================
  // WORKFLOW ACTION 11: VERIFY & CLOSE (Step 17 & 18)
  // ==========================================
  public verifyAndComplete(
    requestId: string,
    verifiedBy = 'Operations Manager',
    notes = 'Work verified and approved. Equipment operates within specifications.'
  ) {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return;

    // 1. Service Request status
    request.status = 'COMPLETED';
    if (request.completionPackage) {
      request.completionPackage.verifiedBy = verifiedBy;
      request.completionPackage.verifiedAt = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      request.completionPackage.verificationNotes = notes;
    }

    // 2. Machine status: DOWN / UNDER_MAINTENANCE -> OPERATIONAL
    const machine = this.state.machines.find((m) => m.id === request.machineId);
    if (machine) {
      machine.status = 'OPERATIONAL';
      machine.activeRequestId = undefined;
      machine.lastServiceDate = new Date().toISOString().split('T')[0];
    }

    // 3. Spare Parts: RESERVED -> CONSUMED
    request.reservations.forEach((res) => {
      const part = this.state.parts.find((p) => p.id === res.partId);
      if (part) {
        part.reservedStock -= res.quantityReserved;
        part.consumedStock += res.quantityReserved;
        res.status = 'CONSUMED';
        res.quantityConsumed = res.quantityReserved;
        res.consumedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    });

    // 4. Technician: BUSY -> AVAILABLE
    const tech = this.state.technicians.find((t) => t.id === request.assignedTechnicianId);
    if (tech) {
      tech.activeStatus = 'AVAILABLE';
      tech.currentJobId = undefined;
      tech.currentWorkload = Math.max(0, tech.currentWorkload - 1);
    }

    // 5. Audit logs
    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        17,
        'COMPLETION_VERIFIED',
        'COMPLETION_SUBMITTED',
        'VERIFICATION',
        verifiedBy,
        'MANAGER',
        `Evidence reviewed and verified by ${verifiedBy}. Photographic and telemetry proof approved.`
      )
    );

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        18,
        'WORKFLOW_CLOSED',
        'VERIFICATION',
        'COMPLETED',
        'Orchestration Engine',
        'ADMIN',
        `Closed loop finalized: Machine ${machine?.code || 'Machine'} status restored to OPERATIONAL, spare parts moved to CONSUMED, technician released to AVAILABLE.`
      )
    );

    request.auditTrail.push(
      createAuditLogEntry(
        request.id,
        19,
        'AUDIT_TRAIL_SEALED',
        'COMPLETED',
        'COMPLETED',
        'Audit Engine',
        'ADMIN',
        'Complete 19-step audit trail permanently recorded with full traceability.'
      )
    );

    this.notify();
  }

  // ==========================================
  // KPI CALCULATIONS (Phase 20)
  // ==========================================
  public getKpiMetrics() {
    const openRequests = this.state.requests.filter((r) => r.status !== 'COMPLETED').length;
    const activeJobs = this.state.requests.filter(
      (r) => r.status === 'EN_ROUTE' || r.status === 'ON_SITE' || r.status === 'IN_PROGRESS'
    ).length;

    let slaAtRisk = 0;
    let slaBreached = 0;
    this.state.requests.forEach((r) => {
      const evaluation = evaluateSlaHealth(r);
      if (evaluation.health === 'AT_RISK') slaAtRisk++;
      if (evaluation.health === 'BREACHED') slaBreached++;
    });

    const availableTechs = this.state.technicians.filter(
      (t) => t.activeStatus === 'AVAILABLE' && t.isAvailable
    ).length;

    const lowStockParts = this.state.parts.filter(
      (p) => p.availableStock <= p.minThreshold
    ).length;

    return {
      openRequests,
      activeJobs,
      slaAtRisk,
      slaBreached,
      availableTechs,
      lowStockParts
    };
  }
}

export const orchestrationStore = new OrchestrationStore();
