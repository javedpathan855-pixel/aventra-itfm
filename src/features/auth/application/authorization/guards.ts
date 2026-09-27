// Application authorization guards (framework-independent, pure).
//
// Thin assertion layer over a resolved AuthorizationContext for protected
// use cases and routes. Guards throw safe AppErrors; they perform no I/O
// and contain no policy matrix (that lives in domain/authorization).

import { AppError } from "@/shared/error/app-error";
import {
  isOrganizationMember,
  type AuthorizationContext,
} from "../../domain/authorization/authorization-context";
import {
  canOrganization,
  canPlatform,
} from "../../domain/authorization/policies";
import type {
  OrganizationPermission,
  PlatformPermission,
} from "../../domain/authorization/permissions";
import type {
  OrganizationRole,
} from "../../domain/authorization/roles";

/** Assert a resolved context carries an authenticated user. */
function requireAuthenticated(
  context: AuthorizationContext,
): asserts context is AuthorizationContext & { userId: string } {
  if (!context.userId) throw new AppError("UNAUTHENTICATED");
}

/** Assert active organization membership (tenant anchor present). */
function requireOrganizationMember(
  context: AuthorizationContext,
): asserts context is AuthorizationContext & {
  organizationId: string;
  organizationRole: OrganizationRole;
} {
  requireAuthenticated(context);
  if (!isOrganizationMember(context)) {
    throw new AppError("FORBIDDEN", {
      message: "You don't have permission to access this organization.",
    });
  }
}

/** Assert an organization permission on the active membership. */
function requirePermission(
  context: AuthorizationContext,
  permission: OrganizationPermission,
): void {
  requireOrganizationMember(context);
  if (!canOrganization(context, permission)) {
    throw new AppError("FORBIDDEN", {
      message: "You don't have permission to perform this action.",
    });
  }
}

/** Assert a platform permission. Never satisfiable by organization roles. */
function requirePlatformPermission(
  context: AuthorizationContext,
  permission: PlatformPermission,
): void {
  requireAuthenticated(context);
  if (!canPlatform(context, permission)) {
    throw new AppError("FORBIDDEN", {
      message: "You don't have permission to perform this action.",
    });
  }
};

export {
  requireAuthenticated,
  requireOrganizationMember,
  requirePermission,
  requirePlatformPermission,
};
