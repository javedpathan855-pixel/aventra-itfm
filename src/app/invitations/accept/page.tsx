import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Building2, CheckCircle2 } from "lucide-react";

import { AppError } from "@/shared/error/app-error";
import { executeGetInvitationSummary, type InvitationSummaryResult } from "@/features/auth/application/use-cases/get-invitation-summary.use-case";
import { executeAcceptInvitation } from "@/features/auth/application/use-cases/accept-invitation.use-case";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";
import { normalizeEmail } from "@/features/auth/domain/services/auth-helpers";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { acceptInvitationAction, signOutAndSwitchAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accept Invitation | Aventra ITFM",
  description: "Accept an organization invitation to Aventra ITFM",
};

interface AcceptInvitationPageProps {
  searchParams: Promise<{ token?: string; error?: string; autoAccept?: string }>;
}

/** Fixed safe messages for action error codes (allowlisted, never raw). */
const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "This invitation is invalid or has expired.",
  VALIDATION_ERROR: "This invitation link is incomplete.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

const AcceptInvitationPage = async ({ searchParams }: AcceptInvitationPageProps) => {
  const { token, error, autoAccept } = await searchParams;

  if (!token) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-6">
        <Card className="w-full max-w-md p-6 sm:p-8 border-border/60">
          <div className="flex flex-col gap-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-muted text-error">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Missing Invitation Link
              </h1>
              <p className="text-sm leading-relaxed text-muted">
                No invitation token was provided. Please check the link in your invitation email.
              </p>
            </div>
            <Link
              href="/auth"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary-hover"
            >
              Go to Sign In
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  // 1. Validate the invitation token first (token-gated)
  let summary: InvitationSummaryResult | null = null;
  try {
    summary = await executeGetInvitationSummary(
      { token },
      { authorizationRepository: prismaAuthorizationRepository },
    );
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    summary = null;
  }

  // Flow D: Invalid, expired, revoked or missing invitation
  if (!summary) {
    const session = await betterAuthProvider.getSession();
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-6">
        <Card className="w-full max-w-md p-6 sm:p-8 border-border/60">
          <div className="flex flex-col gap-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-muted text-error">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Invitation Unavailable
              </h1>
              <p className="text-sm leading-relaxed text-muted">
                This invitation is invalid, has expired, or has already been accepted. Ask your workspace
                administrator for a new invitation.
              </p>
            </div>
            <Link
              href={session ? "/dashboard" : "/auth"}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary-hover"
            >
              {session ? "Go to Dashboard" : "Back to Sign In"}
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  // 2. Check authenticated session
  const session = await betterAuthProvider.getSession();

  // If user has no session, redirect to auth while preserving the token
  if (!session) {
    redirect(
      `/auth?callbackUrl=${encodeURIComponent(`/invitations/accept?token=${encodeURIComponent(token)}&autoAccept=true`)}&token=${encodeURIComponent(token)}&mode=register`,
    );
  }

  // 3. User is authenticated — verify email match (Flow C)
  const isEmailMatching = normalizeEmail(session.email) === normalizeEmail(summary.email);
  if (!isEmailMatching) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-6">
        <Card className="w-full max-w-md p-6 sm:p-8 border-border/60">
          <div className="flex flex-col gap-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-muted text-warning">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Different Account Detected
              </h1>
              <p className="text-sm leading-relaxed text-muted">
                This invitation was sent to <strong className="text-foreground font-semibold">{summary.email}</strong>,
                but you are currently signed in as <strong className="text-foreground font-semibold">{session.email}</strong>.
              </p>
            </div>
            <p className="text-xs text-muted">
              To accept this invitation, please sign out and sign in with the invited email address.
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <form action={signOutAndSwitchAction.bind(null, token)}>
                <Button type="submit" variant="primary" className="w-full">
                  Sign Out &amp; Switch Account
                </Button>
              </form>
              <Link
                href="/dashboard"
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </Card>
      </main>
    );
  }

  // 4. Check if already a member of this organization
  const invitationRow = await prismaAuthorizationRepository.findInvitationByToken(token);
  const existingMembership = invitationRow
    ? await prismaAuthorizationRepository.getMembership(session.userId, invitationRow.organizationId)
    : null;

  if (existingMembership) {
    if (invitationRow) {
      try {
        await betterAuthProvider.setActiveOrganization({ organizationId: invitationRow.organizationId });
      } catch {
        // Non-fatal
      }
    }

    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-6">
        <Card className="w-full max-w-md p-6 sm:p-8 border-border/60">
          <div className="flex flex-col gap-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-muted text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Already a Member
              </h1>
              <p className="text-sm leading-relaxed text-muted">
                You are already a member of <strong className="text-foreground font-semibold">{summary.organizationName}</strong> as <span className="font-semibold uppercase text-primary">{existingMembership.role}</span>.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary-hover"
            >
              Go to Dashboard
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  // 5. Automatic acceptance if autoAccept=true (Flow A / Flow B resumption)
  if (autoAccept === "true") {
    try {
      const result = await executeAcceptInvitation(
        { token },
        {
          getSession: () => betterAuthProvider.getSession(),
          authorizationRepository: prismaAuthorizationRepository,
          auditLog: auditLogger,
        },
      );
      try {
        await betterAuthProvider.setActiveOrganization({ organizationId: result.organizationId });
      } catch {
        // Non-fatal
      }
      redirect("/dashboard");
    } catch {
      // If error or throttle during auto-acceptance, proceed to manual acceptance card below
    }
  }

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.INTERNAL_ERROR) : null;

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-6">
      <Card className="w-full max-w-md p-6 sm:p-8 border-border/60">
        <div className="flex flex-col gap-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Building2 className="h-6 w-6" />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Join {summary.organizationName}
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              You have been invited to join <span className="font-semibold text-foreground">{summary.organizationName}</span> as <span className="font-semibold text-primary uppercase">{summary.role}</span>.
            </p>
            {summary.expiresAt && (
              <p className="text-xs text-muted/80 pt-1" suppressHydrationWarning>
                Invitation expires on {summary.expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.
              </p>
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="w-full rounded-lg border border-error/30 bg-error-muted p-2.5 text-xs leading-relaxed text-error text-left"
            >
              {errorMessage}
            </div>
          )}

          <form action={acceptInvitationAction.bind(null, token)}>
            <Button type="submit" variant="primary" className="w-full h-10">
              Accept Invitation &amp; Continue
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
};

export default AcceptInvitationPage;
