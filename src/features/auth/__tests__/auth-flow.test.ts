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

/**
 * Clean Architecture Test Seam: In-memory fake provider implementing AuthProvider
 * port. Allows deterministic unit verification of complete multi-step auth workflows
 * with zero network or external dependencies.
 */
class FakeAuthProvider implements AuthProvider {
  private users = new Map<string, ProviderUser & { passwordHash: string; otp?: string; otpAttempts: number; resetToken?: string }>();

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
    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        emailVerified: newUser.emailVerified,
      },
      organization: {
        id: `org_${newUser.id}`,
        name: input.organizationName,
        slug: input.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      },
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

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    };
  }

  async signOut(): Promise<void> {}

  async getSession(): Promise<{ userId: string; email: string; activeOrganizationId: string | null } | null> {
    return null;
  }

  async setActiveOrganization(): Promise<WorkspaceInfo> {
    throw new AppError("FORBIDDEN");
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
