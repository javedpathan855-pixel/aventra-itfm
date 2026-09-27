import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SUPERADMIN,
  ORGANIZATION_ROLES,
  normalizeOrganizationRole,
  normalizePlatformRole,
} from "../domain/authorization/roles";
import {
  ROLE_PERMISSIONS,
  SUPERADMIN_PERMISSIONS,
  hasOrganizationPermission,
  hasPlatformPermission,
} from "../domain/authorization/permissions";
import {
  canOrganization,
  canPlatform,
  canAccessOrganization,
  canInviteRole,
  canChangeMemberRole,
  canRemoveMember,
} from "../domain/authorization/policies";
import type { AuthorizationContext } from "../domain/authorization/authorization-context";

const contextFor = (
  organizationRole: AuthorizationContext["organizationRole"],
  platformRole: AuthorizationContext["platformRole"] = null,
  organizationId: string | null = "org-1",
): AuthorizationContext => ({
  userId: "user-1",
  email: "user-1@x.test",
  platformRole,
  organizationId,
  organizationRole,
  organization: organizationId ? { id: organizationId, name: "Org", slug: "org" } : null,
});

describe("Role model", () => {
  it("separates platform and organization roles", () => {
    assert.equal(SUPERADMIN, "SUPERADMIN");
    assert.deepEqual([...ORGANIZATION_ROLES], ["OWNER", "ADMIN", "ENGINEER", "USER"]);
    assert.ok(!(ORGANIZATION_ROLES as readonly string[]).includes("SUPERADMIN"));
  });

  it("normalizes the provider lowercase owner and rejects unknowns", () => {
    assert.equal(normalizeOrganizationRole("owner"), "OWNER");
    assert.equal(normalizeOrganizationRole("  admin "), "ADMIN");
    assert.equal(normalizeOrganizationRole("superadmin"), null);
    assert.equal(normalizeOrganizationRole("root"), null);
    assert.equal(normalizeOrganizationRole(null), null);
    assert.equal(normalizeOrganizationRole(42), null);
  });

  it("never infers platform role from anything but the explicit value", () => {
    assert.equal(normalizePlatformRole("SUPERADMIN"), "SUPERADMIN");
    assert.equal(normalizePlatformRole("superadmin"), null);
    assert.equal(normalizePlatformRole("OWNER"), null);
    assert.equal(normalizePlatformRole("admin@company.com"), null);
    assert.equal(normalizePlatformRole(null), null);
  });
});

