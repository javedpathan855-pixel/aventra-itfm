// Authorization policies (domain layer — deterministic, side-effect free).
//
// Every function is (context, action) → boolean. No database, no Next.js,
// no Prisma, no Better Auth, no React. Ownership transfer is deliberately
// absent: it is a separate explicit operation, never a generic role change.

import type { AuthorizationContext } from "./authorization-context";
import type { OrganizationPermission, PlatformPermission } from "./permissions";
import { hasOrganizationPermission, hasPlatformPermission } from "./permissions";
import type { OrganizationRole } from "./roles";

/** Permission check against the context's active organization role. */
const canOrganization = (
  context: AuthorizationContext,
  permission: OrganizationPermission,
): boolean => hasOrganizationPermission(context.organizationRole, permission);

/** Platform permission check. Never derived from organization roles. */
const canPlatform = (
  context: AuthorizationContext,
  permission: PlatformPermission,
): boolean => hasPlatformPermission(context.platformRole, permission);

/**
 * Tenant check: the context's verified active organization must equal the
 * requested one. SUPERADMIN gets no implicit bypass — platform operations
 * select an organization explicitly and stay tenant-scoped.
 */
const canAccessOrganization = (
  context: AuthorizationContext,
  organizationId: string,
): boolean => context.organizationId === organizationId && context.organizationRole !== null;

/**
 * Who may invite which role. OWNER cannot be granted by invitation at all
 * (ownership transfer is a separate explicit operation); ADMIN invites
 * ENGINEER/USER; ENGINEER/USER invite nobody. SUPERADMIN is never an
 * invitation role (enforced by type: OrganizationRole only).
 */
const canInviteRole = (
  inviterRole: OrganizationRole | null,
  requestedRole: OrganizationRole,
): boolean => {
  if (requestedRole === "OWNER") return false;
  if (inviterRole === "OWNER") return true;
  if (inviterRole === "ADMIN") {
    return requestedRole === "ENGINEER" || requestedRole === "USER";
  }
  return false;
};

interface MemberChange {
  actorRole: OrganizationRole;
  actorUserId: string;
  targetUserId: string;
  targetRole: OrganizationRole;
  newRole: OrganizationRole;
}

/**
 * Generic role-change policy. OWNER may move ADMIN/ENGINEER/USER between
 * non-owner roles; ADMIN may move ENGINEER/USER between non-owner roles.
 * Denied: any path touching OWNER (promotion to it, demotion from it),
 * self-changes (prevents accidental self-lockout; ownership transfer is
 * the explicit path), and every ENGINEER/USER attempt.
 */
const canChangeMemberRole = (change: MemberChange): boolean => {
  if (change.actorUserId === change.targetUserId) return false;
  if (change.targetRole === "OWNER" || change.newRole === "OWNER") return false;
  if (change.actorRole === "OWNER") return true;
  if (change.actorRole === "ADMIN") {
    const editable: readonly OrganizationRole[] = ["ENGINEER", "USER"];
    return editable.includes(change.targetRole) && editable.includes(change.newRole);
  }
  return false;
};

interface MemberRemoval {
  actorRole: OrganizationRole;
  actorUserId: string;
  targetUserId: string;
  targetRole: OrganizationRole;
}

/**
 * Generic removal policy. OWNER removes ADMIN/ENGINEER/USER; ADMIN removes
 * ENGINEER/USER. Denied: removing an OWNER, removing yourself (leaving is
 * a separate flow), and every ENGINEER/USER attempt. An admin can never
 * remove the owner.
 */
const canRemoveMember = (removal: MemberRemoval): boolean => {
  if (removal.actorUserId === removal.targetUserId) return false;
  if (removal.targetRole === "OWNER") return false;
  if (removal.actorRole === "OWNER") return true;
  if (removal.actorRole === "ADMIN") {
    return removal.targetRole === "ENGINEER" || removal.targetRole === "USER";
  }
  return false;
};

export { canOrganization, canPlatform, canAccessOrganization, canInviteRole, canChangeMemberRole, canRemoveMember };
export type { MemberChange, MemberRemoval };

type InvitationStatus = "pending" | "accepted" | "cancelled" | "expired";

/**
 * Invitation lifecycle guard. Only pending invitations move — to accepted,
 * cancelled, or (lazily, by a sweeper) expired. Accepted/cancelled/
 * expired invitations never reopen, which prevents replay.
 */
const canTransitionInvitationStatus = (from: string, to: InvitationStatus): boolean =>
  from === "pending" && (to === "accepted" || to === "cancelled" || to === "expired");

export { canTransitionInvitationStatus };
export type { InvitationStatus };
