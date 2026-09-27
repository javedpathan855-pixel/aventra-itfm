// Logo upload and removal use cases (application layer).

import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import { logoUploadSchema } from "../../domain/schemas/organization.schema";
import type { UpdateProfileDeps } from "./update-organization-profile.use-case";
import type { LogoStorageService } from "../../infrastructure/storage/logo-storage-service";
import type { OrganizationProfileEntity, ProfileCompletionResult } from "../../domain/entities/organization-profile";
import { calculateProfileCompletion } from "../../domain/services/profile-completion";

export interface LogoManagementDeps extends UpdateProfileDeps {
  logoStorageService: LogoStorageService;
}

export const executeUploadOrganizationLogo = async (
  rawInput: unknown,
  deps: LogoManagementDeps,
): Promise<{ profile: OrganizationProfileEntity; completion: ProfileCompletionResult }> => {
  const parsed = logoUploadSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "organization.update");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const validatedLogoUrl = await deps.logoStorageService.processAndStoreLogo(parsed.data.dataUrl);

    const updated = await deps.organizationRepository.updateLogo(
      context.organizationId,
      validatedLogoUrl,
    );

    const completion = calculateProfileCompletion(updated);

    await deps.auditLog?.record({
      type: "ORGANIZATION_LOGO_CHANGED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      result: "allowed",
      metadata: { action: "upload" },
    });

    return { profile: updated, completion };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeRemoveOrganizationLogo = async (
  _rawInput: unknown,
  deps: UpdateProfileDeps,
): Promise<{ profile: OrganizationProfileEntity; completion: ProfileCompletionResult }> => {
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "organization.update");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const updated = await deps.organizationRepository.updateLogo(
      context.organizationId,
      null,
    );

    const completion = calculateProfileCompletion(updated);

    await deps.auditLog?.record({
      type: "ORGANIZATION_LOGO_CHANGED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      result: "allowed",
      metadata: { action: "remove" },
    });

    return { profile: updated, completion };
  } catch (error) {
    throw normalizeError(error);
  }
};
