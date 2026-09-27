import { NextResponse, type NextRequest } from "next/server";

import { AppError, toErrorEnvelope, toSuccessEnvelope } from "@/shared/error/app-error";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { recordAuthorizationDenial } from "@/features/auth/infrastructure/audit/audit-logger";
import { executeAcceptInvitation } from "@/features/auth/application/use-cases/accept-invitation.use-case";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";
import { enforceMemberApiLimit } from "../../throttle";

export const dynamic = "force-dynamic";

const deps = {
  getSession: () => betterAuthProvider.getSession(),
  authorizationRepository: prismaAuthorizationRepository,
  auditLog: auditLogger,
};

/** Accept an organization invitation with its single-use token. */
const POST = async (request: NextRequest) => {
  try {
    const session = await betterAuthProvider.getSession();
    if (!session) {
      throw new AppError("UNAUTHENTICATED");
    }
    const limited = await enforceMemberApiLimit("acceptInvitation", session.userId);
    if (limited) return limited;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("VALIDATION_ERROR");
    }
    const result = await executeAcceptInvitation(body, deps);
    const envelope = toSuccessEnvelope(result);
    return NextResponse.json(envelope, { status: 200 });
  } catch (error) {
    const envelope = toErrorEnvelope(error);
    if (envelope.body.error.code === "FORBIDDEN" || envelope.body.error.code === "UNAUTHENTICATED") {
      await recordAuthorizationDenial({ route: "POST /api/organization/invitations/accept", code: envelope.body.error.code });
    }
    return NextResponse.json(envelope.body, { status: envelope.status });
  }
};

export { POST };
