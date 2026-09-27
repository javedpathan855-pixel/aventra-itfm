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
import type { MailerPort } from "../repository/mailer";
import type { AuditEvent, AuditLogPort } from "../repository/audit-log";
import { executeInviteMember } from "../application/use-cases/invite-member.use-case";
import { executeAcceptInvitation } from "../application/use-cases/accept-invitation.use-case";
import { executeCancelInvitation } from "../application/use-cases/cancel-invitation.use-case";
import { executeGetInvitationSummary } from "../application/use-cases/get-invitation-summary.use-case";
import { canTransitionInvitationStatus } from "../domain/authorization/policies";

interface StoredInvitation extends InvitationRecord {
  tokenHash: string | null;
}

/** Strip the at-rest hash before returning records across the port. */
const toPublicInvitation = (row: StoredInvitation): InvitationRecord => ({
  id: row.id,
  organizationId: row.organizationId,
  email: row.email,
  role: row.role,
  status: row.status,
  expiresAt: row.expiresAt,
  inviterId: row.inviterId,
});

/** Port-faithful fake: hashes at rest, honors pending-only transitions. */
class FakeInvitationRepository implements AuthorizationRepository {
  memberships: MembershipRecord[] = [];
  users = new Map<string, { platformRole: string | null }>();
  organizations = new Map<string, OrganizationRecord>();
  invitations: StoredInvitation[] = [];
  failCreate = false;

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
    if (this.failCreate) throw new AppError("DATABASE_ERROR");
    const token = randomBytes(32).toString("hex");
    const invitation: StoredInvitation = {
      id: `inv-${this.invitations.length + 1}`,
      status: "pending",
      ...input,
      tokenHash: createHash("sha256").update(token, "utf8").digest("hex"),
    };
    this.invitations.push(invitation);
    return { invitation: toPublicInvitation(invitation), token };
  }

  async findPendingInvitation(organizationId: string, email: string) {
    const found = this.invitations.find(
      (row) => row.organizationId === organizationId && row.email === email && row.status === "pending",
    );
    if (!found) return null;
    return toPublicInvitation(found);
  }

  async findInvitationByToken(token: string) {
    if (typeof token !== "string" || token.length === 0) return null;
    const digest = createHash("sha256").update(token, "utf8").digest("hex");
    const found = this.invitations.find((row) => row.tokenHash === digest);
    if (!found) return null;
    return toPublicInvitation(found);
  }

  async acceptInvitation(input: { invitationId: string; organizationId: string; userId: string; role: string }) {
    const invitation = this.invitations.find(
      (row) => row.id === input.invitationId && row.organizationId === input.organizationId && row.status === "pending",
    );
    if (!invitation) throw new AppError("NOT_FOUND");
    invitation.status = "accepted";
    const existing = this.memberships.find(
      (m) => m.userId === input.userId && m.organizationId === input.organizationId,
    );
    if (existing) return existing;
    const membership: MembershipRecord = {
      id: `m-${input.userId}`,
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

class FakeMailer implements MailerPort {
  sent: Array<{ to: string; token: string }> = [];
  fail = false;

  async sendInvitationEmail(input: { to: string; organizationName: string; role: string; token: string; expiresAt: Date }) {
    if (this.fail) throw new AppError("EMAIL_DELIVERY_ERROR");
    this.sent.push({ to: input.to, token: input.token });
  }
}

class FakeAuditLog implements AuditLogPort {
  events: AuditEvent[] = [];

  async record(event: Omit<AuditEvent, "timestamp">) {
    this.events.push({ ...event, timestamp: "2026-01-01T00:00:00.000Z" });
  }
}

const seed = (repo: FakeInvitationRepository) => {
  repo.users.set("owner-a", { platformRole: null });
  repo.users.set("admin-a", { platformRole: null });
  repo.users.set("newbie", { platformRole: null });
  repo.users.set("attacker", { platformRole: null });
  repo.organizations.set("org-a", { id: "org-a", name: "Org A", slug: "org-a" });
  repo.organizations.set("org-b", { id: "org-b", name: "Org B", slug: "org-b" });
  repo.memberships.push(
    { id: "m-owner", userId: "owner-a", organizationId: "org-a", role: "OWNER" },
    { id: "m-admin", userId: "admin-a", organizationId: "org-a", role: "ADMIN" },
  );
};

const sessionFor = (userId: string, activeOrganizationId: string | null, email?: string) => async () => ({
  userId,
  email: email ?? `${userId}@x.test`,
  activeOrganizationId,
});

describe("Invitation creation matrix", () => {
  let repo: FakeInvitationRepository;
  let mailer: FakeMailer;
  let audit: FakeAuditLog;
  beforeEach(() => {
    repo = new FakeInvitationRepository();
    mailer = new FakeMailer();
    audit = new FakeAuditLog();
    seed(repo);
  });
  const depsFor = (userId: string) => ({
    getSession: sessionFor(userId, "org-a"),
    authorizationRepository: repo,
    mailer,
    auditLog: audit,
  });

  it("lets OWNER invite ADMIN/ENGINEER/USER and dispatches email + audit", async () => {
    for (const role of ["ADMIN", "ENGINEER", "USER"] as const) {
      const email = `${role.toLowerCase()}@x.test`;
      const result = await executeInviteMember({ email, role }, depsFor("owner-a"));
      assert.equal(result.role, role);
      assert.ok(mailer.sent.some((sent) => sent.to === email));
      assert.ok(
        audit.events.some((event) => event.type === "INVITATION_CREATED" && event.result === "allowed"),
      );
    }
  });

  it("lets ADMIN invite ENGINEER/USER but never ADMIN/OWNER", async () => {
    await executeInviteMember({ email: "e@x.test", role: "ENGINEER" }, depsFor("admin-a"));
    await executeInviteMember({ email: "u@x.test", role: "USER" }, depsFor("admin-a"));
    for (const role of ["ADMIN", "OWNER"] as const) {
      await assert.rejects(
        executeInviteMember({ email: "n@x.test", role }, depsFor("admin-a")),
        (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
      );
    }
  });

  it("rejects SUPERADMIN and arbitrary roles at validation", async () => {
    for (const role of ["SUPERADMIN", "superadmin", "root", ""]) {
      await assert.rejects(
        executeInviteMember({ email: "x@x.test", role }, depsFor("owner-a")),
        (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
      );
    }
  });

  it("rejects duplicate pending invitations without resending email", async () => {
    await executeInviteMember({ email: "dup@x.test", role: "USER" }, depsFor("owner-a"));
    const sentBefore = mailer.sent.length;
    await assert.rejects(
      executeInviteMember({ email: "dup@x.test", role: "USER" }, depsFor("owner-a")),
      (err: unknown) => err instanceof AppError && err.code === "CONFLICT",
    );
    assert.equal(mailer.sent.length, sentBefore);
  });

  it("compensates the invitation row when email dispatch fails", async () => {
    mailer.fail = true;
    await assert.rejects(
      executeInviteMember({ email: "fail@x.test", role: "USER" }, depsFor("owner-a")),
      (err: unknown) => err instanceof AppError && err.code === "EMAIL_DELIVERY_ERROR",
    );
    assert.equal(
      repo.invitations.filter((row) => row.email === "fail@x.test" && row.status === "pending").length,
      0,
    );
  });

  it("never stores or returns the raw token on the record", async () => {
    const { token } = await repo.createInvitation({
      organizationId: "org-a",
      email: "hash@x.test",
      role: "USER",
      inviterId: "owner-a",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const stored = repo.invitations.find((row) => row.email === "hash@x.test");
    assert.ok(stored);
    assert.equal(JSON.stringify(stored).includes(token), false);
    assert.equal(token.length, 64);
  });
});

describe("Invitation acceptance", () => {
  let repo: FakeInvitationRepository;
  let audit: FakeAuditLog;
  let mailer: FakeMailer;
  beforeEach(() => {
    repo = new FakeInvitationRepository();
    audit = new FakeAuditLog();
    mailer = new FakeMailer();
    seed(repo);
    repo.users.set("invitee", { platformRole: null });
  });
  const invite = (email: string, role = "ENGINEER") =>
    executeInviteMember(
      { email, role },
      {
        getSession: sessionFor("owner-a", "org-a"),
        authorizationRepository: repo,
        mailer,
        auditLog: audit,
      },
    );

  it("accepts the emailed token and creates the membership", async () => {
    await invite("invitee@x.test");
    const emailed = mailer.sent.find((sent) => sent.to === "invitee@x.test");
    assert.ok(emailed, "invitation email carries the acceptance token");
    const result = await executeAcceptInvitation(
      { token: emailed.token },
      {
        getSession: sessionFor("invitee", null, "invitee@x.test"),
        authorizationRepository: repo,
        auditLog: audit,
      },
    );
    assert.equal(result.organizationId, "org-a");
    assert.equal(result.role, "ENGINEER");
    const membership = await repo.getMembership("invitee", "org-a");
    assert.equal(membership?.role, "ENGINEER");
    assert.ok(audit.events.some((event) => event.type === "INVITATION_ACCEPTED"));
  });

  it("rejects invalid tokens without existence signals", async () => {
    await assert.rejects(
      executeAcceptInvitation(
        { token: "00".repeat(32) },
        { getSession: sessionFor("invitee", null, "invitee@x.test"), authorizationRepository: repo },
      ),
      (err: unknown) =>
        err instanceof AppError &&
        err.code === "FORBIDDEN" &&
        err.message.includes("invalid or has expired"),
    );
  });

  it("rejects expired, cancelled, and replayed invitations identically", async () => {
    const { token } = await repo.createInvitation({
      organizationId: "org-a",
      email: "invitee@x.test",
      role: "USER",
      inviterId: "owner-a",
      expiresAt: new Date(Date.now() - 1000),
    });
    const asInvitee = {
      getSession: sessionFor("invitee", null, "invitee@x.test"),
      authorizationRepository: repo,
    };
    await assert.rejects(
      executeAcceptInvitation({ token }, asInvitee),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );

    const fresh = await repo.createInvitation({
      organizationId: "org-a",
      email: "invitee@x.test",
      role: "USER",
      inviterId: "owner-a",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    await repo.cancelInvitation({ invitationId: fresh.invitation.id, organizationId: "org-a" });
    await assert.rejects(
      executeAcceptInvitation({ token: fresh.token }, asInvitee),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );

    const replayable = await repo.createInvitation({
      organizationId: "org-a",
      email: "invitee@x.test",
      role: "USER",
      inviterId: "owner-a",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    await executeAcceptInvitation({ token: replayable.token }, asInvitee);
    const again = await executeAcceptInvitation({ token: replayable.token }, asInvitee);
    assert.equal(again.organizationId, "org-a");
    const memberships = (await repo.listMembershipsForUser("invitee")).filter(
      (m) => m.organizationId === "org-a",
    );
    assert.equal(memberships.length, 1);
  });

  it("rejects email mismatch even with a valid token", async () => {
    const { token } = await repo.createInvitation({
      organizationId: "org-a",
      email: "invitee@x.test",
      role: "USER",
      inviterId: "owner-a",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    await assert.rejects(
      executeAcceptInvitation(
        { token },
        { getSession: sessionFor("attacker", null, "attacker@x.test"), authorizationRepository: repo },
      ),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    assert.equal(await repo.getMembership("attacker", "org-a"), null);
  });

  it("matches recipient email case-insensitively", async () => {
    const { token } = await repo.createInvitation({
      organizationId: "org-a",
      email: "invitee@x.test",
      role: "USER",
      inviterId: "owner-a",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const result = await executeAcceptInvitation(
      { token },
      { getSession: sessionFor("invitee", null, "INVITEE@X.TEST"), authorizationRepository: repo },
    );
    assert.equal(result.organizationId, "org-a");
  });

  it("prevents cross-tenant invitation reuse", async () => {
    const { token } = await repo.createInvitation({
      organizationId: "org-b",
      email: "invitee@x.test",
      role: "USER",
      inviterId: "owner-a",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const result = await executeAcceptInvitation(
      { token },
      { getSession: sessionFor("invitee", "org-a", "invitee@x.test"), authorizationRepository: repo },
    );
    assert.equal(result.organizationId, "org-b");
    assert.equal(await repo.getMembership("invitee", "org-a"), null);
  });
});

describe("Invitation cancellation", () => {
  it("cancels pending invitations and keeps settled rows terminal", async () => {
    const repo = new FakeInvitationRepository();
    const audit = new FakeAuditLog();
    seed(repo);
    const mailer = new FakeMailer();
    const deps = {
      getSession: sessionFor("owner-a", "org-a"),
      authorizationRepository: repo,
      mailer,
      auditLog: audit,
    };
    const created = await executeInviteMember({ email: "gone@x.test", role: "USER" }, deps);
    const emailed = mailer.sent.find((sent) => sent.to === "gone@x.test");
    assert.ok(emailed);
    const cancelled = await executeCancelInvitation({ invitationId: created.invitationId }, deps);
    assert.equal(cancelled.cancelled, true);
    assert.ok(audit.events.some((event) => event.type === "INVITATION_CANCELLED"));
    await assert.rejects(
      executeAcceptInvitation(
        { token: emailed.token },
        { getSession: sessionFor("gone", null, "gone@x.test"), authorizationRepository: repo },
      ),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });
});

describe("Invitation status transitions", () => {
  it("allows pending forward only, never reopening", async () => {
    assert.equal(canTransitionInvitationStatus("pending", "accepted"), true);
    assert.equal(canTransitionInvitationStatus("pending", "cancelled"), true);
    assert.equal(canTransitionInvitationStatus("pending", "expired"), true);
    assert.equal(canTransitionInvitationStatus("accepted", "pending"), false);
    assert.equal(canTransitionInvitationStatus("cancelled", "pending"), false);
    assert.equal(canTransitionInvitationStatus("expired", "accepted"), false);
    assert.equal(canTransitionInvitationStatus("pending", "pending"), false);
  });
});

describe("Invitation summary", () => {
  it("previews pending invitations and hides everything else", async () => {
    const repo = new FakeInvitationRepository();
    seed(repo);
    const { token } = await repo.createInvitation({
      organizationId: "org-a",
      email: "invitee@x.test",
      role: "ENGINEER",
      inviterId: "owner-a",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const deps = {
      getSession: sessionFor("invitee", null, "invitee@x.test"),
      authorizationRepository: repo,
    };
    const summary = await executeGetInvitationSummary({ token }, deps);
    assert.equal(summary.organizationName, "Org A");
    assert.equal(summary.role, "ENGINEER");
    assert.equal(summary.email, "invitee@x.test");

    // Unauthenticated bearer preview also succeeds
    const unauthenticatedSummary = await executeGetInvitationSummary(
      { token },
      { authorizationRepository: repo },
    );
    assert.equal(unauthenticatedSummary.organizationName, "Org A");
    assert.equal(unauthenticatedSummary.email, "invitee@x.test");

    await assert.rejects(
      executeGetInvitationSummary({ token: "00".repeat(32) }, deps),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });
});
