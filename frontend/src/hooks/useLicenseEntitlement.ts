import { LicenseEntitlement } from '../models/owns/license';

export const useLicenseEntitlement = (entitlement: LicenseEntitlement) => {
  // Standalone Equinox has no commercial feature gates. RBAC is checked separately.
  return true;
};
