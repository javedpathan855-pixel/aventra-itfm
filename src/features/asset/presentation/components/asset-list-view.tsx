"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { MotionConfig, motion } from "framer-motion";
import {
  MoreHorizontal,
  Package,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/shared/components/ui/dropdown";
import { toast } from "@/shared/components/ui/toast";
import { archiveAssetAction, listAssetsAction } from "@/app/assets/actions";
import type {
  AssetListItem,
  PaginatedResult,
} from "../../domain/entities/asset";
import { fadeInVariants } from "@/shared/animation";

interface LookupOption {
  id: string;
  name: string;
}

interface AssetListViewProps {
  initialData: PaginatedResult<AssetListItem>;
  userRole: string;
  categories: LookupOption[];
  models: { id: string; modelName: string }[];
  locations: LookupOption[];
  departments: LookupOption[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "RETIRED", label: "Retired" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "assigned", label: "Assigned" },
] as const;

const WARRANTY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING_SOON", label: "Expiring soon" },
  { value: "EXPIRED", label: "Expired" },
  { value: "NONE", label: "No warranty" },
] as const;

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "assetTag", label: "Asset tag" },
  { value: "purchaseDate", label: "Purchase date" },
  { value: "purchaseCost", label: "Purchase cost" },
  { value: "createdAt", label: "Recently added" },
] as const;

const STATUS_BADGE_VARIANT = {
  AVAILABLE: "success",
  ASSIGNED: "primary",
  MAINTENANCE: "warning",
  RETIRED: "outline",
} as const;

const formatPurchaseDate = (value: Date | string): string =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

interface AssetCardMenuProps {
  asset: AssetListItem;
  onViewDetails: (asset: AssetListItem) => void;
  onEdit: (asset: AssetListItem) => void;
  onArchive: (asset: AssetListItem) => void;
}

