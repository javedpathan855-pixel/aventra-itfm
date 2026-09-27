import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createRateLimiter,
  type RateLimitStore,
} from "../../../shared/infrastructure/rate-limit/rate-limiter";
import { MEMBER_API_RATE_LIMITS } from "../domain/constants/auth-constants";
import { auditLogger } from "../infrastructure/audit/audit-logger";
import type { AuditEvent } from "../repository/audit-log";

/** In-memory store mirroring the atomic consume contract. */
const createMemoryStore = (): RateLimitStore & { hits: Map<string, Date[]> } => {
  const hits = new Map<string, Date[]>();
  return {
    hits,
    consume: async ({ key, rule, now }) => {
      const windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);
      const recent = (hits.get(key) ?? []).filter((at) => at >= windowStart);
      if (recent.length >= rule.maxHits) {
        const oldest = recent.sort((a, b) => a.getTime() - b.getTime())[0];
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((oldest.getTime() + rule.windowSeconds * 1000 - now.getTime()) / 1000),
          ),
        };
      }
      hits.set(key, [...recent, now]);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
};

describe("Rate limiter", () => {
  it("allows within budget and denies past it with retry guidance", async () => {
    const store = createMemoryStore();
    const limiter = createRateLimiter(store);
    const rule = { maxHits: 2, windowSeconds: 60 };
    const now = new Date("2026-01-01T00:00:00.000Z");
    assert.equal((await limiter.check({ key: "k", rule, now })).allowed, true);
    assert.equal(
      (await limiter.check({ key: "k", rule, now: new Date(now.getTime() + 1000) })).allowed,
      true,
    );
    const denied = await limiter.check({ key: "k", rule, now: new Date(now.getTime() + 2000) });
    assert.equal(denied.allowed, false);
    assert.ok(denied.retryAfterSeconds > 0);
  });

  it("scopes budgets per key (tenant/user isolation of budgets)", async () => {
    const limiter = createRateLimiter(createMemoryStore());
    const rule = { maxHits: 1, windowSeconds: 60 };
    const now = new Date();
    assert.equal((await limiter.check({ key: "user-a", rule, now })).allowed, true);
    assert.equal((await limiter.check({ key: "user-a", rule, now })).allowed, false);
    assert.equal((await limiter.check({ key: "user-b", rule, now })).allowed, true);
  });

  it("fails closed when storage is unavailable", async () => {
    const failing: RateLimitStore = {
      consume: async () => {
        throw new Error("connection refused");
      },
    };
    const limiter = createRateLimiter(failing);
    const denied = await limiter.check({ key: "k", rule: { maxHits: 100, windowSeconds: 60 }, now: new Date() });
    assert.equal(denied.allowed, false);
    assert.ok(denied.retryAfterSeconds > 0);
  });

  it("defines conservative hourly budgets for member APIs", () => {
    assert.deepEqual(MEMBER_API_RATE_LIMITS.inviteMember, { maxHits: 20, windowSeconds: 3600 });
    assert.deepEqual(MEMBER_API_RATE_LIMITS.removeMember, { maxHits: 20, windowSeconds: 3600 });
    assert.deepEqual(MEMBER_API_RATE_LIMITS.updateMemberRole, { maxHits: 30, windowSeconds: 3600 });
    assert.deepEqual(MEMBER_API_RATE_LIMITS.acceptInvitation, { maxHits: 30, windowSeconds: 3600 });
    assert.deepEqual(MEMBER_API_RATE_LIMITS.cancelInvitation, { maxHits: 30, windowSeconds: 3600 });
  });
});

describe("Audit logger", () => {
  it("records structured events without sensitive payloads", async () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (line: string) => {
      lines.push(line);
    };
    try {
      await auditLogger.record({
        type: "MEMBER_ROLE_CHANGED",
        actorUserId: "actor-1",
        organizationId: "org-1",
        targetUserId: "target-1",
        targetResourceId: "m-1",
        result: "allowed",
        metadata: { fromRole: "ADMIN", toRole: "ENGINEER" },
      });
    } finally {
      console.log = original;
    }
    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0]) as AuditEvent & { source: string };
    assert.equal(parsed.source, "authz-audit");
    assert.equal(parsed.type, "MEMBER_ROLE_CHANGED");
    assert.ok(typeof parsed.timestamp === "string");
    const serialized = JSON.stringify(parsed).toLowerCase();
    for (const secret of ["password", "token", "secret", "otp", "cookie"]) {
      assert.equal(serialized.includes(secret), false);
    }
  });

  it("never throws, even on unserializable input", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await auditLogger.record({
      type: "AUTHORIZATION_DENIED",
      actorUserId: null,
      organizationId: null,
      result: "denied",
      metadata: { route: "x", extra: circular as unknown as string },
    });
  });
});
