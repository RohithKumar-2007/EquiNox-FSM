// DataQuest 3.0 - Orchestration Computational Engines
// Validation, Matching, Conflict Detection, SLA Tracking, and Recovery

import {
  IndustrialMachine,
  SiteLocation,
  SkillRequirement,
  TechnicianProfile,
  SparePartItem,
  ServiceRequest,
  ValidationResult,
  TechnicianScoringBreakdown,
  SlaHealthStatus,
  ServiceExceptionRecord,
  ServiceAuditEvent
} from './types';

// ==========================================
// 1. VALIDATION ENGINE (Phase 6)
// ==========================================
export function validateServiceRequest(
  request: ServiceRequest,
  machine?: IndustrialMachine,
  site?: SiteLocation,
  part?: SparePartItem,
  skillsCatalog: SkillRequirement[] = []
): ValidationResult {
  const machineEligible = !!machine && machine.eligibilityStatus === 'ELIGIBLE';
  const machineMessage = !machine
    ? 'Machine not found in registry'
    : machine.eligibilityStatus === 'ELIGIBLE'
    ? `Machine registered & eligible (${machine.code} - ${machine.name})`
    : `Machine ineligibility detected (${machine.eligibilityStatus})`;

  const siteValid = !!site && !!site.latitude && !!site.longitude;
  const siteMessage = siteValid
    ? `Site location verified (${site.name}, ${site.city})`
    : 'Invalid site coordinates or site unregistered';

  const priorityValid = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(request.priority);
  const priorityMessage = priorityValid
    ? `Priority verified: ${request.priority}`
    : 'Unknown priority tier';

  const skillFound = skillsCatalog.some(
    (s) => s.name.toLowerCase() === request.requiredSkill.toLowerCase()
  );
  const skillMessage = skillFound
    ? `Required discipline identified in catalog: ${request.requiredSkill}`
    : `Custom technical skill identified: ${request.requiredSkill}`;

  const partRequired = request.requiredPartQuantity || 0;
  const partAvailable = !part || part.availableStock >= partRequired;
  const partMessage = !part
    ? 'No replacement parts requested'
    : partAvailable
    ? `Required parts in stock (${part.availableStock} available, ${partRequired} required)`
    : `Stock bottleneck: only ${part.availableStock} available for ${partRequired} needed`;

  const slaMinutes =
    request.priority === 'URGENT'
      ? 60
      : request.priority === 'HIGH'
      ? 240
      : request.priority === 'MEDIUM'
      ? 1440
      : 4320;
  const slaCalculated = true;
  const slaMessage = `SLA target locked: ${slaMinutes} minutes (${slaMinutes / 60}h)`;

  const isValid = machineEligible && siteValid && priorityValid && partAvailable;

  return {
    isValid,
    machineEligible,
    machineMessage,
    siteValid,
    siteMessage,
    priorityValid,
    priorityMessage,
    skillIdentified: true,
    skillMessage,
    partAvailable,
    partMessage,
    slaCalculated,
    slaMinutes,
    slaMessage,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

// ==========================================
// 2. TECHNICIAN MATCHING ENGINE (Phase 7)
// ==========================================
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function rankTechniciansForRequest(
  request: ServiceRequest,
  technicians: TechnicianProfile[],
  site?: SiteLocation,
  excludedTechnicianId?: string
): TechnicianScoringBreakdown[] {
  const targetSiteLat = site?.latitude || 13.0827;
  const targetSiteLon = site?.longitude || 80.2707;

  const scoredCandidates: TechnicianScoringBreakdown[] = technicians
    .filter((t) => t.id !== excludedTechnicianId)
    .map((tech) => {
      // 1. Skill Match (Weight: 35%)
      const matchedSkill = tech.skills.find(
        (s) => s.skillName.toLowerCase() === request.requiredSkill.toLowerCase()
      );
      let skillScore = 0;
      if (matchedSkill) {
        skillScore = Math.min(100, matchedSkill.level * 25);
      } else {
        skillScore = 15; // fallback
      }

      // 2. Availability (Weight: 25%)
      let availabilityScore = 0;
      if (tech.activeStatus === 'AVAILABLE' && tech.isAvailable) {
        availabilityScore = 100;
      } else if (tech.activeStatus === 'ASSIGNED') {
        availabilityScore = 50;
      } else {
        availabilityScore = 10;
      }

      // 3. Location Proximity (Weight: 20%)
      const distanceKm = calculateHaversineDistance(
        tech.currentLocation.latitude,
        tech.currentLocation.longitude,
        targetSiteLat,
        targetSiteLon
      );
      // Distance score: 100 at 0km, decreasing by 2 pts per km
      const locationScore = Math.max(10, Math.round(100 - distanceKm * 2));
      const estimatedArrivalMins = Math.max(8, Math.round(distanceKm * 2.5));

      // 4. Current Workload (Weight: 10%)
      const workloadScore = Math.max(10, 100 - tech.currentWorkload * 28);

      // 5. Priority Suitability (Weight: 10%)
      let priorityScore = 70;
      if (request.priority === 'URGENT' || request.priority === 'HIGH') {
        priorityScore = tech.rating >= 4.7 ? 100 : tech.rating >= 4.3 ? 80 : 50;
      } else {
        priorityScore = 85;
      }

      // Total Weighted Score
      const totalScore = Math.round(
        skillScore * 0.35 +
          availabilityScore * 0.25 +
          locationScore * 0.2 +
          workloadScore * 0.1 +
          priorityScore * 0.1
      );

      // Natural language explanation reasons
      const reasons: string[] = [];
      if (matchedSkill) {
        reasons.push(
          `Certified ${matchedSkill.skillName} (Level ${matchedSkill.level}/5)`
        );
      } else {
        reasons.push(`No direct certification in ${request.requiredSkill}`);
      }

      if (tech.activeStatus === 'AVAILABLE') {
        reasons.push('Currently Available (0 active scheduling overlaps)');
      } else {
        reasons.push(`Status: ${tech.activeStatus}`);
      }

      reasons.push(
        `Located ${distanceKm} km away (ETA ~${estimatedArrivalMins} mins)`
      );

      if (tech.currentWorkload === 0) {
        reasons.push('Low workload (0 active tasks)');
      } else {
        reasons.push(`Workload: ${tech.currentWorkload} active assignments`);
      }

      if (request.priority === 'URGENT' && priorityScore >= 90) {
        reasons.push('Top-tier performance rating matching URGENT requirements');
      }

      return {
        technicianId: tech.id,
        technicianName: tech.name,
        totalScore,
        rank: 0,
        isRecommended: false,
        skillScore,
        availabilityScore,
        locationScore,
        workloadScore,
        priorityScore,
        distanceKm,
        estimatedArrivalMins,
        reasons
      };
    });

  // Sort descending by total score
  scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks & flag top recommendation
  return scoredCandidates.map((c, index) => ({
    ...c,
    rank: index + 1,
    isRecommended: index === 0
  }));
}

// ==========================================
// 3. CONFLICT DETECTION ENGINE (Phase 9)
// ==========================================
export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: 'SCHEDULE_OVERLAP' | 'PART_SHORTAGE' | 'SLA_IMPOSSIBLE';
  conflictMessage?: string;
  recommendation?: string;
}

export function detectResourceConflicts(
  technician: TechnicianProfile,
  request: ServiceRequest,
  part?: SparePartItem
): ConflictCheckResult {
  if (technician.activeStatus === 'BUSY' || technician.currentWorkload >= 3) {
    return {
      hasConflict: true,
      conflictType: 'SCHEDULE_OVERLAP',
      conflictMessage: `Technician ${technician.name} has ${technician.currentWorkload} active jobs (Schedule Overlap detected)`,
      recommendation: 'Select alternate candidate with zero active schedule load'
    };
  }

  if (part && part.availableStock < request.requiredPartQuantity) {
    return {
      hasConflict: true,
      conflictType: 'PART_SHORTAGE',
      conflictMessage: `Part ${part.name} available stock (${part.availableStock}) insufficient for requirement (${request.requiredPartQuantity})`,
      recommendation: 'Check regional warehouse transfer or reserve substitute component'
    };
  }

  return {
    hasConflict: false
  };
}

// ==========================================
// 4. SLA MONITORING ENGINE (Phase 13)
// ==========================================
export interface SlaStatusReport {
  health: SlaHealthStatus;
  remainingMinutes: number;
  elapsedMinutes: number;
  totalDurationMinutes: number;
  percentageRemaining: number;
  displayText: string;
}

export function evaluateSlaHealth(request: ServiceRequest): SlaStatusReport {
  const deadline = new Date(request.slaDeadline).getTime();
  const created = new Date(request.createdAt).getTime();
  const now = Date.now();

  const totalDurationMinutes = request.slaDurationMinutes || 60;
  const remainingMillis = deadline - now;
  const remainingMinutes = Math.round(remainingMillis / (60 * 1000));
  const elapsedMinutes = Math.max(0, Math.round((now - created) / (60 * 1000)));

  const percentageRemaining = Math.max(
    0,
    Math.min(100, Math.round((remainingMinutes / totalDurationMinutes) * 100))
  );

  let health: SlaHealthStatus = 'ON_TRACK';
  let displayText = '';

  if (request.status === 'COMPLETED') {
    health = 'ON_TRACK';
    displayText = 'SLA Satisfied (Completed on time)';
  } else if (remainingMinutes < 0) {
    health = 'BREACHED';
    displayText = `🔴 SLA BREACHED: Deadline exceeded by ${Math.abs(remainingMinutes)} mins`;
  } else if (percentageRemaining <= 25) {
    health = 'AT_RISK';
    displayText = `🟡 SLA AT RISK: ${remainingMinutes} mins remaining (${percentageRemaining}%)`;
  } else {
    health = 'ON_TRACK';
    displayText = `🟢 SLA ON TRACK: ${remainingMinutes} mins remaining`;
  }

  return {
    health,
    remainingMinutes,
    elapsedMinutes,
    totalDurationMinutes,
    percentageRemaining,
    displayText
  };
}

// ==========================================
// 5. EXCEPTION & RECOVERY ENGINE (Phases 14, 15)
// ==========================================
export function createTechnicianDropoutException(
  request: ServiceRequest,
  droppedTechName: string,
  suggestedReplacement?: TechnicianScoringBreakdown
): ServiceExceptionRecord {
  return {
    id: `exc-${Date.now()}`,
    requestId: request.id,
    requestTitle: request.title,
    machineCode: request.machineCode,
    type: 'TECHNICIAN_UNAVAILABLE',
    severity: 'HIGH',
    description: `Assigned technician (${droppedTechName}) reported unavailable due to emergency site conflict`,
    detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    resolved: false,
    suggestedAction: suggestedReplacement
      ? `Reassign to ${suggestedReplacement.technicianName} (Match: ${suggestedReplacement.totalScore}%, ETA ${suggestedReplacement.estimatedArrivalMins}m)`
      : 'Find next qualified technician in regional pool',
    recommendedTechnicianId: suggestedReplacement?.technicianId
  };
}

export function createAuditLogEntry(
  requestId: string,
  stepNumber: number,
  eventType: string,
  fromStatus: string,
  toStatus: string,
  actorName: string,
  actorRole: any,
  summary: string,
  metadata?: Record<string, any>
): ServiceAuditEvent {
  return {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestId,
    stepNumber,
    eventType,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actorName,
    actorRole,
    fromStatus,
    toStatus,
    summary,
    metadata
  };
}
