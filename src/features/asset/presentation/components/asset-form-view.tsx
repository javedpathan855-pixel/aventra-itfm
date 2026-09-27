"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
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
import { toast } from "@/shared/components/ui/toast";
import { listModelsAction, saveAssetAction } from "@/app/assets/actions";
import {
  assetSchema,
  type AssetFormInput,
  type AssetInput,
} from "../../domain/schemas/asset.schema";
import { ASSET_CONDITIONS, ASSET_STATUSES } from "../../domain/constants/asset-constants";
import type { AssetDetail, ModelWithAssetCount } from "../../domain/entities/asset";
import { fadeInVariants } from "@/shared/animation";

interface LookupOption {
  id: string;
  name: string;
}

interface AssetFormViewProps {
  mode: "create" | "edit";
  initialAsset?: AssetDetail;
  categories: LookupOption[];
  initialModels: ModelWithAssetCount[];
  locations: LookupOption[];
  departments: LookupOption[];
  defaultCurrency: string;
  cancelHref: string;
  backLabel: string;
  backHref: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  submittingLabel: string;
  successTitle: string;
}

const toDateInput = (value: Date | string | null): string => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const CONDITION_OPTIONS = ASSET_CONDITIONS.map((c) => ({
  value: c,
  label: c.charAt(0) + c.slice(1).toLowerCase(),
}));

const STATUS_OPTIONS = (ASSET_STATUSES as readonly string[])
  .filter((s) => s !== "ASSIGNED")
  .map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }));

