// Remove organization member use case (application layer).
//
// Tenant rule: the target member is resolved inside the verified active
// organization only — unknown or foreign member ids fail identically
// (FORBIDDEN, no existence leak). Owners can never be removed through
// this path, and nobody can remove themselves here.

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { normalizeOrganizationRole } from "../../domain/authorization/roles";
import { isOrganizationMember } from "../../domain/authorization/authorization-context";
import { canRemoveMember } from "../../domain/authorization/policies";
import type { AuditLogPort } from "../../repository/audit-log";
import {
  resolveAuthorizationContext,
  type AuthorizationDeps,
} from "../authorization/resolve-authorization-context";
import { requirePermission } from "../authorization/guards";

const removeMemberSchema = z.object({
  memberId: z.string().min(1, "Member is required."),
});

interface RemoveMemberResult {
  removed: true;
}

interface RemoveMemberDeps extends AuthorizationDeps {
  auditLog?: AuditLogPort;
}

const executeRemoveMember = async (
  rawInput: unknown,
  deps: RemoveMemberDeps,
): Promise<RemoveMemberResult> => {
  const parsed = removeMemberSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext(
      { requireOrganization: true },
      deps,
    );
    requirePermission(context, "member.remove");
    if (!isOrganizationMember(context)) {
      throw new AppError("FORBIDDEN", {
        message: "You don't have permission to access this organization.",
      });
    }
    const members = await deps.authorizationRepository.listMembersOfOrganization(
      context.organizationId,
    );
    const target = members.find((member) => member.id === parsed.data.memberId);
    if (!target) {
      throw new AppError("FORBIDDEN", {
        message: "You don't have permission to perform this action.",
      });
    }
    const targetRole = normalizeOrganizationRole(target.role);
    if (!targetRole) {
      throw new AppError("INTERNAL_ERROR");
    }
    if (
      !canRemoveMember({
        actorRole: context.organizationRole,
        actorUserId: context.userId,
        targetUserId: target.userId,
        targetRole,
      })
    ) {
      if (targetRole === "OWNER") {
        throw new AppError("FORBIDDEN", {
          message: "The organization owner cannot be removed. Transfer ownership first.",
        });
      }
      throw new AppError("FORBIDDEN", {
        message: "You don't have permission to remove this member.",
      });
    }
    await deps.authorizationRepository.removeMember({
      memberId: target.id,
      organizationId: context.organizationId,
    });
    await deps.auditLog?.record({
      type: "MEMBER_REMOVED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      targetUserId: target.userId,
      targetResourceId: target.id,
      result: "allowed",
      metadata: { role: targetRole },
    });
    return { removed: true };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeRemoveMember };
export type { RemoveMemberResult };
