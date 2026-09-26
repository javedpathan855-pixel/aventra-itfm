// Login use case (application layer — framework-independent).
//
// Owns: input validation (safeParse, never trust browser Zod), email
// normalization, provider invocation, error normalization, and the
// authenticated-vs-verification-required decision plus safe redirect
// resolution. No React, no router, no toast, no Prisma, no Better Auth.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { loginSchema } from "../../domain/schemas/auth.schema";
import {
  getSafeRedirectUrl,
  normalizeEmail,
} from "../../domain/services/auth-helpers";
import type { AuthProvider, ProviderUser } from "../../repository/auth-provider";

interface LoginInput {
  email: string;
  password: string;
  remember: boolean;
}

type LoginResult =
  | { status: "authenticated"; user: ProviderUser; redirectUrl: string }
  | { status: "verification-required"; email: string };

interface LoginDeps {
  authProvider: AuthProvider;
}

/** Validate untrusted input against the canonical domain schema. */
const parseLoginInput = (raw: unknown): LoginInput => {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  return parsed.data;
};

/**
 * Execute password sign-in. Returns the safe redirect for the
 * authenticated case, or the normalized email so presentation can route
 * to OTP verification without re-implementing redirect policy.
 */
const executeLogin = async (
  rawInput: unknown,
  deps: LoginDeps & { redirect?: string | null },
): Promise<LoginResult> => {
  const input = parseLoginInput(rawInput);
  const email = normalizeEmail(input.email);

  try {
    const user = await deps.authProvider.signInWithPassword({
      email,
      password: input.password,
    });
    return {
      status: "authenticated",
      user,
      redirectUrl: getSafeRedirectUrl(deps.redirect, "/dashboard"),
    };
  } catch (error) {
    const normalized = normalizeError(error);
    if (normalized.code === "EMAIL_NOT_VERIFIED") {
      return { status: "verification-required", email };
    }
    throw normalized;
  }
};

export { executeLogin, parseLoginInput };
export type { LoginInput, LoginResult, LoginDeps };
