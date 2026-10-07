import { useState, useEffect } from 'react';
import { orchestrationStore, OrchestrationState } from './store';
import { evaluateSlaHealth } from './engines';

export function useOrchestration() {
  const [state, setState] = useState<OrchestrationState>(
    orchestrationStore.getState()
  );

  useEffect(() => {
    const unsubscribe = orchestrationStore.subscribe(() => {
      setState({ ...orchestrationStore.getState() });
    });
    return unsubscribe;
  }, []);

  return {
    state,
    kpis: orchestrationStore.getKpiMetrics(),
    setRole: (role: any) => orchestrationStore.setRole(role),
    resetDemoData: () => orchestrationStore.resetDemoData(),
    createRequest: (data: any) => orchestrationStore.createRequest(data),
    validateRequest: (id: string) => orchestrationStore.validateRequest(id),
    reservePart: (requestId: string, partId: string, qty: number) =>
      orchestrationStore.reservePart(requestId, partId, qty),
    approveAndAssign: (requestId: string, techId: string, mgr?: string) =>
      orchestrationStore.approveAndAssign(requestId, techId, mgr),
    acceptJob: (id: string) => orchestrationStore.acceptJob(id),
    updateTravelStatus: (id: string, st: 'EN_ROUTE' | 'ON_SITE') =>
      orchestrationStore.updateTravelStatus(id, st),
    startService: (id: string) => orchestrationStore.startService(id),
    triggerTechnicianDropout: (id: string) =>
      orchestrationStore.triggerTechnicianDropout(id),
    reassignTechnician: (requestId: string, techId: string, mgr?: string) =>
      orchestrationStore.reassignTechnician(requestId, techId, mgr),
    submitCompletion: (id: string, pkg: any) =>
      orchestrationStore.submitCompletion(id, pkg),
    verifyAndComplete: (id: string, verifiedBy?: string, notes?: string) =>
      orchestrationStore.verifyAndComplete(id, verifiedBy, notes),
    evaluateSla: (req: any) => evaluateSlaHealth(req),
    escalateToVendor: (requestId: string, payload: any) =>
      orchestrationStore.escalateToVendor(requestId, payload),
    vendorAcceptContract: (requestId: string) =>
      orchestrationStore.vendorAcceptContract(requestId),
    vendorUpdateMilestone: (
      requestId: string,
      milestone: 'EN_ROUTE' | 'ON_SITE' | 'IN_PROGRESS'
    ) => orchestrationStore.vendorUpdateMilestone(requestId, milestone)
  };
}
