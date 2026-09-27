// Update member role use case (application layer).
//
// Tenant rule: the target member is resolved inside the verified active
// organization only — unknown or foreign member ids fail identically
// (FORBIDDEN, no existence leak). Ownership transfer is not a generic
// role change: any path touching OWNER is rejected with an explicit
// business error, as is changing your own role.

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { ORGANIZATION_ROLES } from "../../domain/authorization/roles";
import { normalizeOrganizationRole } from "../../domain/authorization/roles";
import { isOrganizationMember } from "../../domain/authorization/authorization-context";
import { canChangeMemberRole } from "../../domain/authorization/policies";
import type { AuditLogPort } from "../../repository/audit-log";
import {
  resolveAuthorizationContext,
  type AuthorizationDeps,
} from "../authorization/resolve-authorization-context";
import { requirePermission } from "../authorization/guards";

const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1, "Member is required."),
  role: z.enum(ORGANIZATION_ROLES, { message: "Select a valid organization role." }),
});

interface UpdateMemberRoleResult {
  memberId: string;
  userId: string;
  role: string;
}

interface UpdateMemberRoleDeps extends AuthorizationDeps {
  auditLog?: AuditLogPort;
}

const executeUpdateMemberRole = async (
  rawInput: unknown,
  deps: UpdateMemberRoleDeps,
): Promise<UpdateMemberRoleResult> => {
  const parsed = updateMemberRoleSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext(
      { requireOrganization: true },
      deps,
    );
    requirePermission(context, "member.updateRole");
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
      !canChangeMemberRole({
        actorRole: context.organizationRole,
        actorUserId: context.userId,
        targetUserId: target.userId,
        targetRole,
        newRole: parsed.data.role,
      })
    ) {
      if (targetRole === "OWNER" || parsed.data.role === "OWNER") {
        throw new AppError("FORBIDDEN", {
          message: "Ownership can only be changed through the ownership transfer flow.",
        });
      }
      throw new AppError("FORBIDDEN", {
        message: "You don't have permission to change this member's role.",
      });
    }
    const updated = await deps.authorizationRepository.updateMemberRole({
      memberId: target.id,
      organizationId: context.organizationId,
      role: parsed.data.role,
    });
    await deps.auditLog?.record({
      type: "MEMBER_ROLE_CHANGED",
      actorUserId: context.userId,
      organizationId: context.organizationId,
      targetUserId: target.userId,
      targetResourceId: target.id,
      result: "allowed",
      metadata: { fromRole: targetRole, toRole: parsed.data.role },
    });
    return { memberId: updated.id, userId: updated.userId, role: parsed.data.role };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeUpdateMemberRole };
export type { UpdateMemberRoleResult };
