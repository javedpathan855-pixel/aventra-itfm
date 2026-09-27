"use server";

import { revalidatePath } from "next/cache";
import { AppError, type AuthErrorCode } from "@/shared/error/app-error";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";
import { transactionalMailer } from "@/features/auth/infrastructure/email/mailer";
import { prismaOrganizationRepository } from "@/features/organization/infrastructure/prisma/prisma-organization-repository";
import { defaultLogoStorageService } from "@/features/organization/infrastructure/storage/logo-storage-service";
import { executeGetOrganizationProfile } from "@/features/organization/application/use-cases/get-organization-profile.use-case";
import { executeUpdateOrganizationProfile } from "@/features/organization/application/use-cases/update-organization-profile.use-case";
import { executeUpdateOrganizationLegal } from "@/features/organization/application/use-cases/update-organization-legal.use-case";
import {
  executeCreateAddress,
  executeUpdateAddress,
  executeDeleteAddress,
  executeSetDefaultAddress,
} from "@/features/organization/application/use-cases/manage-organization-address.use-case";
import { executeUpdateOrganizationSettings } from "@/features/organization/application/use-cases/update-organization-settings.use-case";
import {
  executeUploadOrganizationLogo,
  executeRemoveOrganizationLogo,
} from "@/features/organization/application/use-cases/manage-organization-logo.use-case";
import { executeListMembers } from "@/features/auth/application/use-cases/list-members.use-case";
import { executeInviteMember } from "@/features/auth/application/use-cases/invite-member.use-case";
import { executeUpdateMemberRole } from "@/features/auth/application/use-cases/update-member-role.use-case";
import { executeRemoveMember } from "@/features/auth/application/use-cases/remove-member.use-case";
import type {
  OrganizationAddressEntity,
  OrganizationProfileEntity,
  OrganizationSettingsEntity,
  ProfileCompletionResult,
} from "@/features/organization/domain/entities/organization-profile";

const getDeps = () => ({
  getSession: () => betterAuthProvider.getSession(),
  authorizationRepository: prismaAuthorizationRepository,
  organizationRepository: prismaOrganizationRepository,
  logoStorageService: defaultLogoStorageService,
  auditLog: auditLogger,
  mailer: transactionalMailer,
});

export type OrganizationActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AuthErrorCode; message: string };

const handleActionError = (error: unknown): { ok: false; code: AuthErrorCode; message: string } => {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }
  return {
    ok: false,
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "An unexpected error occurred.",
  };
};

export const getOrganizationProfileAction = async (): Promise<
  OrganizationActionResult<{
    profile: OrganizationProfileEntity;
    completion: ProfileCompletionResult;
    role: string;
  }>
> => {
  try {
    const data = await executeGetOrganizationProfile({ autoSelectDefault: true }, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const updateOrganizationGeneralAction = async (
  input: unknown,
): Promise<
  OrganizationActionResult<{
    profile: OrganizationProfileEntity;
    completion: ProfileCompletionResult;
  }>
> => {
  try {
    const data = await executeUpdateOrganizationProfile(input, getDeps());
    revalidatePath("/organization");
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const updateOrganizationLegalAction = async (
  input: unknown,
): Promise<
  OrganizationActionResult<{
    profile: OrganizationProfileEntity;
    completion: ProfileCompletionResult;
  }>
> => {
  try {
    const data = await executeUpdateOrganizationLegal(input, getDeps());
    revalidatePath("/organization");
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const saveOrganizationAddressAction = async (
  input: unknown,
): Promise<
  OrganizationActionResult<{
    address: OrganizationAddressEntity;
    addresses: OrganizationAddressEntity[];
  }>
> => {
  try {
    const isUpdate = Boolean(input && typeof input === "object" && "id" in input && (input as Record<string, unknown>).id);
    const data = isUpdate
      ? await executeUpdateAddress(input, getDeps())
      : await executeCreateAddress(input, getDeps());
    revalidatePath("/organization");
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const deleteOrganizationAddressAction = async (
  addressId: string,
): Promise<OrganizationActionResult<{ addresses: OrganizationAddressEntity[] }>> => {
  try {
    const data = await executeDeleteAddress({ addressId }, getDeps());
    revalidatePath("/organization");
    return { ok: true, data: { addresses: data.addresses } };
  } catch (error) {
    return handleActionError(error);
  }
};

export const setDefaultAddressAction = async (
  addressId: string,
): Promise<OrganizationActionResult<{ addresses: OrganizationAddressEntity[] }>> => {
  try {
    const data = await executeSetDefaultAddress({ addressId }, getDeps());
    revalidatePath("/organization");
    return { ok: true, data: { addresses: data.addresses } };
  } catch (error) {
    return handleActionError(error);
  }
};

export const updateOrganizationSettingsAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ settings: OrganizationSettingsEntity }>> => {
  try {
    const data = await executeUpdateOrganizationSettings(input, getDeps());
    revalidatePath("/organization");
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const uploadOrganizationLogoAction = async (
  dataUrl: string,
): Promise<
  OrganizationActionResult<{
    profile: OrganizationProfileEntity;
    completion: ProfileCompletionResult;
  }>
> => {
  try {
    const data = await executeUploadOrganizationLogo({ dataUrl }, getDeps());
    revalidatePath("/organization");
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const removeOrganizationLogoAction = async (): Promise<
  OrganizationActionResult<{
    profile: OrganizationProfileEntity;
    completion: ProfileCompletionResult;
  }>
> => {
  try {
    const data = await executeRemoveOrganizationLogo({}, getDeps());
    revalidatePath("/organization");
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const listOrganizationMembersAction = async () => {
  try {
    const data = await executeListMembers(undefined, getDeps());
    return { ok: true as const, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const inviteOrganizationMemberAction = async (input: unknown) => {
  try {
    const data = await executeInviteMember(input, getDeps());
    revalidatePath("/organization");
    return { ok: true as const, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const updateOrganizationMemberRoleAction = async (input: unknown) => {
  try {
    const data = await executeUpdateMemberRole(input, getDeps());
    revalidatePath("/organization");
    return { ok: true as const, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const removeOrganizationMemberAction = async (input: unknown) => {
  try {
    const data = await executeRemoveMember(input, getDeps());
    revalidatePath("/organization");
    return { ok: true as const, data };
  } catch (error) {
    return handleActionError(error);
  }
};
