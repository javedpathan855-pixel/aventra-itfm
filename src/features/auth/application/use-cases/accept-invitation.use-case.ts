// Accept organization invitation use case (application layer).
//
// Token-gated (not session-gated to an org): the caller authenticates,
// then proves possession of the unguessable acceptance token. Enforces,
// in order: token validity, pending status (replay-safe), expiry,
// recipient-email match (normalized), role sanity, organization
// existence. Already-a-member is an idempotent success (safe double
// submit). The membership write + status flip are one transaction in
// the repository.

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { normalizeOrganizationRole } from "../../domain/authorization/roles";
import { normalizeEmail } from "../../domain/services/auth-helpers";
import type { AuditLogPort } from "../../repository/audit-log";
import type {
  AuthorizationDeps,
} from "../authorization/resolve-authorization-context";

const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required."),
});

interface AcceptInvitationDeps extends AuthorizationDeps {
  auditLog?: AuditLogPort;
}

interface AcceptInvitationResult {
  organizationId: string;
  role: string;
}

/** Generic safe message — never reveals which check failed. */
const INVALID_MESSAGE = "This invitation is invalid or has expired.";

const executeAcceptInvitation = async (
  rawInput: unknown,
  deps: AcceptInvitationDeps,
): Promise<AcceptInvitationResult> => {
  const parsed = acceptInvitationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    // Authentication only — never the session's active organization: the
    // target tenant comes from the invitation token, and a stale active
    // org must not block acceptance.
    const session = await deps.getSession();
    if (!session) {
      throw new AppError("UNAUTHENTICATED");
    }
    const invitation = await deps.authorizationRepository.findInvitationByToken(
      parsed.data.token,
    );
    if (!invitation) {
      throw new AppError("FORBIDDEN", { message: INVALID_MESSAGE });
    }
    if (normalizeEmail(invitation.email) !== normalizeEmail(session.email)) {
      throw new AppError("FORBIDDEN", { message: INVALID_MESSAGE });
    }
    const existing = await deps.authorizationRepository.getMembership(
      session.userId,
      invitation.organizationId,
    );
    if (existing) {
      const existingRole = normalizeOrganizationRole(existing.role);
      if (!existingRole) {
        throw new AppError("INTERNAL_ERROR");
      }
      return { organizationId: invitation.organizationId, role: existingRole };
    }
    if (invitation.status !== "pending") {
      throw new AppError("FORBIDDEN", { message: INVALID_MESSAGE });
    }
    if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
      throw new AppError("FORBIDDEN", { message: INVALID_MESSAGE });
    }
    const role = normalizeOrganizationRole(invitation.role);
    if (!role) {
      throw new AppError("INTERNAL_ERROR");
    }
    const organization = await deps.authorizationRepository.getOrganizationById(
      invitation.organizationId,
    );
    if (!organization) {
      throw new AppError("FORBIDDEN", { message: INVALID_MESSAGE });
    }
    await deps.authorizationRepository.acceptInvitation({
      invitationId: invitation.id,
      organizationId: invitation.organizationId,
      userId: session.userId,
      role,
    });
    await deps.auditLog?.record({
      type: "INVITATION_ACCEPTED",
      actorUserId: session.userId,
      organizationId: invitation.organizationId,
      targetResourceId: invitation.id,
      result: "allowed",
      metadata: { role },
    });
    return { organizationId: invitation.organizationId, role };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeAcceptInvitation };
export type { AcceptInvitationResult, AcceptInvitationDeps };
