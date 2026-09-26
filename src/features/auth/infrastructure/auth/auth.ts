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
import { emailOTP, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { getEnv } from "@/config/env";
import { getPrisma } from "@/shared/infrastructure/prisma";
import { normalizeEmail } from "../../domain/services/auth-helpers";
import {
  MIN_PASSWORD_LENGTH,
  OTP_EXPIRES_IN_SECONDS,
  OTP_LENGTH,
  PASSWORD_RESET_EXPIRES_IN_SECONDS,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from "../../domain/constants/auth-constants";
import {
  buildPasswordResetEmail,
  buildVerificationOtpEmail,
  sendEmail,
} from "../email/resend-email-service";

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
      sendResetPassword: async ({ user, url }) => {
        const { subject, html, text } = buildPasswordResetEmail(url);
        await sendEmail({ to: user.email, subject, html, text });
      },
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
        "/reset-password": { window: 300, max: 5 },
      },
    },

    plugins: [
      nextCookies(),
      organization(),
      emailOTP({
        expiresIn: OTP_EXPIRES_IN_SECONDS,
        otpLength: OTP_LENGTH,
        sendVerificationOnSignUp: true,
        sendVerificationOTP: async ({ email, otp }) => {
          const { subject, html, text } = buildVerificationOtpEmail(otp);
          await sendEmail({ to: email, subject, html, text });
        },
      }),
    ],

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
