// Update general organization profile use case (application layer).

import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import type { AuditLogPort } from "@/features/auth/repository/audit-log";
import { updateGeneralProfileSchema } from "../../domain/schemas/organization.schema";
import type { OrganizationUseCasesDeps } from "./get-organization-profile.use-case";
import type { OrganizationProfileEntity, ProfileCompletionResult } from "../../domain/entities/organization-profile";
import { calculateProfileCompletion } from "../../domain/services/profile-completion";

export interface UpdateProfileDeps extends OrganizationUseCasesDeps {
  auditLog?: AuditLogPort;
}

export interface UpdateOrganizationProfileResult {
  profile: OrganizationProfileEntity;
  completion: ProfileCompletionResult;
}

export const executeUpdateOrganizationProfile = async (
  rawInput: unknown,
  deps: UpdateProfileDeps,
): Promise<UpdateOrganizationProfileResult> => {
  const parsed = updateGeneralProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "organization.update");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const updated = await deps.organizationRepository.updateGeneralProfile(
      context.organizationId,
      parsed.data,
    );

    const completion = calculateProfileCompletion(updated);

    await deps.auditLog?.record({
      type: "ORGANIZATION_PROFILE_UPDATED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      result: "allowed",
      metadata: { name: updated.name },
    });

    return {
      profile: updated,
      completion,
    };
  } catch (error) {
    throw normalizeError(error);
  }
};
