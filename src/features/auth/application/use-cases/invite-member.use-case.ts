// Invite organization member use case (application layer).
//
// Tenant rule: the invitation is always scoped to the verified active
// organization — no organizationId is accepted from the caller. The
// requested role must be permitted for the inviter (OWNER can never be
// granted by invitation; SUPERADMIN is rejected by schema validation).
// The acceptance token is issued by the repository (hash at rest) and
// leaves through the mailer only; a failed dispatch compensates by
// cancelling the invitation so no stuck pending row remains.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { INVITATION_EXPIRES_IN_SECONDS } from "../../domain/constants/auth-constants";
import { invitationSchema } from "../../domain/schemas/auth.schema";
import { isOrganizationMember } from "../../domain/authorization/authorization-context";
import { canInviteRole } from "../../domain/authorization/policies";
import { normalizeEmail } from "../../domain/services/auth-helpers";
import type { AuditLogPort } from "../../repository/audit-log";
import type { MailerPort } from "../../repository/mailer";
import {
  resolveAuthorizationContext,
  type AuthorizationDeps,
} from "../authorization/resolve-authorization-context";
import { requirePermission } from "../authorization/guards";

interface InviteMemberDeps extends AuthorizationDeps {
  mailer: MailerPort;
  auditLog: AuditLogPort;
}

interface InviteMemberResult {
  invitationId: string;
  email: string;
  role: string;
  expiresAt: Date;
}

const executeInviteMember = async (
  rawInput: unknown,
  deps: InviteMemberDeps,
): Promise<InviteMemberResult> => {
  const parsed = invitationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  const email = normalizeEmail(parsed.data.email);

  try {
    const context = await resolveAuthorizationContext(
      { requireOrganization: true },
      deps,
    );
    requirePermission(context, "member.invite");
    requirePermission(context, "invitation.create");
    if (!isOrganizationMember(context) || !context.organization) {
      throw new AppError("FORBIDDEN", {
        message: "You don't have permission to access this organization.",
      });
    }
    if (!canInviteRole(context.organizationRole, parsed.data.role)) {
      throw new AppError("FORBIDDEN", {
        message: "You cannot invite a user with this role.",
      });
    }
    const duplicate = await deps.authorizationRepository.findPendingInvitation(
      context.organizationId,
      email,
    );
    if (duplicate) {
      throw new AppError("CONFLICT", {
        message: "This email already has a pending invitation.",
      });
    }
    const { invitation, token } = await deps.authorizationRepository.createInvitation({
      organizationId: context.organizationId,
      email,
      role: parsed.data.role,
      inviterId: context.userId,
      expiresAt: new Date(Date.now() + INVITATION_EXPIRES_IN_SECONDS * 1000),
    });
    try {
      await deps.mailer.sendInvitationEmail({
        to: email,
        organizationName: context.organization.name,
        role: parsed.data.role,
        token,
        expiresAt: invitation.expiresAt ?? new Date(Date.now() + INVITATION_EXPIRES_IN_SECONDS * 1000),
      });
    } catch (mailError) {
      await deps.authorizationRepository.cancelInvitation({
        invitationId: invitation.id,
        organizationId: context.organizationId,
      });
      throw normalizeError(mailError);
    }
    await deps.auditLog.record({
      type: "INVITATION_CREATED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      targetResourceId: invitation.id,
      result: "allowed",
      metadata: { role: parsed.data.role, email },
    });
    return {
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt ?? new Date(Date.now() + INVITATION_EXPIRES_IN_SECONDS * 1000),
    };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeInviteMember };
export type { InviteMemberResult, InviteMemberDeps };
