// Asset repository port (contracts only — framework-independent).

import type { AssetHistoryEvent } from "../domain/constants/asset-constants";
import type { AssetCondition, AssetStatus } from "../domain/constants/asset-constants";
import type {
  AssetAssignmentEntity,
  AssetDashboardMetrics,
  AssetDetail,
  AssetListItem,
  AssetListQuery,
  AssignmentHistoryQuery,
  CategoryListQuery,
  CategoryWithAssetCount,
  ModelListQuery,
  ModelWithAssetCount,
  PaginatedResult,
} from "../domain/entities/asset";

export interface PersistAssetInput {
  name: string;
  assetTag: string;
  description: string | null;
  categoryId: string;
  modelId: string | null;
  brand: string | null;
  serialNumber: string | null;
  purchaseDate: Date;
  purchaseCost: string;
  currency: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  warrantyStartDate: Date | null;
  warrantyEndDate: Date | null;
  condition: AssetCondition;
  currentLocationId: string | null;
  currentDepartmentId: string | null;
}

export interface PersistAssignmentInput {
  membershipId: string;
  assigneeUserId: string;
  assigneeName: string;
  assigneeEmail: string;
  locationId: string;
  departmentId: string | null;
  assignedAt: Date;
  expectedReturnAt: Date | null;
  condition: AssetCondition;
  notes: string | null;
  createdBy: string;
}

export interface RecordHistoryInput {
  assetId: string | null;
  eventType: AssetHistoryEvent;
  actorUserId: string | null;
  summary: string;
  metadata?: Record<string, string>;
}

export interface DashboardQuery {
  now: Date;
}

export interface AssetRepository {
  // Categories
  listCategories(
    organizationId: string,
    query: CategoryListQuery,
  ): Promise<PaginatedResult<CategoryWithAssetCount>>;
  getCategoryById(organizationId: string, categoryId: string): Promise<CategoryWithAssetCount | null>;
  createCategory(
    organizationId: string,
    input: { name: string; code: string; description: string | null },
  ): Promise<CategoryWithAssetCount>;
  updateCategory(
    organizationId: string,
    categoryId: string,
    input: { name: string; code: string; description: string | null },
  ): Promise<CategoryWithAssetCount>;
  setCategoryActive(
    organizationId: string,
    categoryId: string,
    isActive: boolean,
  ): Promise<CategoryWithAssetCount>;

  // Models
  listModels(
    organizationId: string,
    query: ModelListQuery,
  ): Promise<PaginatedResult<ModelWithAssetCount>>;
  getModelById(organizationId: string, modelId: string): Promise<ModelWithAssetCount | null>;
  createModel(
    organizationId: string,
    input: {
      categoryId: string;
      brand: string;
      modelName: string;
      modelCode: string | null;
      description: string | null;
    },
  ): Promise<ModelWithAssetCount>;
  updateModel(
    organizationId: string,
    modelId: string,
    input: {
      categoryId: string;
      brand: string;
      modelName: string;
      modelCode: string | null;
      description: string | null;
    },
  ): Promise<ModelWithAssetCount>;
  setModelActive(
    organizationId: string,
    modelId: string,
    isActive: boolean,
  ): Promise<ModelWithAssetCount>;

  // Assets
  listAssets(
    organizationId: string,
    query: AssetListQuery,
  ): Promise<PaginatedResult<AssetListItem>>;
  getAssetDetail(organizationId: string, assetId: string): Promise<AssetDetail | null>;
  createAsset(organizationId: string, input: PersistAssetInput): Promise<AssetDetail>;
  updateAsset(
    organizationId: string,
    assetId: string,
    input: PersistAssetInput,
  ): Promise<AssetDetail>;
  archiveAsset(organizationId: string, assetId: string): Promise<AssetDetail>;

  // Assignments (transactional: assignment row + asset status/placement move together)
  assignAsset(
    organizationId: string,
    assetId: string,
    input: PersistAssignmentInput,
  ): Promise<AssetDetail>;
  returnAsset(
    organizationId: string,
    assetId: string,
    input: { returnCondition: AssetCondition; notes: string | null; returnedAt: Date },
  ): Promise<AssetDetail>;
  listAssignmentHistory(
    organizationId: string,
    query: AssignmentHistoryQuery,
  ): Promise<PaginatedResult<AssetAssignmentEntity>>;

  // History + dashboard
  recordHistory(organizationId: string, input: RecordHistoryInput): Promise<void>;
  getDashboardMetrics(organizationId: string, query: DashboardQuery): Promise<AssetDashboardMetrics>;
}

export type { AssetStatus };
