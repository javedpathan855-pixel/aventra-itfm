import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "@/shared/error/app-error";
import type {
  AuthProvider,
  ProviderUser,
  SignUpInput,
  SignUpWorkspaceInput,
  SignUpWorkspaceResult,
  WorkspaceInfo,
} from "../repository/auth-provider";
import { OTP_MAX_ATTEMPTS } from "../domain/constants/auth-constants";
import { executeRegister } from "../application/use-cases/register.use-case";
import { resolveAuthorizationContext } from "../application/authorization/resolve-authorization-context";
import { requirePermission } from "../application/authorization/guards";
import { executeListMyOrganizations } from "../application/use-cases/list-my-organizations.use-case";
import { slugifyOrganizationName } from "../domain/services/auth-helpers";
import type {
  AuthorizationRepository,
  MembershipRecord,
  MemberWithUser,
  OrganizationRecord,
} from "../repository/authorization-repository";

/**
 * Clean Architecture Test Seam: In-memory fake provider implementing AuthProvider
 * port. Allows deterministic unit verification of complete multi-step auth workflows
 * with zero network or external dependencies.
 */
class FakeAuthProvider implements AuthProvider {
  users = new Map<string, ProviderUser & { passwordHash: string; otp?: string; otpAttempts: number; resetToken?: string }>();
  organizations = new Map<string, { id: string; name: string; slug: string }>();
  memberships: { id: string; userId: string; organizationId: string; role: string }[] = [];
  activeSession: { userId: string; email: string; activeOrganizationId: string | null } | null = null;
  shouldFailOrganizationStage = false;

  async findUserByEmail(email: string): Promise<ProviderUser | null> {
    const found = this.users.get(email.toLowerCase());
    if (!found) return null;
    return {
      id: found.id,
      name: found.name,
      email: found.email,
      emailVerified: found.emailVerified,
    };
  }

  async signUpWithPassword(input: SignUpInput): Promise<ProviderUser> {
    const normalized = input.email.toLowerCase();
    if (this.users.has(normalized)) {
      throw new AppError("CONFLICT", { message: "Account already exists." });
    }

    const newUser = {
      id: `usr_${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      email: normalized,
      emailVerified: false,
      passwordHash: `hash_${input.password}`,
      otp: "888999",
      otpAttempts: 0,
    };

    this.users.set(normalized, newUser);
    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      emailVerified: newUser.emailVerified,
    };
  }

  async signUpWithWorkspace(input: SignUpWorkspaceInput): Promise<SignUpWorkspaceResult> {
    const normalized = input.email.toLowerCase();
    if (this.users.has(normalized)) {
      throw new AppError("CONFLICT", { message: "Account already exists." });
    }
    const newUser = {
      id: `usr_${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      email: normalized,
      emailVerified: false,
      passwordHash: `hash_${input.password}`,
      otp: "888999",
      otpAttempts: 0,
    };
    this.users.set(normalized, newUser);

    if (this.shouldFailOrganizationStage) {
      // Simulate compensation: clean up orphan user
      this.users.delete(normalized);
      throw new AppError("INTERNAL_ERROR", { message: "Organization creation failed." });
    }

    let slug = slugifyOrganizationName(input.organizationName);
    const existingSlug = Array.from(this.organizations.values()).find((o) => o.slug === slug);
    if (existingSlug) {
      slug = `${slug}-abcd`;
    }

    const orgId = `org_${newUser.id}`;
    const organization = {
      id: orgId,
      name: input.organizationName,
      slug,
    };
    this.organizations.set(orgId, organization);
    this.memberships.push({
      id: `m_${newUser.id}_${orgId}`,
      userId: newUser.id,
      organizationId: orgId,
      role: "owner",
    });

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        emailVerified: newUser.emailVerified,
      },
      organization,
    };
  }

  async signInWithPassword(input: { email: string; password: string }): Promise<ProviderUser> {
    const normalized = input.email.toLowerCase();
    const user = this.users.get(normalized);
    if (!user || user.passwordHash !== `hash_${input.password}`) {
      throw new AppError("INVALID_CREDENTIALS");
    }

    if (!user.emailVerified) {
      throw new AppError("EMAIL_NOT_VERIFIED");
    }

    this.activeSession = {
      userId: user.id,
      email: user.email,
      activeOrganizationId: null,
    };

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    };
  }

  async signOut(): Promise<void> {
    this.activeSession = null;
  }

  async getSession(): Promise<{ userId: string; email: string; activeOrganizationId: string | null } | null> {
    return this.activeSession;
  }

  async setActiveOrganization(input: { organizationId: string }): Promise<WorkspaceInfo> {
    const org = this.organizations.get(input.organizationId);
    if (!org) {
      throw new AppError("ORGANIZATION_NOT_FOUND");
    }
    if (this.activeSession) {
      this.activeSession.activeOrganizationId = org.id;
    }
    return { id: org.id, name: org.name, slug: org.slug };
  }

  async sendVerificationOTP(email: string): Promise<void> {
    const user = this.users.get(email.toLowerCase());
    if (user) {
      user.otp = "123456";
      user.otpAttempts = 0;
    }
  }

  async verifyEmailOTP(input: { email: string; otp: string }): Promise<ProviderUser> {
    const user = this.users.get(input.email.toLowerCase());
    if (!user) {
      throw new AppError("NOT_FOUND");
    }

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError("VERIFICATION_ATTEMPTS_EXCEEDED");
    }

    if (user.otp !== input.otp) {
      user.otpAttempts += 1;
      if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
        throw new AppError("VERIFICATION_ATTEMPTS_EXCEEDED");
      }
      throw new AppError("VERIFICATION_FAILED");
    }

    user.emailVerified = true;
    user.otp = undefined;

    this.activeSession = {
      userId: user.id,
      email: user.email,
      activeOrganizationId: null,
    };

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = this.users.get(email.toLowerCase());
    if (user) {
      user.resetToken = "valid_token_xyz";
    }
  }

  async resetPasswordWithToken(input: { token: string; newPassword: string }): Promise<void> {
    const entry = Array.from(this.users.values()).find((u) => u.resetToken === input.token);
    if (!entry) {
      throw new AppError("VERIFICATION_FAILED", { message: "Invalid or expired token." });
    }

    entry.passwordHash = `hash_${input.newPassword}`;
    entry.resetToken = undefined;
  }
}

