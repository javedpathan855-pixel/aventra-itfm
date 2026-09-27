"use server";

// Organization switching adapter (composition boundary).
//
// Wires the switch-organization use case to its adapters. Returns
// serializable results only with application-level codes.

import { revalidatePath } from "next/cache";

import { AppError, type AuthErrorCode } from "@/shared/error/app-error";
import { executeSwitchOrganization } from "@/features/auth/application/use-cases/switch-organization.use-case";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";

type SwitchOrganizationActionResult =
  | { ok: true; organizationId: string; name: string; slug: string }
  | { ok: false; code: AuthErrorCode };

const switchOrganizationAction = async (
  input: unknown,
): Promise<SwitchOrganizationActionResult> => {
  try {
    const result = await executeSwitchOrganization(input, {
      getSession: () => betterAuthProvider.getSession(),
      authorizationRepository: prismaAuthorizationRepository,
      authProvider: betterAuthProvider,
    });
    revalidatePath("/dashboard");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code };
    }
    return { ok: false, code: "INTERNAL_ERROR" };
  }
};

/**
 * Form-action variant for progressive-enhancement switch buttons. React
 * form actions must resolve void, so failures stay silent in the UI (the
 * page revalidates unchanged); programmatic callers should use
 * switchOrganizationAction and branch on its result instead.
 */
const switchOrganizationFormAction = async (input: unknown): Promise<void> => {
  await switchOrganizationAction(input);
};

export { switchOrganizationAction, switchOrganizationFormAction };
export type { SwitchOrganizationActionResult };
