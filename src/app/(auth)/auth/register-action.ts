"use server";

// Workspace registration adapter (composition boundary).
//
// Wires the application use case to the infrastructure adapter: the only
// place allowed to join the AuthProvider implementation to the port.
// Returns serializable results only (never AppError instances or provider
// shapes) with application-level codes the form branches on.

import { AppError, type AuthErrorCode } from "@/shared/error/app-error";
import { executeRegister } from "@/features/auth/application/use-cases/register.use-case";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";

type RegisterActionResult =
  | { ok: true; email: string; organizationSlug: string }
  | { ok: false; code: AuthErrorCode };

const registerWorkspaceAction = async (input: unknown): Promise<RegisterActionResult> => {
  try {
    const result = await executeRegister(input, { authProvider: betterAuthProvider });
    return {
      ok: true,
      email: result.user.email,
      organizationSlug: result.organization.slug,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code };
    }
    return { ok: false, code: "INTERNAL_ERROR" };
  }
};

export { registerWorkspaceAction };
export type { RegisterActionResult };
