import { NextResponse } from "next/server";

import { AppError, toErrorEnvelope } from "@/shared/error/app-error";
import { MEMBER_API_RATE_LIMITS, type MemberApiAction } from "@/features/auth/domain/constants/auth-constants";
import { createRateLimiter } from "@/shared/infrastructure/rate-limit/rate-limiter";

/**
 * Enforce the member/invitation API abuse budget for an authenticated
 * user. Returns null when allowed, otherwise a 429 envelope response with
 * a Retry-After hint. Callers pass the verified session user id.
 */
const enforceMemberApiLimit = async (
  action: MemberApiAction,
  userId: string,
): Promise<NextResponse | null> => {
  const rule = MEMBER_API_RATE_LIMITS[action];
  const result = await createRateLimiter().check({
    key: `member-api:${action}:${userId}`,
    rule: { maxHits: rule.maxHits, windowSeconds: rule.windowSeconds },
  });
  if (result.allowed) return null;
  const envelope = toErrorEnvelope(new AppError("RATE_LIMITED"));
  return NextResponse.json(envelope.body, {
    status: envelope.status,
    headers: { "Retry-After": String(result.retryAfterSeconds) },
  });
};

export { enforceMemberApiLimit };
