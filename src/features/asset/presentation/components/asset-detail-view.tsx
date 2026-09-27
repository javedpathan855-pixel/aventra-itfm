"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MotionConfig, motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Pencil,
  Undo2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "@/shared/components/ui/toast";
import { archiveAssetAction, assignAssetAction, returnAssetAction } from "@/app/assets/actions";
import type { AssetDetail } from "../../domain/entities/asset";
import type { AssignAssetInput } from "../../domain/schemas/asset.schema";
import type { ReturnAssetInput } from "../../domain/schemas/asset.schema";
import { fadeInVariants } from "@/shared/animation";
import { AssignmentDialog, type EmployeeOption, type PlacementOption } from "./assignment-dialog";
import { ReturnDialog } from "./return-dialog";

interface AssetDetailViewProps {
  initialAsset: AssetDetail;
  userRole: string;
  employees: EmployeeOption[];
  locations: PlacementOption[];
  departments: PlacementOption[];
}

const STATUS_BADGE_VARIANT = {
  AVAILABLE: "success",
  ASSIGNED: "primary",
  MAINTENANCE: "warning",
  RETIRED: "outline",
} as const;

const formatDate = (value: Date | string | null): string => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value: Date | string): string => {
  const d = new Date(value);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-muted">{label}</span>
    <span className="text-xs font-medium text-foreground">{value ?? "—"}</span>
  </div>
);

