// Organization department management use cases (application layer).

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import { departmentSchema, departmentListQuerySchema } from "../../domain/schemas/location.schema";
import type {
  DepartmentDetail,
  DepartmentWithLocationCount,
  PaginatedResult,
} from "../../domain/entities/location-department";
import type { OrganizationUseCasesDeps } from "./get-organization-profile.use-case";
import type { AuditLogPort } from "@/features/auth/repository/audit-log";

export interface DepartmentDeps extends OrganizationUseCasesDeps {
  auditLog?: AuditLogPort;
}

export interface DepartmentDeps extends OrganizationUseCasesDeps {
  auditLog?: AuditLogPort;
}

const departmentIdParamSchema = z.object({
  departmentId: z.string().trim().min(1, "Department ID is required"),
});

const setActiveSchema = z.object({
  departmentId: z.string().trim().min(1, "Department ID is required"),
  isActive: z.boolean(),
});

const requireActiveOrganization = (organizationId: string | null): string => {
  if (!organizationId) {
    throw new AppError("FORBIDDEN", { message: "No active organization selected." });
  }
  return organizationId;
};

export const executeListDepartments = async (
  rawInput: unknown,
  deps: DepartmentDeps,
): Promise<PaginatedResult<DepartmentWithLocationCount>> => {
  const parsed = departmentListQuerySchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "department.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    return await deps.organizationRepository.listDepartments(organizationId, {
      search: parsed.data.search,
      status: parsed.data.status,
      sortBy: parsed.data.sortBy,
      sortDirection: parsed.data.sortDirection,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeGetDepartmentDetail = async (
  rawInput: unknown,
  deps: DepartmentDeps,
): Promise<{ department: DepartmentDetail }> => {
  const parsed = departmentIdParamSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "department.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    const department = await deps.organizationRepository.getDepartmentDetail(
      organizationId,
      parsed.data.departmentId,
    );
    if (!department) {
      throw new AppError("NOT_FOUND", { message: "Department not found." });
    }
    return { department };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeCreateDepartment = async (
  rawInput: unknown,
  deps: DepartmentDeps,
): Promise<{ department: DepartmentDetail }> => {
  const parsed = departmentSchema
    .extend({ locationIds: z.array(z.string().trim().min(1)).max(200).optional().default([]) })
    .safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  const { locationIds, ...input } = parsed.data;

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "department.create");
    const organizationId = requireActiveOrganization(context.organizationId);

    if (locationIds.length > 0) {
      requirePermission(context, "department.assign");
      await assertLocationsAssignable(deps, organizationId, locationIds);
    }

    const department = await deps.organizationRepository.createDepartment(
      organizationId,
      input,
      locationIds,
    );

    await deps.auditLog?.record({
      type: "DEPARTMENT_CREATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: department.id,
      result: "allowed",
      metadata: { code: department.code, name: department.name },
    });

    return { department };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeUpdateDepartment = async (
  rawInput: unknown,
  deps: DepartmentDeps,
): Promise<{ department: DepartmentDetail }> => {
  const parsed = departmentSchema
    .extend({
      departmentId: z.string().trim().min(1, "Department ID is required"),
      locationIds: z.array(z.string().trim().min(1)).max(200).optional(),
    })
    .safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  const { departmentId, locationIds, ...input } = parsed.data;

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "department.update");
    const organizationId = requireActiveOrganization(context.organizationId);

    if (locationIds !== undefined) {
      requirePermission(context, "department.assign");
      await assertLocationsAssignable(deps, organizationId, locationIds);
    }

    const department =
      locationIds === undefined
        ? await deps.organizationRepository.updateDepartment(organizationId, departmentId, input)
        : await deps.organizationRepository.updateDepartmentWithAssignments(
            organizationId,
            departmentId,
            input,
            locationIds,
          );

    await deps.auditLog?.record({
      type: "DEPARTMENT_UPDATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: department.id,
      result: "allowed",
      metadata: { code: department.code },
    });

    return { department };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeSetDepartmentActive = async (
  rawInput: unknown,
  deps: DepartmentDeps,
): Promise<{ department: DepartmentDetail }> => {
  const parsed = setActiveSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "department.update");
    const organizationId = requireActiveOrganization(context.organizationId);
    const department = await deps.organizationRepository.setDepartmentActive(
      organizationId,
      parsed.data.departmentId,
      parsed.data.isActive,
    );

    await deps.auditLog?.record({
      type: parsed.data.isActive ? "DEPARTMENT_ACTIVATED" : "DEPARTMENT_DEACTIVATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: department.id,
      result: "allowed",
      metadata: { code: department.code },
    });

    return { department };
  } catch (error) {
    throw normalizeError(error);
  }
};

/**
 * Verify every requested location exists in the organization and is
 * active. New assignments require active counterparts; existing
 * assignments survive deactivation untouched.
 */
export const assertLocationsAssignable = async (
  deps: DepartmentDeps,
  organizationId: string,
  locationIds: string[],
): Promise<void> => {
  const uniqueIds = [...new Set(locationIds)];
  if (uniqueIds.length === 0) return;
  const details = await Promise.all(
    uniqueIds.map((locationId) =>
      deps.organizationRepository.getLocationDetail(organizationId, locationId),
    ),
  );
  const invalid = uniqueIds.filter((_, index) => {
    const detail = details[index];
    return !detail || !detail.isActive;
  });
  if (invalid.length > 0) {
    throw new AppError("VALIDATION_ERROR", {
      message: "Some selected locations are invalid or inactive.",
    });
  }
};
