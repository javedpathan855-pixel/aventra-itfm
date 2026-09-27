// SUPERADMIN bootstrap (server-side only — never client, never an endpoint).
//
// Usage: npm run bootstrap:superadmin -- --email=admin@company.com
//
// Sets User.platformRole = "SUPERADMIN" for one existing user. Refuses
// unknown emails (never creates users) and is idempotent. Platform role
// is never inferred from email/domain and can never be granted through
// organization/member APIs — this script (direct database access with
// DATABASE_URL) is the only grant path.

// tsx does not load .env by itself (Next.js and the Prisma CLI do that in
// their own runtimes), so load it here like prisma7.config.ts does.
import "dotenv/config";

import { getPrisma } from "@/shared/infrastructure/prisma";
import { normalizeEmail } from "@/features/auth/domain/services/auth-helpers";
import { SUPERADMIN } from "@/features/auth/domain/authorization/roles";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";

const readEmailArg = (): string => {
  const flag = process.argv.find((arg) => arg.startsWith("--email="));
  const email = flag ? flag.slice("--email=".length) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Usage: npm run bootstrap:superadmin -- --email=admin@company.com");
    process.exit(2);
  }
  return normalizeEmail(email);
};

const main = async (): Promise<void> => {
  const email = readEmailArg();
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, platformRole: true },
  });
  if (!user) {
    console.error("No user found for that email. Create the account first; this script never creates users.");
    process.exit(1);
  }
  if (user.platformRole === SUPERADMIN) {
    console.log("Already a platform administrator.");
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { platformRole: SUPERADMIN } });
  await auditLogger.record({
    type: "SUPERADMIN_BOOTSTRAP",
    actorUserId: null,
    organizationId: null,
    targetUserId: user.id,
    result: "allowed",
  });
  console.log("Platform administrator granted.");
};

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error("Bootstrap failed:", error instanceof Error ? error.message : "unknown error");
    process.exit(1);
  },
);
