// Prisma asset repository (infrastructure — server-only).
//
// All queries are scoped to the verified organizationId passed by the
// application layer. Monetary values travel as Decimal in Postgres and as
// decimal strings in domain entities — floats never appear. Friendly
// CONFLICT errors precede unique-constraint hits; P2002 is still mapped
// to CONFLICT by normalizeError as a safety net.

import { getPrisma } from "@/shared/infrastructure/prisma";
import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/shared/error/app-error";
import { getWarrantyStatus } from "../../domain/services/warranty";
import type { AssetCondition, AssetStatus, WarrantyStatus } from "../../domain/constants/asset-constants";
import type {
  AssetAssignmentEntity,
  AssetDetail,
  AssetListItem,
  AssetListQuery,
  CategoryWithAssetCount,
  ModelWithAssetCount,
} from "../../domain/entities/asset";
import type {
  AssetRepository,
  PersistAssetInput,
  PersistAssignmentInput,
} from "../../repository/asset-repository";

type TransactionClient = Parameters<Parameters<ReturnType<typeof getPrisma>["$transaction"]>[0]>[0];

interface DecimalLike {
  toString(): string;
}

interface RawCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RawModel {
  id: string;
  organizationId: string;
  categoryId: string;
  brand: string;
  modelName: string;
  modelCode: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RawAsset {
  id: string;
  organizationId: string;
  assetTag: string;
  name: string;
  description: string | null;
  categoryId: string;
  modelId: string | null;
  brand: string | null;
  serialNumber: string | null;
  purchaseDate: Date;
  purchaseCost: DecimalLike;
  currency: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  warrantyStartDate: Date | null;
  warrantyEndDate: Date | null;
  condition: string;
  status: string;
  currentLocationId: string | null;
  currentDepartmentId: string | null;
  activeAssignmentId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RawAssignment {
  id: string;
  organizationId: string;
  assetId: string;
  membershipId: string | null;
  assigneeUserId: string;
  assigneeName: string;
  assigneeEmail: string;
  locationId: string;
  locationName: string;
  departmentId: string | null;
  departmentName: string | null;
  assignedAt: Date;
  expectedReturnAt: Date | null;
  returnedAt: Date | null;
  assignmentCondition: string;
  returnCondition: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RawHistory {
  id: string;
  organizationId: string;
  assetId: string | null;
  eventType: string;
  actorUserId: string | null;
  summary: string;
  metadata: Record<string, string> | null;
  createdAt: Date;
}

const mapCategory = (
  raw: RawCategory,
  counts?: { assetCount: number; modelCount: number },
): CategoryWithAssetCount => ({
  id: raw.id,
  organizationId: raw.organizationId,
  name: raw.name,
  code: raw.code,
  description: raw.description,
  isActive: raw.isActive,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  assetCount: counts?.assetCount ?? 0,
  modelCount: counts?.modelCount ?? 0,
});

const mapModel = (
  raw: RawModel,
  categoryName: string,
  assetCount = 0,
): ModelWithAssetCount => ({
  id: raw.id,
  organizationId: raw.organizationId,
  categoryId: raw.categoryId,
  brand: raw.brand,
  modelName: raw.modelName,
  modelCode: raw.modelCode,
  description: raw.description,
  isActive: raw.isActive,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  categoryName,
  assetCount,
});

type AssetCore = Omit<
  AssetDetail,
  | "categoryName"
  | "modelName"
  | "modelCode"
  | "brandResolved"
  | "locationName"
  | "departmentName"
  | "warrantyStatus"
  | "assignments"
  | "activeAssignment"
  | "history"
>;

const mapAsset = (raw: RawAsset): AssetCore => ({
  id: raw.id,
  organizationId: raw.organizationId,
  assetTag: raw.assetTag,
  name: raw.name,
  description: raw.description,
  categoryId: raw.categoryId,
  modelId: raw.modelId,
  brand: raw.brand,
  serialNumber: raw.serialNumber,
  purchaseDate: raw.purchaseDate,
  purchaseCost: raw.purchaseCost.toString(),
  currency: raw.currency,
  vendorName: raw.vendorName,
  invoiceNumber: raw.invoiceNumber,
  warrantyStartDate: raw.warrantyStartDate,
  warrantyEndDate: raw.warrantyEndDate,
  condition: raw.condition as AssetCondition,
  status: raw.status as AssetStatus,
  currentLocationId: raw.currentLocationId,
  currentDepartmentId: raw.currentDepartmentId,
  activeAssignmentId: raw.activeAssignmentId,
  archivedAt: raw.archivedAt,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const mapAssignment = (raw: RawAssignment): AssetAssignmentEntity => ({
  id: raw.id,
  organizationId: raw.organizationId,
  assetId: raw.assetId,
  membershipId: raw.membershipId,
  assigneeUserId: raw.assigneeUserId,
  assigneeName: raw.assigneeName,
  assigneeEmail: raw.assigneeEmail,
  locationId: raw.locationId,
  locationName: raw.locationName,
  departmentId: raw.departmentId,
  departmentName: raw.departmentName,
  assignedAt: raw.assignedAt,
  expectedReturnAt: raw.expectedReturnAt,
  returnedAt: raw.returnedAt,
  assignmentCondition: raw.assignmentCondition as AssetCondition,
  returnCondition: (raw.returnCondition as AssetCondition | null) ?? null,
  notes: raw.notes,
  createdBy: raw.createdBy,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const mapHistory = (raw: RawHistory): AssetDetail["history"][number] => ({
  id: raw.id,
  organizationId: raw.organizationId,
  assetId: raw.assetId,
  eventType: raw.eventType,
  actorUserId: raw.actorUserId,
  summary: raw.summary,
  metadata: raw.metadata,
  createdAt: raw.createdAt,
});

const toListItem = (
  raw: RawAsset & {
    category: { name: string };
    model: { modelName: string } | null;
    currentLocation: { name: string } | null;
    currentDepartment: { name: string } | null;
    activeAssignment: { assigneeName: string } | null;
  },
  now: Date,
): AssetListItem => ({
  ...mapAsset(raw),
  categoryName: raw.category.name,
  modelName: raw.model?.modelName ?? null,
  locationName: raw.currentLocation?.name ?? null,
  departmentName: raw.currentDepartment?.name ?? null,
  assigneeName: raw.activeAssignment?.assigneeName ?? null,
  warrantyStatus: getWarrantyStatus(raw.warrantyEndDate, now) as WarrantyStatus,
});

const startOfDayUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/**
 * Retry a transaction body on Postgres write-conflict/deadlock (P2034).
 * Serialization failures are transient: a retry re-reads committed state,
 * so a loser of a concurrent assignment race falls through to the regular
 * CONFLICT guard instead of surfacing a database error. Bounded to avoid
 * masking persistent failures.
 */
const runWithWriteConflictRetry = async <T>(task: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      if (code !== "P2034" || attempt === attempts) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
};

const assertUniqueCategoryCode = async (
  tx: TransactionClient,
  organizationId: string,
  code: string,
  excludeId: string | null,
): Promise<void> => {
  const existing = await tx.assetCategory.findFirst({
    where: { organizationId, code, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("CONFLICT", { message: "A category with this code already exists." });
  }
};

const assertUniqueCategoryName = async (
  tx: TransactionClient,
  organizationId: string,
  name: string,
  excludeId: string | null,
): Promise<void> => {
  const existing = await tx.assetCategory.findFirst({
    where: { organizationId, name, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("CONFLICT", { message: "A category with this name already exists." });
  }
};

const assertUniqueModelIdentity = async (
  tx: TransactionClient,
  organizationId: string,
  brand: string,
  modelName: string,
  excludeId: string | null,
): Promise<void> => {
  const existing = await tx.assetModel.findFirst({
    where: { organizationId, brand, modelName, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("CONFLICT", { message: "This brand and model name already exists." });
  }
};

const assertUniqueModelCode = async (
  tx: TransactionClient,
  organizationId: string,
  modelCode: string,
  excludeId: string | null,
): Promise<void> => {
  const existing = await tx.assetModel.findFirst({
    where: { organizationId, modelCode, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("CONFLICT", { message: "A model with this code already exists." });
  }
};

const assertUniqueAssetTag = async (
  tx: TransactionClient,
  organizationId: string,
  assetTag: string,
  excludeId: string | null,
): Promise<void> => {
  const existing = await tx.asset.findFirst({
    where: { organizationId, assetTag, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("CONFLICT", { message: "An asset with this tag already exists." });
  }
};

const assertUniqueSerial = async (
  tx: TransactionClient,
  organizationId: string,
  serialNumber: string,
  excludeId: string | null,
): Promise<void> => {
  const existing = await tx.asset.findFirst({
    where: { organizationId, serialNumber, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("CONFLICT", { message: "An asset with this serial number already exists." });
  }
};

const getActiveCategoryOrThrow = async (
  tx: TransactionClient,
  organizationId: string,
  categoryId: string,
) => {
  const category = await tx.assetCategory.findFirst({ where: { id: categoryId, organizationId } });
  if (!category) throw new AppError("NOT_FOUND", { message: "Category not found." });
  if (!category.isActive) {
    throw new AppError("VALIDATION_ERROR", { message: "The selected category is inactive." });
  }
  return category;
};

const getActiveModelOrThrow = async (
  tx: TransactionClient,
  organizationId: string,
  modelId: string,
  categoryId: string,
) => {
  const model = await tx.assetModel.findFirst({ where: { id: modelId, organizationId } });
  if (!model) throw new AppError("NOT_FOUND", { message: "Model not found." });
  if (model.categoryId !== categoryId) {
    throw new AppError("VALIDATION_ERROR", { message: "The selected model does not belong to the chosen category." });
  }
  if (!model.isActive) {
    throw new AppError("VALIDATION_ERROR", { message: "The selected model is inactive." });
  }
  return model;
};

const getActivePlacementOrThrow = async (
  tx: TransactionClient,
  organizationId: string,
  locationId: string | null,
  departmentId: string | null,
): Promise<{ locationName: string | null; departmentName: string | null }> => {
  if (!locationId) return { locationName: null, departmentName: null };
  const location = await tx.location.findFirst({ where: { id: locationId, organizationId } });
  if (!location) throw new AppError("NOT_FOUND", { message: "Location not found." });
  if (!location.isActive) {
    throw new AppError("VALIDATION_ERROR", { message: "The selected location is inactive." });
  }
  if (!departmentId) return { locationName: location.name, departmentName: null };
  const department = await tx.department.findFirst({ where: { id: departmentId, organizationId } });
  if (!department) throw new AppError("NOT_FOUND", { message: "Department not found." });
  if (!department.isActive) {
    throw new AppError("VALIDATION_ERROR", { message: "The selected department is inactive." });
  }
  const link = await tx.locationDepartment.findFirst({ where: { locationId, departmentId } });
  if (!link) {
    throw new AppError("VALIDATION_ERROR", {
      message: "The selected department is not assigned to the chosen location.",
    });
  }
  return { locationName: location.name, departmentName: department.name };
};

const assetListInclude = {
  category: { select: { name: true } },
  model: { select: { modelName: true } },
  currentLocation: { select: { name: true } },
  currentDepartment: { select: { name: true } },
  activeAssignment: { select: { assigneeName: true } },
} as const;

const buildAssetWhere = (
  organizationId: string,
  query: AssetListQuery,
  now: Date,
): Record<string, unknown> => {
  const where: Record<string, unknown> = { organizationId };
  if (query.status === "ARCHIVED") {
    where.archivedAt = { not: null };
  } else {
    where.archivedAt = null;
    if (query.status && query.status !== "all") {
      where.status = query.status;
    }
  }
  if (query.availability === "available") {
    where.activeAssignmentId = null;
    if (query.status !== "ARCHIVED") where.archivedAt = null;
  } else if (query.availability === "assigned") {
    where.activeAssignmentId = { not: null };
  }
  if (query.search) {
    const term = query.search;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { assetTag: { contains: term, mode: "insensitive" } },
      { serialNumber: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      { vendorName: { contains: term, mode: "insensitive" } },
      { invoiceNumber: { contains: term, mode: "insensitive" } },
    ];
  }
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.modelId) where.modelId = query.modelId;
  if (query.locationId) where.currentLocationId = query.locationId;
  if (query.departmentId) where.currentDepartmentId = query.departmentId;
  if (query.warranty && query.warranty !== "all") {
    const today = startOfDayUtc(now);
    const soon = new Date(today.getTime() + 30 * 86_400_000);
    if (query.warranty === "NONE") where.warrantyEndDate = null;
    else if (query.warranty === "EXPIRED") where.warrantyEndDate = { lt: today };
    else if (query.warranty === "EXPIRING_SOON") where.warrantyEndDate = { gte: today, lte: soon };
    else where.warrantyEndDate = { gt: soon };
  }
  if (query.purchaseFrom || query.purchaseTo) {
    const purchaseDate: Record<string, Date> = {};
    if (query.purchaseFrom) purchaseDate.gte = new Date(`${query.purchaseFrom}T00:00:00Z`);
    if (query.purchaseTo) purchaseDate.lte = new Date(`${query.purchaseTo}T23:59:59Z`);
    where.purchaseDate = purchaseDate;
  }
  return where;
};

const buildAssetOrderBy = (query: AssetListQuery): Record<string, string>[] => {
  const direction = query.sortDirection ?? "asc";
  const field = query.sortBy ?? "name";
  if (field === "assetTag") return [{ assetTag: direction }];
  if (field === "purchaseDate") return [{ purchaseDate: direction }];
  if (field === "createdAt") return [{ createdAt: direction }];
  if (field === "purchaseCost") return [{ purchaseCost: direction }];
  if (field === "warrantyEndDate") return [{ warrantyEndDate: direction }];
  return [{ name: direction }];
};

const buildAssetDetail = async (
  tx: TransactionClient,
  organizationId: string,
  assetId: string,
  now: Date,
): Promise<AssetDetail | null> => {
  const row = await tx.asset.findFirst({
    where: { id: assetId, organizationId },
    include: {
      category: { select: { name: true } },
      model: { select: { modelName: true, modelCode: true, brand: true } },
      currentLocation: { select: { name: true } },
      currentDepartment: { select: { name: true } },
      assignments: { orderBy: { assignedAt: "desc" } },
      history: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!row) return null;
  const assignments = (row.assignments as RawAssignment[]).map(mapAssignment);
  return {
    ...mapAsset(row as RawAsset),
    categoryName: (row.category as { name: string }).name,
    modelName: (row.model as { modelName: string } | null)?.modelName ?? null,
    modelCode: (row.model as { modelCode: string | null } | null)?.modelCode ?? null,
    brandResolved:
      (row.model as { brand: string } | null)?.brand ?? (row as RawAsset).brand,
    locationName: (row.currentLocation as { name: string } | null)?.name ?? null,
    departmentName: (row.currentDepartment as { name: string } | null)?.name ?? null,
    warrantyStatus: getWarrantyStatus((row as RawAsset).warrantyEndDate, now),
    assignments,
    activeAssignment: assignments.find((a) => a.returnedAt === null) ?? null,
    history: (row.history as RawHistory[]).map(mapHistory),
  };
};

export const prismaAssetRepository: AssetRepository = {
  listCategories: async (organizationId, query) => {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = { organizationId };
    if (query.status && query.status !== "all") {
      where.isActive = query.status === "active";
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { code: { contains: query.search, mode: "insensitive" } },
      ];
    }
    const sortField = query.sortBy ?? "name";
    const orderBy =
      sortField === "code"
        ? [{ code: query.sortDirection ?? "asc" }]
        : sortField === "createdAt"
          ? [{ createdAt: query.sortDirection ?? "asc" }]
          : [{ name: query.sortDirection ?? "asc" }];
    const [total, rows] = await Promise.all([
      getPrisma().assetCategory.count({ where }),
      getPrisma().assetCategory.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { models: true, assets: { where: { archivedAt: null } } } },
        },
      }),
    ]);
    return {
      items: (rows as (RawCategory & { _count: { models: number; assets: number } })[]).map((row) =>
        mapCategory(row, { assetCount: row._count.assets, modelCount: row._count.models }),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  getCategoryById: async (organizationId, categoryId) => {
    const row = await getPrisma().assetCategory.findFirst({
      where: { id: categoryId, organizationId },
      include: {
        _count: { select: { models: true, assets: { where: { archivedAt: null } } } },
      },
    });
    if (!row) return null;
    const typed = row as RawCategory & { _count: { models: number; assets: number } };
    return mapCategory(typed, { assetCount: typed._count.assets, modelCount: typed._count.models });
  },

  createCategory: async (organizationId, input) => {
    const created = await getPrisma().$transaction(async (tx) => {
      await assertUniqueCategoryCode(tx, organizationId, input.code, null);
      await assertUniqueCategoryName(tx, organizationId, input.name, null);
      return tx.assetCategory.create({ data: { organizationId, ...input } });
    });
    const withCounts = await getPrisma().assetCategory.findFirst({
      where: { id: (created as { id: string }).id, organizationId },
      include: {
        _count: { select: { models: true, assets: { where: { archivedAt: null } } } },
      },
    });
    const typed = withCounts as unknown as RawCategory & { _count: { models: number; assets: number } };
    return mapCategory(typed, { assetCount: typed._count.assets, modelCount: typed._count.models });
  },

  updateCategory: async (organizationId, categoryId, input) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.assetCategory.findFirst({ where: { id: categoryId, organizationId } });
      if (!existing) throw new AppError("NOT_FOUND", { message: "Category not found." });
      await assertUniqueCategoryCode(tx, organizationId, input.code, categoryId);
      await assertUniqueCategoryName(tx, organizationId, input.name, categoryId);
      const updated = await tx.assetCategory.update({
        where: { id: existing.id },
        data: { name: input.name, code: input.code, description: input.description },
        include: {
          _count: { select: { models: true, assets: { where: { archivedAt: null } } } },
        },
      });
      const typed = updated as unknown as RawCategory & { _count: { models: number; assets: number } };
      return mapCategory(typed, { assetCount: typed._count.assets, modelCount: typed._count.models });
    });
  },

  setCategoryActive: async (organizationId, categoryId, isActive) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.assetCategory.findFirst({
        where: { id: categoryId, organizationId },
        include: { _count: { select: { assets: { where: { archivedAt: null } } } } },
      });
      if (!existing) throw new AppError("NOT_FOUND", { message: "Category not found." });
      if (!isActive && (existing as { _count: { assets: number } })._count.assets > 0) {
        throw new AppError("CONFLICT", {
          message: "This category cannot be deactivated while active assets reference it.",
        });
      }
      const updated = await tx.assetCategory.update({
        where: { id: existing.id },
        data: { isActive },
        include: {
          _count: { select: { models: true, assets: { where: { archivedAt: null } } } },
        },
      });
      const typed = updated as unknown as RawCategory & { _count: { models: number; assets: number } };
      return mapCategory(typed, { assetCount: typed._count.assets, modelCount: typed._count.models });
    });
  },

  listModels: async (organizationId, query) => {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = { organizationId };
    if (query.status && query.status !== "all") {
      where.isActive = query.status === "active";
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) {
      where.OR = [
        { brand: { contains: query.search, mode: "insensitive" } },
        { modelName: { contains: query.search, mode: "insensitive" } },
        { modelCode: { contains: query.search, mode: "insensitive" } },
      ];
    }
    const sortField = query.sortBy ?? "name";
    const orderBy =
      sortField === "code"
        ? [{ modelCode: query.sortDirection ?? "asc" }]
        : sortField === "createdAt"
          ? [{ createdAt: query.sortDirection ?? "asc" }]
          : [{ modelName: query.sortDirection ?? "asc" }];
    const [total, rows] = await Promise.all([
      getPrisma().assetModel.count({ where }),
      getPrisma().assetModel.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { name: true } },
          _count: { select: { assets: { where: { archivedAt: null } } } },
        },
      }),
    ]);
    return {
      items: (
        rows as (RawModel & { category: { name: string }; _count: { assets: number } })[]
      ).map((row) => mapModel(row, row.category.name, row._count.assets)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  getModelById: async (organizationId, modelId) => {
    const row = await getPrisma().assetModel.findFirst({
      where: { id: modelId, organizationId },
      include: {
        category: { select: { name: true } },
        _count: { select: { assets: { where: { archivedAt: null } } } },
      },
    });
    if (!row) return null;
    const typed = row as unknown as RawModel & { category: { name: string }; _count: { assets: number } };
    return mapModel(typed, typed.category.name, typed._count.assets);
  },

  createModel: async (organizationId, input) => {
    const created = await getPrisma().$transaction(async (tx) => {
      await getActiveCategoryOrThrow(tx, organizationId, input.categoryId);
      await assertUniqueModelIdentity(tx, organizationId, input.brand, input.modelName, null);
      if (input.modelCode) {
        await assertUniqueModelCode(tx, organizationId, input.modelCode, null);
      }
      return tx.assetModel.create({ data: { organizationId, ...input } });
    });
    const row = await getPrisma().assetModel.findFirst({
      where: { id: (created as { id: string }).id, organizationId },
      include: {
        category: { select: { name: true } },
        _count: { select: { assets: { where: { archivedAt: null } } } },
      },
    });
    const typed = row as unknown as RawModel & { category: { name: string }; _count: { assets: number } };
    return mapModel(typed, typed.category.name, typed._count.assets);
  },

  updateModel: async (organizationId, modelId, input) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.assetModel.findFirst({ where: { id: modelId, organizationId } });
      if (!existing) throw new AppError("NOT_FOUND", { message: "Model not found." });
      await getActiveCategoryOrThrow(tx, organizationId, input.categoryId);
      await assertUniqueModelIdentity(tx, organizationId, input.brand, input.modelName, modelId);
      if (input.modelCode) {
        await assertUniqueModelCode(tx, organizationId, input.modelCode, modelId);
      }
      const updated = await tx.assetModel.update({
        where: { id: existing.id },
        data: {
          categoryId: input.categoryId,
          brand: input.brand,
          modelName: input.modelName,
          modelCode: input.modelCode,
          description: input.description,
        },
        include: {
          category: { select: { name: true } },
          _count: { select: { assets: { where: { archivedAt: null } } } },
        },
      });
      const typed = updated as unknown as RawModel & { category: { name: string }; _count: { assets: number } };
      return mapModel(typed, typed.category.name, typed._count.assets);
    });
  },

  setModelActive: async (organizationId, modelId, isActive) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.assetModel.findFirst({
        where: { id: modelId, organizationId },
        include: { _count: { select: { assets: { where: { archivedAt: null } } } } },
      });
      if (!existing) throw new AppError("NOT_FOUND", { message: "Model not found." });
      if (!isActive && (existing as { _count: { assets: number } })._count.assets > 0) {
        throw new AppError("CONFLICT", {
          message: "This model cannot be deactivated while active assets reference it.",
        });
      }
      const updated = await tx.assetModel.update({
        where: { id: existing.id },
        data: { isActive },
        include: {
          category: { select: { name: true } },
          _count: { select: { assets: { where: { archivedAt: null } } } },
        },
      });
      const typed = updated as unknown as RawModel & { category: { name: string }; _count: { assets: number } };
      return mapModel(typed, typed.category.name, typed._count.assets);
    });
  },

  listAssets: async (organizationId, query) => {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const now = new Date();
    const where = buildAssetWhere(organizationId, query, now);
    const [total, rows] = await Promise.all([
      getPrisma().asset.count({ where }),
      getPrisma().asset.findMany({
        where,
        orderBy: buildAssetOrderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: assetListInclude,
      }),
    ]);
    return {
      items: (
        rows as (RawAsset & {
          category: { name: string };
          model: { modelName: string } | null;
          currentLocation: { name: string } | null;
          currentDepartment: { name: string } | null;
          activeAssignment: { assigneeName: string } | null;
        })[]
      ).map((row) => toListItem(row, now)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  getAssetDetail: async (organizationId, assetId) => {
    return buildAssetDetail(getPrisma(), organizationId, assetId, new Date());
  },

  createAsset: async (organizationId, input: PersistAssetInput) => {
    const now = new Date();
    const createdId = await getPrisma().$transaction(async (tx) => {
      await assertUniqueAssetTag(tx, organizationId, input.assetTag, null);
      if (input.serialNumber) {
        await assertUniqueSerial(tx, organizationId, input.serialNumber, null);
      }
      await getActiveCategoryOrThrow(tx, organizationId, input.categoryId);
      if (input.modelId) {
        await getActiveModelOrThrow(tx, organizationId, input.modelId, input.categoryId);
      }
      await getActivePlacementOrThrow(tx, organizationId, input.currentLocationId, input.currentDepartmentId);
      const created = await tx.asset.create({
        data: {
          organizationId,
          assetTag: input.assetTag,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          modelId: input.modelId,
          brand: input.brand,
          serialNumber: input.serialNumber,
          purchaseDate: input.purchaseDate,
          purchaseCost: new Prisma.Decimal(input.purchaseCost),
          currency: input.currency,
          vendorName: input.vendorName,
          invoiceNumber: input.invoiceNumber,
          warrantyStartDate: input.warrantyStartDate,
          warrantyEndDate: input.warrantyEndDate,
          condition: input.condition,
          status: "AVAILABLE",
          currentLocationId: input.currentLocationId,
          currentDepartmentId: input.currentDepartmentId,
        },
        select: { id: true },
      });
      return (created as { id: string }).id;
    });
    const detail = await buildAssetDetail(getPrisma(), organizationId, createdId, now);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Asset not found." });
    return detail;
  },

  updateAsset: async (organizationId, assetId, input: PersistAssetInput) => {
    const now = new Date();
    await getPrisma().$transaction(async (tx) => {
      const existing = await tx.asset.findFirst({ where: { id: assetId, organizationId } });
      if (!existing) throw new AppError("NOT_FOUND", { message: "Asset not found." });
      if ((existing as RawAsset).archivedAt) {
        throw new AppError("VALIDATION_ERROR", { message: "Archived assets cannot be edited." });
      }
      await assertUniqueAssetTag(tx, organizationId, input.assetTag, assetId);
      if (input.serialNumber) {
        await assertUniqueSerial(tx, organizationId, input.serialNumber, assetId);
      }
      await getActiveCategoryOrThrow(tx, organizationId, input.categoryId);
      if (input.modelId) {
        await getActiveModelOrThrow(tx, organizationId, input.modelId, input.categoryId);
      }
      await getActivePlacementOrThrow(tx, organizationId, input.currentLocationId, input.currentDepartmentId);
      const hasActiveAssignment = (existing as RawAsset).activeAssignmentId !== null;
      const currentStatus = (existing as RawAsset).status as AssetStatus;
      let nextStatus: AssetStatus = currentStatus;
      if (hasActiveAssignment) {
        // Assignment owns the ASSIGNED state; field edits must not move it.
        nextStatus = "ASSIGNED";
      }
      await tx.asset.update({
        where: { id: existing.id },
        data: {
          assetTag: input.assetTag,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          modelId: input.modelId,
          brand: input.brand,
          serialNumber: input.serialNumber,
          purchaseDate: input.purchaseDate,
          purchaseCost: new Prisma.Decimal(input.purchaseCost),
          currency: input.currency,
          vendorName: input.vendorName,
          invoiceNumber: input.invoiceNumber,
          warrantyStartDate: input.warrantyStartDate,
          warrantyEndDate: input.warrantyEndDate,
          condition: input.condition,
          status: nextStatus,
          currentLocationId: input.currentLocationId,
          currentDepartmentId: input.currentDepartmentId,
        },
      });
    });
    const detail = await buildAssetDetail(getPrisma(), organizationId, assetId, now);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Asset not found." });
    return detail;
  },

  archiveAsset: async (organizationId, assetId) => {
    const now = new Date();
    await getPrisma().$transaction(async (tx) => {
      const existing = await tx.asset.findFirst({ where: { id: assetId, organizationId } });
      if (!existing) throw new AppError("NOT_FOUND", { message: "Asset not found." });
      if ((existing as RawAsset).archivedAt) {
        throw new AppError("CONFLICT", { message: "This asset is already archived." });
      }
      if ((existing as RawAsset).activeAssignmentId) {
        throw new AppError("VALIDATION_ERROR", {
          message: "Return the active assignment before archiving this asset.",
        });
      }
      await tx.asset.update({ where: { id: existing.id }, data: { archivedAt: now } });
    });
    const detail = await buildAssetDetail(getPrisma(), organizationId, assetId, now);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Asset not found." });
    return detail;
  },

  assignAsset: async (organizationId, assetId, input: PersistAssignmentInput) => {
    const now = new Date();
    await runWithWriteConflictRetry(() =>
      getPrisma().$transaction(async (tx) => {
      const existing = await tx.asset.findFirst({ where: { id: assetId, organizationId } });
      if (!existing) throw new AppError("NOT_FOUND", { message: "Asset not found." });
      const typed = existing as RawAsset;
      if (typed.archivedAt) {
        throw new AppError("VALIDATION_ERROR", { message: "Archived assets cannot be assigned." });
      }
      if (typed.status !== "AVAILABLE" || typed.activeAssignmentId) {
        throw new AppError("CONFLICT", { message: "This asset is not available for assignment." });
      }
      const membership = await tx.member.findFirst({
        where: { id: input.membershipId, organizationId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      if (!membership) {
        throw new AppError("NOT_FOUND", { message: "Employee membership not found in this organization." });
      }
      const placement = await getActivePlacementOrThrow(tx, organizationId, input.locationId, input.departmentId);
      const created = await tx.assetAssignment.create({
        data: {
          organizationId,
          assetId: existing.id,
          membershipId: membership.id,
          assigneeUserId: (membership as { userId: string }).userId,
          assigneeName: input.assigneeName,
          assigneeEmail: input.assigneeEmail,
          locationId: input.locationId,
          locationName: placement.locationName ?? "",
          departmentId: input.departmentId,
          departmentName: placement.departmentName,
          assignedAt: input.assignedAt,
          expectedReturnAt: input.expectedReturnAt,
          assignmentCondition: input.condition,
          notes: input.notes,
          createdBy: input.createdBy,
        },
        select: { id: true },
      });
      // Conditional claim: exactly one transaction can flip a free asset.
      // Losers see count 0 and surface a clean conflict (also backed by
      // the unique activeAssignmentId constraint).
      const claimed = await tx.asset.updateMany({
        where: { id: existing.id, activeAssignmentId: null },
        data: {
          status: "ASSIGNED",
          activeAssignmentId: (created as { id: string }).id,
          currentLocationId: input.locationId,
          currentDepartmentId: input.departmentId,
        },
      });
      if ((claimed as { count: number }).count === 0) {
        throw new AppError("CONFLICT", { message: "This asset was just assigned by someone else." });
      }
      }),
    );
    const detail = await buildAssetDetail(getPrisma(), organizationId, assetId, now);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Asset not found." });
    return detail;
  },

  returnAsset: async (organizationId, assetId, input) => {
    const now = new Date();
    await runWithWriteConflictRetry(() =>
      getPrisma().$transaction(async (tx) => {
      const existing = await tx.asset.findFirst({ where: { id: assetId, organizationId } });
      if (!existing) throw new AppError("NOT_FOUND", { message: "Asset not found." });
      const assignmentId = (existing as RawAsset).activeAssignmentId;
      if (!assignmentId) {
        throw new AppError("VALIDATION_ERROR", { message: "This asset has no active assignment to return." });
      }
      await tx.assetAssignment.update({
        where: { id: assignmentId },
        data: {
          returnedAt: input.returnedAt,
          returnCondition: input.returnCondition,
          notes: input.notes,
        },
      });
      await tx.asset.update({
        where: { id: existing.id },
        data: { status: "AVAILABLE", activeAssignmentId: null, condition: input.returnCondition },
      });
      }),
    );
    const detail = await buildAssetDetail(getPrisma(), organizationId, assetId, now);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Asset not found." });
    return detail;
  },

  listAssignmentHistory: async (organizationId, query) => {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Record<string, unknown> = { organizationId };
    if (query.assetId) where.assetId = query.assetId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.openOnly) where.returnedAt = null;
    if (query.from || query.to) {
      const assignedAt: Record<string, Date> = {};
      if (query.from) assignedAt.gte = new Date(`${query.from}T00:00:00Z`);
      if (query.to) assignedAt.lte = new Date(`${query.to}T23:59:59Z`);
      where.assignedAt = assignedAt;
    }
    if (query.search) {
      where.OR = [
        { assigneeName: { contains: query.search, mode: "insensitive" } },
        { assigneeEmail: { contains: query.search, mode: "insensitive" } },
        { locationName: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } },
      ];
    }
    const [total, rows] = await Promise.all([
      getPrisma().assetAssignment.count({ where }),
      getPrisma().assetAssignment.findMany({
        where,
        orderBy: { assignedAt: query.sortDirection ?? "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { asset: { select: { assetTag: true } } },
      }),
    ]);
    return {
      items: (rows as (RawAssignment & { asset: { assetTag: string } })[]).map((row) => ({
        ...mapAssignment(row),
        assetTag: row.asset.assetTag,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  recordHistory: async (organizationId, input) => {
    await getPrisma().assetHistory.create({
      data: {
        organizationId,
        assetId: input.assetId,
        eventType: input.eventType,
        actorUserId: input.actorUserId,
        summary: input.summary,
        metadata: input.metadata ?? undefined,
      },
    });
  },

  getDashboardMetrics: async (organizationId, query) => {
    const now = query.now;
    const today = startOfDayUtc(now);
    const soon = new Date(today.getTime() + 30 * 86_400_000);
    const active = { organizationId, archivedAt: null };
    const [
      statusGroups,
      archived,
      warrantyExpiringSoon,
      warrantyExpired,
      byCategoryRaw,
      byLocationRaw,
      byDepartmentRaw,
      recentlyRegistered,
      recentAssignments,
      upcomingWarranty,
    ] = await Promise.all([
      getPrisma().asset.groupBy({ by: ["status"], where: active, _count: { status: true } }),
      getPrisma().asset.count({ where: { organizationId, archivedAt: { not: null } } }),
      getPrisma().asset.count({
        where: { ...active, warrantyEndDate: { gte: today, lte: soon } },
      }),
      getPrisma().asset.count({ where: { ...active, warrantyEndDate: { lt: today } } }),
      getPrisma().asset.groupBy({
        by: ["categoryId"],
        where: active,
        _count: { categoryId: true },
      }),
      getPrisma().asset.groupBy({
        by: ["currentLocationId"],
        where: { ...active, currentLocationId: { not: null } },
        _count: { currentLocationId: true },
      }),
      getPrisma().asset.groupBy({
        by: ["currentDepartmentId"],
        where: { ...active, currentDepartmentId: { not: null } },
        _count: { currentDepartmentId: true },
      }),
      getPrisma().asset.findMany({
        where: active,
        orderBy: { createdAt: "desc" },
        take: 5,
        include: assetListInclude,
      }),
      getPrisma().assetAssignment.findMany({
        where: { organizationId },
        orderBy: { assignedAt: "desc" },
        take: 5,
        include: { asset: { select: { assetTag: true } } },
      }),
      getPrisma().asset.findMany({
        where: { ...active, warrantyEndDate: { gte: today, lte: soon } },
        orderBy: { warrantyEndDate: "asc" },
        take: 5,
        include: assetListInclude,
      }),
    ]);
    const countFor = (status: string): number =>
      (statusGroups as { status: string; _count: { status: number } }[]).find(
        (g) => g.status === status,
      )?._count.status ?? 0;
    const available = countFor("AVAILABLE");
    const assigned = countFor("ASSIGNED");
    const maintenance = countFor("MAINTENANCE");
    const retired = countFor("RETIRED");
    const categoryIds = (byCategoryRaw as { categoryId: string }[]).map((g) => g.categoryId);
    const locationIds = (byLocationRaw as { currentLocationId: string }[]).map(
      (g) => g.currentLocationId,
    );
    const departmentIds = (byDepartmentRaw as { currentDepartmentId: string }[]).map(
      (g) => g.currentDepartmentId,
    );
    const [categories, locations, departments] = await Promise.all([
      categoryIds.length > 0
        ? getPrisma().assetCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : [],
      locationIds.length > 0
        ? getPrisma().location.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
          })
        : [],
      departmentIds.length > 0
        ? getPrisma().department.findMany({
            where: { id: { in: departmentIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);
    const categoryNames = new Map(
      (categories as { id: string; name: string }[]).map((c) => [c.id, c.name]),
    );
    const locationNames = new Map(
      (locations as { id: string; name: string }[]).map((l) => [l.id, l.name]),
    );
    const departmentNames = new Map(
      (departments as { id: string; name: string }[]).map((d) => [d.id, d.name]),
    );
    type Row = RawAsset & {
      category: { name: string };
      model: { modelName: string } | null;
      currentLocation: { name: string } | null;
      currentDepartment: { name: string } | null;
      activeAssignment: { assigneeName: string } | null;
    };
    return {
      totalActive: available + assigned + maintenance + retired,
      available,
      assigned,
      maintenance,
      retired,
      archived,
      warrantyExpiringSoon,
      warrantyExpired,
      byCategory: (byCategoryRaw as { categoryId: string; _count: { categoryId: number } }[]).map(
        (g) => ({
          categoryId: g.categoryId,
          categoryName: categoryNames.get(g.categoryId) ?? "Unknown",
          count: g._count.categoryId,
        }),
      ),
      byLocation: (
        byLocationRaw as { currentLocationId: string; _count: { currentLocationId: number } }[]
      ).map((g) => ({
        locationId: g.currentLocationId,
        locationName: locationNames.get(g.currentLocationId) ?? "Unknown",
        count: g._count.currentLocationId,
      })),
      byDepartment: (
        byDepartmentRaw as { currentDepartmentId: string; _count: { currentDepartmentId: number } }[]
      ).map((g) => ({
        departmentId: g.currentDepartmentId,
        departmentName: departmentNames.get(g.currentDepartmentId) ?? "Unknown",
        count: g._count.currentDepartmentId,
      })),
      recentlyRegistered: (recentlyRegistered as Row[]).map((row) => toListItem(row, now)),
      recentAssignments: (
        recentAssignments as (RawAssignment & { asset: { assetTag: string } })[]
      ).map((row) => ({ ...mapAssignment(row), assetTag: row.asset.assetTag })),
      upcomingWarrantyExpirations: (upcomingWarranty as Row[]).map((row) => toListItem(row, now)),
    };
  },
};
