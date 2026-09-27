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
export const INVITATION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 2; // 48 hours (matches provider default)
export const INVITATION_TOKEN_BYTES = 32; // 256-bit acceptance tokens (cryptographic random, hashed at rest)

/**
 * Member/invitation API abuse budgets (administrative operations).
 * Conservative hourly budgets per authenticated user: invitations and
 * removals are the most abuse-sensitive; role changes slightly roomier.
 * Enforced by atomic server-side storage; keys derive from verified
 * session identity, never client input.
 */
export const MEMBER_API_RATE_LIMITS = {
  inviteMember: { maxHits: 20, windowSeconds: 3600 },
  updateMemberRole: { maxHits: 30, windowSeconds: 3600 },
  removeMember: { maxHits: 20, windowSeconds: 3600 },
  acceptInvitation: { maxHits: 30, windowSeconds: 3600 },
  cancelInvitation: { maxHits: 30, windowSeconds: 3600 },
} as const;

export type MemberApiAction = keyof typeof MEMBER_API_RATE_LIMITS;
