import { describe, it, beforeEach } from "node:test";
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
import { slugifyOrganizationName } from "../domain/services/auth-helpers";
import { executeLogin } from "../application/use-cases/login.use-case";
import { executeRegister } from "../application/use-cases/register.use-case";
import { executeVerifyOtp } from "../application/use-cases/verify-otp.use-case";
import { executeRequestPasswordReset } from "../application/use-cases/request-password-reset.use-case";
import { executeResetPassword } from "../application/use-cases/reset-password.use-case";

/**
 * Application use-case tests. The fake implements the AuthProvider port
 * in memory — no Better Auth, no database, no network.
 */
interface StoredUser extends ProviderUser {
  passwordHash: string;
  otp: string;
  otpAttempts: number;
  resetToken?: string;
  resetTokenExpired?: boolean;
}

class FakeAuthProvider implements AuthProvider {
  users = new Map<string, StoredUser>();
  organizations = new Map<string, WorkspaceInfo>();
  memberships: Array<{ organizationId: string; userId: string; role: string }> = [];
  rateLimitedActions = new Set<string>();
  /** Slugs treated as taken by another tenant (slug-conflict path). */
  takenSlugs = new Set<string>();
  /** When true, the organization stage throws after the user row exists. */
  failOrganizationStage = false;

  async findUserByEmail(email: string): Promise<ProviderUser | null> {
    const found = this.users.get(email);
    if (!found) return null;
    return { id: found.id, name: found.name, email: found.email, emailVerified: found.emailVerified };
  }

  async signUpWithPassword(input: SignUpInput): Promise<ProviderUser> {
    if (this.rateLimitedActions.has("signup")) throw new AppError("RATE_LIMITED");
    if (this.users.has(input.email)) throw new AppError("CONFLICT");
    const user: StoredUser = {
      id: `usr_${input.email}`,
      name: input.name,
      email: input.email,
      emailVerified: false,
      passwordHash: `hash_${input.password}`,
      otp: "123456",
      otpAttempts: 0,
    };
    this.users.set(input.email, user);
    return { id: user.id, name: user.name, email: user.email, emailVerified: false };
  }

  async signUpWithWorkspace(input: SignUpWorkspaceInput): Promise<SignUpWorkspaceResult> {
    if (this.rateLimitedActions.has("signup")) throw new AppError("RATE_LIMITED");
    if (this.users.has(input.email)) throw new AppError("CONFLICT");
    const user: StoredUser = {
      id: `usr_${input.email}`,
      name: input.name,
      email: input.email,
      emailVerified: false,
      passwordHash: `hash_${input.password}`,
      otp: "123456",
      otpAttempts: 0,
    };
    this.users.set(input.email, user);
    if (this.failOrganizationStage) throw new AppError("DATABASE_ERROR");
    const slug = slugifyOrganizationName(input.organizationName);
    if (this.organizations.has(slug) || this.takenSlugs.has(slug)) {
      throw new AppError("CONFLICT");
    }
    const organization: WorkspaceInfo = { id: `org_${slug}`, name: input.organizationName, slug };
    this.organizations.set(slug, organization);
    this.memberships.push({ organizationId: organization.id, userId: user.id, role: "owner" });
    return {
      user: { id: user.id, name: user.name, email: user.email, emailVerified: false },
      organization,
    };
  }

  async signInWithPassword(input: { email: string; password: string }): Promise<ProviderUser> {
    if (this.rateLimitedActions.has("login")) throw new AppError("RATE_LIMITED");
    const user = this.users.get(input.email);
    if (!user || user.passwordHash !== `hash_${input.password}`) {
      throw new AppError("INVALID_CREDENTIALS");
    }
    if (!user.emailVerified) throw new AppError("EMAIL_NOT_VERIFIED");
    return { id: user.id, name: user.name, email: user.email, emailVerified: true };
  }

  async signOut(): Promise<void> {}

  async sendVerificationOTP(email: string): Promise<void> {
    const user = this.users.get(email);
    if (user) {
      user.otp = "123456";
      user.otpAttempts = 0;
    }
  }

  async verifyEmailOTP(input: { email: string; otp: string }): Promise<ProviderUser> {
    if (this.rateLimitedActions.has("otp")) throw new AppError("RATE_LIMITED");
    const user = this.users.get(input.email);
    if (!user) throw new AppError("NOT_FOUND");
    if (input.otp === "000000") throw new AppError("VERIFICATION_EXPIRED");
    if (user.otpAttempts >= 5) throw new AppError("VERIFICATION_ATTEMPTS_EXCEEDED");
    if (user.otp !== input.otp) {
      user.otpAttempts += 1;
      if (user.otpAttempts >= 5) throw new AppError("VERIFICATION_ATTEMPTS_EXCEEDED");
      throw new AppError("VERIFICATION_FAILED");
    }
    user.emailVerified = true;
    return { id: user.id, name: user.name, email: user.email, emailVerified: true };
  }

