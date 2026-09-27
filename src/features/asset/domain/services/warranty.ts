// Asset domain services (framework-independent, pure).

import {
  WARRANTY_EXPIRING_SOON_DAYS,
  type WarrantyStatus,
} from "../constants/asset-constants";

const MS_PER_DAY = 86_400_000;

/**
 * Derive the warranty status of an asset at a point in time.
 * Pure function: `now` is injected so tests never depend on the clock.
 */
export const getWarrantyStatus = (
  warrantyEndDate: Date | string | null,
  now: Date = new Date(),
): WarrantyStatus => {
  if (!warrantyEndDate) return "NONE";
  const end = warrantyEndDate instanceof Date ? warrantyEndDate : new Date(warrantyEndDate);
  if (isNaN(end.getTime())) return "NONE";
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY);
  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= WARRANTY_EXPIRING_SOON_DAYS) return "EXPIRING_SOON";
  return "ACTIVE";
};
