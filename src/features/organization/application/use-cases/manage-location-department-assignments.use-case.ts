// Location–department assignment use cases (application layer).
//
// The many-to-many relationship is stored in a dedicated join table.
// Exactly one side (locationId XOR departmentId) anchors each sync call;
// both sides are always verified inside the caller's organization, so
// cross-tenant IDs and inactive counterparts are rejected before any
// write. Removing assignments never deletes locations or departments.

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import { assignmentSchema, assignmentSetSchema } from "../../domain/schemas/location.schema";
import type { OrganizationUseCasesDeps } from "./get-organization-profile.use-case";
import type { AuditLogPort } from "@/features/auth/repository/audit-log";
import { assertLocationsAssignable } from "./manage-organization-departments.use-case";

export interface AssignmentDeps extends OrganizationUseCasesDeps {
  auditLog?: AuditLogPort;
}

const requireActiveOrganization = (organizationId: string | null): string => {
  if (!organizationId) {
    throw new AppError("FORBIDDEN", { message: "No active organization selected." });
  }
  return organizationId;
};

const assertDepartmentsAssignable = async (
  deps: AssignmentDeps,
  organizationId: string,
  departmentIds: string[],
): Promise<void> => {
  const uniqueIds = [...new Set(departmentIds)];
  if (uniqueIds.length === 0) return;
  const details = await Promise.all(
    uniqueIds.map((departmentId) =>
      deps.organizationRepository.getDepartmentDetail(organizationId, departmentId),
    ),
  );
  const invalid = uniqueIds.filter((_, index) => {
    const detail = details[index];
    return !detail || !detail.isActive;
  });
  if (invalid.length > 0) {
    throw new AppError("VALIDATION_ERROR", {
      message: "Some selected departments are invalid or inactive.",
    });
  }
};

export const executeSyncLocationAssignments = async (
  rawInput: unknown,
  deps: AssignmentDeps,
): Promise<{ assigned: number; removed: number }> => {
  const parsed = assignmentSetSchema
    .extend({ locationId: z.string().trim().min(1, "Location ID is required") })
    .omit({ locationIds: true })
    .safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "location.assign");
    const organizationId = requireActiveOrganization(context.organizationId);

    const existing = await deps.organizationRepository.getLocationDetail(
      organizationId,
      parsed.data.locationId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", { message: "Location not found." });
    }

    await assertDepartmentsAssignable(deps, organizationId, parsed.data.departmentIds);

    const result = await deps.organizationRepository.syncAssignments(organizationId, {
      locationId: parsed.data.locationId,
      ids: parsed.data.departmentIds,
    });

    await deps.auditLog?.record({
      type: "LOCATION_DEPARTMENT_ASSIGNED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: parsed.data.locationId,
      result: "allowed",
      metadata: { assigned: String(result.assigned), removed: String(result.removed) },
    });

    return result;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeSyncDepartmentAssignments = async (
  rawInput: unknown,
  deps: AssignmentDeps,
): Promise<{ assigned: number; removed: number }> => {
  const parsed = assignmentSetSchema
    .extend({ departmentId: z.string().trim().min(1, "Department ID is required") })
    .omit({ departmentIds: true })
    .safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "department.assign");
    const organizationId = requireActiveOrganization(context.organizationId);

    const existing = await deps.organizationRepository.getDepartmentDetail(
      organizationId,
      parsed.data.departmentId,
    );
    if (!existing) {
      throw new AppError("NOT_FOUND", { message: "Department not found." });
    }

    await assertLocationsAssignable(deps, organizationId, parsed.data.locationIds);

    const result = await deps.organizationRepository.syncAssignments(organizationId, {
      departmentId: parsed.data.departmentId,
      ids: parsed.data.locationIds,
    });

    await deps.auditLog?.record({
      type: "LOCATION_DEPARTMENT_ASSIGNED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: parsed.data.departmentId,
      result: "allowed",
      metadata: { assigned: String(result.assigned), removed: String(result.removed) },
    });

    return result;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeRemoveAssignment = async (
  rawInput: unknown,
  deps: AssignmentDeps,
): Promise<{ removed: boolean }> => {
  const parsed = assignmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "location.assign");
    const organizationId = requireActiveOrganization(context.organizationId);

    const removed = await deps.organizationRepository.removeAssignment(
      organizationId,
      parsed.data,
    );

    await deps.auditLog?.record({
      type: "LOCATION_DEPARTMENT_UNASSIGNED",
      actorUserId: context.userId,
      organizationId,
      result: "allowed",
      metadata: {
        locationId: parsed.data.locationId,
        departmentId: parsed.data.departmentId,
      },
    });

    return { removed };
  } catch (error) {
    throw normalizeError(error);
  }
};
