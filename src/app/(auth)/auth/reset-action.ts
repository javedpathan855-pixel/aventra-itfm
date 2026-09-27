"use server";

// Password-reset adapter (composition boundary).
//
// Wires the application use case to the infrastructure adapter: the only
// place allowed to join the AuthProvider implementation to the port.
// Returns serializable results only (never AppError instances, provider
// shapes, or the reset token) with application-level codes the form
// branches on.

import { AppError, type AuthErrorCode } from "@/shared/error/app-error";
import { executeResetPassword } from "@/features/auth/application/use-cases/reset-password.use-case";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";

type ResetPasswordActionResult = { ok: true } | { ok: false; code: AuthErrorCode };

const resetPasswordAction = async (input: unknown): Promise<ResetPasswordActionResult> => {
  try {
    await executeResetPassword(input, { authProvider: betterAuthProvider });
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code };
    }
    return { ok: false, code: "INTERNAL_ERROR" };
  }
};

export { resetPasswordAction };
export type { ResetPasswordActionResult };
