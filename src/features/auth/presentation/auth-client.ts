"use client";

// Better Auth reactive client for the auth forms. Public client only:
// baseURL points at our own /api/auth routes, and the plugins mirror
// the server (OTP verification, organization reads). No secrets here.
//
// Lives in presentation (not infrastructure/auth) so the server Better Auth
// singleton (auth.ts: secrets, Prisma adapter, env) can never be pulled
// into the client bundle through a shared barrel.

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, organizationClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  plugins: [emailOTPClient(), organizationClient()],
});

export { authClient };
