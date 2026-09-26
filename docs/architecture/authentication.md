# Aventra ITFM Authentication Architecture

## Overview
Aventra ITFM enforces an enterprise-grade, clean architecture authentication pipeline powered by **Better Auth** and **PostgreSQL (Prisma 7)**.

---

## Architectural Boundaries

```
src/
├── config/
│   └── env.ts                     # Strict server environment validation (Zod)
├── features/auth/
│   ├── domain/                    # Zero-dependency business domain
│   │   ├── constants/             # Centralized contracts (OTP_LENGTH, MIN_PASSWORD_LENGTH, etc.)
│   │   ├── schemas/               # Zod validation schemas for all flows
│   │   └── services/              # Pure helpers: normalizeEmail, slugifyOrganizationName, getSafeRedirectUrl
│   ├── repository/                # Port definitions (AuthProvider, SecurityEventSink)
│   ├── infrastructure/            # Adapters & external integrations
│   │   ├── auth/                  # Better Auth server instance & client SDK
│   │   ├── email/                 # Resend HTTP email delivery service with branded templates
│   │   └── security/              # Database-backed sliding window rate limiter (RateLimitHit)
│   └── presentation/              # React 19 UI layer
│       ├── components/            # AuthShowcase with GPU-accelerated motion
│       ├── forms/                 # LoginForm, RegisterForm, OtpVerificationForm, ResetPasswordForm
│       ├── hooks/                 # useAuth flow coordinator
│       └── pages/                 # AuthPageClient, ResetPasswordPageClient
```

---

## Supported Workflows

### 1. Registration Flow
1. User enters `name`, `email`, `password`, and `confirmPassword`.
2. Client normalizes email (`trim().toLowerCase()`) and submits to `authClient.signUp.email()`.
3. Better Auth writes the user record (`emailVerified: false`) and generates a 6-digit OTP code in the `verification` table.
4. The server dispatches an email with the verification code using the Resend service.
5. Client transitions seamlessly to the OTP verification screen for that email address.

### 2. OTP Email Verification Flow
1. User receives a 6-digit code with a 10-minute expiry (`OTP_EXPIRES_IN_SECONDS = 600`).
2. Input field features 6 distinct, accessible input slots with auto-advance, backspace navigation, and full-code paste detection.
3. Verification attempts are tracked against `OTP_MAX_ATTEMPTS = 5`.
4. Client provides an interval-safe 60-second countdown for resending codes.
5. On successful verification, the account is marked `emailVerified: true`, session cookies are established via `nextCookies`, and the user is redirected to the verified destination.

### 3. Login Flow
1. User enters credentials with optional "Remember this device" (`rememberMe`).
2. Submits to `authClient.signIn.email()`.
3. If the user account exists with valid credentials but has not verified its email (`EMAIL_NOT_VERIFIED`), the system automatically sends a fresh OTP and transitions to the OTP screen.
4. Upon authentication, redirect destination is validated against `getSafeRedirectUrl()` to prevent open redirect vulnerabilities.

### 4. Forgot Password & Password Reset Flow
1. User enters registered email.
2. The server responds with a generic confirmation message regardless of whether the email exists to prevent user enumeration attacks.
3. If the account exists, a secure single-use token link (`/auth/reset-password?token=...`) with 1-hour expiry is sent via Resend.
4. On `/auth/reset-password`, the user sets and confirms their new password.

---

## Security Hardening
- **No Client Secrets**: Credentials, OTPs, reset tokens, and API keys are never written to `localStorage` or `sessionStorage`.
- **Open Redirect Protection**: `getSafeRedirectUrl()` permits only internal relative paths (`/dashboard`), blocking protocol-relative URLs (`//evil.com`) and script schemes (`javascript:`).
- **Rate Limiting**: Multi-action sliding window rate limiter backed by the `RateLimitHit` PostgreSQL ledger.
- **Error Normalization**: Raw database internals or stack traces are converted into safe `AppError` envelopes before reaching the client.

---

## Required Environment Variables
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | 32+ character high-entropy encryption secret |
| `BETTER_AUTH_URL` | Canonical application base URL (`http://localhost:3000`) |
| `RESEND_API_KEY` | Resend API key for email delivery |
| `RESEND_FROM_EMAIL` | Verified sender email address |
