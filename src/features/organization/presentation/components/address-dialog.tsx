"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
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
  organizationAddressSchema,
  type OrganizationAddressInput,
  type OrganizationAddressFormInput,
} from "../../domain/schemas/organization.schema";
import {
  orgDialogBackdropVariants,
  orgDialogPanelVariants,
} from "@/shared/animation";
import { ADDRESS_TYPES, ADDRESS_TYPE_LABELS } from "../../domain/constants/organization-constants";
import type { OrganizationAddressEntity } from "../../domain/entities/organization-profile";

interface AddressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: OrganizationAddressInput) => Promise<void>;
  initialData?: OrganizationAddressEntity | null;
  isSaving: boolean;
}

export const AddressDialog = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: AddressDialogProps) => {
  const form = useForm<OrganizationAddressFormInput, unknown, OrganizationAddressInput>({
    resolver: zodResolver(organizationAddressSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      type: initialData?.type || "registered",
      label: initialData?.label || "",
      addressLine1: initialData?.addressLine1 || "",
      addressLine2: initialData?.addressLine2 || "",
      landmark: initialData?.landmark || "",
      city: initialData?.city || "",
      district: initialData?.district || "",
      state: initialData?.state || "",
      stateCode: initialData?.stateCode || "",
      country: initialData?.country || "India",
      postalCode: initialData?.postalCode || "",
      isDefault: initialData?.isDefault ?? false,
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
    form.reset();
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
            aria-labelledby="address-dialog-title"
            className="relative w-full max-w-lg rounded-xl border border-card-border bg-card-background shadow-dropdown p-6 flex flex-col gap-4 my-8"
          >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 id="address-dialog-title" className="text-sm font-bold text-foreground">
              {initialData ? "Edit Organization Address" : "Add Organization Address"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Address Type</FormLabel>
                    <FormControl>
                      <Select
                        options={ADDRESS_TYPES.map((type) => ({
                          value: type,
                          label: ADDRESS_TYPE_LABELS[type],
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Custom Label (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g. Mumbai HQ, West Facility"
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
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Address Line 1 <span className="text-error">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Building name, Floor, Unit Number"
                      disabled={isSaving}
                      {...field}
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
                      placeholder="Street, Road, Area"
                      disabled={isSaving}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="landmark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Landmark (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Near Metro Station"
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
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      City <span className="text-error">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Mumbai" disabled={isSaving} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      State <span className="text-error">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Maharashtra" disabled={isSaving} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Postal Code / PIN <span className="text-error">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="400001" disabled={isSaving} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Country</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="India" disabled={isSaving} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="pt-1">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSaving}
                      size="sm"
                    >
                      <span className="text-xs font-normal text-foreground">
                        Set as primary default address for this organization
                      </span>
                    </Checkbox>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40 mt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSaving} disabled={isSaving}>
                {isSaving ? "Saving..." : initialData ? "Update Address" : "Save Address"}
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
