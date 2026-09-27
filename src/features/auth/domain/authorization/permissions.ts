// Canonical permission model (domain layer — framework-independent).
//
// Permissions are checked, roles are not: application code calls
// requirePermission(context, "member.invite"), never `role === "admin"`.
// The matrix below is the single policy source. Future ITFM modules add
// their own `asset.*`, `ticket.*`, … permissions here when they exist —
// never speculative permissions for modules that do not exist yet.

import type { OrganizationRole, PlatformRole } from "./roles";
import { SUPERADMIN } from "./roles";

type OrganizationPermission =
  | "organization.read"
  | "organization.update"
  | "organization.delete"
  | "organization.transferOwnership"
  | "member.read"
  | "member.invite"
  | "member.updateRole"
  | "member.remove"
  | "invitation.read"
  | "invitation.create"
  | "invitation.cancel";

type PlatformPermission =
  | "platform.organization.read"
  | "platform.organization.manage"
  | "platform.user.read"
  | "platform.user.manage"
  | "platform.settings.manage"
  | "platform.audit.read";

/**
 * Role → permission matrix. OWNER holds every organization permission;
 * ADMIN holds everything except organization.delete and
 * organization.transferOwnership; ENGINEER and USER hold no
 * organization-management permissions (operational permissions arrive
 * with future modules).
 */
const ROLE_PERMISSIONS: Record<OrganizationRole, readonly OrganizationPermission[]> = {
  OWNER: [
    "organization.read",
    "organization.update",
    "organization.delete",
    "organization.transferOwnership",
    "member.read",
    "member.invite",
    "member.updateRole",
    "member.remove",
    "invitation.read",
    "invitation.create",
    "invitation.cancel",
  ],
  ADMIN: [
    "organization.read",
    "organization.update",
    "member.read",
    "member.invite",
    "member.updateRole",
    "member.remove",
    "invitation.read",
    "invitation.create",
    "invitation.cancel",
  ],
  ENGINEER: [],
  USER: [],
} as const;

/** Platform permissions held exclusively by SUPERADMIN. Never mapped from organization roles. */
const SUPERADMIN_PERMISSIONS: readonly PlatformPermission[] = [
  "platform.organization.read",
  "platform.organization.manage",
  "platform.user.read",
  "platform.user.manage",
  "platform.settings.manage",
  "platform.audit.read",
] as const;

const hasOrganizationPermission = (
  role: OrganizationRole | null,
  permission: OrganizationPermission,
): boolean => (role === null ? false : ROLE_PERMISSIONS[role].includes(permission));

const hasPlatformPermission = (
  platformRole: PlatformRole | null,
  permission: PlatformPermission,
): boolean =>
  platformRole === SUPERADMIN && (SUPERADMIN_PERMISSIONS as readonly string[]).includes(permission);

export { ROLE_PERMISSIONS, SUPERADMIN_PERMISSIONS, hasOrganizationPermission, hasPlatformPermission };
export type { OrganizationPermission, PlatformPermission };
