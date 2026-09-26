// Reset-password use case (application layer — framework-independent).
//
// Owns: reset-token presence validation, new-password validation via the
// canonical domain schema, provider invocation, and invalid/expired token
// mapping. Tokens are never logged and never embedded in error messages.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { resetPasswordSchema } from "../../domain/schemas/auth.schema";
import type { AuthProvider } from "../../repository/auth-provider";

interface ResetPasswordInput {
  token: string;
  password: string;
  confirmPassword: string;
}

interface ResetPasswordResult {
  success: true;
}

interface ResetPasswordDeps {
  authProvider: AuthProvider;
}

/** Validate untrusted input: token presence + canonical password rules. */
const parseResetPasswordInput = (raw: unknown): ResetPasswordInput => {
  if (typeof raw !== "object" || raw === null) {
    throw new AppError("VALIDATION_ERROR");
  }
  const record = raw as Record<string, unknown>;
  const token = record.token;
  if (typeof token !== "string" || token.length === 0) {
    throw new AppError("VALIDATION_ERROR");
  }
  const parsed = resetPasswordSchema.safeParse({
    password: record.password,
    confirmPassword: record.confirmPassword,
  });
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  return { token, password: parsed.data.password, confirmPassword: parsed.data.confirmPassword };
};

/** Consume a single-use reset token with a new password. */
const executeResetPassword = async (
  rawInput: unknown,
  deps: ResetPasswordDeps,
): Promise<ResetPasswordResult> => {
  const input = parseResetPasswordInput(rawInput);

  try {
    await deps.authProvider.resetPasswordWithToken({
      token: input.token,
      newPassword: input.password,
    });
    return { success: true };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeResetPassword, parseResetPasswordInput };
export type { ResetPasswordInput, ResetPasswordResult, ResetPasswordDeps };
