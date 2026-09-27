// Organization location management use cases (application layer).

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import { locationSchema, locationListQuerySchema } from "../../domain/schemas/location.schema";
import type {
  LocationDetail,
  LocationWithDepartmentCount,
  PaginatedResult,
} from "../../domain/entities/location-department";
import type { OrganizationUseCasesDeps } from "./get-organization-profile.use-case";
import type { AuditLogPort } from "@/features/auth/repository/audit-log";

export interface LocationDeps extends OrganizationUseCasesDeps {
  auditLog?: AuditLogPort;
}

const locationIdParamSchema = z.object({
  locationId: z.string().trim().min(1, "Location ID is required"),
});

const setActiveSchema = z.object({
  locationId: z.string().trim().min(1, "Location ID is required"),
  isActive: z.boolean(),
});

const requireActiveOrganization = (organizationId: string | null): string => {
  if (!organizationId) {
    throw new AppError("FORBIDDEN", { message: "No active organization selected." });
  }
  return organizationId;
};

export const executeListLocations = async (
  rawInput: unknown,
  deps: LocationDeps,
): Promise<PaginatedResult<LocationWithDepartmentCount>> => {
  const parsed = locationListQuerySchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "location.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    return await deps.organizationRepository.listLocations(organizationId, {
      search: parsed.data.search,
      status: parsed.data.status,
      defaultOnly: parsed.data.defaultOnly,
      sortBy: parsed.data.sortBy,
      sortDirection: parsed.data.sortDirection,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeGetLocationDetail = async (
  rawInput: unknown,
  deps: LocationDeps,
): Promise<{ location: LocationDetail }> => {
  const parsed = locationIdParamSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "location.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    const location = await deps.organizationRepository.getLocationDetail(
      organizationId,
      parsed.data.locationId,
    );
    if (!location) {
      throw new AppError("NOT_FOUND", { message: "Location not found." });
    }
    return { location };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeCreateLocation = async (
  rawInput: unknown,
  deps: LocationDeps,
): Promise<{ location: LocationDetail }> => {
  const parsed = locationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "location.create");
    const organizationId = requireActiveOrganization(context.organizationId);
    const location = await deps.organizationRepository.createLocation(organizationId, parsed.data);

    await deps.auditLog?.record({
      type: "LOCATION_CREATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: location.id,
      result: "allowed",
      metadata: { code: location.code, name: location.name },
    });

    return { location };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeUpdateLocation = async (
  rawInput: unknown,
  deps: LocationDeps,
): Promise<{ location: LocationDetail }> => {
  const parsed = locationSchema
    .extend({ locationId: z.string().trim().min(1, "Location ID is required") })
    .safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  const { locationId, ...input } = parsed.data;

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "location.update");
    const organizationId = requireActiveOrganization(context.organizationId);
    const location = await deps.organizationRepository.updateLocation(
      organizationId,
      locationId,
      input,
    );

    await deps.auditLog?.record({
      type: "LOCATION_UPDATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: location.id,
      result: "allowed",
      metadata: { code: location.code },
    });

    return { location };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeSetLocationActive = async (
  rawInput: unknown,
  deps: LocationDeps,
): Promise<{ location: LocationDetail }> => {
  const parsed = setActiveSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "location.update");
    const organizationId = requireActiveOrganization(context.organizationId);
    const location = await deps.organizationRepository.setLocationActive(
      organizationId,
      parsed.data.locationId,
      parsed.data.isActive,
    );

    await deps.auditLog?.record({
      type: parsed.data.isActive ? "LOCATION_ACTIVATED" : "LOCATION_DEACTIVATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: location.id,
      result: "allowed",
      metadata: { code: location.code },
    });

    return { location };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeSetDefaultLocation = async (
  rawInput: unknown,
  deps: LocationDeps,
): Promise<{ location: LocationDetail }> => {
  const parsed = locationIdParamSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "location.update");
    const organizationId = requireActiveOrganization(context.organizationId);

    const current = await deps.organizationRepository.getLocationDetail(
      organizationId,
      parsed.data.locationId,
    );
    if (!current) {
      throw new AppError("NOT_FOUND", { message: "Location not found." });
    }
    if (!current.isActive) {
      throw new AppError("VALIDATION_ERROR", {
        message: "Only an active location can be set as default.",
      });
    }

    const location = await deps.organizationRepository.setDefaultLocation(
      organizationId,
      parsed.data.locationId,
    );

    await deps.auditLog?.record({
      type: "LOCATION_DEFAULT_CHANGED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: location.id,
      result: "allowed",
      metadata: { code: location.code },
    });

    return { location };
  } catch (error) {
    throw normalizeError(error);
  }
};
