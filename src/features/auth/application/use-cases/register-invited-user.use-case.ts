// Register invited user use case (application layer — framework-independent).
//
// Owns: input validation (safeParse — never trust browser Zod),
// verification of the invitation token, enforcement that registration email
// matches the invited email, and user account creation WITHOUT organization creation.
// Preserves existing Better Auth emailOTP verification on sign-up.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { registerInvitedUserSchema } from "../../domain/schemas/auth.schema";
import { normalizeEmail } from "../../domain/services/auth-helpers";
import type { AuthProvider, ProviderUser } from "../../repository/auth-provider";
import type { AuthorizationRepository } from "../../repository/authorization-repository";

interface RegisterInvitedUserInput {
  token: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

interface RegisterInvitedUserResult {
  user: ProviderUser;
  requiresVerification: boolean;
}

interface RegisterInvitedUserDeps {
  authProvider: AuthProvider;
  authorizationRepository: AuthorizationRepository;
}

/** Validate untrusted input against the canonical domain schema. */
const parseRegisterInvitedUserInput = (raw: unknown): RegisterInvitedUserInput => {
  const parsed = registerInvitedUserSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  return parsed.data;
};

/**
 * Register an invited user: creates credential account only (no new organization).
 * Enforces token validity, pending status, expiry, and email match.
 * Verification is required next (standard Better Auth emailOTP on sign up).
 */
const executeRegisterInvitedUser = async (
  rawInput: unknown,
  deps: RegisterInvitedUserDeps,
): Promise<RegisterInvitedUserResult> => {
  const input = parseRegisterInvitedUserInput(rawInput);
  const normalizedInputEmail = normalizeEmail(input.email);

  try {
    const invitation = await deps.authorizationRepository.findInvitationByToken(input.token);
    if (!invitation || invitation.status !== "pending") {
      throw new AppError("FORBIDDEN", {
        message: "This invitation is invalid or has expired.",
      });
    }

    if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
      throw new AppError("FORBIDDEN", {
        message: "This invitation is invalid or has expired.",
      });
    }

    if (normalizeEmail(invitation.email) !== normalizedInputEmail) {
      throw new AppError("FORBIDDEN", {
        message: "The registration email must match the invited email address.",
      });
    }

    const createdUser = await deps.authProvider.signUpWithPassword({
      name: input.name.trim(),
      email: normalizedInputEmail,
      password: input.password,
    });

    return {
      user: createdUser,
      requiresVerification: true,
    };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeRegisterInvitedUser, parseRegisterInvitedUserInput };
export type {
  RegisterInvitedUserInput,
  RegisterInvitedUserResult,
  RegisterInvitedUserDeps,
};
