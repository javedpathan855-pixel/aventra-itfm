import { cache } from "react";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { executeListMyOrganizations } from "@/features/auth/application/use-cases/list-my-organizations.use-case";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";

const getCachedSession = cache(() => betterAuthProvider.getSession());

/**
 * Server-only composition loader for the dashboard boundary.
 * Uses React cache() to deduplicate session and authorization resolution
 * between layout.tsx and page.tsx within the same request lifecycle.
 */
export const getDashboardServerContext = cache(async () => {
  const deps = {
    getSession: getCachedSession,
    authorizationRepository: prismaAuthorizationRepository,
  };

  const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
  const { organizations } = await executeListMyOrganizations({ autoSelectDefault: true }, deps);

  return { context, organizations };
});
