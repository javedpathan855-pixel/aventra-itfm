// Asset category management use cases (application layer).

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import {
  assetCategorySchema,
  categoryListQuerySchema,
  updateAssetCategorySchema,
} from "../../domain/schemas/asset.schema";
import type { AssetUseCasesDeps } from "./asset-deps";

const setActiveSchema = z.object({
  categoryId: z.string().trim().min(1, "Category ID is required"),
  isActive: z.boolean(),
});

const requireActiveOrganization = (organizationId: string | null): string => {
  if (!organizationId) {
    throw new AppError("FORBIDDEN", { message: "No active organization selected." });
  }
  return organizationId;
};

export const executeListCategories = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = categoryListQuerySchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.category.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    return await deps.assetRepository.listCategories(organizationId, {
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

export const executeCreateCategory = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = assetCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.category.manage");
    const organizationId = requireActiveOrganization(context.organizationId);
    const category = await deps.assetRepository.createCategory(organizationId, parsed.data);
    await deps.auditLog?.record({
      type: "ASSET_CATEGORY_CREATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: category.id,
      result: "allowed",
    });
    return { category };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeUpdateCategory = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = updateAssetCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.category.manage");
    const organizationId = requireActiveOrganization(context.organizationId);
    const category = await deps.assetRepository.updateCategory(
      organizationId,
      parsed.data.categoryId,
      { name: parsed.data.name, code: parsed.data.code, description: parsed.data.description },
    );
    await deps.auditLog?.record({
      type: "ASSET_CATEGORY_UPDATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: category.id,
      result: "allowed",
    });
    return { category };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeSetCategoryActive = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = setActiveSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.category.manage");
    const organizationId = requireActiveOrganization(context.organizationId);
    const category = await deps.assetRepository.setCategoryActive(
      organizationId,
      parsed.data.categoryId,
      parsed.data.isActive,
    );
    await deps.auditLog?.record({
      type: "ASSET_CATEGORY_STATUS_CHANGED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: category.id,
      result: "allowed",
      metadata: { isActive: String(parsed.data.isActive) },
    });
    return { category };
  } catch (error) {
    throw normalizeError(error);
  }
};