  async requestPasswordReset(email: string): Promise<void> {
    if (this.rateLimitedActions.has("forgot")) throw new AppError("RATE_LIMITED");
    const user = this.users.get(email);
    if (!user) throw new AppError("NOT_FOUND");
    user.resetToken = "valid-token";
    user.resetTokenExpired = false;
  }

  async resetPasswordWithToken(input: { token: string; newPassword: string }): Promise<void> {
    const entry = Array.from(this.users.values()).find((u) => u.resetToken === input.token);
    if (!entry) throw new AppError("VERIFICATION_FAILED");
    if (entry.resetTokenExpired) throw new AppError("VERIFICATION_EXPIRED");
    entry.passwordHash = `hash_${input.newPassword}`;
    entry.resetToken = undefined;
  }
}

const seedVerifiedUser = async (auth: FakeAuthProvider, email = "user@company.com"): Promise<void> => {
  await auth.signUpWithPassword({ name: "Test User", email, password: "StrongPass123" });
  await auth.verifyEmailOTP({ email, otp: "123456" });
};

describe("Login use case", () => {
  let auth: FakeAuthProvider;
  beforeEach(() => {
    auth = new FakeAuthProvider();
  });

  it("authenticates with valid credentials and resolves a safe redirect", async () => {
    await seedVerifiedUser(auth);
    const result = await executeLogin(
      { email: "user@company.com", password: "StrongPass123", remember: false },
      { authProvider: auth, redirect: "/org/acme" },
    );
    assert.equal(result.status, "authenticated");
    if (result.status === "authenticated") {
      assert.equal(result.redirectUrl, "/org/acme");
      assert.equal(result.user.emailVerified, true);
    }
  });

  it("rejects malformed input without calling the provider", async () => {
    await assert.rejects(
      executeLogin({ email: "not-an-email", password: "x", remember: false }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
  });

  it("normalizes email case and whitespace before lookup", async () => {
    await seedVerifiedUser(auth);
    const result = await executeLogin(
      { email: "  USER@COMPANY.COM  ", password: "StrongPass123", remember: true },
      { authProvider: auth },
    );
    assert.equal(result.status, "authenticated");
  });

  it("surfaces invalid credentials without leaking details", async () => {
    await seedVerifiedUser(auth);
    await assert.rejects(
      executeLogin({ email: "user@company.com", password: "WrongPass999", remember: false }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "INVALID_CREDENTIALS",
    );
  });

  it("returns verification-required for unverified accounts", async () => {
    await auth.signUpWithPassword({ name: "New User", email: "new@company.com", password: "StrongPass123" });
    const result = await executeLogin(
      { email: "new@company.com", password: "StrongPass123", remember: false },
      { authProvider: auth },
    );
    assert.equal(result.status, "verification-required");
    if (result.status === "verification-required") assert.equal(result.email, "new@company.com");
  });

  it("propagates rate limiting", async () => {
    await seedVerifiedUser(auth);
    auth.rateLimitedActions.add("login");
    await assert.rejects(
      executeLogin({ email: "user@company.com", password: "StrongPass123", remember: false }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "RATE_LIMITED",
    );
  });

  it("falls back to /dashboard for hostile redirect values", async () => {
    await seedVerifiedUser(auth);
    const result = await executeLogin(
      { email: "user@company.com", password: "StrongPass123", remember: false },
      { authProvider: auth, redirect: "https://evil.example/phish" },
    );
    assert.equal(result.status, "authenticated");
    if (result.status === "authenticated") assert.equal(result.redirectUrl, "/dashboard");
  });
});

describe("Register use case", () => {
  let auth: FakeAuthProvider;
  beforeEach(() => {
    auth = new FakeAuthProvider();
  });

  it("registers workspace and requires verification", async () => {
    const result = await executeRegister(
      {
        name: "Jane Doe",
        email: "jane@company.com",
        organizationName: "Acme Technologies",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
        termsAccepted: true,
      },
      { authProvider: auth },
    );
    assert.equal(result.requiresVerification, true);
    assert.equal(result.user.email, "jane@company.com");
    assert.equal(result.organization.name, "Acme Technologies");
    assert.equal(result.organization.slug, "acme-technologies");
  });

  it("creates the owner membership for the registering user", async () => {
    const result = await executeRegister(
      {
        name: "Jane Doe",
        email: "jane@company.com",
        organizationName: "Acme Technologies",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
        termsAccepted: true,
      },
      { authProvider: auth },
    );
    const membership = auth.memberships.find(
      (m) => m.organizationId === result.organization.id && m.userId === result.user.id,
    );
    assert.ok(membership, "owner membership must exist");
    assert.equal(membership?.role, "owner");
  });

  it("rejects mismatched confirmation without calling the provider", async () => {
    await assert.rejects(
      executeRegister(
        {
          name: "Jane Doe",
          email: "jane@company.com",
          organizationName: "Acme Technologies",
          password: "StrongPass123",
          confirmPassword: "OtherPass123",
          termsAccepted: true,
        },
        { authProvider: auth },
      ),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
    assert.equal((await auth.findUserByEmail("jane@company.com")), null);
  });

  it("rejects missing terms acceptance without calling the provider", async () => {
    await assert.rejects(
      executeRegister(
        {
          name: "Jane Doe",
          email: "jane@company.com",
          organizationName: "Acme Technologies",
          password: "StrongPass123",
          confirmPassword: "StrongPass123",
          termsAccepted: false,
        },
        { authProvider: auth },
      ),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
    assert.equal((await auth.findUserByEmail("jane@company.com")), null);
  });

  it("rejects invalid organization names without calling the provider", async () => {
    await assert.rejects(
      executeRegister(
        {
          name: "Jane Doe",
          email: "jane@company.com",
          organizationName: "A",
          password: "StrongPass123",
          confirmPassword: "StrongPass123",
          termsAccepted: true,
        },
        { authProvider: auth },
      ),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
    assert.equal((await auth.findUserByEmail("jane@company.com")), null);
  });

  it("normalizes email and trims names before registration", async () => {
    const result = await executeRegister(
      {
        name: "  Jane Doe  ",
        email: "  JANE@COMPANY.COM ",
        organizationName: "  Acme Technologies  ",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
        termsAccepted: true,
      },
      { authProvider: auth },
    );
    assert.notEqual(await auth.findUserByEmail("jane@company.com"), null);
    assert.equal(result.organization.name, "Acme Technologies");
    assert.equal(result.organization.slug, "acme-technologies");
  });

  it("maps duplicate email to conflict", async () => {
    await seedVerifiedUser(auth, "dup@company.com");
    await assert.rejects(
      executeRegister(
        {
          name: "Jane Doe",
          email: "dup@company.com",
          organizationName: "Acme Technologies",
          password: "StrongPass123",
          confirmPassword: "StrongPass123",
          termsAccepted: true,
        },
        { authProvider: auth },
      ),
      (err: unknown) => err instanceof AppError && err.code === "CONFLICT",
    );
  });

  it("maps taken organization slugs to conflict", async () => {
    auth.takenSlugs.add("acme-technologies");
    await assert.rejects(
      executeRegister(
        {
          name: "Jane Doe",
          email: "jane@company.com",
          organizationName: "Acme Technologies",
          password: "StrongPass123",
          confirmPassword: "StrongPass123",
          termsAccepted: true,
        },
        { authProvider: auth },
      ),
      (err: unknown) => err instanceof AppError && err.code === "CONFLICT",
    );
  });

  it("surfaces organization-stage failures without leaking internals", async () => {
    auth.failOrganizationStage = true;
    await assert.rejects(
      executeRegister(
        {
          name: "Jane Doe",
          email: "jane@company.com",
          organizationName: "Acme Technologies",
          password: "StrongPass123",
          confirmPassword: "StrongPass123",
          termsAccepted: true,
        },
        { authProvider: auth },
      ),
      (err: unknown) => {
        if (!(err instanceof AppError)) return false;
        const serialized = JSON.stringify({ code: err.code, message: err.message });
        return err.code === "DATABASE_ERROR" && !serialized.includes("jane@company.com");
      },
    );
  });

  it("propagates rate limiting", async () => {
    auth.rateLimitedActions.add("signup");
    await assert.rejects(
      executeRegister(
        {
          name: "Jane Doe",
          email: "jane@company.com",
          organizationName: "Acme Technologies",
          password: "StrongPass123",
          confirmPassword: "StrongPass123",
          termsAccepted: true,
        },
        { authProvider: auth },
      ),
      (err: unknown) => err instanceof AppError && err.code === "RATE_LIMITED",
    );
  });
});

describe("Verify OTP use case", () => {
  let auth: FakeAuthProvider;
  beforeEach(async () => {
    auth = new FakeAuthProvider();
    await auth.signUpWithPassword({ name: "Otp User", email: "otp@company.com", password: "StrongPass123" });
  });

  it("verifies a valid code", async () => {
    const result = await executeVerifyOtp({ email: "otp@company.com", otp: "123456" }, { authProvider: auth });
    assert.equal(result.user.emailVerified, true);
  });

  it("rejects malformed codes without calling the provider", async () => {
    await assert.rejects(
      executeVerifyOtp({ email: "otp@company.com", otp: "12AB" }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
  });

  it("maps incorrect codes to verification failure", async () => {
    await assert.rejects(
      executeVerifyOtp({ email: "otp@company.com", otp: "999999" }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "VERIFICATION_FAILED",
    );
  });

  it("maps consumed codes to expiry", async () => {
    await assert.rejects(
      executeVerifyOtp({ email: "otp@company.com", otp: "000000" }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "VERIFICATION_EXPIRED",
    );
  });

  it("maps exhausted attempts to lockout", async () => {
    for (let i = 0; i < 5; i++) {
      await assert.rejects(
        executeVerifyOtp({ email: "otp@company.com", otp: "999999" }, { authProvider: auth }),
        (err: unknown) => err instanceof AppError,
      );
    }
    await assert.rejects(
      executeVerifyOtp({ email: "otp@company.com", otp: "999999" }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "VERIFICATION_ATTEMPTS_EXCEEDED",
    );
  });

  it("propagates provider rate limiting", async () => {
    auth.rateLimitedActions.add("otp");
    await assert.rejects(
      executeVerifyOtp({ email: "otp@company.com", otp: "123456" }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "RATE_LIMITED",
    );
  });
});

describe("Request password reset use case", () => {
  let auth: FakeAuthProvider;
  beforeEach(async () => {
    auth = new FakeAuthProvider();
    await seedVerifiedUser(auth, "known@company.com");
  });

  it("dispatches for a known account", async () => {
    const result = await executeRequestPasswordReset({ email: "known@company.com" }, { authProvider: auth });
    assert.equal(result.dispatched, true);
  });

  it("is enumeration-safe for unknown accounts", async () => {
    const result = await executeRequestPasswordReset({ email: "ghost@company.com" }, { authProvider: auth });
    assert.equal(result.dispatched, true);
  });

  it("rejects malformed email", async () => {
    await assert.rejects(
      executeRequestPasswordReset({ email: "not-an-email" }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
  });

  it("surfaces rate limiting instead of swallowing it", async () => {
    auth.rateLimitedActions.add("forgot");
    await assert.rejects(
      executeRequestPasswordReset({ email: "known@company.com" }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "RATE_LIMITED",
    );
  });
});

describe("Reset password use case", () => {
  let auth: FakeAuthProvider;
  beforeEach(async () => {
    auth = new FakeAuthProvider();
    await seedVerifiedUser(auth, "reset@company.com");
    await auth.requestPasswordReset("reset@company.com");
  });

  it("consumes a valid token", async () => {
    const result = await executeResetPassword(
      { token: "valid-token", password: "BrandNewPass123", confirmPassword: "BrandNewPass123" },
      { authProvider: auth },
    );
    assert.equal(result.success, true);
  });

  it("rejects a missing token", async () => {
    await assert.rejects(
      executeResetPassword({ token: "", password: "BrandNewPass123", confirmPassword: "BrandNewPass123" }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
  });

  it("maps unknown tokens without leaking token values", async () => {
    await assert.rejects(
      executeResetPassword(
        { token: "bogus-token", password: "BrandNewPass123", confirmPassword: "BrandNewPass123" },
        { authProvider: auth },
      ),
      (err: unknown) => {
        if (!(err instanceof AppError)) return false;
        const serialized = JSON.stringify({ code: err.code, message: err.message });
        return err.code === "VERIFICATION_FAILED" && !serialized.includes("bogus-token");
      },
    );
  });

  it("maps expired tokens", async () => {
    const stored = auth.users.get("reset@company.com");
    if (stored) stored.resetTokenExpired = true;
    await assert.rejects(
      executeResetPassword(
        { token: "valid-token", password: "BrandNewPass123", confirmPassword: "BrandNewPass123" },
        { authProvider: auth },
      ),
      (err: unknown) => err instanceof AppError && err.code === "VERIFICATION_EXPIRED",
    );
  });

  it("rejects weak or mismatched passwords", async () => {
    await assert.rejects(
      executeResetPassword({ token: "valid-token", password: "short", confirmPassword: "short" }, { authProvider: auth }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
    await assert.rejects(
      executeResetPassword(
        { token: "valid-token", password: "BrandNewPass123", confirmPassword: "DifferentPass123" },
        { authProvider: auth },
      ),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );
  });
});
