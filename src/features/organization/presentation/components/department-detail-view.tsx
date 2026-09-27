"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MotionConfig, motion } from "framer-motion";
import { ArrowLeft, Network, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "@/shared/components/ui/toast";
import {
  listLocationsAction,
  removeAssignmentAction,
  saveDepartmentAction,
  setDepartmentActiveAction,
  syncDepartmentAssignmentsAction,
} from "@/app/organization/actions";
import type {
  DepartmentDetail,
  LocationEntity,
} from "../../domain/entities/location-department";
import { DepartmentDialog, type DepartmentSaveInput } from "./department-dialog";
import { AssignmentManager } from "./assignment-manager";
import {
  orgPageStaggerVariants,
  orgSectionItemVariants,
} from "@/shared/animation";

interface DepartmentDetailViewProps {
  initialDepartment: DepartmentDetail;
  userRole: string;
}

const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</span>
    <span className="text-sm text-foreground">{value || "—"}</span>
  </div>
);

export const DepartmentDetailView = ({ initialDepartment, userRole }: DepartmentDetailViewProps) => {
  const canManage = userRole === "OWNER" || userRole === "ADMIN";
  const [department, setDepartment] = useState(initialDepartment);
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignOptions, setAssignOptions] = useState<LocationEntity[]>([]);

  const handleSave = async (values: DepartmentSaveInput) => {
    setIsSaving(true);
    try {
      const result = await saveDepartmentAction({ ...values, departmentId: department.id });
      if (!result.ok) {
        toast.error("Failed to save department", { description: result.message });
        return;
      }
      setDepartment(result.data.department);
      toast.success("Department updated", {
        description: `${result.data.department.name} was saved successfully.`,
      });
      setIsEditOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = () => {
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
      setDepartment(result.data.department);
      toast.success(nextActive ? "Department reactivated" : "Department deactivated", {
        description: `${result.data.department.name} is now ${nextActive ? "active" : "inactive"}.`,
      });
    });
  };

  const openEditDialog = async () => {
    const result = await listLocationsAction({ status: "active", pageSize: 100 });
    if (result.ok) {
      setAssignOptions(result.data.items);
    }
    setIsEditOpen(true);
  };

  const openAssignDialog = async () => {
    const result = await listLocationsAction({ status: "active", pageSize: 100 });
    if (!result.ok) {
      toast.error("Failed to load locations", { description: result.message });
      return;
    }
    setAssignOptions(result.data.items);
    setIsAssignOpen(true);
  };

  const handleSaveAssignments = async (locationIds: string[]) => {
    setIsSaving(true);
    try {
      const result = await syncDepartmentAssignmentsAction({
        departmentId: department.id,
        locationIds,
      });
      if (!result.ok) {
        toast.error("Failed to save assignments", { description: result.message });
        return;
      }
      setDepartment((current) => ({
        ...current,
        locations: assignOptions.filter((location) => locationIds.includes(location.id)),
        locationCount: locationIds.length,
      }));
      toast.success("Assignments updated", {
        description: `${result.data.assigned} assigned, ${result.data.removed} removed.`,
      });
      setIsAssignOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAssignment = (locationId: string, locationName: string) => {
    if (!window.confirm(`Remove ${department.name} from ${locationName}? The location itself is kept.`)) {
      return;
    }
    startTransition(async () => {
      const result = await removeAssignmentAction({ locationId, departmentId: department.id });
      if (!result.ok) {
        toast.error("Failed to remove assignment", { description: result.message });
        return;
      }
      setDepartment((current) => ({
        ...current,
        locations: current.locations.filter((item) => item.id !== locationId),
        locationCount: Math.max(0, current.locationCount - 1),
      }));
      toast.success("Assignment removed", { description: `${locationName} was unassigned.` });
    });
  };

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
            href="/organization/departments"
            className="inline-flex items-center gap-1.5 self-start text-xs text-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to departments
          </Link>
        </motion.div>

        <motion.div
          variants={orgSectionItemVariants}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
            <Network className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{department.name}</h1>
              <Badge variant={department.isActive ? "success" : "outline"} size="sm">
                {department.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <span className="text-xs text-muted">
              {department.code} · {department.locationCount}{" "}
              {department.locationCount === 1 ? "location" : "locations"}
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
              onClick={openEditDialog}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleToggleActive}
            >
              {department.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <motion.div variants={orgSectionItemVariants} className="h-full">
          <Card className="flex flex-col gap-3 p-4 h-full">
            <h2 className="text-sm font-bold text-foreground">Department Details</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoRow label="Code" value={department.code} />
            <InfoRow label="Status" value={department.isActive ? "Active" : "Inactive"} />
            <InfoRow label="Description" value={department.description} />
          </div>
        </Card>
        </motion.div>

        <motion.div variants={orgSectionItemVariants} className="h-full">
          <Card className="flex flex-col gap-3 p-4 h-full">
            <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              Assigned Locations ({department.locationCount})
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
          {department.locations.length === 0 ? (
            <p className="text-xs text-muted">
              This department is not assigned to any location yet. Departments may exist
              without assignments.
              {canManage ? " Use Assign to link locations." : ""}
            </p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Assigned locations">
              {department.locations.map((location) => (
                <motion.li
                  key={location.id}
                  variants={orgSectionItemVariants}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={`/organization/locations/${location.id}`}
                        className="truncate text-xs font-semibold text-foreground hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {location.name}
                      </Link>
                      <span className="text-[11px] text-muted">
                        {location.code}
                        {location.city ? ` · ${location.city}` : ""}
                      </span>
                    </div>
                    {!location.isActive && (
                      <Badge variant="outline" size="sm">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(location.id, location.name)}
                      disabled={isPending}
                      aria-label={`Remove ${location.name} from this department`}
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
            Created {new Date(department.createdAt).toLocaleDateString()} · Last updated{" "}
            {new Date(department.updatedAt).toLocaleDateString()}
          </p>
        </Card>
      </motion.div>

      {canManage && (
        <>
          <DepartmentDialog
            key={`edit-${department.id}-${department.updatedAt}`}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSave={handleSave}
            initialData={department}
            availableLocations={assignOptions}
            isSaving={isSaving}
          />
          <AssignmentManager
            key={`assign-${department.id}`}
            isOpen={isAssignOpen}
            onClose={() => setIsAssignOpen(false)}
            onSave={handleSaveAssignments}
            title="Assign Locations"
            description={`Select locations where ${department.name} operates. Only active locations can be assigned.`}
            options={assignOptions.map((location) => ({
              id: location.id,
              name: location.name,
              code: location.code,
              isActive: location.isActive,
            }))}
            initialSelectedIds={department.locations.map((location) => location.id)}
            isSaving={isSaving}
            searchPlaceholder="Search locations by name or code"
            emptyOptionsMessage="No active locations available. Create a location first."
          />
        </>
      )}
      </motion.div>
    </MotionConfig>
  );
};
