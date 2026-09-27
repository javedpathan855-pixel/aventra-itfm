import { NextResponse, type NextRequest } from "next/server";

import { AppError, toErrorEnvelope, toSuccessEnvelope } from "@/shared/error/app-error";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { recordAuthorizationDenial } from "@/features/auth/infrastructure/audit/audit-logger";
import { executeListMembers } from "@/features/auth/application/use-cases/list-members.use-case";
import { executeInviteMember } from "@/features/auth/application/use-cases/invite-member.use-case";
import { transactionalMailer } from "@/features/auth/infrastructure/email/mailer";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";
import { enforceMemberApiLimit } from "../throttle";

export const dynamic = "force-dynamic";

const baseDeps = {
  getSession: () => betterAuthProvider.getSession(),
  authorizationRepository: prismaAuthorizationRepository,
};

const inviteDeps = {
  ...baseDeps,
  mailer: transactionalMailer,
  auditLog: auditLogger,
};

const deny = async (route: string, error: unknown) => {
  const envelope = toErrorEnvelope(error);
  if (envelope.body.error.code === "FORBIDDEN" || envelope.body.error.code === "UNAUTHENTICATED") {
    await recordAuthorizationDenial({ route, code: envelope.body.error.code });
  }
  return NextResponse.json(envelope.body, { status: envelope.status });
};

/** List members of the caller's active organization. */
const GET = async () => {
  try {
    const result = await executeListMembers(undefined, baseDeps);
    const envelope = toSuccessEnvelope(result);
    return NextResponse.json(envelope, { status: 200 });
  } catch (error) {
    return deny("GET /api/organization/members", error);
  }
};

/** Invite a member to the caller's active organization. */
const POST = async (request: NextRequest) => {
  try {
    const session = await betterAuthProvider.getSession();
    if (!session) {
      throw new AppError("UNAUTHENTICATED");
    }
    const limited = await enforceMemberApiLimit("inviteMember", session.userId);
    if (limited) return limited;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("VALIDATION_ERROR");
    }
    const result = await executeInviteMember(body, inviteDeps);
    const envelope = toSuccessEnvelope(result);
    return NextResponse.json(envelope, { status: 201 });
  } catch (error) {
    return deny("POST /api/organization/members", error);
  }
};

export { GET, POST };
