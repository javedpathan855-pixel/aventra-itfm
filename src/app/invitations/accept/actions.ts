"use server";

// Invitation acceptance adapter (composition boundary).
//
// Wires the accept-invitation use case to its adapters. Throttles by
// verified session identity before invoking the use case, then redirects:
// success → dashboard, failure → back to the accept page with a safe
// error code (never messages, tokens, or provider details).

import { redirect } from "next/navigation";

import { AppError, type AuthErrorCode } from "@/shared/error/app-error";
import { executeAcceptInvitation } from "@/features/auth/application/use-cases/accept-invitation.use-case";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";
import { enforceMemberApiLimit } from "@/app/api/organization/throttle";

const back = (token: string, code: AuthErrorCode): never =>
  redirect(`/invitations/accept?token=${encodeURIComponent(token)}&error=${code}`);

const acceptInvitationAction = async (token: unknown): Promise<never> => {
  const rawToken = typeof token === "string" ? token : "";
  const session = await betterAuthProvider.getSession();
  if (!session) {
    redirect(`/auth?callbackUrl=${encodeURIComponent(`/invitations/accept?token=${encodeURIComponent(rawToken)}`)}`);
  }
  const limited = await enforceMemberApiLimit("acceptInvitation", session.userId);
  if (limited) {
    back(rawToken, "RATE_LIMITED");
  }
  let organizationId: string | null = null;
  try {
    const result = await executeAcceptInvitation(
      { token: rawToken },
      {
        getSession: () => betterAuthProvider.getSession(),
        authorizationRepository: prismaAuthorizationRepository,
        auditLog: auditLogger,
      },
    );
    organizationId = result.organizationId;
  } catch (error) {
    back(rawToken, error instanceof AppError ? error.code : "INTERNAL_ERROR");
  }

  if (organizationId) {
    try {
      await betterAuthProvider.setActiveOrganization({ organizationId });
    } catch {
      // Non-fatal if setting active organization fails; dashboard resolver will select it
    }
  }

  redirect("/dashboard");
};

const signOutAndSwitchAction = async (token: unknown): Promise<never> => {
  const rawToken = typeof token === "string" ? token : "";
  await betterAuthProvider.signOut();
  redirect(
    `/auth?callbackUrl=${encodeURIComponent(`/invitations/accept?token=${encodeURIComponent(rawToken)}&autoAccept=true`)}&token=${encodeURIComponent(rawToken)}`,
  );
};

export { acceptInvitationAction, signOutAndSwitchAction };
