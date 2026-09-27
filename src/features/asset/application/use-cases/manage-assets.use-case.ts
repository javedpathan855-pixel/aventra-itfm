// Asset registry use cases (application layer).
//
// Date strings from validated input are converted to UTC-midnight Dates
// here so the repository contract stays Date-typed and float-free.

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import {
  assetListQuerySchema,
  assetSchema,
  updateAssetSchema,
} from "../../domain/schemas/asset.schema";
import type { AssetUseCasesDeps } from "./asset-deps";
import type { PersistAssetInput } from "../../repository/asset-repository";

const assetIdParamSchema = z.object({
  assetId: z.string().trim().min(1, "Asset ID is required"),
});

const requireActiveOrganization = (organizationId: string | null): string => {
  if (!organizationId) {
    throw new AppError("FORBIDDEN", { message: "No active organization selected." });
  }
  return organizationId;
};

const toPersistInput = (parsed: {
  name: string;
  assetTag: string;
  description: string | null;
  categoryId: string;
  modelId: string | null;
  brand: string | null;
  serialNumber: string | null;
  purchaseDate: string;
  purchaseCost: string;
  currency: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  condition: PersistAssetInput["condition"];
  currentLocationId: string | null;
  currentDepartmentId: string | null;
}): PersistAssetInput => ({
  ...parsed,
  purchaseDate: new Date(`${parsed.purchaseDate}T00:00:00Z`),
  warrantyStartDate: parsed.warrantyStartDate ? new Date(`${parsed.warrantyStartDate}T00:00:00Z`) : null,
  warrantyEndDate: parsed.warrantyEndDate ? new Date(`${parsed.warrantyEndDate}T00:00:00Z`) : null,
});

export const executeListAssets = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = assetListQuerySchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    return await deps.assetRepository.listAssets(organizationId, {
      search: parsed.data.search,
      status: parsed.data.status,
      availability: parsed.data.availability,
      categoryId: parsed.data.categoryId || undefined,
      modelId: parsed.data.modelId || undefined,
      locationId: parsed.data.locationId || undefined,
      departmentId: parsed.data.departmentId || undefined,
      warranty: parsed.data.warranty,
      sortBy: parsed.data.sortBy,
      sortDirection: parsed.data.sortDirection,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeGetAssetDetail = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = assetIdParamSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    const asset = await deps.assetRepository.getAssetDetail(organizationId, parsed.data.assetId);
    if (!asset) {
      // Scoped lookup: missing and foreign read as NOT_FOUND (no enumeration).
      throw new AppError("NOT_FOUND", { message: "Asset not found." });
    }
    return { asset };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeCreateAsset = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = assetSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.create");
    const organizationId = requireActiveOrganization(context.organizationId);
    const asset = await deps.assetRepository.createAsset(organizationId, toPersistInput(parsed.data));
    await deps.assetRepository.recordHistory(organizationId, {
      assetId: asset.id,
      eventType: "ASSET_CREATED",
      actorUserId: context.userId,
      summary: `Asset ${asset.assetTag} registered.`,
      metadata: { assetTag: asset.assetTag },
    });
    await deps.auditLog?.record({
      type: "ASSET_CREATED",
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

export const executeUpdateAsset = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = updateAssetSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.update");
    const organizationId = requireActiveOrganization(context.organizationId);
    const asset = await deps.assetRepository.updateAsset(
      organizationId,
      parsed.data.assetId,
      toPersistInput(parsed.data),
    );
    await deps.assetRepository.recordHistory(organizationId, {
      assetId: asset.id,
      eventType: "ASSET_UPDATED",
      actorUserId: context.userId,
      summary: `Asset ${asset.assetTag} updated.`,
      metadata: { assetTag: asset.assetTag },
    });
    await deps.auditLog?.record({
      type: "ASSET_UPDATED",
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

export const executeArchiveAsset = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = assetIdParamSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.archive");
    const organizationId = requireActiveOrganization(context.organizationId);
    const asset = await deps.assetRepository.archiveAsset(organizationId, parsed.data.assetId);
    await deps.assetRepository.recordHistory(organizationId, {
      assetId: asset.id,
      eventType: "ASSET_ARCHIVED",
      actorUserId: context.userId,
      summary: `Asset ${asset.assetTag} archived.`,
      metadata: { assetTag: asset.assetTag },
    });
    await deps.auditLog?.record({
      type: "ASSET_ARCHIVED",
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
