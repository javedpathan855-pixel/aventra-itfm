// OTP verification use case (application layer — framework-independent).
//
// Owns: input validation via the canonical OTP schema (replacing the
// former manual length/regex checks in the form), email normalization,
// provider invocation, and error normalization. Attempt limiting and
// expiry are enforced server-side by the provider; client countdowns and
// local attempt counters are UX only and MUST NOT be treated as security.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { otpVerificationSchema } from "../../domain/schemas/auth.schema";
import { normalizeEmail } from "../../domain/services/auth-helpers";
import type { AuthProvider, ProviderUser } from "../../repository/auth-provider";

interface VerifyOtpInput {
  email: string;
  otp: string;
}

interface VerifyOtpResult {
  user: ProviderUser;
}

interface VerifyOtpDeps {
  authProvider: AuthProvider;
}

/** Validate untrusted input against the canonical domain schema. */
const parseVerifyOtpInput = (raw: unknown): VerifyOtpInput => {
  const parsed = otpVerificationSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  return parsed.data;
};

/** Verify an email OTP; provider maps invalid/expired/rate-limited states. */
const executeVerifyOtp = async (
  rawInput: unknown,
  deps: VerifyOtpDeps,
): Promise<VerifyOtpResult> => {
  const input = parseVerifyOtpInput(rawInput);
  const email = normalizeEmail(input.email);

  try {
    const user = await deps.authProvider.verifyEmailOTP({ email, otp: input.otp });
    return { user };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeVerifyOtp, parseVerifyOtpInput };
export type { VerifyOtpInput, VerifyOtpResult, VerifyOtpDeps };
