import { NextResponse, type NextRequest } from "next/server";

import { AppError, toErrorEnvelope, toSuccessEnvelope } from "@/shared/error/app-error";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { recordAuthorizationDenial } from "@/features/auth/infrastructure/audit/audit-logger";
import { executeUpdateMemberRole } from "@/features/auth/application/use-cases/update-member-role.use-case";
import { executeRemoveMember } from "@/features/auth/application/use-cases/remove-member.use-case";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";
import { enforceMemberApiLimit } from "../../throttle";

export const dynamic = "force-dynamic";

const deps = {
  getSession: () => betterAuthProvider.getSession(),
  authorizationRepository: prismaAuthorizationRepository,
  auditLog: auditLogger,
};

interface RouteContext {
  params: Promise<{ memberId: string }>;
}

const deny = async (route: string, error: unknown) => {
  const envelope = toErrorEnvelope(error);
  if (envelope.body.error.code === "FORBIDDEN" || envelope.body.error.code === "UNAUTHENTICATED") {
    await recordAuthorizationDenial({ route, code: envelope.body.error.code });
  }
  return NextResponse.json(envelope.body, { status: envelope.status });
};

const throttle = async (action: "updateMemberRole" | "removeMember") => {
  const session = await betterAuthProvider.getSession();
  if (!session) {
    throw new AppError("UNAUTHENTICATED");
  }
  return enforceMemberApiLimit(action, session.userId);
};

/** Change a member's role inside the caller's active organization. */
const PATCH = async (request: NextRequest, context: RouteContext) => {
  try {
    const limited = await throttle("updateMemberRole");
    if (limited) return limited;
    const { memberId } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("VALIDATION_ERROR");
    }
    const record = body as Record<string, unknown>;
    const result = await executeUpdateMemberRole(
      { memberId, role: record.role },
      deps,
    );
    const envelope = toSuccessEnvelope(result);
    return NextResponse.json(envelope, { status: 200 });
  } catch (error) {
    return deny("PATCH /api/organization/members/[memberId]", error);
  }
};

/** Remove a member from the caller's active organization. */
const DELETE = async (_request: NextRequest, context: RouteContext) => {
  try {
    const limited = await throttle("removeMember");
    if (limited) return limited;
    const { memberId } = await context.params;
    const result = await executeRemoveMember({ memberId }, deps);
    const envelope = toSuccessEnvelope(result);
    return NextResponse.json(envelope, { status: 200 });
  } catch (error) {
    return deny("DELETE /api/organization/members/[memberId]", error);
  }
};

export { PATCH, DELETE };
