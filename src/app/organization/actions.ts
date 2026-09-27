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
import { executeGetViewerRole } from "@/features/organization/application/use-cases/get-viewer-role.use-case";
import { executeUpdateOrganizationProfile } from "@/features/organization/application/use-cases/update-organization-profile.use-case";
import { executeUpdateOrganizationLegal } from "@/features/organization/application/use-cases/update-organization-legal.use-case";
import {
  executeCreateAddress,
  executeUpdateAddress,
  executeDeleteAddress,
  executeSetDefaultAddress,
} from "@/features/organization/application/use-cases/manage-organization-address.use-case";
import {
  executeCreateLocation,
  executeGetLocationDetail,
  executeListLocations,
  executeSetDefaultLocation,
  executeSetLocationActive,
  executeUpdateLocation,
} from "@/features/organization/application/use-cases/manage-organization-locations.use-case";
import {
  executeCreateDepartment,
  executeGetDepartmentDetail,
  executeListDepartments,
  executeSetDepartmentActive,
  executeUpdateDepartment,
} from "@/features/organization/application/use-cases/manage-organization-departments.use-case";
import {
  executeRemoveAssignment,
  executeSyncDepartmentAssignments,
  executeSyncLocationAssignments,
} from "@/features/organization/application/use-cases/manage-location-department-assignments.use-case";
import type {
  DepartmentDetail,
  DepartmentWithLocationCount,
  LocationDetail,
  LocationWithDepartmentCount,
  PaginatedResult,
} from "@/features/organization/domain/entities/location-department";
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

const revalidateLocationDepartmentPaths = () => {
  revalidatePath("/organization/locations");
  revalidatePath("/organization/departments");
  revalidatePath("/organization");
};

export const listLocationsAction = async (
  input: unknown,
): Promise<OrganizationActionResult<PaginatedResult<LocationWithDepartmentCount>>> => {
  try {
    const data = await executeListLocations(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const getLocationDetailAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ location: LocationDetail }>> => {
  try {
    const data = await executeGetLocationDetail(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const saveLocationAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ location: LocationDetail }>> => {
  try {
    const isUpdate = Boolean(
      input && typeof input === "object" && "locationId" in input && (input as Record<string, unknown>).locationId,
    );
    const data = isUpdate
      ? await executeUpdateLocation(input, getDeps())
      : await executeCreateLocation(input, getDeps());
    revalidateLocationDepartmentPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const setLocationActiveAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ location: LocationDetail }>> => {
  try {
    const data = await executeSetLocationActive(input, getDeps());
    revalidateLocationDepartmentPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const setDefaultLocationAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ location: LocationDetail }>> => {
  try {
    const data = await executeSetDefaultLocation(input, getDeps());
    revalidateLocationDepartmentPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const listDepartmentsAction = async (
  input: unknown,
): Promise<OrganizationActionResult<PaginatedResult<DepartmentWithLocationCount>>> => {
  try {
    const data = await executeListDepartments(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const getDepartmentDetailAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ department: DepartmentDetail }>> => {
  try {
    const data = await executeGetDepartmentDetail(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const saveDepartmentAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ department: DepartmentDetail }>> => {
  try {
    const isUpdate = Boolean(
      input && typeof input === "object" && "departmentId" in input && (input as Record<string, unknown>).departmentId,
    );
    const data = isUpdate
      ? await executeUpdateDepartment(input, getDeps())
      : await executeCreateDepartment(input, getDeps());
    revalidateLocationDepartmentPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const setDepartmentActiveAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ department: DepartmentDetail }>> => {
  try {
    const data = await executeSetDepartmentActive(input, getDeps());
    revalidateLocationDepartmentPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const syncLocationAssignmentsAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ assigned: number; removed: number }>> => {
  try {
    const data = await executeSyncLocationAssignments(input, getDeps());
    revalidateLocationDepartmentPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const syncDepartmentAssignmentsAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ assigned: number; removed: number }>> => {
  try {
    const data = await executeSyncDepartmentAssignments(input, getDeps());
    revalidateLocationDepartmentPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const removeAssignmentAction = async (
  input: unknown,
): Promise<OrganizationActionResult<{ removed: boolean }>> => {
  try {
    const data = await executeRemoveAssignment(input, getDeps());
    revalidateLocationDepartmentPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const getViewerRoleAction = async (): Promise<
  OrganizationActionResult<{ role: string }>
> => {
  try {
    const data = await executeGetViewerRole({}, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};
