"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cpu, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  assetModelSchema,
  type AssetModelFormInput,
  type AssetModelInput,
} from "../../domain/schemas/asset.schema";
import {
  orgDialogBackdropVariants,
  orgDialogPanelVariants,
} from "@/shared/animation";
import type { CategoryWithAssetCount, ModelWithAssetCount } from "../../domain/entities/asset";

interface ModelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: AssetModelInput) => Promise<void>;
  initialData?: ModelWithAssetCount | null;
  categories: CategoryWithAssetCount[];
  isSaving: boolean;
}

export const ModelDialog = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories,
  isSaving,
}: ModelDialogProps) => {
  const form = useForm<AssetModelFormInput, unknown, AssetModelInput>({
    resolver: zodResolver(assetModelSchema),
    defaultValues: {
      categoryId: initialData?.categoryId || "",
      brand: initialData?.brand || "",
      modelName: initialData?.modelName || "",
      modelCode: initialData?.modelCode || "",
      description: initialData?.description || "",
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
            aria-labelledby="model-dialog-title"
            className="relative w-full max-w-lg rounded-xl border border-card-border bg-card-background shadow-dropdown p-6 flex flex-col gap-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Cpu className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 id="model-dialog-title" className="text-sm font-bold text-foreground">
                  {initialData ? "Edit Model" : "Add Model"}
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
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Category <span className="text-error" aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <Select
                          aria-label="Model category"
                          placeholder="Select category"
                          options={categories
                            .filter((c) => c.isActive || c.id === initialData?.categoryId)
                            .map((c) => ({ value: c.id, label: c.name }))}
                          value={field.value || ""}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Brand <span className="text-error" aria-hidden="true">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="e.g. Apple"
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
                    name="modelName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Model Name <span className="text-error" aria-hidden="true">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="e.g. MacBook Pro 14"
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
                  name="modelCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Model Code (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="e.g. MBP14-M3"
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Description (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Short description of this model"
                          disabled={isSaving}
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
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
                    {isSaving ? "Saving..." : initialData ? "Save Changes" : "Add Model"}
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
