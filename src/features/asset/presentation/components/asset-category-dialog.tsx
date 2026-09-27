"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tags, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  assetCategorySchema,
  type AssetCategoryFormInput,
  type AssetCategoryInput,
} from "../../domain/schemas/asset.schema";
import {
  orgDialogBackdropVariants,
  orgDialogPanelVariants,
} from "@/shared/animation";
import type { CategoryWithAssetCount } from "../../domain/entities/asset";

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: AssetCategoryInput) => Promise<void>;
  initialData?: CategoryWithAssetCount | null;
  isSaving: boolean;
}

export const CategoryDialog = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: CategoryDialogProps) => {
  const form = useForm<AssetCategoryFormInput, unknown, AssetCategoryInput>({
    resolver: zodResolver(assetCategorySchema),
    defaultValues: {
      name: initialData?.name || "",
      code: initialData?.code || "",
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
            aria-labelledby="category-dialog-title"
            className="relative w-full max-w-lg rounded-xl border border-card-border bg-card-background shadow-dropdown p-6 flex flex-col gap-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Tags className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 id="category-dialog-title" className="text-sm font-bold text-foreground">
                  {initialData ? "Edit Category" : "Add Category"}
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
                        <FormLabel className="text-xs">
                          Name <span className="text-error" aria-hidden="true">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="e.g. Laptops"
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
                          Code <span className="text-error" aria-hidden="true">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="e.g. LAPTOP"
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
                          placeholder="What belongs in this category"
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
                    {isSaving ? "Saving..." : initialData ? "Save Changes" : "Add Category"}
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
