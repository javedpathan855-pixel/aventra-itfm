import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@/shared/error/app-error";
import type {
  AuthorizationRepository,
  CreatedInvitation,
  InvitationRecord,
  MembershipRecord,
  MemberWithUser,
  OrganizationRecord,
} from "../repository/authorization-repository";
import type { AuthProvider } from "../repository/auth-provider";
import {
  resolveAuthorizationContext,
} from "../application/authorization/resolve-authorization-context";
import {
  requireOrganizationMember,
  requirePermission,
  requirePlatformPermission,
} from "../application/authorization/guards";
import { executeListMembers } from "../application/use-cases/list-members.use-case";
import { executeInviteMember } from "../application/use-cases/invite-member.use-case";
import { executeUpdateMemberRole } from "../application/use-cases/update-member-role.use-case";
import { executeRemoveMember } from "../application/use-cases/remove-member.use-case";
import { executeSwitchOrganization } from "../application/use-cases/switch-organization.use-case";
import { executeListMyOrganizations } from "../application/use-cases/list-my-organizations.use-case";

/** In-memory authorization repository honoring the port's org-scoping. */
class FakeAuthorizationRepository implements AuthorizationRepository {
  memberships: MembershipRecord[] = [];
  users = new Map<string, { platformRole: string | null }>();
  organizations = new Map<string, OrganizationRecord>();
  invitations: InvitationRecord[] = [];

  async getMembership(userId: string, organizationId: string) {
    return this.memberships.find((m) => m.userId === userId && m.organizationId === organizationId) ?? null;
  }

  async listMembershipsForUser(userId: string) {
    return this.memberships.filter((m) => m.userId === userId);
  }

  async listMembersOfOrganization(organizationId: string): Promise<MemberWithUser[]> {
    return this.memberships
      .filter((m) => m.organizationId === organizationId)
      .map((m) => ({ id: m.id, userId: m.userId, name: m.userId, email: `${m.userId}@x.test`, role: m.role }));
  }

  async getUserPlatformRole(userId: string) {
    return this.users.get(userId)?.platformRole ?? null;
  }

  async getOrganizationById(organizationId: string) {
    return this.organizations.get(organizationId) ?? null;
  }

  async createInvitation(input: {
    organizationId: string;
    email: string;
    role: string;
    inviterId: string;
    expiresAt: Date;
  }): Promise<CreatedInvitation> {
    const token = randomBytes(32).toString("hex");
    const invitation: InvitationRecord = {
      id: `inv-${this.invitations.length + 1}`,
      status: "pending",
      ...input,
    };
    // Hash-at-rest mirror: the raw token is never stored on the record.
    (invitation as unknown as Record<string, unknown>).tokenHash = createHash("sha256")
      .update(token, "utf8")
      .digest("hex");
    this.invitations.push(invitation);
    return { invitation, token };
  }

  async findPendingInvitation(organizationId: string, email: string) {
    return (
      this.invitations.find(
        (invitation) =>
          invitation.organizationId === organizationId &&
          invitation.email === email &&
          invitation.status === "pending",
      ) ?? null
    );
  }

  async findInvitationByToken(token: string) {
    if (typeof token !== "string" || token.length === 0) return null;
    const digest = createHash("sha256").update(token, "utf8").digest("hex");
    return (
      this.invitations.find(
        (invitation) =>
          (invitation as unknown as Record<string, unknown>).tokenHash === digest,
      ) ?? null
    );
  }

  async acceptInvitation(input: { invitationId: string; organizationId: string; userId: string; role: string }) {
    const invitation = this.invitations.find(
      (row) =>
        row.id === input.invitationId &&
        row.organizationId === input.organizationId &&
        row.status === "pending",
    );
    if (!invitation) throw new AppError("NOT_FOUND");
    invitation.status = "accepted";
    const existing = this.memberships.find(
      (m) => m.userId === input.userId && m.organizationId === input.organizationId,
    );
    if (existing) return existing;
    const membership: MembershipRecord = {
      id: `m-${input.userId}-${input.organizationId}`,
      userId: input.userId,
      organizationId: input.organizationId,
      role: input.role,
    };
    this.memberships.push(membership);
    return membership;
  }

  async cancelInvitation(input: { invitationId: string; organizationId: string }) {
    const invitation = this.invitations.find(
      (row) => row.id === input.invitationId && row.organizationId === input.organizationId && row.status === "pending",
    );
    if (invitation) invitation.status = "cancelled";
  }

