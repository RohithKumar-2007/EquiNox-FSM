export interface TechnicianCandidate {
  technicianId: number;
  firstName: string;
  lastName: string;
  email: string;
  score: number;
  rank: number;
  reasons: string[];
  skillMatch: boolean;
  sameLocation: boolean;
  available: boolean;
  openWorkOrderCount: number;
  distanceKm?: number;
}

export interface AutoAssignResponse {
  assigned: boolean;
  workOrderId: number;
  assignedTechnician?: TechnicianCandidate;
  message: string;
  reasons: string[];
  requiresConfirmation: boolean;
}
