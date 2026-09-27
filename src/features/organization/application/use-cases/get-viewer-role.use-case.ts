// Viewer role use case (application layer — framework-independent).
//
// Returns the caller's organization role for UI gating (show/hide
// management controls) WITHOUT requiring organization.read, so roles
// without profile access (ENGINEER, USER) still render read-only pages.
// This is presentation data only: every mutation and listing re-checks
// its own permission server-side, and unauthenticated callers are
// rejected before any role is returned.

import { normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import type { OrganizationUseCasesDeps } from "./get-organization-profile.use-case";

export const executeGetViewerRole = async (
  _rawInput: unknown,
  deps: OrganizationUseCasesDeps,
): Promise<{ role: string }> => {
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    return { role: context.organizationRole ?? "USER" };
  } catch (error) {
    throw normalizeError(error);
  }
};
