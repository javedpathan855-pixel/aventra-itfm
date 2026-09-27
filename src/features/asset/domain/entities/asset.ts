// Asset domain entities (framework-independent).
//
// Monetary amounts are decimal strings (exactly two fraction digits max) —
// never floats. Dates cross layer boundaries as Date objects.

import type { AssetCondition, AssetStatus, WarrantyStatus } from "../constants/asset-constants";

export interface AssetCategoryEntity {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetModelEntity {
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

export interface AssetEntity {
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
  /** Decimal string, e.g. "125000.00". */
  purchaseCost: string;
  currency: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  warrantyStartDate: Date | null;
  warrantyEndDate: Date | null;
  condition: AssetCondition;
  status: AssetStatus;
  currentLocationId: string | null;
  currentDepartmentId: string | null;
  activeAssignmentId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetAssignmentEntity {
  id: string;
  organizationId: string;
  assetId: string;
  membershipId: string | null;
  assigneeUserId: string;
  /** Snapshot at handover — immune to later renames. */
  assigneeName: string;
  assigneeEmail: string;
  locationId: string;
  locationName: string;
  departmentId: string | null;
  departmentName: string | null;
  assignedAt: Date;
  expectedReturnAt: Date | null;
  returnedAt: Date | null;
  assignmentCondition: AssetCondition;
  returnCondition: AssetCondition | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  /** Populated by history/report listings for display; absent on writes. */
  assetTag?: string;
}

export interface AssetHistoryEntity {
  id: string;
  organizationId: string;
  assetId: string | null;
  eventType: string;
  actorUserId: string | null;
  summary: string;
  metadata: Record<string, string> | null;
  createdAt: Date;
}

/** List row: asset plus resolved relation names and live assignment state. */
export interface AssetListItem extends AssetEntity {
  categoryName: string;
  modelName: string | null;
  locationName: string | null;
  departmentName: string | null;
  assigneeName: string | null;
  warrantyStatus: WarrantyStatus;
}

export interface AssetWithCounts extends AssetListItem {
  assignmentCount: number;
}

export interface CategoryWithAssetCount extends AssetCategoryEntity {
  assetCount: number;
  modelCount: number;
}

export interface ModelWithAssetCount extends AssetModelEntity {
  categoryName: string;
  assetCount: number;
}

export interface AssetDetail extends AssetEntity {
  categoryName: string;
  modelName: string | null;
  modelCode: string | null;
  brandResolved: string | null;
  locationName: string | null;
  departmentName: string | null;
  warrantyStatus: WarrantyStatus;
  assignments: AssetAssignmentEntity[];
  activeAssignment: AssetAssignmentEntity | null;
  history: AssetHistoryEntity[];
}

export type AssetStatusFilter = "all" | AssetStatus | "ARCHIVED";
export type AssetAvailabilityFilter = "all" | "available" | "assigned";
export type AssetWarrantyFilter = "all" | WarrantyStatus;
export type AssetSortField = "name" | "assetTag" | "purchaseDate" | "createdAt" | "purchaseCost" | "warrantyEndDate";
export type SortDirection = "asc" | "desc";

export interface AssetListQuery {
  search?: string;
  status?: AssetStatusFilter;
  availability?: AssetAvailabilityFilter;
  categoryId?: string;
  modelId?: string;
  locationId?: string;
  departmentId?: string;
  warranty?: AssetWarrantyFilter;
  purchaseFrom?: string;
  purchaseTo?: string;
  sortBy?: AssetSortField;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface CategoryListQuery {
  search?: string;
  status?: "all" | "active" | "inactive";
  sortBy?: "name" | "code" | "createdAt";
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface ModelListQuery extends CategoryListQuery {
  categoryId?: string;
}

export interface AssignmentHistoryQuery {
  search?: string;
  assetId?: string;
  membershipId?: string;
  locationId?: string;
  openOnly?: boolean;
  from?: string;
  to?: string;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AssetDashboardMetrics {
  totalActive: number;
  available: number;
  assigned: number;
  maintenance: number;
  retired: number;
  archived: number;
  warrantyExpiringSoon: number;
  warrantyExpired: number;
  byCategory: { categoryId: string; categoryName: string; count: number }[];
  byLocation: { locationId: string; locationName: string; count: number }[];
  byDepartment: { departmentId: string; departmentName: string; count: number }[];
  recentlyRegistered: AssetListItem[];
  recentAssignments: AssetAssignmentEntity[];
  upcomingWarrantyExpirations: AssetListItem[];
}
