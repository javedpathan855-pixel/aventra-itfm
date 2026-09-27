import { NextResponse, type NextRequest } from "next/server";

import { AppError, toErrorEnvelope, toSuccessEnvelope } from "@/shared/error/app-error";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { recordAuthorizationDenial } from "@/features/auth/infrastructure/audit/audit-logger";
import { executeCancelInvitation } from "@/features/auth/application/use-cases/cancel-invitation.use-case";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";
import { enforceMemberApiLimit } from "../../throttle";

export const dynamic = "force-dynamic";

const deps = {
  getSession: () => betterAuthProvider.getSession(),
  authorizationRepository: prismaAuthorizationRepository,
  auditLog: auditLogger,
};

interface RouteContext {
  params: Promise<{ invitationId: string }>;
}

/** Cancel a pending invitation in the caller's active organization. */
const DELETE = async (_request: NextRequest, context: RouteContext) => {
  try {
    const session = await betterAuthProvider.getSession();
    if (!session) {
      throw new AppError("UNAUTHENTICATED");
    }
    const limited = await enforceMemberApiLimit("cancelInvitation", session.userId);
    if (limited) return limited;
    const { invitationId } = await context.params;
    const result = await executeCancelInvitation({ invitationId }, deps);
    const envelope = toSuccessEnvelope(result);
    return NextResponse.json(envelope, { status: 200 });
  } catch (error) {
    const envelope = toErrorEnvelope(error);
    if (envelope.body.error.code === "FORBIDDEN" || envelope.body.error.code === "UNAUTHENTICATED") {
      await recordAuthorizationDenial({ route: "DELETE /api/organization/invitations/[invitationId]", code: envelope.body.error.code });
    }
    return NextResponse.json(envelope.body, { status: envelope.status });
  }
};

export { DELETE };