class FakeAuthRepo implements AuthorizationRepository {
  constructor(private authProvider: FakeAuthProvider) {}

  async getMembership(userId: string, organizationId: string): Promise<MembershipRecord | null> {
    const m = this.authProvider.memberships.find(
      (row) => row.userId === userId && row.organizationId === organizationId,
    );
    return m ? { ...m } : null;
  }

  async listMembershipsForUser(userId: string): Promise<MembershipRecord[]> {
    return this.authProvider.memberships
      .filter((row) => row.userId === userId)
      .map((row) => ({ ...row }));
  }

  async listMembersOfOrganization(organizationId: string): Promise<MemberWithUser[]> {
    return this.authProvider.memberships
      .filter((row) => row.organizationId === organizationId)
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        name: "Test User",
        email: "test@example.com",
        role: row.role,
      }));
  }

  async getUserPlatformRole(): Promise<string | null> {
    return null;
  }

  async getOrganizationById(organizationId: string): Promise<OrganizationRecord | null> {
    const org = this.authProvider.organizations.get(organizationId);
    return org ? { ...org } : null;
  }

  async createInvitation(): Promise<never> {
    throw new Error("Not implemented");
  }

  async findPendingInvitation(): Promise<null> {
    return null;
  }

  async findInvitationByToken(): Promise<null> {
    return null;
  }

  async acceptInvitation(): Promise<never> {
    throw new Error("Not implemented");
  }

  async cancelInvitation(): Promise<void> {}

  async updateMemberRole(): Promise<never> {
    throw new Error("Not implemented");
  }

  async removeMember(): Promise<void> {}
}

