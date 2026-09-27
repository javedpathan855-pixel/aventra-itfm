// Asset reports and CSV export (application layer).
//
// Report presets translate to the existing list/history queries so
// reporting never invents a parallel query path. Export reuses the same
// filters with pagination removed and a hard server-side row cap.

import { AppError, normalizeError } from "@/shared/error/app-error";
import { resolveAuthorizationContext } from "@/features/auth/application/authorization/resolve-authorization-context";
import { requirePermission } from "@/features/auth/application/authorization/guards";
import { ASSET_EXPORT_MAX_ROWS } from "../../domain/constants/asset-constants";
import type { AssetListItem, AssetListQuery } from "../../domain/entities/asset";
import { assetReportSchema } from "../../domain/schemas/asset.schema";
import type { AssetUseCasesDeps } from "./asset-deps";

type ReportKind =
  | "inventory"
  | "available"
  | "assigned"
  | "category"
  | "location"
  | "department"
  | "warranty"
  | "assignments";

const requireActiveOrganization = (organizationId: string | null): string => {
  if (!organizationId) {
    throw new AppError("FORBIDDEN", { message: "No active organization selected." });
  }
  return organizationId;
};

const assetColumnsFor = (report: ReportKind): string[] => {
  switch (report) {
    case "assigned":
      return [
        "Asset Tag", "Name", "Category", "Model", "Serial", "Assignee",
        "Location", "Department", "Status", "Warranty", "Purchase Date",
      ];
    case "warranty":
      return [
        "Asset Tag", "Name", "Category", "Warranty Status", "Warranty Expiry",
        "Location", "Assignee", "Status",
      ];
    case "assignments":
      return [
        "Asset", "Employee", "Email", "Location", "Department",
        "Assigned At", "Expected Return", "Returned At", "Condition", "Notes",
      ];
    default:
      return [
        "Asset Tag", "Name", "Category", "Model", "Serial", "Status",
        "Condition", "Location", "Department", "Assignee",
        "Purchase Date", "Cost", "Currency", "Warranty Expiry",
      ];
  }
};

const assetRowFor = (report: ReportKind, item: AssetListItem): string[] => {
  const model = item.modelName ?? item.brand ?? "";
  switch (report) {
    case "assigned":
      return [
        item.assetTag, item.name, item.categoryName, model, item.serialNumber ?? "",
        item.assigneeName ?? "", item.locationName ?? "", item.departmentName ?? "",
        item.status, item.warrantyStatus, item.purchaseDate.toISOString().slice(0, 10),
      ];
    case "warranty":
      return [
        item.assetTag, item.name, item.categoryName, item.warrantyStatus,
        item.warrantyEndDate ? item.warrantyEndDate.toISOString().slice(0, 10) : "",
        item.locationName ?? "", item.assigneeName ?? "", item.status,
      ];
    default:
      return [
        item.assetTag, item.name, item.categoryName, model, item.serialNumber ?? "",
        item.status, item.condition, item.locationName ?? "", item.departmentName ?? "",
        item.assigneeName ?? "", item.purchaseDate.toISOString().slice(0, 10),
        item.purchaseCost, item.currency,
        item.warrantyEndDate ? item.warrantyEndDate.toISOString().slice(0, 10) : "",
      ];
  }
};

/**
 * Escape a single CSV cell. Guards against spreadsheet formula injection
 * by neutralizing leading =, +, -, @, tab and carriage-return characters.
 */
