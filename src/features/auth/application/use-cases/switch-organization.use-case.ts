// Switch active organization use case (application layer).
//
// Validates membership server-side before touching the session: unknown
// and foreign organization ids fail identically (FORBIDDEN, no existence
// leak). The session mutation itself stays provider-owned.

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import {
  resolveAuthorizationContext,
  type AuthorizationDeps,
} from "../authorization/resolve-authorization-context";
import { requireAuthenticated } from "../authorization/guards";
import type { AuthProvider } from "../../repository/auth-provider";
import type { AuditLogPort } from "../../repository/audit-log";

const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1, "Organization is required."),
});

interface SwitchOrganizationResult {
  organizationId: string;
  name: string;
  slug: string;
}

interface SwitchOrganizationDeps extends AuthorizationDeps {
  authProvider: AuthProvider;
  auditLog?: AuditLogPort;
}

const executeSwitchOrganization = async (
  rawInput: unknown,
  deps: SwitchOrganizationDeps,
): Promise<SwitchOrganizationResult> => {
  const parsed = switchOrganizationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({}, deps);
    requireAuthenticated(context);
    const membership = await deps.authorizationRepository.getMembership(
      context.userId,
      parsed.data.organizationId,
    );
    if (!membership) {
      throw new AppError("FORBIDDEN", {
        message: "You don't have permission to access this organization.",
      });
    }
    const organization = await deps.authProvider.setActiveOrganization({
      organizationId: parsed.data.organizationId,
    });
    await deps.auditLog?.record({
      type: "ORGANIZATION_SWITCHED",
      actorUserId: context.userId,
      organizationId: organization.id,
      result: "allowed",
    });
    return {
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
    };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeSwitchOrganization };
export type { SwitchOrganizationResult, SwitchOrganizationDeps };