describe("Permission matrix", () => {
  it("grants OWNER every organization permission", () => {
    assert.equal(ROLE_PERMISSIONS.OWNER.length, 31);
    for (const permission of [
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
    ] as const) {
      assert.equal(hasOrganizationPermission("OWNER", permission), true);
    }
  });

  it("denies ADMIN delete and ownership transfer only", () => {
    assert.equal(hasOrganizationPermission("ADMIN", "organization.delete"), false);
    assert.equal(hasOrganizationPermission("ADMIN", "organization.transferOwnership"), false);
    assert.equal(hasOrganizationPermission("ADMIN", "member.invite"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "member.updateRole"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "member.remove"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "location.create"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "location.assign"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "department.create"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "department.assign"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "asset.create"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "asset.archive"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "asset.assign"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "asset.category.manage"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "asset.model.manage"), true);
    assert.equal(hasOrganizationPermission("ADMIN", "asset.export"), true);
    assert.equal(ROLE_PERMISSIONS.ADMIN.length, 29);
  });

  it("grants ENGINEER operational asset access and USER read-only access", () => {
    assert.deepEqual([...ROLE_PERMISSIONS.ENGINEER], [
      "location.read",
      "department.read",
      "asset.read",
      "asset.assign",
      "asset.return",
      "asset.category.read",
      "asset.model.read",
      "asset.report.read",
    ]);
    assert.deepEqual([...ROLE_PERMISSIONS.USER], [
      "location.read",
      "department.read",
      "asset.read",
      "asset.category.read",
      "asset.model.read",
    ]);
    assert.equal(hasOrganizationPermission("ENGINEER", "location.read"), true);
    assert.equal(hasOrganizationPermission("USER", "department.read"), true);
    assert.equal(hasOrganizationPermission("ENGINEER", "location.create"), false);
    assert.equal(hasOrganizationPermission("ENGINEER", "location.assign"), false);
    assert.equal(hasOrganizationPermission("USER", "department.update"), false);
    assert.equal(hasOrganizationPermission("ENGINEER", "member.read"), false);
    assert.equal(hasOrganizationPermission("USER", "organization.read"), false);
    assert.equal(hasOrganizationPermission("ENGINEER", "asset.read"), true);
    assert.equal(hasOrganizationPermission("ENGINEER", "asset.assign"), true);
    assert.equal(hasOrganizationPermission("ENGINEER", "asset.return"), true);
    assert.equal(hasOrganizationPermission("ENGINEER", "asset.report.read"), true);
    assert.equal(hasOrganizationPermission("ENGINEER", "asset.create"), false);
    assert.equal(hasOrganizationPermission("ENGINEER", "asset.update"), false);
    assert.equal(hasOrganizationPermission("ENGINEER", "asset.archive"), false);
    assert.equal(hasOrganizationPermission("ENGINEER", "asset.category.manage"), false);
    assert.equal(hasOrganizationPermission("ENGINEER", "asset.export"), false);
    assert.equal(hasOrganizationPermission("USER", "asset.read"), true);
    assert.equal(hasOrganizationPermission("USER", "asset.category.read"), true);
    assert.equal(hasOrganizationPermission("USER", "asset.assign"), false);
    assert.equal(hasOrganizationPermission("USER", "asset.return"), false);
    assert.equal(hasOrganizationPermission("USER", "asset.report.read"), false);
    assert.equal(hasOrganizationPermission("USER", "asset.export"), false);
    assert.equal(hasOrganizationPermission(null, "member.read"), false);
  });

  it("keeps platform permissions exclusive to SUPERADMIN", () => {
    assert.equal(SUPERADMIN_PERMISSIONS.length, 6);
    for (const permission of SUPERADMIN_PERMISSIONS) {
      assert.equal(hasPlatformPermission("SUPERADMIN", permission), true);
      assert.equal(hasPlatformPermission(null, permission), false);
    }
  });

  it("never maps organization roles to platform permissions", () => {
    const ownerContext = contextFor("OWNER");
    assert.equal(canPlatform(ownerContext, "platform.user.read"), false);
    assert.equal(canPlatform(contextFor("OWNER", "SUPERADMIN"), "platform.user.read"), true);
  });
});

describe("Tenant access policy", () => {
  it("requires exact active-organization match without superadmin bypass", () => {
    assert.equal(canAccessOrganization(contextFor("OWNER"), "org-1"), true);
    assert.equal(canAccessOrganization(contextFor("OWNER"), "org-2"), false);
    assert.equal(canAccessOrganization(contextFor("OWNER", "SUPERADMIN"), "org-2"), false);
    assert.equal(
      canAccessOrganization(contextFor(null, null, null), "org-1"),
      false,
    );
  });
});

describe("Invitation policy", () => {
  it("lets OWNER invite ADMIN, ENGINEER, and USER but never OWNER", () => {
    assert.equal(canInviteRole("OWNER", "ADMIN"), true);
    assert.equal(canInviteRole("OWNER", "ENGINEER"), true);
    assert.equal(canInviteRole("OWNER", "USER"), true);
    assert.equal(canInviteRole("OWNER", "OWNER"), false);
  });

  it("lets ADMIN invite ENGINEER and USER only", () => {
    assert.equal(canInviteRole("ADMIN", "ENGINEER"), true);
    assert.equal(canInviteRole("ADMIN", "USER"), true);
    assert.equal(canInviteRole("ADMIN", "OWNER"), false);
    assert.equal(canInviteRole("ADMIN", "ADMIN"), false);
  });

  it("lets ENGINEER, USER, and anonymous invite nobody", () => {
    for (const role of ["ENGINEER", "USER", null] as const) {
      for (const requested of ["OWNER", "ADMIN", "ENGINEER", "USER"] as const) {
        assert.equal(canInviteRole(role, requested), false);
      }
    }
  });
});

