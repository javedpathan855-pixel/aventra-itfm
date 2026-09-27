"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Undo2, X } from "lucide-react";
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
  returnAssetSchema,
  type ReturnAssetFormInput,
  type ReturnAssetInput,
} from "../../domain/schemas/asset.schema";
import { ASSET_CONDITIONS } from "../../domain/constants/asset-constants";
import {
  orgDialogBackdropVariants,
  orgDialogPanelVariants,
} from "@/shared/animation";

interface ReturnDialogProps {
  assetId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: ReturnAssetInput) => Promise<void>;
  isSaving: boolean;
}

const CONDITION_OPTIONS = ASSET_CONDITIONS.map((c) => ({
  value: c,
  label: c.charAt(0) + c.slice(1).toLowerCase(),
}));

export const ReturnDialog = ({ assetId, isOpen, onClose, onSave, isSaving }: ReturnDialogProps) => {
  const form = useForm<ReturnAssetFormInput, unknown, ReturnAssetInput>({
    resolver: zodResolver(returnAssetSchema),
    defaultValues: {
      assetId,
      returnCondition: "GOOD",
      notes: "",
      returnedAt: "",
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
            aria-labelledby="return-dialog-title"
            className="relative w-full max-w-lg rounded-xl border border-card-border bg-card-background shadow-dropdown p-6 flex flex-col gap-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Undo2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 id="return-dialog-title" className="text-sm font-bold text-foreground">
                  Return Asset
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
                    name="returnCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Return Condition <span className="text-error" aria-hidden="true">*</span>
                        </FormLabel>
                        <FormControl>
                          <Select
                            aria-label="Return condition"
                            options={CONDITION_OPTIONS.map((o) => ({ ...o }))}
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

                  <FormField
                    control={form.control}
                    name="returnedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Return Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Return notes"
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
                    {isSaving ? "Returning..." : "Return Asset"}
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