  async updateMemberRole(input: { memberId: string; organizationId: string; role: string }) {
    const membership = this.memberships.find(
      (m) => m.id === input.memberId && m.organizationId === input.organizationId,
    );
    if (!membership) throw new AppError("NOT_FOUND");
    membership.role = input.role;
    return membership;
  }

  async removeMember(input: { memberId: string; organizationId: string }) {
    this.memberships = this.memberships.filter(
      (m) => !(m.id === input.memberId && m.organizationId === input.organizationId),
    );
  }
}

const stubAuthProvider = (overrides: Partial<AuthProvider>): AuthProvider => ({
  findUserByEmail: async () => null,
  signUpWithPassword: async () => {
    throw new AppError("INTERNAL_ERROR");
  },
  signUpWithWorkspace: async () => {
    throw new AppError("INTERNAL_ERROR");
  },
  signInWithPassword: async () => {
    throw new AppError("INTERNAL_ERROR");
  },
  signOut: async () => {},
  sendVerificationOTP: async () => {},
  verifyEmailOTP: async () => {
    throw new AppError("INTERNAL_ERROR");
  },
  requestPasswordReset: async () => {},
  resetPasswordWithToken: async () => {},
  getSession: async () => null,
  setActiveOrganization: async () => {
    throw new AppError("INTERNAL_ERROR");
  },
  ...overrides,
});

/** Org A (owner/user-a, admin/user-b, engineer/user-c, user/user-d) + Org B (owner/user-e). */
const seedTenants = (repo: FakeAuthorizationRepository) => {
  repo.users.set("user-a", { platformRole: null });
  repo.users.set("user-b", { platformRole: null });
  repo.users.set("user-c", { platformRole: null });
  repo.users.set("user-d", { platformRole: null });
  repo.users.set("user-e", { platformRole: null });
  repo.users.set("user-root", { platformRole: "SUPERADMIN" });
  repo.organizations.set("org-a", { id: "org-a", name: "Org A", slug: "org-a" });
  repo.organizations.set("org-b", { id: "org-b", name: "Org B", slug: "org-b" });
  repo.memberships.push(
    { id: "m-a-owner", userId: "user-a", organizationId: "org-a", role: "OWNER" },
    { id: "m-a-admin", userId: "user-b", organizationId: "org-a", role: "ADMIN" },
    { id: "m-a-eng", userId: "user-c", organizationId: "org-a", role: "ENGINEER" },
    { id: "m-a-user", userId: "user-d", organizationId: "org-a", role: "USER" },
    { id: "m-b-owner", userId: "user-e", organizationId: "org-b", role: "OWNER" },
  );
};

const sessionFor = (userId: string, activeOrganizationId: string | null, email?: string) => async () => ({
  userId,
  email: email ?? `${userId}@x.test`,
  activeOrganizationId,
});

