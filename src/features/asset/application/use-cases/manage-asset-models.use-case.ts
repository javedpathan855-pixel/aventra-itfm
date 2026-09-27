// Asset model management use cases (application layer).

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import {
  assetModelSchema,
  modelListQuerySchema,
  updateAssetModelSchema,
} from "../../domain/schemas/asset.schema";
import type { AssetUseCasesDeps } from "./asset-deps";

const setActiveSchema = z.object({
  modelId: z.string().trim().min(1, "Model ID is required"),
  isActive: z.boolean(),
});

const requireActiveOrganization = (organizationId: string | null): string => {
  if (!organizationId) {
    throw new AppError("FORBIDDEN", { message: "No active organization selected." });
  }
  return organizationId;
};

export const executeListModels = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = modelListQuerySchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.model.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    return await deps.assetRepository.listModels(organizationId, {
      search: parsed.data.search,
      status: parsed.data.status,
      categoryId: parsed.data.categoryId,
      sortBy: parsed.data.sortBy,
      sortDirection: parsed.data.sortDirection,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeCreateModel = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = assetModelSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.model.manage");
    const organizationId = requireActiveOrganization(context.organizationId);
    const model = await deps.assetRepository.createModel(organizationId, parsed.data);
    await deps.auditLog?.record({
      type: "ASSET_MODEL_CREATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: model.id,
      result: "allowed",
    });
    return { model };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeUpdateModel = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = updateAssetModelSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.model.manage");
    const organizationId = requireActiveOrganization(context.organizationId);
    const model = await deps.assetRepository.updateModel(organizationId, parsed.data.modelId, {
      categoryId: parsed.data.categoryId,
      brand: parsed.data.brand,
      modelName: parsed.data.modelName,
      modelCode: parsed.data.modelCode,
      description: parsed.data.description,
    });
    await deps.auditLog?.record({
      type: "ASSET_MODEL_UPDATED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: model.id,
      result: "allowed",
    });
    return { model };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeSetModelActive = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = setActiveSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.model.manage");
    const organizationId = requireActiveOrganization(context.organizationId);
    const model = await deps.assetRepository.setModelActive(
      organizationId,
      parsed.data.modelId,
      parsed.data.isActive,
    );
    await deps.auditLog?.record({
      type: "ASSET_MODEL_STATUS_CHANGED",
      actorUserId: context.userId,
      organizationId,
      targetResourceId: model.id,
      result: "allowed",
      metadata: { isActive: String(parsed.data.isActive) },
    });
    return { model };
  } catch (error) {
    throw normalizeError(error);
  }
};