const AssetCardMenu = ({ asset, onViewDetails, onEdit, onArchive }: AssetCardMenuProps) => (
  <Dropdown>
    <DropdownTrigger
      aria-label={`Actions for ${asset.name}`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors outline-none hover:bg-surface-elevated hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
    </DropdownTrigger>
    <DropdownContent align="right" className="min-w-44">
      <DropdownItem onClick={() => onViewDetails(asset)}>
        View details
      </DropdownItem>
      <DropdownItem onClick={() => onEdit(asset)}>
        Edit asset
      </DropdownItem>
      {!asset.archivedAt && (
        <DropdownItem variant="danger" onClick={() => onArchive(asset)}>
          Archive asset
        </DropdownItem>
      )}
    </DropdownContent>
  </Dropdown>
);

export const AssetListView = ({
  initialData,
  userRole,
  categories,
  models,
  locations,
  departments,
}: AssetListViewProps) => {
  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [availability, setAvailability] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [warranty, setWarranty] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isPending, startTransition] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = (
    overrides: Partial<{
      q: string;
      status: string;
      availability: string;
      categoryId: string;
      modelId: string;
      locationId: string;
      departmentId: string;
      warranty: string;
      sortBy: string;
      sortDirection: "asc" | "desc";
      page: number;
    }> = {},
  ) => {
    const query = {
      search: overrides.q ?? searchInput,
      status: overrides.status ?? status,
      availability: overrides.availability ?? availability,
      categoryId: overrides.categoryId ?? categoryId,
      modelId: overrides.modelId ?? modelId,
      locationId: overrides.locationId ?? locationId,
      departmentId: overrides.departmentId ?? departmentId,
      warranty: overrides.warranty ?? warranty,
      sortBy: overrides.sortBy ?? sortBy,
      sortDirection: overrides.sortDirection ?? sortDirection,
      page: overrides.page ?? 1,
      pageSize: data.pageSize,
    };
    startTransition(async () => {
      const result = await listAssetsAction(query);
      if (!result.ok) {
        toast.error("Failed to load assets", { description: result.message });
        return;
      }
      setData(result.data);
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    searchTimer.current = setTimeout(() => {
      fetchPage({ q: value, page: 1 });
    }, 350);
  };

  const applySearch = (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    fetchPage({ page: 1 });
  };

  const handleReset = () => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    setSearchInput("");
    setStatus("all");
    setAvailability("all");
    setCategoryId("");
    setModelId("");
    setLocationId("");
    setDepartmentId("");
    setWarranty("all");
    setSortBy("name");
    setSortDirection("asc");
    fetchPage({
      q: "",
      status: "all",
      availability: "all",
      categoryId: "",
      modelId: "",
      locationId: "",
      departmentId: "",
      warranty: "all",
      sortBy: "name",
      sortDirection: "asc",
      page: 1,
    });
  };

  const handleArchive = (asset: AssetListItem) => {
    const message = asset.activeAssignmentId
      ? `${asset.name} is currently assigned and must be returned before archival. Continue to archive only if it has no active assignment.`
      : `Archiving preserves ${asset.name} and its history while removing it from active lists.\n\nContinue?`;
    if (!window.confirm(message)) return;
    startTransition(async () => {
      const result = await archiveAssetAction({ assetId: asset.id });
      if (!result.ok) {
        toast.error("Failed to archive asset", { description: result.message });
        return;
      }
      toast.success("Asset archived", {
        description: `${result.data.asset.name} was archived successfully.`,
      });
      fetchPage({ page: data.page });
    });
  };

  const hasActiveFilters =
    searchInput !== "" ||
    status !== "all" ||
    availability !== "all" ||
    categoryId !== "" ||
    modelId !== "" ||
    locationId !== "" ||
    departmentId !== "" ||
    warranty !== "all";

  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const rangeEnd = (data.page - 1) * data.pageSize + data.items.length;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={fadeInVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Asset Registry
            </h1>
            <p className="text-xs text-muted">
              {data.total} {data.total === 1 ? "asset" : "assets"} in this organization
            </p>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => router.push("/assets/new")}
              className="gap-1.5 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Asset
            </Button>
          )}
        </div>

        <Card className="p-4">
          <form
            onSubmit={applySearch}
            className="flex flex-col gap-3"
            role="search"
            aria-label="Search and filter assets"
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                type="text"
                placeholder="Search by name, tag, serial, brand or vendor"
                aria-label="Search assets by name, tag, serial, brand or vendor"
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Status</span>
                <Select
                  aria-label="Filter by status"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-36"
                  options={STATUS_OPTIONS.map((option) => ({ ...option }))}
                  value={status}
                  onChange={(next) => {
                    setStatus(next);
                    fetchPage({ status: next, page: 1 });
                  }}
                  disabled={isPending}
                />
              </div>

              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Availability</span>
                <Select
                  aria-label="Filter by availability"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-36"
                  options={AVAILABILITY_OPTIONS.map((option) => ({ ...option }))}
                  value={availability}
                  onChange={(next) => {
                    setAvailability(next);
                    fetchPage({ availability: next, page: 1 });
                  }}
                  disabled={isPending}
                />
              </div>

              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Category</span>
                <Select
                  aria-label="Filter by category"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-36"
                  options={[
                    { value: "", label: "All categories" },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  value={categoryId}
                  onChange={(next) => {
                    setCategoryId(next);
                    fetchPage({ categoryId: next, page: 1 });
                  }}
                  disabled={isPending}
                />
              </div>

              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Model</span>
                <Select
                  aria-label="Filter by model"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-36"
                  options={[
                    { value: "", label: "All models" },
                    ...models.map((m) => ({
                      value: m.id,
                      label: m.modelName,
                    })),
                  ]}
                  value={modelId}
                  onChange={(next) => {
                    setModelId(next);
                    fetchPage({ modelId: next, page: 1 });
                  }}
                  disabled={isPending}
                />
              </div>

              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Location</span>
                <Select
                  aria-label="Filter by location"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-36"
                  options={[
                    { value: "", label: "All locations" },
                    ...locations.map((l) => ({ value: l.id, label: l.name })),
                  ]}
                  value={locationId}
                  onChange={(next) => {
                    setLocationId(next);
                    fetchPage({ locationId: next, page: 1 });
                  }}
                  disabled={isPending}
                />
              </div>

              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Department</span>
                <Select
                  aria-label="Filter by department"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-36"
                  options={[
                    { value: "", label: "All departments" },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                  value={departmentId}
                  onChange={(next) => {
                    setDepartmentId(next);
                    fetchPage({ departmentId: next, page: 1 });
                  }}
                  disabled={isPending}
                />
              </div>

              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Warranty</span>
                <Select
                  aria-label="Filter by warranty"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-36"
                  options={WARRANTY_OPTIONS.map((option) => ({ ...option }))}
                  value={warranty}
                  onChange={(next) => {
                    setWarranty(next);
                    fetchPage({ warranty: next, page: 1 });
                  }}
                  disabled={isPending}
                />
              </div>

              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Sort by</span>
                <Select
                  aria-label="Sort assets"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-36"
                  options={SORT_OPTIONS.map((option) => ({ ...option }))}
                  value={sortBy}
                  onChange={(next) => {
                    setSortBy(next);
                    fetchPage({ sortBy: next, page: 1 });
                  }}
                  disabled={isPending}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={isPending}
                onClick={() => {
                  const next = sortDirection === "asc" ? "desc" : "asc";
                  setSortDirection(next);
                  fetchPage({ sortDirection: next, page: 1 });
                }}
                aria-label={sortDirection === "asc" ? "Sort descending" : "Sort ascending"}
              >
                {sortDirection === "asc" ? "↑ Asc" : "↓ Desc"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={isPending}
                onClick={handleReset}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </Button>
            </div>
          </form>
        </Card>

        {isPending && (
          <p className="text-xs text-muted" role="status" aria-live="polite">
            Loading assets...
          </p>
        )}

        {data.items.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated/60 text-muted">
              <Package className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-foreground">No assets found</p>
            <p className="max-w-sm text-xs text-muted">
              {hasActiveFilters
                ? "Try adjusting your search or filters."
                : "Register your first asset to start tracking your inventory."}
            </p>
            {canManage && !hasActiveFilters && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => router.push("/assets/new")}
                className="mt-1 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add Asset
              </Button>
            )}
          </Card>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Assets">
            {data.items.map((asset) => {
              const modelLabel = asset.modelName ?? asset.brand ?? null;
              const placement = [asset.locationName, asset.departmentName]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={asset.id}>
                  <Card className="flex flex-col gap-4 p-4 transition-colors hover:border-border-strong sm:p-5 lg:flex-row lg:items-center lg:gap-5">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated/60 text-primary"
                        aria-hidden="true"
                      >
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link
                            href={`/assets/${asset.id}`}
                            className="truncate text-sm font-semibold text-foreground rounded outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {asset.name}
                          </Link>
                          {asset.archivedAt ? (
                            <Badge variant="outline" size="sm">
                              Archived
                            </Badge>
                          ) : (
                            <Badge
                              variant={STATUS_BADGE_VARIANT[asset.status]}
                              size="sm"
                            >
                              {asset.status.charAt(0) + asset.status.slice(1).toLowerCase()}
                            </Badge>
                          )}
                          {asset.warrantyStatus === "EXPIRING_SOON" && !asset.archivedAt && (
                            <Badge variant="warning" size="sm">
                              Warranty expiring
                            </Badge>
                          )}
                          {asset.warrantyStatus === "EXPIRED" && !asset.archivedAt && (
                            <Badge variant="error" size="sm">
                              Warranty expired
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          {asset.assetTag}
                          {asset.serialNumber ? ` · ${asset.serialNumber}` : ""}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted">
                          {asset.categoryName}
                          {modelLabel ? ` · ${modelLabel}` : ""}
                        </p>
                        {(placement || asset.assigneeName) && (
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {[placement, asset.assigneeName ? `→ ${asset.assigneeName}` : null]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:gap-5 lg:border-t-0 lg:pt-0">
                      <div
                        className="hidden h-12 w-px shrink-0 bg-border/60 lg:block"
                        aria-hidden="true"
                      />
                      <div className="flex min-w-28 items-center gap-2">
                        <div className="flex min-w-0 flex-col">
                          <span className="text-[11px] text-muted">Purchased</span>
                          <span className="truncate text-xs font-medium text-foreground" suppressHydrationWarning>
                            {formatPurchaseDate(asset.purchaseDate)}
                          </span>
                        </div>
                      </div>
                      <div
                        className="hidden h-12 w-px shrink-0 bg-border/60 sm:block"
                        aria-hidden="true"
                      />
                      <div className="flex min-w-28 items-center gap-2">
                        <div className="flex min-w-0 flex-col">
                          <span className="text-[11px] text-muted">Cost</span>
                          <span className="truncate text-xs font-medium text-foreground">
                            {asset.purchaseCost} {asset.currency}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <AssetCardMenu
                        asset={asset}
                        onViewDetails={(item) => router.push(`/assets/${item.id}`)}
                        onEdit={(item) => router.push(`/assets/${item.id}/edit`)}
                        onArchive={handleArchive}
                      />
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {data.total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted" aria-live="polite">
              Showing {rangeStart} to {rangeEnd} of {data.total}{" "}
              {data.total === 1 ? "asset" : "assets"}
            </p>
            {data.totalPages > 1 && (
              <nav
                aria-label="Assets pagination"
                className="flex items-center gap-1.5 self-end sm:self-auto"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isPending || data.page <= 1}
                  onClick={() => fetchPage({ page: data.page - 1 })}
                  aria-label="Go to previous page"
                >
                  <span aria-hidden="true">‹</span>
                </Button>
                <span
                  aria-current="page"
                  aria-label={`Page ${data.page}`}
                  className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary-muted px-2 text-xs font-semibold text-primary"
                >
                  {data.page}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isPending || data.page >= data.totalPages}
                  onClick={() => fetchPage({ page: data.page + 1 })}
                  aria-label="Go to next page"
                >
                  <span aria-hidden="true">›</span>
                </Button>
              </nav>
            )}
          </div>
        )}
      </motion.div>
    </MotionConfig>
  );
};
