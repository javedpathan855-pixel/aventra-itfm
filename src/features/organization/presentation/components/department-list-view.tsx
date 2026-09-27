"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { MotionConfig, motion } from "framer-motion";
import {
  Building2,
  Calendar,
  MapPin,
  MoreHorizontal,
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
import {
  getDepartmentDetailAction,
  listDepartmentsAction,
  listLocationsAction,
  saveDepartmentAction,
  setDepartmentActiveAction,
} from "@/app/organization/actions";
import type {
  DepartmentDetail,
  DepartmentWithLocationCount,
  LocationEntity,
  PaginatedResult,
} from "../../domain/entities/location-department";
import { fadeInVariants, orgCardStaggerVariants, orgPageStaggerVariants, orgSectionItemVariants } from "@/shared/animation";
import { DepartmentDialog, type DepartmentSaveInput } from "./department-dialog";

interface DepartmentListViewProps {
  initialData: PaginatedResult<DepartmentWithLocationCount>;
  userRole: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "code", label: "Code" },
  { value: "createdAt", label: "Recently added" },
] as const;

const formatCreatedDate = (value: Date | string): string =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

interface DepartmentCardMenuProps {
  department: DepartmentWithLocationCount;
  onEdit: (department: DepartmentWithLocationCount) => void;
  onToggleActive: (department: DepartmentWithLocationCount) => void;
}

