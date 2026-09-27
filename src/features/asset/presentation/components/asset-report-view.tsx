"use client";

import { useState, useTransition } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Download, FileBarChart, RotateCcw, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { toast } from "@/shared/components/ui/toast";
import { exportAssetReportAction, getAssetReportAction } from "@/app/assets/actions";
import { fadeInVariants } from "@/shared/animation";

interface LookupOption {
  id: string;
  name: string;
}

interface AssetReportViewProps {
  categories: LookupOption[];
  locations: LookupOption[];
  departments: LookupOption[];
  canExport: boolean;
}

type ReportKind =
  | "inventory"
  | "available"
  | "assigned"
  | "category"
  | "location"
  | "department"
  | "warranty"
  | "assignments";

const REPORT_OPTIONS: { value: ReportKind; label: string }[] = [
  { value: "inventory", label: "Complete Asset Inventory" },
  { value: "available", label: "Available Assets" },
  { value: "assigned", label: "Assigned Assets" },
  { value: "category", label: "Category-wise Assets" },
  { value: "location", label: "Location-wise Assets" },
  { value: "department", label: "Department-wise Assets" },
  { value: "warranty", label: "Warranty Expiry" },
  { value: "assignments", label: "Assignment History" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "RETIRED", label: "Retired" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

interface ReportResult {
  report: string;
  columns: string[];
  rows: string[][];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const AssetReportView = ({
  categories,
  locations,
  departments,
  canExport,
}: AssetReportViewProps) => {
  const [report, setReport] = useState<ReportKind>("inventory");
  const [searchInput, setSearchInput] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  const collectFilters = (page: number) => ({
    report,
    search: searchInput,
    categoryId,
    locationId,
    departmentId,
    status,
    from: from || undefined,
    to: to || undefined,
    sortDirection: "asc" as const,
    page,
    pageSize: result?.pageSize ?? 20,
  });

  const runReport = (page = 1) => {
    startTransition(async () => {
      const actionResult = await getAssetReportAction(collectFilters(page));
      if (!actionResult.ok) {
        toast.error("Failed to run report", { description: actionResult.message });
        return;
      }
      setResult(actionResult.data);
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const actionResult = await exportAssetReportAction(collectFilters(1));
      if (!actionResult.ok) {
        toast.error("Failed to export report", { description: actionResult.message });
        return;
      }
      downloadCsv(actionResult.data.filename, actionResult.data.csv);
      toast.success("Report exported", {
        description: `${actionResult.data.rowCount} rows downloaded${actionResult.data.truncated ? " (capped at 5,000 rows)" : ""}.`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setSearchInput("");
    setCategoryId("");
    setLocationId("");
    setDepartmentId("");
    setStatus("all");
    setFrom("");
    setTo("");
    setResult(null);
  };

  const showCategoryFilter = report === "inventory" || report === "category";
  const showStatusFilter = report !== "assignments" && report !== "warranty";
  const showDateFilter = report === "assignments";

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
              Asset Reports
            </h1>
            <p className="text-xs text-muted">Inventory, warranty and assignment reports</p>
          </div>
          {canExport && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void handleExport()}
              disabled={isExporting || isPending}
              isLoading={isExporting}
              className="gap-1.5 self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          )}
        </div>

        <Card className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runReport(1);
            }}
            className="flex flex-col gap-3"
            aria-label="Report filters"
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-52 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Report</span>
                <Select
                  aria-label="Report type"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-52"
                  options={REPORT_OPTIONS.map((o) => ({ ...o }))}
                  value={report}
                  onChange={(next) => {
                    setReport(next as ReportKind);
                    setResult(null);
                  }}
                  disabled={isPending}
                />
              </div>

              {showCategoryFilter && (
                <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                  <span className="text-[11px] font-medium text-muted">Category</span>
                  <Select
                    aria-label="Filter report by category"
                    size="md"
                    wrapperClassName="w-full sm:w-auto sm:min-w-36"
                    options={[
                      { value: "", label: "All categories" },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    value={categoryId}
                    onChange={setCategoryId}
                    disabled={isPending}
                  />
                </div>
              )}

              <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                <span className="text-[11px] font-medium text-muted">Location</span>
                <Select
                  aria-label="Filter report by location"
                  size="md"
                  wrapperClassName="w-full sm:w-auto sm:min-w-36"
                  options={[
                    { value: "", label: "All locations" },
                    ...locations.map((l) => ({ value: l.id, label: l.name })),
                  ]}
                  value={locationId}
                  onChange={setLocationId}
                  disabled={isPending}
                />
              </div>

              {(report === "inventory" || report === "department") && (
                <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                  <span className="text-[11px] font-medium text-muted">Department</span>
                  <Select
                    aria-label="Filter report by department"
                    size="md"
                    wrapperClassName="w-full sm:w-auto sm:min-w-36"
                    options={[
                      { value: "", label: "All departments" },
                      ...departments.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                    value={departmentId}
                    onChange={setDepartmentId}
                    disabled={isPending}
                  />
                </div>
              )}

              {showStatusFilter && (
                <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                  <span className="text-[11px] font-medium text-muted">Status</span>
                  <Select
                    aria-label="Filter report by status"
                    size="md"
                    wrapperClassName="w-full sm:w-auto sm:min-w-36"
                    options={STATUS_OPTIONS.map((o) => ({ ...o }))}
                    value={status}
                    onChange={setStatus}
                    disabled={isPending}
                  />
                </div>
              )}

              {showDateFilter && (
                <>
                  <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                    <span className="text-[11px] font-medium text-muted">From</span>
                    <Input
                      type="date"
                      aria-label="Filter from date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex min-w-36 flex-1 flex-col gap-1.5 sm:flex-none">
                    <span className="text-[11px] font-medium text-muted">To</span>
                    <Input
                      type="date"
                      aria-label="Filter to date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </>
              )}

              <Button type="submit" variant="primary" size="md" disabled={isPending}>
                {isPending ? "Running..." : "Run Report"}
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

            {report !== "assignments" && (
              <div className="relative min-w-0">
                <Search
                  className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  placeholder="Search within report (name, tag, serial...)"
                  aria-label="Search within report"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                  disabled={isPending}
                />
              </div>
            )}
          </form>
        </Card>

        {isPending && (
          <p className="text-xs text-muted" role="status" aria-live="polite">
            Running report...
          </p>
        )}

        {!result && !isPending && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated/60 text-muted">
              <FileBarChart className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-foreground">No report yet</p>
            <p className="max-w-sm text-xs text-muted">
              Choose a report type, adjust the filters and select Run Report to preview results.
            </p>
          </Card>
        )}

        {result && (
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted" aria-live="polite">
                {result.total} {result.total === 1 ? "row" : "rows"} · Page {result.page} of{" "}
                {result.totalPages}
              </p>
              {result.totalPages > 1 && (
                <nav aria-label="Report pagination" className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isPending || result.page <= 1}
                    onClick={() => runReport(result.page - 1)}
                    aria-label="Go to previous page"
                  >
                    <span aria-hidden="true">‹</span>
                  </Button>
                  <span
                    aria-current="page"
                    className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary-muted px-2 text-xs font-semibold text-primary"
                  >
                    {result.page}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isPending || result.page >= result.totalPages}
                    onClick={() => runReport(result.page + 1)}
                    aria-label="Go to next page"
                  >
                    <span aria-hidden="true">›</span>
                  </Button>
                </nav>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-max border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/60 bg-surface-elevated/40">
                    {result.columns.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-border/30 last:border-0 hover:bg-surface-elevated/30 transition-colors"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="max-w-56 truncate px-3 py-2 text-xs text-foreground"
                          title={cell}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </motion.div>
    </MotionConfig>
  );
};
