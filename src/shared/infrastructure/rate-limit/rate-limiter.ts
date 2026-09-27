// Atomic sliding-window rate limiter (shared server infrastructure).
//
// Unlike naive count-then-insert limiters, the check-and-record step runs
// inside one transaction behind a PostgreSQL advisory lock on the key, so
// concurrent requests cannot all pass a stale read. Fail-closed: when the
// limiter cannot determine state (storage error), it denies —
// security-sensitive mutations must not proceed on unknown budgets.
// Keys are built by callers from verified server context (session user,
// tenant id) — never raw client input.

import { getPrisma } from "@/shared/infrastructure/prisma";

interface RateLimitRule {
  maxHits: number;
  windowSeconds: number;
}

interface RateLimitStore {
  consume(input: {
    key: string;
    rule: RateLimitRule;
    now: Date;
  }): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** PostgreSQL-backed atomic store (advisory lock + count + insert + prune). */
const createPostgresRateLimitStore = (): RateLimitStore => ({
  consume: async ({ key, rule, now }) => {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      const windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);
      const hits = await tx.rateLimitHit.count({
        where: { key, createdAt: { gte: windowStart } },
      });
      if (hits >= rule.maxHits) {
        const oldest = await tx.rateLimitHit.findFirst({
          where: { key, createdAt: { gte: windowStart } },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        });
        const retryAfterSeconds = oldest
          ? Math.max(1, Math.ceil((oldest.createdAt.getTime() + rule.windowSeconds * 1000 - now.getTime()) / 1000))
          : rule.windowSeconds;
        return { allowed: false, retryAfterSeconds };
      }
      await tx.rateLimitHit.create({ data: { key, createdAt: now } });
      await tx.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: windowStart } } });
      return { allowed: true, retryAfterSeconds: 0 };
    });
  },
});

interface RateLimiter {
  check(input: { key: string; rule: RateLimitRule; now?: Date }): Promise<RateLimitResult>;
}

const createRateLimiter = (store?: RateLimitStore): RateLimiter => {
  const active = store ?? createPostgresRateLimitStore();
  return {
    check: async ({ key, rule, now }) => {
      try {
        return await active.consume({ key, rule, now: now ?? new Date() });
      } catch {
        return { allowed: false, retryAfterSeconds: rule.windowSeconds };
      }
    },
  };
};

export { createRateLimiter, createPostgresRateLimitStore };
export type { RateLimiter, RateLimitRule, RateLimitResult, RateLimitStore };
