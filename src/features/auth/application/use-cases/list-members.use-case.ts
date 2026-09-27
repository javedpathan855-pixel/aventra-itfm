// List organization members use case (application layer).
//
// Tenant rule: members are always read from the verified active
// organization in the authorization context — no organizationId is
// accepted from the caller.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { isOrganizationMember } from "../../domain/authorization/authorization-context";
import { normalizeOrganizationRole } from "../../domain/authorization/roles";
import {
  resolveAuthorizationContext,
  type AuthorizationDeps,
} from "../authorization/resolve-authorization-context";
import { requirePermission } from "../authorization/guards";

interface OrganizationMember {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface ListMembersResult {
  organizationId: string;
  members: OrganizationMember[];
}

const executeListMembers = async (
  rawInput: unknown,
  deps: AuthorizationDeps,
): Promise<ListMembersResult> => {
  if (rawInput !== undefined && rawInput !== null && typeof rawInput !== "object") {
    throw new AppError("VALIDATION_ERROR");
  }
  try {
    const context = await resolveAuthorizationContext(
      { requireOrganization: true },
      deps,
    );
    requirePermission(context, "member.read");
    if (!isOrganizationMember(context)) {
      throw new AppError("FORBIDDEN", {
        message: "You don't have permission to access this organization.",
      });
    }
    const rows = await deps.authorizationRepository.listMembersOfOrganization(
      context.organizationId,
    );
    const members = rows.map((row) => {
      const role = normalizeOrganizationRole(row.role);
      if (!role) {
        throw new AppError("INTERNAL_ERROR");
      }
      return {
        memberId: row.id,
        userId: row.userId,
        name: row.name,
        email: row.email,
        role,
      };
    });
    return { organizationId: context.organizationId, members };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeListMembers };
export type { OrganizationMember, ListMembersResult };
