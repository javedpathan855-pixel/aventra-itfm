// Canonical Better Auth instance (ADR 002, ADR 003).
//
// One configuration for the whole app: PostgreSQL via the official
// Prisma adapter, email+password credentials, 6-digit hashed OTP email
// verification, organization tenancy, and hardened session/cookie
// posture. Constructed lazily so importing this module (build,
// typecheck, unit tests) never requires live credentials — the first
// real request validates the environment once via src/config/env.ts.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getEnv } from "@/config/env";
import { getPrisma } from "@/shared/infrastructure/prisma";
import { normalizeEmail } from "../../domain/services/auth-helpers";

/** 6 numeric digits, per the registration contract. */
const OTP_LENGTH = 6;
/** 10-minute verification window (ADR 003). */
const OTP_EXPIRES_IN_SECONDS = 600;
/** OTP destroyed after this many wrong guesses (ADR 003). */
const OTP_MAX_ATTEMPTS = 5;
/** 7-day sessions with daily refresh (explicit ADR 003). */
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;
/** Single-use password-reset links live one hour (ADR 003). */
const PASSWORD_RESET_EXPIRES_IN_SECONDS = 3600;
/** Minimum password length, mirrored in RegisterSchema (ADR 003). */
const MIN_PASSWORD_LENGTH = 8;

type AuthInstance = ReturnType<typeof buildAuth>;

let cached: AuthInstance | null = null;

/**
 * Return the shared Better Auth instance, building it on first use.
 * Server-only: the adapter, secrets, and email vendor stay here.
 */
const getAuth = (): AuthInstance => {
  cached ??= buildAuth();
  return cached;
};

/** Test seam: drop the cached instance between tests. */
const resetAuthCache = () => {
  cached = null;
};

const buildAuth = () => {
  const env = getEnv();

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: prismaAdapter(getPrisma(), { provider: "postgresql" }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      resetPasswordTokenExpiresIn: PASSWORD_RESET_EXPIRES_IN_SECONDS,
      revokeSessionsOnPasswordReset: true,
    },

    emailVerification: {
      // OTP verification signs the user in directly — no re-login (ADR 002).
      autoSignInAfterVerification: true,
    },

    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },

    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 300, max: 10 },
        "/email-otp/*": { window: 60, max: 10 },
        "/forget-password": { window: 300, max: 5 },
      },
    },

    databaseHooks: {
      user: {
        create: {
          // Defense in depth: uniqueness is enforced on the normalized form.
          before: async (user) => ({
            data: { ...user, email: normalizeEmail(user.email) },
          }),
        },
      },
    },
  });
};

export { getAuth, resetAuthCache };
export {
  MIN_PASSWORD_LENGTH,
  OTP_EXPIRES_IN_SECONDS,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  PASSWORD_RESET_EXPIRES_IN_SECONDS,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
};