describe("Authorization context resolver", () => {
  let repo: FakeAuthorizationRepository;
  beforeEach(() => {
    repo = new FakeAuthorizationRepository();
    seedTenants(repo);
  });

  it("rejects anonymous callers as unauthenticated", async () => {
    await assert.rejects(
      resolveAuthorizationContext({}, { getSession: async () => null, authorizationRepository: repo }),
      (err: unknown) => err instanceof AppError && err.code === "UNAUTHENTICATED",
    );
  });

  it("resolves an org-less context without organization requirement", async () => {
    const context = await resolveAuthorizationContext(
      {},
      { getSession: sessionFor("user-a", null), authorizationRepository: repo },
    );
    assert.equal(context.userId, "user-a");
    assert.equal(context.organizationId, null);
    assert.equal(context.organizationRole, null);
  });

  it("rejects missing organization selection when required", async () => {
    await assert.rejects(
      resolveAuthorizationContext(
        { requireOrganization: true },
        { getSession: sessionFor("user-a", null), authorizationRepository: repo },
      ),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("resolves membership with role normalization", async () => {
    repo.memberships.push({ id: "m-legacy", userId: "user-d", organizationId: "org-b", role: "owner" });
    const context = await resolveAuthorizationContext(
      {},
      { getSession: sessionFor("user-d", "org-b"), authorizationRepository: repo },
    );
    assert.equal(context.organizationId, "org-b");
    assert.equal(context.organizationRole, "OWNER");
    assert.equal(context.organization?.slug, "org-b");
  });

  it("denies non-members without leaking organization existence", async () => {
    for (const target of ["org-b", "org-nope"]) {
      await assert.rejects(
        resolveAuthorizationContext(
          { organizationId: target },
          { getSession: sessionFor("user-d", "org-a"), authorizationRepository: repo },
        ),
        (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
      );
    }
  });

  it("rejects malformed input without touching the session", async () => {
    let called = false;
    await assert.rejects(
      resolveAuthorizationContext("org-a", {
        getSession: async () => {
          called = true;
          return null;
        },
        authorizationRepository: repo,
      }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
    assert.equal(called, false);
  });

  it("passes the platform role through for superadmins", async () => {
    const context = await resolveAuthorizationContext(
      {},
      { getSession: sessionFor("user-root", null), authorizationRepository: repo },
    );
    assert.equal(context.platformRole, "SUPERADMIN");
    assert.equal(context.organizationRole, null);
  });
});

describe("Authorization guards", () => {
  it("enforces organization membership and permissions", () => {
    const engineer = {
      userId: "user-c",
      email: "user-c@x.test",
      platformRole: null,
      organizationId: "org-a",
      organizationRole: "ENGINEER",
      organization: { id: "org-a", name: "Org A", slug: "org-a" },
    } as const;
    assert.throws(
      () => requirePermission({ ...engineer }, "member.invite"),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    assert.throws(
      () => requireOrganizationMember({ ...engineer, organizationId: null, organizationRole: null }),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("enforces platform permissions separately from organization roles", () => {
    const owner = {
      userId: "user-a",
      email: "user-a@x.test",
      platformRole: null,
      organizationId: "org-a",
      organizationRole: "OWNER",
      organization: { id: "org-a", name: "Org A", slug: "org-a" },
    } as const;
    const root = { ...owner, userId: "user-root", platformRole: "SUPERADMIN" } as const;
    assert.throws(
      () => requirePlatformPermission({ ...owner }, "platform.user.read"),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    requirePlatformPermission({ ...root }, "platform.user.read");
  });
});

describe("Member use cases", () => {
  let repo: FakeAuthorizationRepository;
  beforeEach(() => {
    repo = new FakeAuthorizationRepository();
    seedTenants(repo);
  });
  const noopMailer = { sendInvitationEmail: async () => {} };
  const noopAudit = { record: async () => {} };
  const depsFor = (userId: string, activeOrganizationId: string | null) => ({
    getSession: sessionFor(userId, activeOrganizationId),
    authorizationRepository: repo,
    mailer: noopMailer,
    auditLog: noopAudit,
  });

  it("lets owners list members but denies engineers", async () => {
    const result = await executeListMembers(undefined, depsFor("user-a", "org-a"));
    assert.equal(result.organizationId, "org-a");
    assert.equal(result.members.length, 4);
    await assert.rejects(
      executeListMembers(undefined, depsFor("user-c", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("lets owners invite admins and admins invite users, never owners", async () => {
    const created = await executeInviteMember(
      { email: "new@x.test", role: "ADMIN" },
      depsFor("user-a", "org-a"),
    );
    assert.equal(created.role, "ADMIN");
    await executeInviteMember({ email: "u@x.test", role: "USER" }, depsFor("user-b", "org-a"));
    await assert.rejects(
      executeInviteMember({ email: "evil@x.test", role: "OWNER" }, depsFor("user-b", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    await assert.rejects(
      executeInviteMember({ email: "evil@x.test", role: "USER" }, depsFor("user-c", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("rejects superadmin and unknown roles at validation", async () => {
    for (const role of ["SUPERADMIN", "superadmin", "root", ""]) {
      await assert.rejects(
        executeInviteMember({ email: "x@x.test", role }, depsFor("user-a", "org-a")),
        (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
      );
    }
  });

  it("lets owners demote admins but blocks ownership paths and self-changes", async () => {
    const updated = await executeUpdateMemberRole(
      { memberId: "m-a-admin", role: "ENGINEER" },
      depsFor("user-a", "org-a"),
    );
    assert.equal(updated.role, "ENGINEER");
    await assert.rejects(
      executeUpdateMemberRole({ memberId: "m-a-admin", role: "OWNER" }, depsFor("user-a", "org-a")),
      (err: unknown) =>
        err instanceof AppError &&
        err.code === "FORBIDDEN" &&
        err.message.includes("ownership transfer"),
    );
    await assert.rejects(
      executeUpdateMemberRole({ memberId: "m-a-owner", role: "ADMIN" }, depsFor("user-a", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    await assert.rejects(
      executeUpdateMemberRole({ memberId: "m-a-owner", role: "ADMIN" }, depsFor("user-a", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("lets admins manage non-owners but never touch the owner", async () => {
    await executeUpdateMemberRole({ memberId: "m-a-eng", role: "USER" }, depsFor("user-b", "org-a"));
    await assert.rejects(
      executeUpdateMemberRole({ memberId: "m-a-owner", role: "USER" }, depsFor("user-b", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("lets owners remove admins but protects owners and self-removal", async () => {
    await assert.rejects(
      executeRemoveMember({ memberId: "m-a-owner" }, depsFor("user-b", "org-a")),
      (err: unknown) =>
        err instanceof AppError && err.code === "FORBIDDEN" && err.message.includes("owner"),
    );
    const removed = await executeRemoveMember({ memberId: "m-a-admin" }, depsFor("user-a", "org-a"));
    assert.equal(removed.removed, true);
    await assert.rejects(
      executeRemoveMember({ memberId: "m-a-owner" }, depsFor("user-a", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    await assert.rejects(
      executeRemoveMember({ memberId: "m-a-user" }, depsFor("user-d", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("denies cross-tenant member access identically to unknown members", async () => {
    await assert.rejects(
      executeUpdateMemberRole({ memberId: "m-b-owner", role: "USER" }, depsFor("user-a", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    await assert.rejects(
      executeRemoveMember({ memberId: "m-b-owner" }, depsFor("user-a", "org-a")),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    const listed = await executeListMembers(undefined, depsFor("user-a", "org-a"));
    assert.ok(listed.members.every((member) => member.userId !== "user-e"));
  });
});

describe("Organization switching", () => {
  let repo: FakeAuthorizationRepository;
  beforeEach(() => {
    repo = new FakeAuthorizationRepository();
    seedTenants(repo);
    repo.memberships.push({ id: "m-b-eng", userId: "user-c", organizationId: "org-b", role: "ENGINEER" });
  });

  it("switches members and surfaces the new organization", async () => {
    let switched: string | null = null;
    const authProvider = stubAuthProvider({
      setActiveOrganization: async (input: { organizationId: string }) => {
        switched = input.organizationId;
        return { id: input.organizationId, name: "Org B", slug: "org-b" };
      },
    });
    const result = await executeSwitchOrganization({ organizationId: "org-b" }, {
      getSession: sessionFor("user-c", "org-a"),
      authorizationRepository: repo,
      authProvider,
    });
    assert.equal(result.organizationId, "org-b");
    assert.equal(switched, "org-b");
  });

  it("denies foreign organizations without calling the provider", async () => {
    let called = false;
    const authProvider = stubAuthProvider({
      setActiveOrganization: async () => {
        called = true;
        throw new AppError("INTERNAL_ERROR");
      },
    });
    await assert.rejects(
      executeSwitchOrganization({ organizationId: "org-b" }, {
        getSession: sessionFor("user-d", "org-a"),
        authorizationRepository: repo,
        authProvider,
      }),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    assert.equal(called, false);
  });

  it("rejects empty organization ids without a session call", async () => {
    let called = false;
    await assert.rejects(
      executeSwitchOrganization({ organizationId: "" }, {
        getSession: async () => {
          called = true;
          return null;
        },
        authorizationRepository: repo,
        authProvider: stubAuthProvider({}),
      }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
    assert.equal(called, false);
  });
});

describe("My organizations", () => {
  it("lists memberships with roles and the active marker", async () => {
    const repo = new FakeAuthorizationRepository();
    seedTenants(repo);
    repo.memberships.push({ id: "m-b-eng", userId: "user-c", organizationId: "org-b", role: "ENGINEER" });
    const result = await executeListMyOrganizations(
      {},
      { getSession: sessionFor("user-c", "org-a"), authorizationRepository: repo },
    );
    assert.equal(result.organizations.length, 2);
    const active = result.organizations.find((o) => o.organizationId === "org-a");
    const other = result.organizations.find((o) => o.organizationId === "org-b");
    assert.equal(active?.active, true);
    assert.equal(other?.active, false);
    assert.equal(other?.role, "ENGINEER");
  });
});
