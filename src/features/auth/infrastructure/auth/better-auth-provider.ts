import { headers } from "next/headers";

import { getAuth } from "./auth";
import {
  normalizeAuthError,
  readBetterAuthCode,
} from "../error/better-auth-error-map";
import { getPrisma } from "@/shared/infrastructure/prisma";
import {
  normalizeEmail,
  slugifyOrganizationName,
} from "../../domain/services/auth-helpers";
import {
  AuthProvider,
  ProviderUser,
  SignUpInput,
  SignUpWorkspaceInput,
  SignUpWorkspaceResult,
} from "../../repository/auth-provider";

const toProviderUser = (user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}): ProviderUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
});

/** Slug-conflict retries before surfacing CONFLICT (verified provider codes). */
const WORKSPACE_SLUG_ATTEMPTS = 3;

const isSlugConflict = (error: unknown): boolean => {
  const code = readBetterAuthCode(error);
  return code === "ORGANIZATION_ALREADY_EXISTS" || code === "ORGANIZATION_SLUG_ALREADY_TAKEN";
};

/** Non-security uniqueness jitter for slug retries (not a secret/token). */
const randomSlugSuffix = (): string => Math.random().toString(36).slice(2, 6);

/**
 * Compensation for organization-stage failure: remove the orphan user so
 * registration never leaves "user created, organization missing" state.
 * Account/session rows cascade from the user relation. Logs the message
 * only — never identifiers, emails, or payloads.
 */
const compensateWorkspaceSignup = async (userId: string): Promise<void> => {
  try {
    await getPrisma().user.delete({ where: { id: userId } });
  } catch (rollbackError) {
    console.error(
      "[AuthProvider] Workspace signup compensation failed:",
      rollbackError instanceof Error ? rollbackError.message : "unknown error",
    );
  }
};

/**
 * Better Auth implementation of the application AuthProvider port.
 * Server-only: forwards request headers for IP/user-agent tracking and
 * relies on the nextCookies plugin to persist session cookies from
 * server actions. Single responsibility: adapt Better Auth server behavior
 * to the port contract. Reads normalize email identically to the
 * databaseHooks normalization in auth.ts. Failures are normalized to safe
 * AppErrors via normalizeAuthError (never raw provider shapes).
 */
const betterAuthProvider: AuthProvider = {
  findUserByEmail: async (email) => {
    const user = await getPrisma().user.findUnique({
      where: { email: normalizeEmail(email) },
      select: { id: true, name: true, email: true, emailVerified: true },
    });
    return user ? toProviderUser(user) : null;
  },

  signUpWithPassword: async (input: SignUpInput) => {
    try {
      const result = await getAuth().api.signUpEmail({
        body: {
          name: input.name,
          email: input.email,
          password: input.password,
        },
        headers: await headers(),
      });
      return toProviderUser(result.user);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  signUpWithWorkspace: async (input: SignUpWorkspaceInput): Promise<SignUpWorkspaceResult> => {
    let createdUser: ProviderUser | null = null;
    try {
      const signup = await getAuth().api.signUpEmail({
        body: {
          name: input.name,
          email: input.email,
          password: input.password,
        },
        headers: await headers(),
      });
      createdUser = toProviderUser(signup.user);
    } catch (error) {
      throw normalizeAuthError(error);
    }

    // Organization stage (system call): userId without request headers.
    // Headers must be omitted — the endpoint treats headers-without-session
    // as an explicit client call and rejects it, and no session exists yet
    // for an unverified user. The creator receives the provider's "owner"
    // role (verified: better-auth organization plugin default).
    const baseSlug = slugifyOrganizationName(input.organizationName);
    let lastSlugError: unknown = null;
    for (let attempt = 0; attempt < WORKSPACE_SLUG_ATTEMPTS; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSlugSuffix()}`;
      try {
        const created = await getAuth().api.createOrganization({
          body: { name: input.organizationName, slug, userId: createdUser.id },
        });
        return {
          user: createdUser,
          organization: { id: created.id, name: created.name, slug: created.slug },
        };
      } catch (error) {
        if (!isSlugConflict(error)) {
          await compensateWorkspaceSignup(createdUser.id);
          throw normalizeAuthError(error);
        }
        lastSlugError = error;
      }
    }
    await compensateWorkspaceSignup(createdUser.id);
    throw normalizeAuthError(lastSlugError);
  },

  signInWithPassword: async (input) => {
    try {
      const result = await getAuth().api.signInEmail({
        body: { email: input.email, password: input.password },
        headers: await headers(),
      });
      return toProviderUser(result.user);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  signOut: async () => {
    try {
      await getAuth().api.signOut({ headers: await headers() });
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  sendVerificationOTP: async (email: string) => {
    try {
      await getAuth().api.sendVerificationOTP({
        body: { email, type: "email-verification" },
        headers: await headers(),
      });
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  verifyEmailOTP: async (input: { email: string; otp: string }) => {
    try {
      const result = await getAuth().api.verifyEmailOTP({
        body: { email: input.email, otp: input.otp },
        headers: await headers(),
      });
      if (!result.user) {
        // Provider verified the OTP but omitted the user payload: resolve
        // through the same normalized, whitelisted read as findUserByEmail.
        // A missing row here is a verification failure, not a NOT_FOUND leak.
        const user = await getPrisma().user.findUnique({
          where: { email: normalizeEmail(input.email) },
          select: { id: true, name: true, email: true, emailVerified: true },
        });
        if (!user) {
          throw normalizeAuthError({ code: "INVALID_OTP" });
        }
        return toProviderUser(user);
      }
      return toProviderUser(result.user);
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  requestPasswordReset: async (email) => {
    try {
      await getAuth().api.requestPasswordReset({
        body: { email, redirectTo: "/auth/reset-password" },
        headers: await headers(),
      });
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  resetPasswordWithToken: async (input) => {
    try {
      await getAuth().api.resetPassword({
        body: { newPassword: input.newPassword, token: input.token },
        headers: await headers(),
      });
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },

  getSession: async () => {
    const result = await getAuth().api.getSession({ headers: await headers() });
    if (!result || !result.session || !result.user) return null;
    return {
      userId: result.user.id,
      name: result.user.name,
      email: result.user.email,
      activeOrganizationId: result.session.activeOrganizationId ?? null,
    };
  },

  setActiveOrganization: async (input) => {
    try {
      // The provider validates membership itself (non-members are rejected
      // and the active organization is cleared); callers additionally
      // verify membership first so unknown ids never reach the provider.
      const organization = await getAuth().api.setActiveOrganization({
        body: { organizationId: input.organizationId },
        headers: await headers(),
      });
      if (!organization || typeof organization.id !== "string") {
        throw normalizeAuthError({ code: "ORGANIZATION_NOT_FOUND" });
      }
      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      };
    } catch (error) {
      throw normalizeAuthError(error);
    }
  },
};

export { betterAuthProvider };