describe("End-to-End Authentication Workflows (Clean Architecture Port Tests)", () => {
  it("enforces registration -> unverified login block -> OTP verify -> authenticated login", async () => {
    const auth = new FakeAuthProvider();
    const email = "cto@enterprise.org";

    // 1. Register new user
    const created = await auth.signUpWithPassword({
      name: "Enterprise CTO",
      email,
      password: "MasterPassword2026",
    });
    assert.equal(created.emailVerified, false);

    // 2. Try to log in prior to verification -> must throw EMAIL_NOT_VERIFIED
    await assert.rejects(
      async () => {
        await auth.signInWithPassword({
          email,
          password: "MasterPassword2026",
        });
      },
      (err: unknown) => err instanceof AppError && err.code === "EMAIL_NOT_VERIFIED",
    );

    // 3. Test OTP attempt limits: 5 wrong attempts lock the code
    await auth.sendVerificationOTP(email);

    for (let i = 1; i < OTP_MAX_ATTEMPTS; i++) {
      await assert.rejects(
        async () => {
          await auth.verifyEmailOTP({ email, otp: "000000" });
        },
        (err: unknown) => err instanceof AppError && err.code === "VERIFICATION_FAILED",
      );
    }

    // 5th wrong attempt -> VERIFICATION_ATTEMPTS_EXCEEDED
    await assert.rejects(
      async () => {
        await auth.verifyEmailOTP({ email, otp: "000000" });
      },
      (err: unknown) => err instanceof AppError && err.code === "VERIFICATION_ATTEMPTS_EXCEEDED",
    );

    // 4. Request new OTP and verify with valid code
    await auth.sendVerificationOTP(email);
    const verified = await auth.verifyEmailOTP({ email, otp: "123456" });
    assert.equal(verified.emailVerified, true);

    // 5. Subsequent login succeeds
    const sessionUser = await auth.signInWithPassword({
      email,
      password: "MasterPassword2026",
    });
    assert.equal(sessionUser.id, created.id);
  });

  it("handles forgot password and password reset token consumption", async () => {
    const auth = new FakeAuthProvider();
    const email = "director@finance.com";

    await auth.signUpWithPassword({
      name: "Finance Director",
      email,
      password: "InitialPassword123",
    });
    await auth.sendVerificationOTP(email);
    await auth.verifyEmailOTP({ email, otp: "123456" });

    // Request password reset
    await auth.requestPasswordReset(email);

    // Attempt with invalid token -> fails
    await assert.rejects(
      async () => {
        await auth.resetPasswordWithToken({
          token: "invalid_random_token",
          newPassword: "BrandNewPassword456",
        });
      },
      (err: unknown) => err instanceof AppError && err.code === "VERIFICATION_FAILED",
    );

    // Consume valid token
    await auth.resetPasswordWithToken({
      token: "valid_token_xyz",
      newPassword: "BrandNewPassword456",
    });

    // Old password no longer works
    await assert.rejects(
      async () => {
        await auth.signInWithPassword({
          email,
          password: "InitialPassword123",
        });
      },
      (err: unknown) => err instanceof AppError && err.code === "INVALID_CREDENTIALS",
    );

    // New password succeeds
    const user = await auth.signInWithPassword({
      email,
      password: "BrandNewPassword456",
    });
    assert.equal(user.email, email);
  });
});

