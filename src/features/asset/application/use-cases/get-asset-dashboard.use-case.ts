// Asset dashboard aggregation use case (application layer).

import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import type { AssetUseCasesDeps } from "./asset-deps";

const requireActiveOrganization = (organizationId: string | null): string => {
  if (!organizationId) {
    throw new AppError("FORBIDDEN", { message: "No active organization selected." });
  }
  return organizationId;
};

export const executeGetAssetDashboard = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  if (rawInput !== undefined && rawInput !== null && typeof rawInput !== "object") {
    throw new AppError("VALIDATION_ERROR");
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    const metrics = await deps.assetRepository.getDashboardMetrics(organizationId, {
      now: new Date(),
    });
    return { metrics };
  } catch (error) {
    throw normalizeError(error);
  }
};
