"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Mail, MapPin, Phone, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import Checkbox from "@/shared/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  locationSchema,
  type LocationFormInput,
  type LocationInput,
} from "../../domain/schemas/location.schema";
import type { LocationDetail } from "../../domain/entities/location-department";
import { LOCATION_DESCRIPTION_MAX_LENGTH } from "../../domain/constants/location-constants";
import {
  orgDialogBackdropVariants,
  orgDialogPanelVariants,
} from "@/shared/animation";

interface LocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: LocationInput) => Promise<void>;
  initialData?: LocationDetail | null;
  isSaving: boolean;
}

export const LocationDialog = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: LocationDialogProps) => {
  const form = useForm<LocationFormInput, unknown, LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
      description: initialData?.description || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      addressLine1: initialData?.addressLine1 || "",
      addressLine2: initialData?.addressLine2 || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      postalCode: initialData?.postalCode || "",
      country: initialData?.country || "",
      timezone: initialData?.timezone || "",
      isDefault: initialData?.isDefault ?? false,
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
    form.reset();
  });

  const descriptionLength = (useWatch({ control: form.control, name: "description" }) ?? "").length;

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
            aria-labelledby="location-dialog-title"
            className="relative w-full max-w-lg rounded-xl border border-card-border bg-card-background shadow-dropdown p-6 my-8 flex flex-col gap-4 max-h-[calc(100vh-2rem)] overflow-hidden"
          >
        <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary shrink-0">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 id="location-dialog-title" className="text-sm font-bold text-foreground">
                {initialData ? "Edit Location" : "Add Location"}
              </h3>
              <p className="text-xs text-muted">
                {initialData
                  ? "Update this location's details"
                  : "Add a new location to your organization"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-elevated transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-h-0 flex-1" noValidate>
            <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-muted text-primary shrink-0">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-px">
                  <p className="text-xs font-semibold text-foreground">Basic Information</p>
                  <p className="text-[11px] text-muted">Location name, code and description</p>
                </div>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Location Name <span className="text-error" aria-hidden="true">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g. Mumbai HQ"
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
                    <FormLabel className="text-xs">
                      Location Code <span className="text-error" aria-hidden="true">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g. MUM-HQ"
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
                        placeholder="Short description of this location"
                        disabled={isSaving}
                        value={field.value || ""}
                        onChange={field.onChange}
                        maxLength={LOCATION_DESCRIPTION_MAX_LENGTH}
                      />
                    </FormControl>
                    <div className="mt-1 flex justify-end">
                      <span className="text-[10px] text-muted" aria-live="off">
                        {descriptionLength}/{LOCATION_DESCRIPTION_MAX_LENGTH}
                      </span>
                    </div>
                    <FormMessage />
                </FormItem>
              )}
            />

              <div className="flex items-center gap-2.5 pt-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-muted text-primary shrink-0">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-px">
                  <p className="text-xs font-semibold text-foreground">Contact Information</p>
                  <p className="text-[11px] text-muted">Add contact details for this location</p>
                </div>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Email (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="hq@company.com"
                        disabled={isSaving}
                        value={field.value || ""}
                        onChange={field.onChange}
                        startIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+91 22 0000 0000"
                        disabled={isSaving}
                        value={field.value || ""}
                        onChange={field.onChange}
                        startIcon={<Phone className="h-4 w-4" aria-hidden="true" />}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <div className="flex items-center gap-2.5 pt-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-muted text-primary shrink-0">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-px">
                  <p className="text-xs font-semibold text-foreground">Address Details</p>
                  <p className="text-[11px] text-muted">Physical address and timezone</p>
                </div>
              </div>

            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs">Address Line 1 (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Street address"
                        disabled={isSaving}
                        value={field.value || ""}
                        onChange={field.onChange}
                        startIcon={<MapPin className="h-4 w-4" aria-hidden="true" />}
                      />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-xs">Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Floor, suite, landmark"
                        disabled={isSaving}
                        value={field.value || ""}
                        onChange={field.onChange}
                        startIcon={<Building2 className="h-4 w-4" aria-hidden="true" />}
                      />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">City (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Mumbai"
                        disabled={isSaving}
                        value={field.value || ""}
                        onChange={field.onChange}
                        startIcon={<Building2 className="h-4 w-4" aria-hidden="true" />}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">State (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Maharashtra"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Postal Code</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="400001"
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
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Country</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="India"
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
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Timezone</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Asia/Kolkata"
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
              name="isDefault"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      disabled={isSaving}
                      size="sm"
                      label="Set as default location"
                      description="Mark this location as the organization's default."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border/40 pt-4 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSaving} disabled={isSaving}>
                {initialData ? "Save Changes" : "Add Location"}
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
