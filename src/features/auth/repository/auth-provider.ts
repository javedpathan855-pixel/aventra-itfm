// Auth provider port (domain layer).
//
// The use-cases orchestrate registration/OTP/login/reset against this
// interface; the Better Auth adapter implements it in infrastructure.
// Fakes implement it in tests — no database, no network, no secrets.

interface ProviderUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

interface AuthProvider {
  /** Null when no account exists for the normalized email. */
  findUserByEmail(email: string): Promise<ProviderUser | null>;
  /** Create the credential account. Throws CONFLICT when taken. */
  signUpWithPassword(input: SignUpInput): Promise<ProviderUser>;

  /**
   * Password sign-in with session creation.
   * Throws INVALID_CREDENTIALS or EMAIL_NOT_VERIFIED.
   */
  signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<ProviderUser>;
  /** Invalidate the current session. */
  signOut(): Promise<void>;
  /** Start password reset. Provider stays silent for unknown emails. */
  requestPasswordReset(email: string): Promise<void>;
  /** Consume a single-use reset token with a new password. */
  resetPasswordWithToken(input: {
    token: string;
    newPassword: string;
  }): Promise<void>;
}

/** Security-event sink (implemented by the structured logger). */
interface SecurityEventSink {
  log(
    event:
      | "registration_started"
      | "registration_completed"
      | "verification_requested"
      | "verification_succeeded"
      | "verification_failed"
      | "verification_rate_limited"
      | "login_succeeded"
      | "login_failed"
      | "logout"
      | "password_reset_requested"
      | "password_reset_completed",
    context?: { userId?: string; emailDomain?: string; reason?: string },
  ): void;
}

export type { AuthProvider, ProviderUser, SecurityEventSink, SignUpInput };
