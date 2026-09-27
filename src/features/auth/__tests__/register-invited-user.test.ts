import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "@/shared/error/app-error";
import type {
  AuthProvider,
  ProviderUser,
  SignUpInput,
  SignUpWorkspaceResult,
  WorkspaceInfo,
} from "../repository/auth-provider";
import type {
  AuthorizationRepository,
  CreatedInvitation,
  InvitationRecord,
  MemberWithUser,
  MembershipRecord,
  OrganizationRecord,
} from "../repository/authorization-repository";
import { executeRegisterInvitedUser } from "../application/use-cases/register-invited-user.use-case";

class MockAuthProvider implements AuthProvider {
  users = new Map<string, ProviderUser>();
  workspaceCreatedCount = 0;
  passwordCreatedCount = 0;

  async findUserByEmail(email: string) {
    return this.users.get(email) ?? null;
  }

  async signUpWithPassword(input: SignUpInput): Promise<ProviderUser> {
    if (this.users.has(input.email)) throw new AppError("CONFLICT");
    this.passwordCreatedCount += 1;
    const user: ProviderUser = {
      id: `usr_${input.email}`,
      name: input.name,
      email: input.email,
      emailVerified: false,
    };
    this.users.set(input.email, user);
    return user;
  }

  async signUpWithWorkspace(): Promise<SignUpWorkspaceResult> {
    this.workspaceCreatedCount += 1;
    throw new Error("signUpWithWorkspace must never be called during invited user registration");
  }

  async signInWithPassword(): Promise<ProviderUser> {
    throw new Error("not implemented");
  }
  async signOut(): Promise<void> {}
  async sendVerificationOTP(): Promise<void> {}
  async verifyEmailOTP(): Promise<ProviderUser> {
    throw new Error("not implemented");
  }
  async requestPasswordReset(): Promise<void> {}
  async resetPasswordWithToken(): Promise<void> {}
  async getSession() {
    return null;
  }
  async setActiveOrganization(): Promise<WorkspaceInfo> {
    throw new Error("not implemented");
  }
}

class MockAuthRepository implements AuthorizationRepository {
  invitations: InvitationRecord[] = [];

  async getMembership() {
    return null;
  }
  async listMembershipsForUser(): Promise<MembershipRecord[]> {
    return [];
  }
  async listMembersOfOrganization(): Promise<MemberWithUser[]> {
    return [];
  }
  async getUserPlatformRole(): Promise<string | null> {
    return null;
  }
  async getOrganizationById(id: string): Promise<OrganizationRecord | null> {
    return { id, name: "Acme Corp", slug: "acme-corp" };
  }
  async createInvitation(): Promise<CreatedInvitation> {
    throw new Error("not implemented");
  }
  async findPendingInvitation() {
    return null;
  }
  async findInvitationByToken(token: string) {
    return this.invitations.find((inv) => inv.id === token) ?? null;
  }
  async acceptInvitation(): Promise<MembershipRecord> {
    throw new Error("not implemented");
  }
  async cancelInvitation() {}
  async countActiveMembers() {
    return 1;
  }
  async updateMemberRole(): Promise<MembershipRecord> {
    throw new Error("not implemented");
  }
  async removeMember() {}
}

describe("executeRegisterInvitedUser", () => {
  let authProvider: MockAuthProvider;
  let authRepo: MockAuthRepository;

  beforeEach(() => {
    authProvider = new MockAuthProvider();
    authRepo = new MockAuthRepository();

    authRepo.invitations = [
      {
        id: "valid-token-123",
        organizationId: "org-1",
        email: "alice@company.com",
        role: "ENGINEER",
        status: "pending",
        expiresAt: new Date(Date.now() + 86400 * 1000),
        inviterId: "inviter-1",
      },
      {
        id: "expired-token",
        organizationId: "org-1",
        email: "expired@company.com",
        role: "USER",
        status: "pending",
        expiresAt: new Date(Date.now() - 1000),
        inviterId: "inviter-1",
      },
      {
        id: "accepted-token",
        organizationId: "org-1",
        email: "accepted@company.com",
        role: "ADMIN",
        status: "accepted",
        expiresAt: new Date(Date.now() + 86400 * 1000),
        inviterId: "inviter-1",
      },
    ];
  });

  it("successfully registers an invited user without creating an organization", async () => {
    const result = await executeRegisterInvitedUser(
      {
        token: "valid-token-123",
        name: "Alice Smith",
        email: "alice@company.com",
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
        termsAccepted: true,
      },
      { authProvider, authorizationRepository: authRepo },
    );

    assert.equal(result.user.email, "alice@company.com");
    assert.equal(result.user.name, "Alice Smith");
    assert.equal(result.requiresVerification, true);
    assert.equal(authProvider.passwordCreatedCount, 1);
    assert.equal(authProvider.workspaceCreatedCount, 0); // Crucial: NO workspace created
  });

  it("normalizes email case insensitively", async () => {
    const result = await executeRegisterInvitedUser(
      {
        token: "valid-token-123",
        name: "Alice Smith",
        email: "  ALICE@Company.com  ",
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
        termsAccepted: true,
      },
      { authProvider, authorizationRepository: authRepo },
    );

    assert.equal(result.user.email, "alice@company.com");
  });

  it("rejects when registration email does not match invitation email", async () => {
    await assert.rejects(
      executeRegisterInvitedUser(
        {
          token: "valid-token-123",
          name: "Eve Hacker",
          email: "eve@other.com",
          password: "StrongPassword123!",
          confirmPassword: "StrongPassword123!",
          termsAccepted: true,
        },
        { authProvider, authorizationRepository: authRepo },
      ),
      (err: unknown) =>
        err instanceof AppError &&
        err.code === "FORBIDDEN" &&
        err.message.includes("match the invited email"),
    );
  });

  it("rejects non-existent or invalid invitation token", async () => {
    await assert.rejects(
      executeRegisterInvitedUser(
        {
          token: "non-existent-token",
          name: "Alice Smith",
          email: "alice@company.com",
          password: "StrongPassword123!",
          confirmPassword: "StrongPassword123!",
          termsAccepted: true,
        },
        { authProvider, authorizationRepository: authRepo },
      ),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("rejects expired invitation token", async () => {
    await assert.rejects(
      executeRegisterInvitedUser(
        {
          token: "expired-token",
          name: "Expired User",
          email: "expired@company.com",
          password: "StrongPassword123!",
          confirmPassword: "StrongPassword123!",
          termsAccepted: true,
        },
        { authProvider, authorizationRepository: authRepo },
      ),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("rejects already accepted invitation token", async () => {
    await assert.rejects(
      executeRegisterInvitedUser(
        {
          token: "accepted-token",
          name: "Accepted User",
          email: "accepted@company.com",
          password: "StrongPassword123!",
          confirmPassword: "StrongPassword123!",
          termsAccepted: true,
        },
        { authProvider, authorizationRepository: authRepo },
      ),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("rejects password mismatch or invalid input schema", async () => {
    await assert.rejects(
      executeRegisterInvitedUser(
        {
          token: "valid-token-123",
          name: "Alice",
          email: "alice@company.com",
          password: "StrongPassword123!",
          confirmPassword: "DifferentPassword123!",
          termsAccepted: true,
        },
        { authProvider, authorizationRepository: authRepo },
      ),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
  });
});
