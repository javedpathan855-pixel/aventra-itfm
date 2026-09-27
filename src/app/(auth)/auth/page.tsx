import { Suspense } from "react";
import AuthPageClient from "@/features/auth/presentation/pages/auth-page-client";
import {
  executeGetInvitationSummary,
  type InvitationSummaryResult,
} from "@/features/auth/application/use-cases/get-invitation-summary.use-case";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";

export const metadata = {
  title: "Authentication | Aventra ITFM",
  description: "Secure enterprise sign-in and registration for Aventra ITFM",
};

interface AuthPageProps {
  searchParams: Promise<{
    mode?: string;
    callbackUrl?: string;
    token?: string;
    invitationToken?: string;
    error?: string;
  }>;
}

const AuthPage = async ({ searchParams }: AuthPageProps) => {
  const params = await searchParams;

  let invitationToken = params.token || params.invitationToken;
  if (!invitationToken && params.callbackUrl) {
    try {
      const parsed = new URL(params.callbackUrl, "http://localhost");
      invitationToken = parsed.searchParams.get("token") ?? undefined;
    } catch {
      // Non-URL or unparseable callback
    }
  }

  let invitationSummary: InvitationSummaryResult | null = null;
  if (invitationToken) {
    try {
      invitationSummary = await executeGetInvitationSummary(
        { token: invitationToken },
        { authorizationRepository: prismaAuthorizationRepository },
      );
    } catch {
      invitationSummary = null;
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-muted text-sm">
          Loading Aventra ITFM...
        </div>
      }
    >
      <AuthPageClient
        initialInvitation={invitationSummary}
        invitationToken={invitationSummary ? invitationToken : undefined}
      />
    </Suspense>
  );
};

export default AuthPage;
