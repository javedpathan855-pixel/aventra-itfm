import { redirect } from "next/navigation";
import Link from "next/link";

import { AppError } from "@/shared/error/app-error";
import { executeGetInvitationSummary } from "@/features/auth/application/use-cases/get-invitation-summary.use-case";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { acceptInvitationAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accept Invitation | Aventra ITFM",
  description: "Accept an organization invitation to Aventra ITFM",
};

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

/** Fixed safe messages for action error codes (allowlisted, never raw). */
const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "This invitation is invalid or has expired.",
  VALIDATION_ERROR: "This invitation link is incomplete.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

/**
 * Invitation acceptance page (server-only). Requires a session first
 * (redirect preserves the token), then previews the pending invitation.
 * Acceptance itself runs through the server action → use case chain.
 */
const AcceptInvitationPage = async ({ searchParams }: AcceptInvitationPageProps) => {
  const { token, error } = await searchParams;

  const session = await betterAuthProvider.getSession();
  if (!session) {
    redirect(
      `/auth?callbackUrl=${encodeURIComponent(`/invitations/accept?token=${encodeURIComponent(token ?? "")}`)}`,
    );
  }

  let summary: { organizationName: string; role: string; expiresAt: Date | null } | null = null;
  if (token) {
    try {
      summary = await executeGetInvitationSummary(
        { token },
        {
          getSession: () => betterAuthProvider.getSession(),
          authorizationRepository: prismaAuthorizationRepository,
        },
      );
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
      summary = null;
    }
  }

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.INTERNAL_ERROR) : null;

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-6">
      <Card className="w-full max-w-md p-6 sm:p-8">
        {!summary ? (
          <div className="flex flex-col gap-3 text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Invitation unavailable
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              This invitation is invalid or has expired. Ask your workspace
              administrator for a new invitation.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary-hover"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-center">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Join {summary.organizationName}
              </h1>
              <p className="text-sm leading-relaxed text-muted">
                You have been invited as {summary.role}. This invitation
                {summary.expiresAt
                  ? ` expires on ${summary.expiresAt.toLocaleDateString()}.`
                  : " does not expire."}
              </p>
            </div>
            {errorMessage && (
              <div
                role="alert"
                className="w-full rounded-lg border border-error/30 bg-error-muted p-2.5 text-xs leading-relaxed text-error"
              >
                {errorMessage}
              </div>
            )}
            <form action={acceptInvitationAction.bind(null, token)}>
              <Button type="submit" variant="primary" className="w-full">
                Accept Invitation
              </Button>
            </form>
          </div>
        )}
      </Card>
    </main>
  );
};

export default AcceptInvitationPage;