const DepartmentCardMenu = ({
  department,
  onEdit,
  onToggleActive,
}: DepartmentCardMenuProps) => (
  <Dropdown>
    <DropdownTrigger
      aria-label={`Actions for ${department.name}`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors outline-none hover:bg-surface-elevated hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
    </DropdownTrigger>
    <DropdownContent align="right" className="min-w-44">
      <DropdownItem onClick={() => onEdit(department)}>Edit department</DropdownItem>
      <DropdownItem
        variant={department.isActive ? "danger" : "default"}
        onClick={() => onToggleActive(department)}
      >
        {department.isActive ? "Deactivate" : "Reactivate"}
      </DropdownItem>
    </DropdownContent>
  </Dropdown>
);

export const DepartmentListView = ({ initialData, userRole }: DepartmentListViewProps) => {
  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const [data, setData] = useState(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentDetail | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<LocationEntity[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = (overrides: Partial<{ q: string; status: string; sortBy: string; sortDirection: "asc" | "desc"; page: number }> = {}) => {
    const query = {
      search: overrides.q ?? searchInput,
      status: overrides.status ?? status,
      sortBy: overrides.sortBy ?? sortBy,
      sortDirection: overrides.sortDirection ?? sortDirection,
      page: overrides.page ?? 1,
      pageSize: data.pageSize,
    };
    startTransition(async () => {
      const result = await listDepartmentsAction(query);
      if (!result.ok) {
        toast.error("Failed to load departments", { description: result.message });
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
    setSortBy("name");
    setSortDirection("asc");
    fetchPage({ q: "", status: "all", sortBy: "name", sortDirection: "asc", page: 1 });
  };

  const openCreateDialog = async () => {
    const locationsResult = await listLocationsAction({ status: "active", pageSize: 100 });
    if (locationsResult.ok) {
      setAvailableLocations(locationsResult.data.items);
    }
    setEditingDepartment(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDepartment(null);
  };

  const handleSave = async (values: DepartmentSaveInput) => {
    setIsSaving(true);
    try {
      const wasEditing = editingDepartment !== null;
      const result = wasEditing
        ? await saveDepartmentAction({ ...values, departmentId: editingDepartment.id })
        : await saveDepartmentAction(values);
      if (!result.ok) {
        toast.error(wasEditing ? "Failed to save department" : "Failed to create department", {
          description: result.message,
        });
        return;
      }
      toast.success(wasEditing ? "Department updated" : "Department created", {
        description: `${result.data.department.name} was ${wasEditing ? "saved" : "added"} successfully.`,
      });
      handleCloseDialog();
      fetchPage({ page: wasEditing ? data.page : 1 });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = async (department: DepartmentWithLocationCount) => {
    const [detailResult, locationsResult] = await Promise.all([
      getDepartmentDetailAction({ departmentId: department.id }),
      listLocationsAction({ status: "active", pageSize: 100 }),
    ]);
    if (!detailResult.ok) {
      toast.error("Failed to load department", { description: detailResult.message });
      return;
    }
    if (locationsResult.ok) {
      setAvailableLocations(locationsResult.data.items);
    }
    setEditingDepartment(detailResult.data.department);
    setIsDialogOpen(true);
  };

  const handleToggleActive = (department: DepartmentWithLocationCount) => {
    const nextActive = !department.isActive;
    const message = nextActive
      ? "Reactivating restores this department with all of its location assignments intact."
      : "Deactivating will hide this department from active lists. Location assignments and history are preserved.";
    if (!window.confirm(`${message}\n\nContinue?`)) return;
    startTransition(async () => {
      const result = await setDepartmentActiveAction({
        departmentId: department.id,
        isActive: nextActive,
      });
      if (!result.ok) {
        toast.error(`${nextActive ? "Reactivation" : "Deactivation"} failed`, {
          description: result.message,
        });
        return;
      }
      toast.success(nextActive ? "Department reactivated" : "Department deactivated", {
        description: `${result.data.department.name} is now ${nextActive ? "active" : "inactive"}.`,
      });
      fetchPage({ page: data.page });
    });
  };

  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const rangeEnd = (data.page - 1) * data.pageSize + data.items.length;

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={orgPageStaggerVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-4"
      >
        <motion.div variants={orgSectionItemVariants} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Departments
            </h1>
            <p className="text-xs text-muted">
              {data.total} {data.total === 1 ? "department" : "departments"} in this organization
            </p>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={openCreateDialog}
              className="gap-1.5 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Department
            </Button>
          )}
        </motion.div>

        <motion.div variants={orgSectionItemVariants}>
          <Card className="p-4">
          <form
            onSubmit={applySearch}
            className="flex flex-col gap-3 lg:flex-row lg:items-end"
            role="search"
            aria-label="Search and filter departments"
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                type="text"
                placeholder="Search by name or code"
                aria-label="Search departments by name or code"
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
                <span className="text-[11px] font-medium text-muted">Sort by</span>
                <Select
                  aria-label="Sort departments"
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
        </motion.div>

        {isPending && (
          <p className="text-xs text-muted" role="status" aria-live="polite">
            Loading departments...
          </p>
        )}

        {data.items.length === 0 ? (
          <motion.div variants={fadeInVariants} initial="initial" animate="animate">
            <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated/60 text-muted">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-foreground">No departments found</p>
            <p className="max-w-sm text-xs text-muted">
              {searchInput || status !== "all"
                ? "Try adjusting your search or filters."
                : "Add your first department to organize work across locations."}
            </p>
            {canManage && !searchInput && status === "all" && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={openCreateDialog}
                className="mt-1 gap-1.5"
              >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Department
            </Button>
          )}
          </Card>
          </motion.div>
        ) : (
          <motion.ul
            variants={orgCardStaggerVariants}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-3"
            aria-label="Departments"
          >
            {data.items.map((department) => (
              <motion.li
                key={department.id}
                variants={orgSectionItemVariants}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
              >
                <Card className="flex flex-col gap-4 p-4 transition-colors hover:border-border-strong sm:p-5 lg:flex-row lg:items-center lg:gap-5">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-elevated/60 text-primary"
                      aria-hidden="true"
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          href={`/organization/departments/${department.id}`}
                          className="truncate text-sm font-semibold text-foreground rounded outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {department.name}
                        </Link>
                        <Badge variant={department.isActive ? "success" : "outline"} size="sm">
                          {department.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted">{department.code}</p>
                      {department.description && (
                        <p className="mt-1 truncate text-xs text-muted">{department.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:gap-5 lg:border-t-0 lg:pt-0">
                    <div
                      className="hidden h-12 w-px shrink-0 bg-border/60 lg:block"
                      aria-hidden="true"
                    />
                    <div className="flex min-w-28 items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                      <div className="flex min-w-0 flex-col">
                        <span className="text-[11px] text-muted">Locations</span>
                        <span className="truncate text-xs font-medium text-foreground">
                          {department.locationCount}{" "}
                          {department.locationCount === 1 ? "location" : "locations"}
                        </span>
                      </div>
                    </div>
                    <div
                      className="hidden h-12 w-px shrink-0 bg-border/60 sm:block"
                      aria-hidden="true"
                    />
                    <div className="flex min-w-28 items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                      <div className="flex min-w-0 flex-col">
                        <span className="text-[11px] text-muted">Created On</span>
                        <span className="truncate text-xs font-medium text-foreground" suppressHydrationWarning>
                          {formatCreatedDate(department.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <DepartmentCardMenu
                      department={department}
                      onEdit={openEditDialog}
                      onToggleActive={handleToggleActive}
                    />
                  )}
                </Card>
              </motion.li>
            ))}
          </motion.ul>
        )}

        {data.total > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted" aria-live="polite">
              Showing {rangeStart} to {rangeEnd} of {data.total}{" "}
              {data.total === 1 ? "department" : "departments"}
            </p>
            {data.totalPages > 1 && (
              <nav
                aria-label="Departments pagination"
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

        {canManage && (
          <DepartmentDialog
            key={editingDepartment ? `edit-${editingDepartment.id}` : "new-department"}
            isOpen={isDialogOpen}
            onClose={handleCloseDialog}
            onSave={handleSave}
            initialData={editingDepartment}
            availableLocations={availableLocations}
            isSaving={isSaving}
          />
        )}
      </motion.div>
    </MotionConfig>
  );
};
