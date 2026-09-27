// Cancel organization invitation use case (application layer).
//
// Tenant rule: cancellation is scoped to the verified active organization
// — absent or foreign invitation ids resolve identically (no leak).

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { isOrganizationMember } from "../../domain/authorization/authorization-context";
import type { AuditLogPort } from "../../repository/audit-log";
import {
  resolveAuthorizationContext,
  type AuthorizationDeps,
} from "../authorization/resolve-authorization-context";
import { requirePermission } from "../authorization/guards";

const cancelInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation is required."),
});

interface CancelInvitationDeps extends AuthorizationDeps {
  auditLog?: AuditLogPort;
}

interface CancelInvitationResult {
  cancelled: true;
}

const executeCancelInvitation = async (
  rawInput: unknown,
  deps: CancelInvitationDeps,
): Promise<CancelInvitationResult> => {
  const parsed = cancelInvitationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext(
      { requireOrganization: true },
      deps,
    );
    requirePermission(context, "invitation.cancel");
    if (!isOrganizationMember(context)) {
      throw new AppError("FORBIDDEN", {
        message: "You don't have permission to access this organization.",
      });
    }
    await deps.authorizationRepository.cancelInvitation({
      invitationId: parsed.data.invitationId,
      organizationId: context.organizationId,
    });
    await deps.auditLog?.record({
      type: "INVITATION_CANCELLED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      targetResourceId: parsed.data.invitationId,
      result: "allowed",
    });
    return { cancelled: true };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeCancelInvitation };
export type { CancelInvitationResult, CancelInvitationDeps };