export const escapeCsvCell = (value: string): string => {
  const needsPrefix = /^[=+\-@\t\r]/.test(value);
  const safe = needsPrefix ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const buildCsvDocument = (columns: string[], rows: string[][]): string =>
  `\uFEFF${[columns, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;

interface ReportFilters {
  categoryId?: string;
  locationId?: string;
  departmentId?: string;
  status: string;
  from?: string;
  to?: string;
  sortDirection: "asc" | "desc";
  page: number;
  pageSize: number;
}

const toAssetFilters = (
  report: ReportKind,
  parsed: ReportFilters,
): Partial<AssetListQuery> => {
  const base = {
    categoryId: parsed.categoryId || undefined,
    locationId: parsed.locationId || undefined,
    departmentId: parsed.departmentId || undefined,
    sortDirection: parsed.sortDirection,
  };
  switch (report) {
    case "available":
      return { ...base, availability: "available" as const };
    case "assigned":
      return { ...base, availability: "assigned" as const };
    case "warranty":
      return { ...base, sortBy: "warrantyEndDate" as const, sortDirection: "asc" as const };
    default:
      return {
        ...base,
        status: (parsed.status === "all" ? undefined : parsed.status) as
          | "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED" | "ARCHIVED" | undefined,
      };
  }
};

export const executeGetAssetReport = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = assetReportSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.report.read");
    const organizationId = requireActiveOrganization(context.organizationId);
    const report = parsed.data.report as ReportKind;
    if (report === "assignments") {
      const history = await deps.assetRepository.listAssignmentHistory(organizationId, {
        search: parsed.data.search || undefined,
        locationId: parsed.data.locationId || undefined,
        from: parsed.data.from ?? undefined,
        to: parsed.data.to ?? undefined,
        sortDirection: parsed.data.sortDirection,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
      });
      return {
        report,
        columns: assetColumnsFor(report),
        rows: history.items.map((a) => [
          a.assetTag ?? a.assetId, a.assigneeName, a.assigneeEmail, a.locationName, a.departmentName ?? "",
          a.assignedAt.toISOString(), a.expectedReturnAt ? a.expectedReturnAt.toISOString() : "",
          a.returnedAt ? a.returnedAt.toISOString() : "", a.assignmentCondition,
          a.notes ?? "",
        ]),
        total: history.total,
        page: history.page,
        pageSize: history.pageSize,
        totalPages: history.totalPages,
      };
    }
    const filters = toAssetFilters(report, {
      categoryId: parsed.data.categoryId,
      locationId: parsed.data.locationId,
      departmentId: parsed.data.departmentId,
      status: parsed.data.status,
      from: parsed.data.from ?? undefined,
      to: parsed.data.to ?? undefined,
      sortDirection: parsed.data.sortDirection,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
    const result = await deps.assetRepository.listAssets(organizationId, {
      search: parsed.data.search,
      purchaseFrom: parsed.data.from ?? undefined,
      purchaseTo: parsed.data.to ?? undefined,
      ...filters,
      sortBy: filters.sortBy ?? "name",
    });
    const items =
      report === "warranty" ? result.items.filter((item) => item.warrantyEndDate !== null) : result.items;
    return {
      report,
      columns: assetColumnsFor(report),
      rows: items.map((item) => assetRowFor(report, item)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizeError(error);
  }
};

export const executeExportAssetReport = async (rawInput: unknown, deps: AssetUseCasesDeps) => {
  const parsed = assetReportSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }
  try {
    const context = await resolveAuthorizationContext({ autoSelectDefault: true }, deps);
    requirePermission(context, "asset.export");
    const organizationId = requireActiveOrganization(context.organizationId);
    const report = parsed.data.report as ReportKind;
    const columns = assetColumnsFor(report);
    let rows: string[][];
    let total: number;
    if (report === "assignments") {
      const history = await deps.assetRepository.listAssignmentHistory(organizationId, {
        search: parsed.data.search || undefined,
        locationId: parsed.data.locationId || undefined,
        from: parsed.data.from ?? undefined,
        to: parsed.data.to ?? undefined,
        sortDirection: parsed.data.sortDirection,
        page: 1,
        pageSize: ASSET_EXPORT_MAX_ROWS,
      });
      total = history.total;
      rows = history.items.map((a) => [
        a.assetTag ?? a.assetId, a.assigneeName, a.assigneeEmail, a.locationName, a.departmentName ?? "",
        a.assignedAt.toISOString(), a.expectedReturnAt ? a.expectedReturnAt.toISOString() : "",
        a.returnedAt ? a.returnedAt.toISOString() : "", a.assignmentCondition, a.notes ?? "",
      ]);
    } else {
      const filters = toAssetFilters(report, {
        categoryId: parsed.data.categoryId,
        locationId: parsed.data.locationId,
        departmentId: parsed.data.departmentId,
        status: parsed.data.status,
        from: parsed.data.from ?? undefined,
        to: parsed.data.to ?? undefined,
        sortDirection: parsed.data.sortDirection,
        page: 1,
        pageSize: ASSET_EXPORT_MAX_ROWS,
      });
      const result = await deps.assetRepository.listAssets(organizationId, {
        search: parsed.data.search,
        purchaseFrom: parsed.data.from ?? undefined,
        purchaseTo: parsed.data.to ?? undefined,
        ...filters,
        sortBy: filters.sortBy ?? "name",
      });
      const items =
        report === "warranty" ? result.items.filter((i) => i.warrantyEndDate !== null) : result.items;
      total = result.total;
      rows = items.map((item) => assetRowFor(report, item));
    }
    const truncated = total > rows.length;
    const date = new Date().toISOString().slice(0, 10);
    return {
      report,
      filename: `aventra-assets-${report}-${date}.csv`,
      csv: buildCsvDocument(columns, rows),
      rowCount: rows.length,
      truncated,
    };
  } catch (error) {
    throw normalizeError(error);
  }
};