export const AssetFormView = ({
  mode,
  initialAsset,
  categories,
  initialModels,
  locations,
  departments,
  defaultCurrency,
  cancelHref,
  backLabel,
  backHref,
  title,
  subtitle,
  submitLabel,
  submittingLabel,
  successTitle,
}: AssetFormViewProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [models, setModels] = useState<ModelWithAssetCount[]>(initialModels);
  const [modelsLoading, setModelsLoading] = useState(false);

  const form = useForm<AssetFormInput, unknown, AssetInput>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: initialAsset?.name ?? "",
      assetTag: initialAsset?.assetTag ?? "",
      description: initialAsset?.description ?? "",
      categoryId: initialAsset?.categoryId ?? "",
      modelId: initialAsset?.modelId ?? "",
      brand: initialAsset?.brand ?? "",
      serialNumber: initialAsset?.serialNumber ?? "",
      purchaseDate: initialAsset ? toDateInput(initialAsset.purchaseDate) : "",
      purchaseCost: initialAsset?.purchaseCost ?? "",
      currency: initialAsset?.currency ?? defaultCurrency,
      vendorName: initialAsset?.vendorName ?? "",
      invoiceNumber: initialAsset?.invoiceNumber ?? "",
      warrantyStartDate: initialAsset ? toDateInput(initialAsset.warrantyStartDate) : "",
      warrantyEndDate: initialAsset ? toDateInput(initialAsset.warrantyEndDate) : "",
      condition: initialAsset?.condition ?? "GOOD",
      currentLocationId: initialAsset?.currentLocationId ?? "",
      currentDepartmentId: initialAsset?.currentDepartmentId ?? "",
    },
    mode: "onTouched",
  });

  const selectedCategoryId = useWatch({ control: form.control, name: "categoryId" });
  const descriptionLength = (useWatch({ control: form.control, name: "description" }) ?? "").length;

  const handleCategoryChange = async (nextCategoryId: string) => {
    form.setValue("categoryId", nextCategoryId, { shouldValidate: true, shouldTouch: true });
    form.setValue("modelId", "", { shouldValidate: false });
    if (!nextCategoryId) {
      setModels([]);
      return;
    }
    setModelsLoading(true);
    try {
      const result = await listModelsAction({
        categoryId: nextCategoryId,
        status: "active",
        pageSize: 100,
      });
      if (result.ok) {
        setModels(result.data.items);
      } else {
        toast.error("Failed to load models", { description: result.message });
      }
    } finally {
      setModelsLoading(false);
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const payload =
        mode === "edit" && initialAsset ? { ...values, assetId: initialAsset.id } : values;
      const result = await saveAssetAction(payload);
      if (!result.ok) {
        toast.error(mode === "edit" ? "Failed to save asset" : "Failed to create asset", {
          description: result.message,
        });
        return;
      }
      toast.success(successTitle, {
        description: `${result.data.asset.name} was ${mode === "edit" ? "saved" : "added"} successfully.`,
      });
      router.push(`/assets/${result.data.asset.id}`);
    } finally {
      setIsSubmitting(false);
    }
  });

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
            href={backHref}
            className="inline-flex items-center gap-1.5 self-start text-xs text-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {backLabel}
          </Link>
        </div>

        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Card className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-col gap-0.5 border-b border-border/40 pb-4">
                <h2 className="text-sm font-bold text-foreground">Basic Information</h2>
                <p className="text-xs text-muted">Identity, category and description</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Asset Name <span className="text-error" aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="e.g. MacBook Pro 14"
                          disabled={isSubmitting}
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
                  name="assetTag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Asset Tag <span className="text-error" aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="e.g. AST-LT-001"
                          disabled={isSubmitting}
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                          aria-label="Asset category"
                          placeholder="Select category"
                          options={categories.map((c) => ({ value: c.id, label: c.name }))}
                          value={field.value || ""}
                          onChange={(next) => void handleCategoryChange(next)}
                          onBlur={field.onBlur}
                          name={field.name}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Model (Optional)</FormLabel>
                      <FormControl>
                        <Select
                          aria-label="Asset model"
                          placeholder={
                            !selectedCategoryId
                              ? "Select a category first"
                              : modelsLoading
                                ? "Loading models..."
                                : "Select model"
                          }
                          options={models.map((m) => ({
                            value: m.id,
                            label: `${m.brand} ${m.modelName}`,
                          }))}
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          disabled={isSubmitting || !selectedCategoryId || modelsLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Brand (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="e.g. Apple"
                          disabled={isSubmitting}
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
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Serial Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Manufacturer serial number"
                          disabled={isSubmitting}
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
                        placeholder="Short description of this asset"
                        disabled={isSubmitting}
                        value={field.value || ""}
                        onChange={field.onChange}
                        maxLength={1000}
                      />
                    </FormControl>
                    <div className="mt-1 flex justify-end">
                      <span className="text-[10px] text-muted" aria-live="off">
                        {descriptionLength}/1000
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>

            <Card className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-col gap-0.5 border-b border-border/40 pb-4">
                <h2 className="text-sm font-bold text-foreground">Purchase Information</h2>
                <p className="text-xs text-muted">Cost, vendor and invoice details</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Purchase Date <span className="text-error" aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={isSubmitting}
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
                  name="purchaseCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Purchase Cost <span className="text-error" aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          disabled={isSubmitting}
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
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Currency</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="INR"
                          disabled={isSubmitting}
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vendorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Vendor (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="e.g. Apple Store, Mumbai"
                          disabled={isSubmitting}
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
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Invoice Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="e.g. INV-2026-0042"
                          disabled={isSubmitting}
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Card className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-col gap-0.5 border-b border-border/40 pb-4">
                <h2 className="text-sm font-bold text-foreground">Warranty</h2>
                <p className="text-xs text-muted">Coverage period, when applicable</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="warrantyStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Warranty Start (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={isSubmitting}
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
                  name="warrantyEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Warranty Expiry (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={isSubmitting}
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Card className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-col gap-0.5 border-b border-border/40 pb-4">
                <h2 className="text-sm font-bold text-foreground">Location</h2>
                <p className="text-xs text-muted">Where this asset is kept</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="currentLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Location (Optional)</FormLabel>
                      <FormControl>
                        <Select
                          aria-label="Asset location"
                          placeholder="Select location"
                          options={locations.map((l) => ({ value: l.id, label: l.name }))}
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentDepartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Department (Optional)</FormLabel>
                      <FormControl>
                        <Select
                          aria-label="Asset department"
                          placeholder="Select department"
                          options={departments.map((d) => ({ value: d.id, label: d.name }))}
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Card className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-col gap-0.5 border-b border-border/40 pb-4">
                <h2 className="text-sm font-bold text-foreground">Condition</h2>
                <p className="text-xs text-muted">Physical state of the asset</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Initial Condition</FormLabel>
                      <FormControl>
                        <Select
                          aria-label="Asset condition"
                          options={CONDITION_OPTIONS.map((o) => ({ ...o }))}
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode === "edit" && initialAsset && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-foreground">Lifecycle Status</span>
                    <span className="text-xs text-muted">
                      {initialAsset.archivedAt
                        ? "Archived — status changes are disabled. Unarchiving is not available in this phase."
                        : initialAsset.activeAssignmentId
                          ? "Assigned — status follows the active assignment until it is returned."
                          : "Managed automatically by assignment, return and archive actions."}
                    </span>
                    <Select
                      aria-label="Lifecycle status (managed automatically)"
                      options={STATUS_OPTIONS.filter((o) =>
                        initialAsset.activeAssignmentId ? o.value === "ASSIGNED" : o.value !== "ASSIGNED",
                      ).map((o) => ({ ...o }))}
                      value={
                        initialAsset.activeAssignmentId ? "ASSIGNED" : initialAsset.status
                      }
                      onChange={() => {}}
                      disabled
                    />
                  </div>
                )}
              </div>
            </Card>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href={cancelHref}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-surface-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </Link>
              <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                {isSubmitting ? submittingLabel : submitLabel}
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </MotionConfig>
  );
};
