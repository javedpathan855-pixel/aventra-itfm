// Get organization profile use case (application layer — framework-independent).

import { AppError, normalizeError } from "@/shared/error/app-error";
import {
  resolveAuthorizationContext,
  type AuthorizationDeps,
} from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import type { OrganizationRepository } from "../../repository/organization-repository";
import type {
  OrganizationProfileEntity,
  ProfileCompletionResult,
} from "../../domain/entities/organization-profile";
import { calculateProfileCompletion } from "../../domain/services/profile-completion";

export interface GetOrganizationProfileResult {
  profile: OrganizationProfileEntity;
  completion: ProfileCompletionResult;
  role: string;
}

export interface OrganizationUseCasesDeps extends AuthorizationDeps {
  organizationRepository: OrganizationRepository;
}

export const executeGetOrganizationProfile = async (
  rawInput: unknown,
  deps: OrganizationUseCasesDeps,
): Promise<GetOrganizationProfileResult> => {
  try {
    const context = await resolveAuthorizationContext(rawInput, deps);
    requirePermission(context, "organization.read");

    if (!context.organizationId) {
      throw new AppError("FORBIDDEN", { message: "No active organization selected." });
    }

    const profile = await deps.organizationRepository.getProfile(context.organizationId);
    if (!profile) {
      throw new AppError("ORGANIZATION_NOT_FOUND");
    }

    // Ensure settings exist
    if (!profile.settings) {
      profile.settings = await deps.organizationRepository.getSettings(context.organizationId);
    }

    const completion = calculateProfileCompletion(profile);

    return {
      profile,
      completion,
      role: context.organizationRole ?? "USER",
    };
  } catch (error) {
    throw normalizeError(error);
  }
};
