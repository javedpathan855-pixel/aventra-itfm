"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Network, Search, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import Checkbox from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  departmentSchema,
  type DepartmentFormInput,
  type DepartmentInput,
} from "../../domain/schemas/location.schema";
import type {
  DepartmentDetail,
  LocationEntity,
} from "../../domain/entities/location-department";
import {
  orgDialogBackdropVariants,
  orgDialogPanelVariants,
} from "@/shared/animation";

export interface DepartmentSaveInput extends DepartmentInput {
  locationIds: string[];
}

interface DepartmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (department: DepartmentSaveInput) => Promise<void>;
  initialData?: DepartmentDetail | null;
  availableLocations: LocationEntity[];
  isSaving: boolean;
}

export const DepartmentDialog = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  availableLocations,
  isSaving,
}: DepartmentDialogProps) => {
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(
    () => initialData?.locations.map((location) => location.id) ?? [],
  );

  const form = useForm<DepartmentFormInput, unknown, DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
    },
    mode: "onTouched",
  });

  const searchTerm = locationSearch.trim().toLowerCase();
  const visibleLocations = availableLocations.filter(
    (location) =>
      searchTerm.length === 0 ||
      location.name.toLowerCase().includes(searchTerm) ||
      location.code.toLowerCase().includes(searchTerm),
  );
  const selectedLocations = availableLocations.filter((location) =>
    selectedLocationIds.includes(location.id),
  );

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds((current) =>
      current.includes(locationId)
        ? current.filter((id) => id !== locationId)
        : [...current, locationId],
    );
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave({ ...values, locationIds: selectedLocationIds });
    form.reset();
    setSelectedLocationIds([]);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={orgDialogBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto"
        >
          <motion.div
            variants={orgDialogPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-dialog-title"
            className="relative w-full max-w-lg rounded-xl border border-card-border bg-card-background shadow-dropdown p-6 flex flex-col gap-4 my-8"
          >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <Network className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 id="department-dialog-title" className="text-sm font-bold text-foreground">
              {initialData ? "Edit Department" : "Add Department"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Department Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g. Engineering"
                        disabled={isSaving}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Department Code</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g. ENG"
                        disabled={isSaving}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Description (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="What this department is responsible for"
                      disabled={isSaving}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-foreground" id="assign-locations-label">
                Assigned Locations (Optional)
              </span>
              {selectedLocations.length > 0 && (
                <div className="flex flex-wrap gap-1.5" aria-live="polite">
                  {selectedLocations.map((location) => (
                    <Badge key={location.id} variant="primary" size="sm">
                      {location.name}
                      <button
                        type="button"
                        onClick={() => toggleLocation(location.id)}
                        aria-label={`Remove ${location.name} from selection`}
                        className="ml-1 rounded-full hover:text-foreground"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  placeholder="Search locations by name or code"
                  aria-label="Search locations"
                  value={locationSearch}
                  onChange={(event) => setLocationSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div
                role="group"
                aria-labelledby="assign-locations-label"
                className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2"
              >
                {visibleLocations.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted">
                    {availableLocations.length === 0
                      ? "No active locations available. Create a location first."
                      : "No locations match your search."}
                  </p>
                ) : (
                  visibleLocations.map((location) => (
                    <label
                      key={location.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-elevated"
                    >
                      <Checkbox
                        checked={selectedLocationIds.includes(location.id)}
                        onCheckedChange={() => toggleLocation(location.id)}
                        disabled={isSaving}
                        size="sm"
                        aria-label={`${location.name} (${location.code})`}
                      />
                      <span className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{location.name}</span>
                        <span className="text-[11px] text-muted">{location.code}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSaving} disabled={isSaving}>
                {initialData ? "Save Changes" : "Add Department"}
              </Button>
            </div>
          </form>
        </Form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
