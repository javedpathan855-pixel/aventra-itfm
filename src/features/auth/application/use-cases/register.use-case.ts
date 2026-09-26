// Workspace registration use case (application layer — framework-independent).
//
// Owns: input validation (safeParse — never trust browser Zod), name and
// organization-name trimming, email normalization, provider invocation,
// and error normalization. The provider creates user + organization +
// owner membership; verification is always required next. No React,
// no router, no toast, no Prisma, no Better Auth.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { registerSchema } from "../../domain/schemas/auth.schema";
import { normalizeEmail } from "../../domain/services/auth-helpers";
import type {
  AuthProvider,
  SignUpWorkspaceResult,
} from "../../repository/auth-provider";

interface RegisterInput {
  name: string;
  email: string;
  organizationName: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

interface RegisterResult {
  user: SignUpWorkspaceResult["user"];
  organization: SignUpWorkspaceResult["organization"];
  requiresVerification: boolean;
}

interface RegisterDeps {
  authProvider: AuthProvider;
}

/** Validate untrusted input against the canonical domain schema. */
const parseRegisterInput = (raw: unknown): RegisterInput => {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  return parsed.data;
};

/**
 * Register a workspace: credential account + organization + owner
 * membership. Verification is always required next (existing Better Auth
 * behavior is preserved — emailOTP sends on sign-up).
 */
const executeRegister = async (
  rawInput: unknown,
  deps: RegisterDeps,
): Promise<RegisterResult> => {
  const input = parseRegisterInput(rawInput);
  const email = normalizeEmail(input.email);

  try {
    const result = await deps.authProvider.signUpWithWorkspace({
      name: input.name.trim(),
      email,
      password: input.password,
      organizationName: input.organizationName.trim(),
    });
    return {
      user: result.user,
      organization: result.organization,
      requiresVerification: true,
    };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeRegister, parseRegisterInput };
export type { RegisterInput, RegisterResult, RegisterDeps };
