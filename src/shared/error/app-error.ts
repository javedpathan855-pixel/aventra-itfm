// Canonical application error model for server boundaries.
//
// One normalizer turns unknown failures (Prisma, Resend, Zod, network)
// into safe AppErrors; transport renders the API_RULES.md envelope
// { success:false, error:{ code, message, details? } }.
// Provider-specific (Better Auth) code knowledge lives in
// features/auth/infrastructure/error/better-auth-error-map.ts — never here.
// Client logic must branch on `code`, never on human-readable messages.

type ErrorDetails = Record<string, unknown>;

const AUTH_ERROR_CODES = [
  "VALIDATION_ERROR",
  "INVALID_CREDENTIALS",
  "EMAIL_NOT_VERIFIED",
  "VERIFICATION_FAILED",
  "VERIFICATION_EXPIRED",
  "VERIFICATION_ATTEMPTS_EXCEEDED",
  "RATE_LIMITED",
  "CONFLICT",
  "NOT_FOUND",
  "FORBIDDEN",
  "DATABASE_ERROR",
  "EMAIL_DELIVERY_ERROR",
  "UPSTREAM_ERROR",
  "INTERNAL_ERROR",
] as const;

type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const ERROR_STATUS: Record<AuthErrorCode, number> = {
  VALIDATION_ERROR: 422,
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_VERIFIED: 403,
  VERIFICATION_FAILED: 400,
  VERIFICATION_EXPIRED: 400,
  VERIFICATION_ATTEMPTS_EXCEEDED: 429,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  DATABASE_ERROR: 503,
  EMAIL_DELIVERY_ERROR: 502,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

const SAFE_MESSAGES: Record<AuthErrorCode, string> = {
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  INVALID_CREDENTIALS: "The email or password you entered is incorrect.",
  EMAIL_NOT_VERIFIED:
    "Please verify your email address before signing in. Check your inbox for the code.",
  VERIFICATION_FAILED: "The verification code is incorrect. Please try again.",
  VERIFICATION_EXPIRED:
    "The verification code has expired. Please request a new one.",
  VERIFICATION_ATTEMPTS_EXCEEDED:
    "Too many incorrect attempts. Please request a new code.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  CONFLICT: "This request conflicts with the current state. Please retry.",
  NOT_FOUND: "The requested resource was not found.",
  FORBIDDEN: "You do not have access to this resource.",
  DATABASE_ERROR: "Something went wrong. Please try again in a moment.",
  EMAIL_DELIVERY_ERROR:
    "We could not send the email right now. Please try again in a moment.",
  UPSTREAM_ERROR: "A dependent service is unavailable. Please try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

/**
 * Safe, categorized application error. `message` is always user-facing;
 * `cause` stays server-side for diagnostics (never serialized).
 */
class AppError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;
  readonly details?: ErrorDetails;

  constructor(
    code: AuthErrorCode,
    options?: { message?: string; details?: ErrorDetails; cause?: unknown },
  ) {
    super(options?.message ?? SAFE_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = options?.details;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Canonical normalizer: unknown server failure -> safe AppError.
 * AppErrors pass through; database failures map; anything else becomes
 * INTERNAL_ERROR with the original kept as `cause` (never serialized).
 * Better Auth failures are mapped by the auth feature normalizer
 * (normalizeAuthError) before reaching here.
 */
const fromPrismaError = (error: unknown): AppError | null => {
  if (!isRecord(error) || typeof error.code !== "string") {
    return null;
  }

  switch (error.code) {
    case "P2002":
      return new AppError("CONFLICT", { cause: error });
    case "P2003":
    case "P2025":
      return new AppError("NOT_FOUND", { cause: error });
    case "P1001":
    case "P1002":
    case "P1008":
    case "P1017":
      return new AppError("DATABASE_ERROR", { cause: error });
    default:
      if (error.code.startsWith("P")) {
        return new AppError("DATABASE_ERROR", { cause: error });
      }
      return null;
  }
};

/**
 * Canonical normalizer: unknown server failure -> safe AppError.
 * AppErrors pass through; provider/database failures map; anything
 * else becomes INTERNAL_ERROR with the original kept as `cause`.
 */
const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  return fromPrismaError(error) ?? new AppError("INTERNAL_ERROR", { cause: error });
};

interface ErrorEnvelope {
  success: false;
  error: {
    code: AuthErrorCode;
    message: string;
    details?: ErrorDetails;
  };
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** Render the API_RULES.md error envelope (safe fields only). */
const toErrorEnvelope = (
  error: unknown,
): { status: number; body: ErrorEnvelope } => {
  const appError = normalizeError(error);
  return {
    status: appError.status,
    body: {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
      },
    },
  };
};

/** Render the API_RULES.md success envelope. */
const toSuccessEnvelope = <T>(
  data: T,
  meta?: Record<string, unknown>,
): SuccessEnvelope<T> => ({
  success: true,
  data,
  ...(meta ? { meta } : {}),
});

export {
  AppError,
  AUTH_ERROR_CODES,
  ERROR_STATUS,
  SAFE_MESSAGES,
  fromPrismaError,
  normalizeError,
  toErrorEnvelope,
  toSuccessEnvelope,
};
export type { AuthErrorCode, ErrorDetails, ErrorEnvelope, SuccessEnvelope };
