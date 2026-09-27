// List caller's organizations use case (application layer).
//
// Organization-switcher foundation: returns every organization the caller
// belongs to (with their role in each) so presentation can offer switching
// without ever accepting organization identifiers from the client.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { normalizeOrganizationRole } from "../../domain/authorization/roles";
import {
  resolveAuthorizationContext,
  type AuthorizationDeps,
} from "../authorization/resolve-authorization-context";
import { requireAuthenticated } from "../authorization/guards";

interface MyOrganization {
  organizationId: string;
  name: string;
  slug: string;
  role: string;
  active: boolean;
}

interface ListMyOrganizationsResult {
  organizations: MyOrganization[];
}

const executeListMyOrganizations = async (
  rawInput: unknown,
  deps: AuthorizationDeps,
): Promise<ListMyOrganizationsResult> => {
  if (rawInput !== undefined && rawInput !== null && typeof rawInput !== "object") {
    throw new AppError("VALIDATION_ERROR");
  }
  try {
    const context = await resolveAuthorizationContext(rawInput, deps);
    requireAuthenticated(context);
    const memberships = await deps.authorizationRepository.listMembershipsForUser(
      context.userId,
    );
    const organizations: MyOrganization[] = [];
    for (const membership of memberships) {
      const role = normalizeOrganizationRole(membership.role);
      const organization = await deps.authorizationRepository.getOrganizationById(
        membership.organizationId,
      );
      if (!role || !organization) continue;
      organizations.push({
        organizationId: organization.id,
        name: organization.name,
        slug: organization.slug,
        role,
        active: organization.id === context.organizationId,
      });
    }
    return { organizations };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeListMyOrganizations };
export type { MyOrganization, ListMyOrganizationsResult };
