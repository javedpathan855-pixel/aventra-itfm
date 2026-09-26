import { headers } from "next/headers";

import { getAuth } from "./auth";
import { normalizeError } from "@/shared/error/app-error";
import { getPrisma } from "@/shared/infrastructure/prisma";
import {
  AuthProvider,
  ProviderUser,
  SignUpInput,
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

/**
 * Better Auth implementation of the domain AuthProvider port.
 * Server-only: forwards request headers for IP/user-agent tracking and
 * relies on the nextCookies plugin to persist session cookies from
 * server actions. Provider failures are normalized to safe AppErrors.
 */
const betterAuthProvider: AuthProvider = {
  findUserByEmail: async (email) => {
    const user = await getPrisma().user.findUnique({
      where: { email },
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
      throw normalizeError(error);
    }
  },

  signInWithPassword: async (input) => {
    try {
      const result = await getAuth().api.signInEmail({
        body: { email: input.email, password: input.password },
        headers: await headers(),
      });
      return toProviderUser(result.user);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  signOut: async () => {
    try {
      await getAuth().api.signOut({ headers: await headers() });
    } catch (error) {
      throw normalizeError(error);
    }
  },

  requestPasswordReset: async (email) => {
    try {
      await getAuth().api.requestPasswordReset({
        body: { email, redirectTo: "/auth/reset-password" },
        headers: await headers(),
      });
    } catch (error) {
      throw normalizeError(error);
    }
  },

  resetPasswordWithToken: async (input) => {
    try {
      await getAuth().api.resetPassword({
        body: { newPassword: input.newPassword, token: input.token },
        headers: await headers(),
      });
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export { betterAuthProvider };
