import { getEnv } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const buildClient = (): PrismaClient => {
  const adapter = new PrismaPg({ connectionString: getEnv().DATABASE_URL });
  return new PrismaClient({ adapter });
};

const getPrisma = (): PrismaClient => {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = buildClient();
  }
  return globalForPrisma.prisma;
};

/** Test seam: drop the cached client between tests. */
const resetPrismaCache = () => {
  globalForPrisma.prisma = undefined;
};

export { getPrisma, resetPrismaCache };