describe("Member role-change policy", () => {
  it("lets OWNER move non-owners between non-owner roles", () => {
    assert.equal(
      canChangeMemberRole({ actorRole: "OWNER", actorUserId: "a", targetUserId: "b", targetRole: "ADMIN", newRole: "ENGINEER" }),
      true,
    );
  });

  it("blocks every path touching OWNER ownership", () => {
    const promote = { actorRole: "OWNER", actorUserId: "a", targetUserId: "b", targetRole: "ADMIN", newRole: "OWNER" } as const;
    const demote = { actorRole: "OWNER", actorUserId: "a", targetUserId: "b", targetRole: "OWNER", newRole: "ADMIN" } as const;
    const adminPromote = { actorRole: "ADMIN", actorUserId: "a", targetUserId: "b", targetRole: "ENGINEER", newRole: "OWNER" } as const;
    assert.equal(canChangeMemberRole(promote), false);
    assert.equal(canChangeMemberRole(demote), false);
    assert.equal(canChangeMemberRole(adminPromote), false);
  });

  it("lets ADMIN move ENGINEER and USER between each other", () => {
    assert.equal(
      canChangeMemberRole({ actorRole: "ADMIN", actorUserId: "a", targetUserId: "b", targetRole: "ENGINEER", newRole: "USER" }),
      true,
    );
    assert.equal(
      canChangeMemberRole({ actorRole: "ADMIN", actorUserId: "a", targetUserId: "b", targetRole: "ADMIN", newRole: "USER" }),
      false,
    );
  });

  it("blocks self-changes and ENGINEER/USER attempts", () => {
    assert.equal(
      canChangeMemberRole({ actorRole: "OWNER", actorUserId: "a", targetUserId: "a", targetRole: "ADMIN", newRole: "USER" }),
      false,
    );
    assert.equal(
      canChangeMemberRole({ actorRole: "ENGINEER", actorUserId: "a", targetUserId: "b", targetRole: "USER", newRole: "ENGINEER" }),
      false,
    );
    assert.equal(
      canChangeMemberRole({ actorRole: "USER", actorUserId: "a", targetUserId: "b", targetRole: "USER", newRole: "ENGINEER" }),
      false,
    );
  });
});

describe("Member removal policy", () => {
  it("lets OWNER remove non-owners and ADMIN remove ENGINEER/USER", () => {
    assert.equal(
      canRemoveMember({ actorRole: "OWNER", actorUserId: "a", targetUserId: "b", targetRole: "ADMIN" }),
      true,
    );
    assert.equal(
      canRemoveMember({ actorRole: "ADMIN", actorUserId: "a", targetUserId: "b", targetRole: "ENGINEER" }),
      true,
    );
  });

  it("protects the owner from everyone including admins", () => {
    assert.equal(
      canRemoveMember({ actorRole: "OWNER", actorUserId: "a", targetUserId: "b", targetRole: "OWNER" }),
      false,
    );
    assert.equal(
      canRemoveMember({ actorRole: "ADMIN", actorUserId: "a", targetUserId: "b", targetRole: "OWNER" }),
      false,
    );
  });

  it("blocks self-removal and ENGINEER/USER attempts", () => {
    assert.equal(
      canRemoveMember({ actorRole: "OWNER", actorUserId: "a", targetUserId: "a", targetRole: "ADMIN" }),
      false,
    );
    assert.equal(
      canRemoveMember({ actorRole: "ENGINEER", actorUserId: "a", targetUserId: "b", targetRole: "USER" }),
      false,
    );
    assert.equal(
      canRemoveMember({ actorRole: "USER", actorUserId: "a", targetUserId: "b", targetRole: "USER" }),
      false,
    );
  });
});

describe("Permission-first checks", () => {
  it("prefers permission checks over role equality", () => {
    assert.equal(canOrganization(contextFor("ADMIN"), "member.invite"), true);
    assert.equal(canOrganization(contextFor("ENGINEER"), "member.invite"), false);
    assert.equal(canOrganization(contextFor(null, null, "org-1"), "member.read"), false);
  });
});
