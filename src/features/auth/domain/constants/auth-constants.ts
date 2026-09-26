// Canonical domain-level authentication constants.
// Pure TS: no React, no Next.js, no Prisma, no Better Auth.

export const MIN_PASSWORD_LENGTH = 8;
export const OTP_LENGTH = 6;
export const OTP_EXPIRES_IN_SECONDS = 600; // 10 minutes (ADR 003)
export const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60s countdown (UX only — server abuse protection is Better Auth rateLimit)
export const OTP_MAX_ATTEMPTS = 5; // Client UX lockout threshold (attempts remaining display).
// Server-side OTP abuse protection is enforced by Better Auth (rateLimit
// customRules for "/email-otp/*" + TOO_MANY_ATTEMPTS →
// VERIFICATION_ATTEMPTS_EXCEEDED mapping). This constant MUST NOT be treated
// as a server security boundary on its own.
export const PASSWORD_RESET_EXPIRES_IN_SECONDS = 3600; // 1 hour (ADR 003)
export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days (ADR 003)
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // 1 day
