// Asset assignment and return use cases (application layer).
//
// Membership snapshots (name/email) are resolved from the verified
// organization roster here, so history stays rename-proof without the
// client supplying identity claims.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import {
  assignAssetSchema,
  assignmentHistoryQuerySchema,
  returnAssetSchema,
} from "../../domain/schemas/asset.schema";
import type { AssetUseCasesDeps } from "./asset-deps";

const requireActiveOrganization = (organizationId: string | null): string => {
  if (!organizationId) {
    throw new AppError("FORBIDDEN", { message: "No active organization selected." });
  }
  return organizationId;
};

const toUtcDate = (value: string): Date => new Date(`${value}T00:00:00Z`);

export const executeAssignAsset = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = assignAssetSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.assign");
    const organizationId = requireActiveOrganization(context.organizationId);
    const roster = await deps.authorizationRepository.listMembersOfOrganization(organizationId);
    const member = roster.find((row) => row.id === parsed.data.membershipId);
    if (!member) {
      throw new AppError("NOT_FOUND", { message: "Employee membership not found in this organization." });
    }
    const asset = await deps.assetRepository.assignAsset(organizationId, parsed.data.assetId, {
      membershipId: member.id,
      assigneeUserId: member.userId,
      assigneeName: member.name,
      assigneeEmail: member.email,
      locationId: parsed.data.locationId,
      departmentId: parsed.data.departmentId,
      assignedAt: parsed.data.assignedAt ? toUtcDate(parsed.data.assignedAt) : new Date(),
      expectedReturnAt: parsed.data.expectedReturnAt ? toUtcDate(parsed.data.expectedReturnAt) : null,
      condition: parsed.data.condition,
      notes: parsed.data.notes,
      createdBy: context.userId,
    });
    await deps.assetRepository.recordHistory(organizationId, {
      assetId: asset.id,
      eventType: "ASSET_ASSIGNED",
      actorUserId: context.userId,
      summary: `Asset ${asset.assetTag} assigned to ${member.name}.`,
      metadata: { assetTag: asset.assetTag, assignee: member.name },
    });
    await deps.auditLog?.record({
      type: "ASSET_ASSIGNED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: asset.id,
      result: "allowed",
    });
    return { asset };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeReturnAsset = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = returnAssetSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.return");
    const organizationId = requireActiveOrganization(context.organizationId);
    const asset = await deps.assetRepository.returnAsset(organizationId, parsed.data.assetId, {
      returnCondition: parsed.data.returnCondition,
      notes: parsed.data.notes,
      returnedAt: parsed.data.returnedAt ? toUtcDate(parsed.data.returnedAt) : new Date(),
    });
    await deps.assetRepository.recordHistory(organizationId, {
      assetId: asset.id,
      eventType: "ASSET_RETURNED",
      actorUserId: context.userId,
      summary: `Asset ${asset.assetTag} returned.`,
      metadata: { assetTag: asset.assetTag },
    });
    await deps.auditLog?.record({
      type: "ASSET_RETURNED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: asset.id,
      result: "allowed",
    });
    return { asset };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeListAssignmentHistory = async (rawInput: unknown, deps: AssetUseCasesDeps) => {  const parsed = assignmentHistoryQuerySchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    return await deps.assetRepository.listAssignmentHistory(organizationId, {
      search: parsed.data.search,
      assetId: parsed.data.assetId || undefined,
      locationId: parsed.data.locationId || undefined,
      openOnly: parsed.data.openOnly,
      from: parsed.data.from ?? undefined,
      to: parsed.data.to ?? undefined,
      sortDirection: parsed.data.sortDirection,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
  } catch (error) {
    throw normalizeError(error);
  }
};

/**
 * Minimal assignee roster for the assignment flow. Anyone holding
 * `asset.assign` may see member identities for selection — this avoids
 * widening `member.read` (and the members UI) to operational roles.
 */
export const executeListAssignableEmployees = async (
  rawInput: unknown,
  deps: AssetUseCasesDeps,
) => {
  if (rawInput !== undefined && rawInput !== null && typeof rawInput !== "object") {
    throw new AppError("VALIDATION_ERROR");
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.assign");
    const organizationId = requireActiveOrganization(context.organizationId);
    const roster = await deps.authorizationRepository.listMembersOfOrganization(organizationId);
    return {
      employees: roster.map((row) => ({
        memberId: row.id,
        userId: row.userId,
        name: row.name,
        email: row.email,
      })),
    };
  } catch (error) {
    throw normalizeError(error);
  }
};