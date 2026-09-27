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
  | "invitation.cancel"
  | "location.read"
  | "location.create"
  | "location.update"
  | "location.assign"
  | "department.read"
  | "department.create"
  | "department.update"
  | "department.assign"
  | "asset.read"
  | "asset.create"
  | "asset.update"
  | "asset.archive"
  | "asset.assign"
  | "asset.return"
  | "asset.category.read"
  | "asset.category.manage"
  | "asset.model.read"
  | "asset.model.manage"
  | "asset.report.read"
  | "asset.export";

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
 * organization-management permissions. Locations, departments and assets
 * are operational data: OWNER and ADMIN manage them fully. ENGINEER
 * additionally handles day-to-day asset assignment/return and reads
 * reports, while USER keeps read-only access (least privilege).
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
    "location.read",
    "location.create",
    "location.update",
    "location.assign",
    "department.read",
    "department.create",
    "department.update",
    "department.assign",
    "asset.read",
    "asset.create",
    "asset.update",
    "asset.archive",
    "asset.assign",
    "asset.return",
    "asset.category.read",
    "asset.category.manage",
    "asset.model.read",
    "asset.model.manage",
    "asset.report.read",
    "asset.export",
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
    "location.read",
    "location.create",
    "location.update",
    "location.assign",
    "department.read",
    "department.create",
    "department.update",
    "department.assign",
    "asset.read",
    "asset.create",
    "asset.update",
    "asset.archive",
    "asset.assign",
    "asset.return",
    "asset.category.read",
    "asset.category.manage",
    "asset.model.read",
    "asset.model.manage",
    "asset.report.read",
    "asset.export",
  ],
  ENGINEER: [
    "location.read",
    "department.read",
    "asset.read",
    "asset.assign",
    "asset.return",
    "asset.category.read",
    "asset.model.read",
    "asset.report.read",
  ],
  USER: ["location.read", "department.read", "asset.read", "asset.category.read", "asset.model.read"],
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
