"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import {
  Archive,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  Package,
  PackageCheck,
  PackageOpen,
  Wrench,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { AssetDashboardMetrics } from "../../domain/entities/asset";
import { fadeInVariants } from "@/shared/animation";

interface AssetDashboardViewProps {
  metrics: AssetDashboardMetrics;
  userRole: string;
}

const formatDate = (value: Date | string): string =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

interface Kpi {
  label: string;
  value: number;
  hint: string;
  icon: typeof Package;
}

const DistributionBar = ({
  label,
  count,
  max,
  href,
}: {
  label: string;
  count: number;
  max: number;
  href?: string;
}) => {
  const width = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  const row = (
    <>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <span className="truncate text-xs text-foreground">{label}</span>
        <span className="shrink-0 text-xs font-semibold text-foreground">{count}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
        role="img"
        aria-label={`${label}: ${count} assets`}
      >
        <div className="h-full rounded-full bg-primary motion-reduce:transition-none" style={{ width: `${width}%` }} />
      </div>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {row}
    </Link>
  ) : (
    <div className="flex flex-col gap-1">{row}</div>
  );
};

export const AssetDashboardView = ({ metrics, userRole }: AssetDashboardViewProps) => {
  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const router = useRouter();
  const kpis: Kpi[] = [
    { label: "Total Active", value: metrics.totalActive, hint: "Non-archived assets", icon: Package },
    { label: "Available", value: metrics.available, hint: "Ready to assign", icon: PackageOpen },
    { label: "Assigned", value: metrics.assigned, hint: "With employees", icon: PackageCheck },
    { label: "Maintenance", value: metrics.maintenance, hint: "Under repair", icon: Wrench },
    { label: "Retired", value: metrics.retired, hint: "End of life", icon: Archive },
    { label: "Archived", value: metrics.archived, hint: "Soft-archived", icon: Archive },
    { label: "Warranty Expiring", value: metrics.warrantyExpiringSoon, hint: "Within 30 days", icon: CalendarClock },
    { label: "Warranty Expired", value: metrics.warrantyExpired, hint: "Coverage lapsed", icon: CircleAlert },
  ];
  const maxCategory = Math.max(0, ...metrics.byCategory.map((c) => c.count));
  const maxLocation = Math.max(0, ...metrics.byLocation.map((l) => l.count));
  const maxDepartment = Math.max(0, ...metrics.byDepartment.map((d) => d.count));

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
              Asset Dashboard
            </h1>
            <p className="text-xs text-muted">Live overview of your organization&apos;s assets</p>
          </div>
          {canManage && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                router.push("/assets/new");
              }}
              className="gap-1.5 self-start sm:self-auto"
            >
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              Register Asset
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Asset KPIs">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-bold text-foreground">{kpi.value}</span>
                  <span className="truncate text-[11px] font-medium text-foreground">{kpi.label}</span>
                  <span className="truncate text-[10px] text-muted">{kpi.hint}</span>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">Assets by Category</h2>
            {metrics.byCategory.length === 0 ? (
              <p className="text-xs text-muted">No active assets yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {metrics.byCategory.map((entry) => (
                  <DistributionBar
                    key={entry.categoryId}
                    label={entry.categoryName}
                    count={entry.count}
                    max={maxCategory}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">Assets by Location</h2>
            {metrics.byLocation.length === 0 ? (
              <p className="text-xs text-muted">No placed assets yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {metrics.byLocation.map((entry) => (
                  <DistributionBar
                    key={entry.locationId}
                    label={entry.locationName}
                    count={entry.count}
                    max={maxLocation}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">Assets by Department</h2>
            {metrics.byDepartment.length === 0 ? (
              <p className="text-xs text-muted">No department placements yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {metrics.byDepartment.map((entry) => (
                  <DistributionBar
                    key={entry.departmentId}
                    label={entry.departmentName}
                    count={entry.count}
                    max={maxDepartment}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">Recently Registered</h2>
            {metrics.recentlyRegistered.length === 0 ? (
              <p className="text-xs text-muted">No assets registered yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {metrics.recentlyRegistered.map((asset) => (
                  <li key={asset.id}>
                    <Link
                      href={`/assets/${asset.id}`}
                      className="flex items-center justify-between gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-foreground">
                          {asset.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {asset.assetTag} · {asset.categoryName}
                        </span>
                      </span>
                      <Badge variant="outline" size="sm" className="shrink-0">
                        {asset.status.charAt(0) + asset.status.slice(1).toLowerCase()}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">Recent Assignments</h2>
            {metrics.recentAssignments.length === 0 ? (
              <p className="text-xs text-muted">No assignments recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {metrics.recentAssignments.map((assignment) => (
                  <li key={assignment.id} className="flex flex-col gap-0.5">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {assignment.assetTag ?? "Asset"} → {assignment.assigneeName}
                    </span>
                    <span className="truncate text-[11px] text-muted" suppressHydrationWarning>
                      {assignment.locationName} · {formatDate(assignment.assignedAt)}
                      {assignment.returnedAt ? " · Returned" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">Warranty Expiring Soon</h2>
            {metrics.upcomingWarrantyExpirations.length === 0 ? (
              <p className="text-xs text-muted">No warranties expiring in the next 30 days.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {metrics.upcomingWarrantyExpirations.map((asset) => (
                  <li key={asset.id}>
                    <Link
                      href={`/assets/${asset.id}`}
                      className="flex items-center justify-between gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-foreground">
                          {asset.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {asset.assetTag}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-warning" suppressHydrationWarning>
                        {asset.warrantyEndDate ? formatDate(asset.warrantyEndDate) : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </motion.div>
    </MotionConfig>
  );
};
