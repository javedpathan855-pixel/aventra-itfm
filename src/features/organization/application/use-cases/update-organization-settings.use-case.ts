// Update organization settings use case (application layer).

import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import { organizationSettingsSchema } from "../../domain/schemas/organization.schema";
import type { UpdateProfileDeps } from "./update-organization-profile.use-case";
import type { OrganizationSettingsEntity } from "../../domain/entities/organization-profile";

export interface UpdateOrganizationSettingsResult {
  settings: OrganizationSettingsEntity;
}

export const executeUpdateOrganizationSettings = async (
  rawInput: unknown,
  deps: UpdateProfileDeps,
): Promise<UpdateOrganizationSettingsResult> => {
  const parsed = organizationSettingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({}, deps);
    requirePermission(context, "organization.update");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const settings = await deps.organizationRepository.updateSettings(
      context.organizationId,
      parsed.data,
    );

    await deps.auditLog?.record({
      type: "ORGANIZATION_SETTINGS_UPDATED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      result: "allowed",
      metadata: { timezone: settings.timezone, currency: settings.currency },
    });

    return { settings };
  } catch (error) {
    throw normalizeError(error);
  }
};
