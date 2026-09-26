// Auth domain error taxonomy (pure — no runtime imports).
//
// Single source of truth mapping raw provider error codes to safe
// application error codes. Both the server adapter
// (infrastructure/error/better-auth-error-map.ts) and presentation
// (forms deciding banner vs OTP screen vs redirect) consume this map,
// so provider-specific strings never scatter across components.
//
// Security: presentation branches on the mapped application code, never on
// raw provider strings or human-readable messages.

import type { AuthErrorCode } from "@/shared/error/app-error";

/**
 * Known Better Auth / better-call failure codes → safe application codes.
 * Unlisted codes map to null so callers fall back to generic handling
 * (Prisma map, then INTERNAL_ERROR) instead of inventing UI strings.
 */
const PROVIDER_CODE_MAP: Record<string, AuthErrorCode> = {
  INVALID_EMAIL_OR_PASSWORD: "INVALID_CREDENTIALS",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  USER_ALREADY_EXISTS: "CONFLICT",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "CONFLICT",
  // Organization slug conflicts (verified against the installed
  // better-auth organization plugin: ORGANIZATION_ALREADY_EXISTS is thrown
  // by /organization/create, ORGANIZATION_SLUG_ALREADY_TAKEN by slug
  // check/update paths).
  ORGANIZATION_ALREADY_EXISTS: "CONFLICT",
  ORGANIZATION_SLUG_ALREADY_TAKEN: "CONFLICT",
  INVALID_PASSWORD: "VALIDATION_ERROR",
  INVALID_OTP: "VERIFICATION_FAILED",
  OTP_EXPIRED: "VERIFICATION_EXPIRED",
  TOO_MANY_ATTEMPTS: "VERIFICATION_ATTEMPTS_EXCEEDED",
  TOO_MANY_REQUESTS: "RATE_LIMITED",
  INVALID_TOKEN: "VERIFICATION_FAILED",
  EXPIRED_TOKEN: "VERIFICATION_EXPIRED",
};

/** Map a raw provider code to a safe application code (null when unknown). */
const mapProviderCodeToAppCode = (rawCode: string | null): AuthErrorCode | null => {
  if (!rawCode || typeof rawCode !== "string") return null;
  return PROVIDER_CODE_MAP[rawCode] ?? null;
};

/** Verification-flow codes that should route the user to OTP handling. */
const isVerificationErrorCode = (code: AuthErrorCode): boolean =>
  code === "VERIFICATION_FAILED" ||
  code === "VERIFICATION_EXPIRED" ||
  code === "VERIFICATION_ATTEMPTS_EXCEEDED" ||
  code === "EMAIL_NOT_VERIFIED";

/** Codes that must render an account-enumeration-safe generic response. */
const isEnumerationSensitiveCode = (code: AuthErrorCode): boolean =>
  code === "CONFLICT" || code === "NOT_FOUND" || code === "INVALID_CREDENTIALS";

export { mapProviderCodeToAppCode, isVerificationErrorCode, isEnumerationSensitiveCode };
export type { AuthErrorCode };
