// Forgot-password use case (application layer — framework-independent).
//
// Owns: input validation (safeParse), email normalization, reset request,
// enumeration-safe behavior, and error normalization. The externally
// visible result is identical whether or not the account exists; only
// abuse signals (rate limiting) and unexpected failures surface.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { forgotPasswordSchema } from "../../domain/schemas/auth.schema";
import { normalizeEmail } from "../../domain/services/auth-helpers";
import { isEnumerationSensitiveCode } from "../../domain/error/auth-error";
import type { AuthProvider } from "../../repository/auth-provider";
import type { AuthErrorCode } from "@/shared/error/app-error";

interface RequestPasswordResetInput {
  email: string;
}

interface RequestPasswordResetResult {
  dispatched: true;
}

interface RequestPasswordResetDeps {
  authProvider: AuthProvider;
}

/** Validate untrusted input against the canonical domain schema. */
const parseRequestPasswordResetInput = (raw: unknown): RequestPasswordResetInput => {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  return parsed.data;
};

/**
 * Request a password reset without revealing account existence.
 * Existence-revealing failures collapse to the same success result;
 * rate limiting and infrastructure failures still throw.
 */
const executeRequestPasswordReset = async (
  rawInput: unknown,
  deps: RequestPasswordResetDeps,
): Promise<RequestPasswordResetResult> => {
  const input = parseRequestPasswordResetInput(rawInput);
  const email = normalizeEmail(input.email);

  try {
    await deps.authProvider.requestPasswordReset(email);
    return { dispatched: true };
  } catch (error) {
    const normalized = normalizeError(error);
    const code: AuthErrorCode = normalized.code;
    if (isEnumerationSensitiveCode(code)) {
      return { dispatched: true };
    }
    throw normalized;
  }
};

export { executeRequestPasswordReset, parseRequestPasswordResetInput };
export type {
  RequestPasswordResetInput,
  RequestPasswordResetResult,
  RequestPasswordResetDeps,
};
