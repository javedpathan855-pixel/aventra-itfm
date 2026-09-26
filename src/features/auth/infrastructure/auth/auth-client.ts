"use client";

// Better Auth reactive client for the auth forms. Public client only:
// baseURL points at our own /api/auth routes, and the plugins mirror
// the server (OTP verification, organization reads). No secrets here.

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, organizationClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  plugins: [emailOTPClient(), organizationClient()],
});

export { authClient };
