"use server";

import { revalidatePath } from "next/cache";
import { AppError, type AuthErrorCode } from "@/shared/error/app-error";
import { betterAuthProvider } from "@/features/auth/infrastructure/auth/better-auth-provider";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { auditLogger } from "@/features/auth/infrastructure/audit/audit-logger";
import { prismaAssetRepository } from "@/features/asset/infrastructure/prisma/prisma-asset-repository";
import {
  executeCreateCategory,
  executeListCategories,
  executeSetCategoryActive,
  executeUpdateCategory,
} from "@/features/asset/application/use-cases/manage-asset-categories.use-case";
import {
  executeCreateModel,
  executeListModels,
  executeSetModelActive,
  executeUpdateModel,
} from "@/features/asset/application/use-cases/manage-asset-models.use-case";
import {
  executeArchiveAsset,
  executeCreateAsset,
  executeGetAssetDetail,
  executeListAssets,
  executeUpdateAsset,
} from "@/features/asset/application/use-cases/manage-assets.use-case";
import {
  executeAssignAsset,
  executeListAssignableEmployees,
  executeListAssignmentHistory,
  executeReturnAsset,
} from "@/features/asset/application/use-cases/manage-asset-assignments.use-case";
import { executeGetAssetDashboard } from "@/features/asset/application/use-cases/get-asset-dashboard.use-case";
import {
  executeExportAssetReport,
  executeGetAssetReport,
} from "@/features/asset/application/use-cases/get-asset-report.use-case";
import type {
  AssetAssignmentEntity,
  AssetDashboardMetrics,
  AssetDetail,
  AssetListItem,
  CategoryWithAssetCount,
  ModelWithAssetCount,
  PaginatedResult,
} from "@/features/asset/domain/entities/asset";

const getDeps = () => ({
  getSession: () => betterAuthProvider.getSession(),
  authorizationRepository: prismaAuthorizationRepository,
  assetRepository: prismaAssetRepository,
  auditLog: auditLogger,
});

export type AssetActionResult<T> =
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

const revalidateAssetPaths = () => {
  revalidatePath("/assets", "layout");
  revalidatePath("/dashboard");
};

export const listCategoriesAction = async (
  input: unknown,
): Promise<AssetActionResult<PaginatedResult<CategoryWithAssetCount>>> => {
  try {
    const data = await executeListCategories(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const saveCategoryAction = async (
  input: unknown,
): Promise<AssetActionResult<{ category: CategoryWithAssetCount }>> => {
  try {
    const isUpdate = Boolean(
      input && typeof input === "object" && "categoryId" in input && (input as Record<string, unknown>).categoryId,
    );
    const data = isUpdate
      ? await executeUpdateCategory(input, getDeps())
      : await executeCreateCategory(input, getDeps());
    revalidateAssetPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const setCategoryActiveAction = async (
  input: unknown,
): Promise<AssetActionResult<{ category: CategoryWithAssetCount }>> => {
  try {
    const data = await executeSetCategoryActive(input, getDeps());
    revalidateAssetPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const listModelsAction = async (
  input: unknown,
): Promise<AssetActionResult<PaginatedResult<ModelWithAssetCount>>> => {
  try {
    const data = await executeListModels(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const saveModelAction = async (
  input: unknown,
): Promise<AssetActionResult<{ model: ModelWithAssetCount }>> => {
  try {
    const isUpdate = Boolean(
      input && typeof input === "object" && "modelId" in input && (input as Record<string, unknown>).modelId,
    );
    const data = isUpdate
      ? await executeUpdateModel(input, getDeps())
      : await executeCreateModel(input, getDeps());
    revalidateAssetPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const setModelActiveAction = async (
  input: unknown,
): Promise<AssetActionResult<{ model: ModelWithAssetCount }>> => {
  try {
    const data = await executeSetModelActive(input, getDeps());
    revalidateAssetPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const listAssetsAction = async (
  input: unknown,
): Promise<AssetActionResult<PaginatedResult<AssetListItem>>> => {
  try {
    const data = await executeListAssets(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const getAssetDetailAction = async (
  input: unknown,
): Promise<AssetActionResult<{ asset: AssetDetail }>> => {
  try {
    const data = await executeGetAssetDetail(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const saveAssetAction = async (
  input: unknown,
): Promise<AssetActionResult<{ asset: AssetDetail }>> => {
  try {
    const isUpdate = Boolean(
      input && typeof input === "object" && "assetId" in input && (input as Record<string, unknown>).assetId,
    );
    const data = isUpdate
      ? await executeUpdateAsset(input, getDeps())
      : await executeCreateAsset(input, getDeps());
    revalidateAssetPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const archiveAssetAction = async (
  input: unknown,
): Promise<AssetActionResult<{ asset: AssetDetail }>> => {
  try {
    const data = await executeArchiveAsset(input, getDeps());
    revalidateAssetPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const assignAssetAction = async (
  input: unknown,
): Promise<AssetActionResult<{ asset: AssetDetail }>> => {
  try {
    const data = await executeAssignAsset(input, getDeps());
    revalidateAssetPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const returnAssetAction = async (
  input: unknown,
): Promise<AssetActionResult<{ asset: AssetDetail }>> => {
  try {
    const data = await executeReturnAsset(input, getDeps());
    revalidateAssetPaths();
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const listAssetEmployeesAction = async () => {
  try {
    const data = await executeListAssignableEmployees({}, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const listAssignmentHistoryAction = async (
  input: unknown,
): Promise<AssetActionResult<PaginatedResult<AssetAssignmentEntity>>> => {
  try {
    const data = await executeListAssignmentHistory(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const getAssetDashboardAction = async (): Promise<
  AssetActionResult<{ metrics: AssetDashboardMetrics }>
> => {
  try {
    const data = await executeGetAssetDashboard({}, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const getAssetReportAction = async (
  input: unknown,
): Promise<
  AssetActionResult<{
    report: string;
    columns: string[];
    rows: string[][];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>
> => {
  try {
    const data = await executeGetAssetReport(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};

export const exportAssetReportAction = async (
  input: unknown,
): Promise<
  AssetActionResult<{
    report: string;
    filename: string;
    csv: string;
    rowCount: number;
    truncated: boolean;
  }>
> => {
  try {
    const data = await executeExportAssetReport(input, getDeps());
    return { ok: true, data };
  } catch (error) {
    return handleActionError(error);
  }
};
