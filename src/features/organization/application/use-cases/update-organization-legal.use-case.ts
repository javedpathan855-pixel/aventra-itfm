// Update organization legal & tax information use case (application layer).

import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import { updateLegalTaxSchema } from "../../domain/schemas/organization.schema";
import type { UpdateProfileDeps } from "./update-organization-profile.use-case";
import type { OrganizationProfileEntity, ProfileCompletionResult } from "../../domain/entities/organization-profile";
import { calculateProfileCompletion } from "../../domain/services/profile-completion";

export interface UpdateOrganizationLegalResult {
  profile: OrganizationProfileEntity;
  completion: ProfileCompletionResult;
}

export const executeUpdateOrganizationLegal = async (
  rawInput: unknown,
  deps: UpdateProfileDeps,
): Promise<UpdateOrganizationLegalResult> => {
  const parsed = updateLegalTaxSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "organization.update");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const updated = await deps.organizationRepository.updateLegalTax(
      context.organizationId,
      parsed.data,
    );

    const completion = calculateProfileCompletion(updated);

    await deps.auditLog?.record({
      type: "ORGANIZATION_LEGAL_UPDATED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      result: "allowed",
      metadata: {
        hasGstin: String(Boolean(updated.gstin)),
        hasPan: String(Boolean(updated.pan)),
      },
    });

    return {
      profile: updated,
      completion,
    };
  } catch (error) {
    throw normalizeError(error);
  }
};