describe("Organization Onboarding Workflow (End-to-End Clean Architecture Integration)", () => {
  it("completes full journey: register workspace -> owner membership -> OTP verification -> dashboard auto-resolution", async () => {
    const auth = new FakeAuthProvider();
    const repo = new FakeAuthRepo(auth);
    const email = "owner@enterprise-itfm.com";

    // 1. Visitor submits valid workspace registration form
    const registerResult = await executeRegister(
      {
        name: "Enterprise Founder",
        email,
        organizationName: "Aventra Global Systems",
        password: "SuperSecurePassword123!",
        confirmPassword: "SuperSecurePassword123!",
        termsAccepted: true,
      },
      { authProvider: auth },
    );

    assert.equal(registerResult.requiresVerification, true);
    assert.equal(registerResult.user.email, email);
    assert.equal(registerResult.organization.name, "Aventra Global Systems");
    assert.equal(registerResult.organization.slug, "aventra-global-systems");

    // 2. Initial owner membership is created with owner role
    const membership = auth.memberships.find(
      (m) => m.userId === registerResult.user.id && m.organizationId === registerResult.organization.id,
    );
    assert.ok(membership, "Initial membership must exist");
    assert.equal(membership?.role, "owner");

    // 3. User is unverified; before verification, session is null -> accessing dashboard rejects
    await assert.rejects(
      async () => {
        await resolveAuthorizationContext(
          { autoSelectDefault: true },
          { getSession: () => auth.getSession(), authorizationRepository: repo },
        );
      },
      (err: unknown) => err instanceof AppError && err.code === "UNAUTHENTICATED",
    );

    // 4. User verifies OTP
    const verifiedUser = await auth.verifyEmailOTP({ email, otp: "888999" });
    assert.equal(verifiedUser.emailVerified, true);

    // 5. User accesses dashboard -> session is valid, active organization auto-resolves to newly onboarded org
    const context = await resolveAuthorizationContext(
      { autoSelectDefault: true },
      { getSession: () => auth.getSession(), authorizationRepository: repo },
    );

    assert.equal(context.userId, registerResult.user.id);
    assert.equal(context.email, email);
    assert.equal(context.organizationId, registerResult.organization.id);
    assert.equal(context.organizationRole, "OWNER");
    assert.equal(context.organization?.name, "Aventra Global Systems");
    assert.equal(context.organization?.slug, "aventra-global-systems");

    // 6. Registered owner possesses full owner privileges
    assert.doesNotThrow(() => {
      requirePermission(context, "organization.delete");
      requirePermission(context, "member.invite");
      requirePermission(context, "member.updateRole");
    });

    // 7. Dashboard organization listing shows newly onboarded organization as active
    const orgsResult = await executeListMyOrganizations(
      { autoSelectDefault: true },
      { getSession: () => auth.getSession(), authorizationRepository: repo },
    );
    assert.equal(orgsResult.organizations.length, 1);
    assert.equal(orgsResult.organizations[0].organizationId, registerResult.organization.id);
    assert.equal(orgsResult.organizations[0].active, true);
    assert.equal(orgsResult.organizations[0].role, "OWNER");
  });

  it("handles duplicate email safely without creating orphan organization", async () => {
    const auth = new FakeAuthProvider();
    const email = "existing@company.com";

    // First user registers
    await executeRegister(
      {
        name: "Original User",
        email,
        organizationName: "First Corp",
        password: "Password123!",
        confirmPassword: "Password123!",
        termsAccepted: true,
      },
      { authProvider: auth },
    );
    assert.equal(auth.organizations.size, 1);

    // Second registration with same email (normalized) -> CONFLICT
    await assert.rejects(
      async () => {
        await executeRegister(
          {
            name: "Duplicate Attempt",
            email: "  Existing@Company.COM  ",
            organizationName: "Second Corp",
            password: "Password123!",
            confirmPassword: "Password123!",
            termsAccepted: true,
          },
          { authProvider: auth },
        );
      },
      (err: unknown) => err instanceof AppError && err.code === "CONFLICT",
    );

    // No second organization was created
    assert.equal(auth.organizations.size, 1);
  });

  it("handles duplicate organization names with collision-safe slugs", async () => {
    const auth = new FakeAuthProvider();

    const first = await executeRegister(
      {
        name: "First Founder",
        email: "first@example.com",
        organizationName: "Apex Logistics",
        password: "Password123!",
        confirmPassword: "Password123!",
        termsAccepted: true,
      },
      { authProvider: auth },
    );

    const second = await executeRegister(
      {
        name: "Second Founder",
        email: "second@example.com",
        organizationName: "Apex Logistics",
        password: "Password123!",
        confirmPassword: "Password123!",
        termsAccepted: true,
      },
      { authProvider: auth },
    );

    assert.equal(first.organization.name, "Apex Logistics");
    assert.equal(second.organization.name, "Apex Logistics");
    assert.equal(first.organization.slug, "apex-logistics");
    assert.equal(second.organization.slug, "apex-logistics-abcd");
    assert.notEqual(first.organization.id, second.organization.id);
  });

  it("compensates and cleans up user if organization creation fails", async () => {
    const auth = new FakeAuthProvider();
    auth.shouldFailOrganizationStage = true;

    await assert.rejects(
      async () => {
        await executeRegister(
          {
            name: "Unlucky User",
            email: "unlucky@test.com",
            organizationName: "Failed Corp",
            password: "Password123!",
            confirmPassword: "Password123!",
            termsAccepted: true,
          },
          { authProvider: auth },
        );
      },
      (err: unknown) => err instanceof AppError && err.code === "INTERNAL_ERROR",
    );

    // User is cleaned up (compensated) — no orphan user in persistence
    const user = await auth.findUserByEmail("unlucky@test.com");
    assert.equal(user, null);
    assert.equal(auth.organizations.size, 0);
  });
});