export const AssetDetailView = ({
  initialAsset,
  userRole,
  employees,
  locations,
  departments,
}: AssetDetailViewProps) => {
  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const canOperate = canManage || userRole === "ENGINEER";
  const [asset, setAsset] = useState(initialAsset);
  const [isPending, startTransition] = useTransition();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isArchived = asset.archivedAt !== null;
  const canAssign = canOperate && !isArchived && asset.status === "AVAILABLE" && !asset.activeAssignmentId;
  const canReturn = canOperate && !isArchived && asset.activeAssignmentId !== null;
  const canArchive = canManage && !isArchived;

  const handleAssign = async (values: AssignAssetInput) => {
    setIsSaving(true);
    try {
      const result = await assignAssetAction({ ...values, assetId: asset.id });
      if (!result.ok) {
        toast.error("Failed to assign asset", { description: result.message });
        return;
      }
      setAsset(result.data.asset);
      toast.success("Asset assigned", {
        description: `${result.data.asset.name} was assigned successfully.`,
      });
      setIsAssignOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturn = async (values: ReturnAssetInput) => {
    setIsSaving(true);
    try {
      const result = await returnAssetAction({ ...values, assetId: asset.id });
      if (!result.ok) {
        toast.error("Failed to return asset", { description: result.message });
        return;
      }
      setAsset(result.data.asset);
      toast.success("Asset returned", {
        description: `${result.data.asset.name} is available again.`,
      });
      setIsReturnOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = () => {
    if (asset.activeAssignmentId) {
      toast.error("Cannot archive an assigned asset", {
        description: "Return the active assignment first.",
      });
      return;
    }
    if (!window.confirm(`Archiving preserves ${asset.name} and its history while removing it from active lists.\n\nContinue?`)) {
      return;
    }
    startTransition(async () => {
      const result = await archiveAssetAction({ assetId: asset.id });
      if (!result.ok) {
        toast.error("Failed to archive asset", { description: result.message });
        return;
      }
      setAsset(result.data.asset);
      toast.success("Asset archived", {
        description: `${result.data.asset.name} was archived successfully.`,
      });
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={fadeInVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-4"
      >
        <div className="self-start">
          <Link
            href="/assets"
            className="inline-flex items-center gap-1.5 self-start text-xs text-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to registry
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <Package className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">{asset.name}</h1>
                {isArchived ? (
                  <Badge variant="outline" size="sm">
                    Archived
                  </Badge>
                ) : (
                  <Badge variant={STATUS_BADGE_VARIANT[asset.status]} size="sm">
                    {asset.status.charAt(0) + asset.status.slice(1).toLowerCase()}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted">
                {asset.assetTag} · {asset.categoryName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Link
                href={`/assets/${asset.id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition-all duration-200 hover:bg-surface-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Link>
            )}
            {canAssign && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isPending}
                onClick={() => setIsAssignOpen(true)}
                className="gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Assign
              </Button>
            )}
            {canReturn && asset.activeAssignment && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setIsReturnOpen(true)}
                className="gap-1.5"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                Return
              </Button>
            )}
            {canArchive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleArchive}
                className="gap-1.5 text-error border-error/30 hover:bg-error/10 hover:border-error/50"
              >
                Archive
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">Asset Identity</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow label="Asset Tag" value={asset.assetTag} />
              <InfoRow label="Category" value={asset.categoryName} />
              <InfoRow label="Model" value={asset.modelName} />
              <InfoRow label="Brand" value={asset.brandResolved} />
              <InfoRow label="Serial Number" value={asset.serialNumber} />
              <InfoRow label="Condition" value={asset.condition} />
            </div>
            {asset.description && (
              <p className="text-xs text-muted leading-relaxed">{asset.description}</p>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">Purchase & Warranty</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow label="Purchase Date" value={formatDate(asset.purchaseDate)} />
              <InfoRow label="Purchase Cost" value={`${asset.purchaseCost} ${asset.currency}`} />
              <InfoRow label="Vendor" value={asset.vendorName} />
              <InfoRow label="Invoice" value={asset.invoiceNumber} />
              <InfoRow label="Warranty Start" value={formatDate(asset.warrantyStartDate)} />
              <InfoRow label="Warranty Expiry" value={formatDate(asset.warrantyEndDate)} />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">Placement & Assignment</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow label="Location" value={asset.locationName} />
              <InfoRow label="Department" value={asset.departmentName} />
            </div>
            {asset.activeAssignment ? (
              <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-surface/30 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <UserPlus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Assigned to {asset.activeAssignment.assigneeName}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs text-muted">
                  <span>Since {formatDate(asset.activeAssignment.assignedAt)}</span>
                  {asset.activeAssignment.expectedReturnAt && (
                    <span>Due {formatDate(asset.activeAssignment.expectedReturnAt)}</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">
                {isArchived ? "Archived assets cannot be assigned." : "This asset is currently available."}
              </p>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-bold text-foreground">
              Assignment History ({asset.assignments.length})
            </h2>
            {asset.assignments.length === 0 ? (
              <p className="text-xs text-muted">No assignments recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Assignment history">
                {asset.assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex flex-col gap-1 rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {assignment.assigneeName}
                      </span>
                      {assignment.returnedAt ? (
                        <Badge variant="outline" size="sm">
                          Returned
                        </Badge>
                      ) : (
                        <Badge variant="primary" size="sm">
                          Active
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted">
                      {assignment.locationName}
                      {assignment.departmentName ? ` · ${assignment.departmentName}` : ""} ·{" "}
                      {formatDate(assignment.assignedAt)}
                      {assignment.returnedAt ? ` → ${formatDate(assignment.returnedAt)}` : ""}
                    </span>
                    {assignment.notes && (
                      <span className="text-[11px] text-muted">{assignment.notes}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-bold text-foreground">Event History</h2>
          {asset.history.length === 0 ? (
            <p className="text-xs text-muted">No events recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Asset event history">
              {asset.history.map((event) => (
                <li key={event.id} className="flex items-start gap-2 text-xs">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted mt-0.5" aria-hidden="true" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-foreground font-medium">{event.summary}</span>
                    <span className="text-[11px] text-muted" suppressHydrationWarning>
                      {event.eventType} · {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-1 p-4">
          <h2 className="text-sm font-bold text-foreground">Record Information</h2>
          <p className="text-xs text-muted flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span suppressHydrationWarning>
              Created {formatDate(asset.createdAt)} · Last updated {formatDate(asset.updatedAt)}
              {isArchived && asset.archivedAt ? ` · Archived ${formatDate(asset.archivedAt)}` : ""}
            </span>
          </p>
        </Card>

        {canAssign && (
          <AssignmentDialog
            key={`assign-${asset.id}`}
            assetId={asset.id}
            isOpen={isAssignOpen}
            onClose={() => setIsAssignOpen(false)}
            onSave={handleAssign}
            employees={employees}
            locations={locations}
            departments={departments}
            isSaving={isSaving}
          />
        )}
        {canReturn && (
          <ReturnDialog
            key={`return-${asset.id}`}
            assetId={asset.id}
            isOpen={isReturnOpen}
            onClose={() => setIsReturnOpen(false)}
            onSave={handleReturn}
            isSaving={isSaving}
          />
        )}
      </motion.div>
    </MotionConfig>
  );
};
