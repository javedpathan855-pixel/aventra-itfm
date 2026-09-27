"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MotionConfig, motion } from "framer-motion";
import { ArrowLeft, Building2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "@/shared/components/ui/toast";
import {
  listDepartmentsAction,
  removeAssignmentAction,
  saveLocationAction,
  setDefaultLocationAction,
  setLocationActiveAction,
  syncLocationAssignmentsAction,
} from "@/app/organization/actions";
import type {
  DepartmentEntity,
  LocationDetail,
} from "../../domain/entities/location-department";
import type { LocationInput } from "../../domain/schemas/location.schema";
import { LocationDialog } from "./location-dialog";
import { AssignmentManager } from "./assignment-manager";
import {
  orgPageStaggerVariants,
  orgSectionItemVariants,
} from "@/shared/animation";

interface LocationDetailViewProps {
  initialLocation: LocationDetail;
  userRole: string;
}

const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
    <span className="text-sm text-foreground">{value || "—"}</span>
  </div>
);

export const LocationDetailView = ({ initialLocation, userRole }: LocationDetailViewProps) => {
  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const [location, setLocation] = useState(initialLocation);
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignOptions, setAssignOptions] = useState<DepartmentEntity[]>([]);

  const runMutation = (
    label: string,
    action: () => Promise<
      | { ok: true; data: { location: LocationDetail } }
      | { ok: false; code: string; message: string }
    >,
    successMessage: (name: string) => string,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(`${label} failed`, { description: result.message });
        return;
      }
      setLocation(result.data.location);
      toast.success(label, { description: successMessage(result.data.location.name) });
    });
  };

  const handleSave = async (values: LocationInput) => {
    setIsSaving(true);
    try {
      const result = await saveLocationAction({ ...values, locationId: location.id });
      if (!result.ok) {
        toast.error("Failed to save location", { description: result.message });
        return;
      }
      setLocation(result.data.location);
      toast.success("Location updated", {
        description: `${result.data.location.name} was saved successfully.`,
      });
      setIsEditOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = () => {
    const nextActive = !location.isActive;
    const message = nextActive
      ? "Reactivating restores this location with all of its department assignments intact."
      : `Deactivating will hide this location from active lists.${location.isDefault ? " It is currently the default location, so default status will be cleared." : ""} Assignments and history are preserved.`;
    if (!window.confirm(`${message}\n\nContinue?`)) return;
    runMutation(
      nextActive ? "Location reactivated" : "Location deactivated",
      () => setLocationActiveAction({ locationId: location.id, isActive: nextActive }),
      (name) => `${name} is now ${nextActive ? "active" : "inactive"}.`,
    );
  };

  const handleSetDefault = () => {
    runMutation(
      "Default location updated",
      () => setDefaultLocationAction({ locationId: location.id }),
      (name) => `${name} is now the default location.`,
    );
  };

  const openAssignDialog = async () => {
    const result = await listDepartmentsAction({ status: "active", pageSize: 100 });
    if (!result.ok) {
      toast.error("Failed to load departments", { description: result.message });
      return;
    }
    setAssignOptions(result.data.items);
    setIsAssignOpen(true);
  };

  const handleSaveAssignments = async (departmentIds: string[]) => {
    setIsSaving(true);
    try {
      const result = await syncLocationAssignmentsAction({
        locationId: location.id,
        departmentIds,
      });
      if (!result.ok) {
        toast.error("Failed to save assignments", { description: result.message });
        return;
      }
      setLocation((current) => ({
        ...current,
        departments: assignOptions.filter((department) => departmentIds.includes(department.id)),
        departmentCount: departmentIds.length,
      }));
      toast.success("Assignments updated", {
        description: `${result.data.assigned} assigned, ${result.data.removed} removed.`,
      });
      setIsAssignOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAssignment = (departmentId: string, departmentName: string) => {
    if (!window.confirm(`Remove ${departmentName} from ${location.name}? The department itself is kept.`)) {
      return;
    }
    startTransition(async () => {
      const result = await removeAssignmentAction({ locationId: location.id, departmentId });
      if (!result.ok) {
        toast.error("Failed to remove assignment", { description: result.message });
        return;
      }
      setLocation((current) => ({
        ...current,
        departments: current.departments.filter((item) => item.id !== departmentId),
        departmentCount: Math.max(0, current.departmentCount - 1),
      }));
      toast.success("Assignment removed", { description: `${departmentName} was unassigned.` });
    });
  };

  const addressParts = [location.addressLine1, location.addressLine2].filter(Boolean);
  const regionParts = [location.city, location.state, location.postalCode].filter(Boolean);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={orgPageStaggerVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-4"
      >
        <motion.div variants={orgSectionItemVariants} className="self-start">
          <Link
            href="/organization/locations"
            className="inline-flex items-center gap-1.5 self-start text-xs text-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to locations
          </Link>
        </motion.div>

        <motion.div
          variants={orgSectionItemVariants}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{location.name}</h1>
              {location.isDefault && (
                <Badge variant="primary" size="sm">
                  <Star className="mr-1 h-3 w-3" aria-hidden="true" />
                  Default
                </Badge>
              )}
              <Badge variant={location.isActive ? "success" : "outline"} size="sm">
                {location.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <span className="text-xs text-muted">
              {location.code} · {location.departmentCount}{" "}
              {location.departmentCount === 1 ? "department" : "departments"}
            </span>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setIsEditOpen(true)}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
            {!location.isDefault && location.isActive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleSetDefault}
              >
                Set as Default
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleToggleActive}
            >
              {location.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <motion.div variants={orgSectionItemVariants} className="h-full">
          <Card className="flex flex-col gap-3 p-4 h-full">
            <h2 className="text-sm font-bold text-foreground">Location Details</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoRow label="Code" value={location.code} />
            <InfoRow label="Timezone" value={location.timezone} />
            <InfoRow
              label="Address"
              value={addressParts.length > 0 ? addressParts.join(", ") : null}
            />
            <InfoRow
              label="City / State / Postal"
              value={regionParts.length > 0 ? regionParts.join(", ") : null}
            />
            <InfoRow label="Country" value={location.country} />
            <InfoRow label="Email" value={location.email} />
            <InfoRow label="Phone" value={location.phone} />
            <InfoRow label="Description" value={location.description} />
          </div>
        </Card>
        </motion.div>

        <motion.div variants={orgSectionItemVariants} className="h-full">
          <Card className="flex flex-col gap-3 p-4 h-full">
            <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Assigned Departments ({location.departmentCount})
            </h2>
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={openAssignDialog}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Assign
              </Button>
            )}
          </div>
          {location.departments.length === 0 ? (
            <p className="text-xs text-muted">
              No departments assigned to this location yet.
              {canManage ? " Use Assign to link departments." : ""}
            </p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Assigned departments">
              {location.departments.map((department) => (
                <motion.li
                  key={department.id}
                  variants={orgSectionItemVariants}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={`/organization/departments/${department.id}`}
                        className="truncate text-xs font-semibold text-foreground hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {department.name}
                      </Link>
                      <span className="text-[11px] text-muted">{department.code}</span>
                    </div>
                    {!department.isActive && (
                      <Badge variant="outline" size="sm">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(department.id, department.name)}
                      disabled={isPending}
                      aria-label={`Remove ${department.name} from this location`}
                      className="rounded-md p-1.5 text-muted hover:bg-surface-elevated hover:text-error transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
        </motion.div>
      </div>

      <motion.div variants={orgSectionItemVariants}>
        <Card className="flex flex-col gap-1 p-4">
          <h2 className="text-sm font-bold text-foreground">Record Information</h2>
          <p className="text-xs text-muted">
            Created {new Date(location.createdAt).toLocaleDateString()} · Last updated{" "}
            {new Date(location.updatedAt).toLocaleDateString()}
          </p>
        </Card>
      </motion.div>

      {canManage && (
        <>
          <LocationDialog
            key={`edit-${location.id}-${location.updatedAt}`}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSave={handleSave}
            initialData={location}
            isSaving={isSaving}
          />
          <AssignmentManager
            key={`assign-${location.id}`}
            isOpen={isAssignOpen}
            onClose={() => setIsAssignOpen(false)}
            onSave={handleSaveAssignments}
            title="Assign Departments"
            description={`Select departments operating at ${location.name}. Only active departments can be assigned.`}
            options={assignOptions.map((department) => ({
              id: department.id,
              name: department.name,
              code: department.code,
              isActive: department.isActive,
            }))}
            initialSelectedIds={location.departments.map((department) => department.id)}
            isSaving={isSaving}
            searchPlaceholder="Search departments by name or code"
            emptyOptionsMessage="No active departments available. Create a department first."
          />
        </>
      )}
      </motion.div>
    </MotionConfig>
  );
};
