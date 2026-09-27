// Asset validation schemas (domain layer).
//
// Single source of truth for invariants. Presentation reuses these through
// zodResolver (UX); application use cases re-validate with safeParse
// (security boundary); infrastructure enforces uniqueness at the database.

import { z } from "zod";
import {
  ASSET_CONDITIONS,
  ASSET_COST_MAX_VALUE,
  ASSET_DESCRIPTION_MAX_LENGTH,
  ASSET_INVOICE_MAX_LENGTH,
  ASSET_LIST_DEFAULT_PAGE_SIZE,
  ASSET_LIST_MAX_PAGE_SIZE,
  ASSET_NAME_MAX_LENGTH,
  ASSET_NAME_MIN_LENGTH,
  ASSET_NOTES_MAX_LENGTH,
  ASSET_SERIAL_MAX_LENGTH,
  ASSET_TAG_MAX_LENGTH,
  ASSET_TAG_MIN_LENGTH,
  ASSET_VENDOR_MAX_LENGTH,
  CATEGORY_CODE_MAX_LENGTH,
  CATEGORY_CODE_MIN_LENGTH,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
  MODEL_BRAND_MAX_LENGTH,
  MODEL_CODE_MAX_LENGTH,
  MODEL_DESCRIPTION_MAX_LENGTH,
  MODEL_NAME_MAX_LENGTH,
  normalizeAssetName,
  normalizeAssetTag,
} from "../constants/asset-constants";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((val) => val || null);

const idParam = (label: string) =>
  z.object({ [`${label}Id`]: z.string().trim().min(1, `${label} ID is required`) });

const assetIdParamSchema = z.object({
  assetId: z.string().trim().min(1, "Asset ID is required"),
});

const dateString = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a valid date (YYYY-MM-DD)`)
    .refine(
      (val) => {
        const d = new Date(`${val}T00:00:00Z`);
        return !isNaN(d.getTime());
      },
      { message: `${label} must be a real calendar date` },
    );

const optionalDateString = (label: string) =>
  dateString(label).optional().nullable().transform((val) => val || null);

const moneyString = z
  .string()
  .trim()
  .regex(/^\d{1,11}(\.\d{1,2})?$/, "Purchase cost must be a non-negative amount with at most two decimals")
  .refine((val) => {
    const [whole] = val.split(".");
    return (whole ?? "").length <= 11;
  }, { message: `Purchase cost must not exceed ${ASSET_COST_MAX_VALUE}` });

const currencyCode = z
  .string()
  .trim()
  .length(3, "Currency must be a 3-letter ISO code")
  .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter ISO code")
  .transform((val) => val.toUpperCase());

const conditionSchema = z.enum(ASSET_CONDITIONS);

const assetTagSchema = z
  .string()
  .trim()
  .min(ASSET_TAG_MIN_LENGTH, `Asset tag must be at least ${ASSET_TAG_MIN_LENGTH} characters`)
  .max(ASSET_TAG_MAX_LENGTH, `Asset tag must be at most ${ASSET_TAG_MAX_LENGTH} characters`)
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]$/, "Asset tag may contain letters, digits and hyphens only")
  .transform(normalizeAssetTag);

export const assetCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(CATEGORY_NAME_MIN_LENGTH, `Category name must be at least ${CATEGORY_NAME_MIN_LENGTH} characters`)
    .max(CATEGORY_NAME_MAX_LENGTH, `Category name must be at most ${CATEGORY_NAME_MAX_LENGTH} characters`)
    .transform(normalizeAssetName),
  code: z
    .string()
    .trim()
    .min(CATEGORY_CODE_MIN_LENGTH, `Category code must be at least ${CATEGORY_CODE_MIN_LENGTH} characters`)
    .max(CATEGORY_CODE_MAX_LENGTH, `Category code must be at most ${CATEGORY_CODE_MAX_LENGTH} characters`)
    .regex(/^[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]$/i, "Category code may contain letters, digits and hyphens only")
    .transform(normalizeAssetTag),
  description: optionalText(CATEGORY_DESCRIPTION_MAX_LENGTH),
});

export type AssetCategoryInput = z.infer<typeof assetCategorySchema>;
export type AssetCategoryFormInput = z.input<typeof assetCategorySchema>;

export const updateAssetCategorySchema = assetCategorySchema.extend({
  categoryId: z.string().trim().min(1, "Category ID is required"),
});
export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategorySchema>;

export const assetModelSchema = z.object({
  categoryId: z.string().trim().min(1, "Category is required"),
  brand: z
    .string()
    .trim()
    .min(1, "Brand is required")
    .max(MODEL_BRAND_MAX_LENGTH, `Brand must be at most ${MODEL_BRAND_MAX_LENGTH} characters`)
    .transform(normalizeAssetName),
  modelName: z
    .string()
    .trim()
    .min(1, "Model name is required")
    .max(MODEL_NAME_MAX_LENGTH, `Model name must be at most ${MODEL_NAME_MAX_LENGTH} characters`)
    .transform(normalizeAssetName),
  modelCode: z
    .string()
    .trim()
    .max(MODEL_CODE_MAX_LENGTH, `Model code must be at most ${MODEL_CODE_MAX_LENGTH} characters`)
    .optional()
    .nullable()
    .transform((val) => {
      const cleaned = (val || "").trim();
      return cleaned.length > 0 ? normalizeAssetTag(cleaned) : null;
    }),
  description: optionalText(MODEL_DESCRIPTION_MAX_LENGTH),
});

export type AssetModelInput = z.infer<typeof assetModelSchema>;
export type AssetModelFormInput = z.input<typeof assetModelSchema>;

export const updateAssetModelSchema = assetModelSchema.extend({
  modelId: z.string().trim().min(1, "Model ID is required"),
});
export type UpdateAssetModelInput = z.infer<typeof updateAssetModelSchema>;

const setActiveSchema = (label: string) =>
  z.object({
    [`${label}Id`]: z.string().trim().min(1, `${label} ID is required`),
    isActive: z.boolean(),
  });

export const setCategoryActiveSchema = setActiveSchema("category");
export const setModelActiveSchema = setActiveSchema("model");

export const assetSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(ASSET_NAME_MIN_LENGTH, `Asset name must be at least ${ASSET_NAME_MIN_LENGTH} characters`)
      .max(ASSET_NAME_MAX_LENGTH, `Asset name must be at most ${ASSET_NAME_MAX_LENGTH} characters`)
      .transform(normalizeAssetName),
    assetTag: assetTagSchema,
    description: optionalText(ASSET_DESCRIPTION_MAX_LENGTH),
    categoryId: z.string().trim().min(1, "Category is required"),
    modelId: z.string().trim().min(1).optional().nullable().transform((val) => val || null),
    brand: optionalText(MODEL_BRAND_MAX_LENGTH),
    serialNumber: z
      .string()
      .trim()
      .max(ASSET_SERIAL_MAX_LENGTH, `Serial number must be at most ${ASSET_SERIAL_MAX_LENGTH} characters`)
      .optional()
      .nullable()
      .transform((val) => {
        const cleaned = (val || "").trim();
        return cleaned.length > 0 ? cleaned : null;
      }),
    purchaseDate: dateString("Purchase date"),
    purchaseCost: moneyString,
    currency: currencyCode.default("INR"),
    vendorName: optionalText(ASSET_VENDOR_MAX_LENGTH),
    invoiceNumber: optionalText(ASSET_INVOICE_MAX_LENGTH),
    warrantyStartDate: optionalDateString("Warranty start date"),
    warrantyEndDate: optionalDateString("Warranty expiry date"),
    condition: conditionSchema.default("GOOD"),
    currentLocationId: z.string().trim().min(1).optional().nullable().transform((val) => val || null),
    currentDepartmentId: z.string().trim().min(1).optional().nullable().transform((val) => val || null),
  })
  .refine(
    (val) => {
      if (!val.warrantyStartDate || !val.warrantyEndDate) return true;
      return new Date(`${val.warrantyEndDate}T00:00:00Z`) >= new Date(`${val.warrantyStartDate}T00:00:00Z`);
    },
    { message: "Warranty expiry date cannot be before the warranty start date", path: ["warrantyEndDate"] },
  );

export type AssetInput = z.infer<typeof assetSchema>;
export type AssetFormInput = z.input<typeof assetSchema>;

export const updateAssetSchema = assetSchema.extend({
  assetId: z.string().trim().min(1, "Asset ID is required"),
});
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const assignAssetSchema = z
  .object({
    assetId: z.string().trim().min(1, "Asset is required"),
    membershipId: z.string().trim().min(1, "Employee is required"),
    locationId: z.string().trim().min(1, "Location is required"),
    departmentId: z.string().trim().min(1).optional().nullable().transform((val) => val || null),
    assignedAt: optionalDateString("Assignment date"),
    expectedReturnAt: optionalDateString("Expected return date"),
    condition: conditionSchema.default("GOOD"),
    notes: optionalText(ASSET_NOTES_MAX_LENGTH),
  })
  .refine(
    (val) => {
      if (!val.assignedAt || !val.expectedReturnAt) return true;
      return new Date(`${val.expectedReturnAt}T00:00:00Z`) >= new Date(`${val.assignedAt}T00:00:00Z`);
    },
    { message: "Expected return date cannot be before the assignment date", path: ["expectedReturnAt"] },
  );

export type AssignAssetInput = z.infer<typeof assignAssetSchema>;
export type AssignAssetFormInput = z.input<typeof assignAssetSchema>;

export const returnAssetSchema = z.object({
  assetId: z.string().trim().min(1, "Asset is required"),
  returnCondition: conditionSchema,
  notes: optionalText(ASSET_NOTES_MAX_LENGTH),
  returnedAt: optionalDateString("Return date"),
});
export type ReturnAssetInput = z.infer<typeof returnAssetSchema>;
export type ReturnAssetFormInput = z.input<typeof returnAssetSchema>;

const statusFilterSchema = z.enum(["all", "AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED", "ARCHIVED"]);
const availabilityFilterSchema = z.enum(["all", "available", "assigned"]);
const warrantyFilterSchema = z.enum(["all", "NONE", "ACTIVE", "EXPIRING_SOON", "EXPIRED"]);

export const assetListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
  status: statusFilterSchema.optional().default("all"),
  availability: availabilityFilterSchema.optional().default("all"),
  categoryId: z.string().trim().optional().default(""),
  modelId: z.string().trim().optional().default(""),
  locationId: z.string().trim().optional().default(""),
  departmentId: z.string().trim().optional().default(""),
  warranty: warrantyFilterSchema.optional().default("all"),
  purchaseFrom: optionalDateString("From date"),
  purchaseTo: optionalDateString("To date"),
  sortBy: z.enum(["name", "assetTag", "purchaseDate", "createdAt", "purchaseCost", "warrantyEndDate"]).optional().default("name"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(ASSET_LIST_MAX_PAGE_SIZE).optional().default(ASSET_LIST_DEFAULT_PAGE_SIZE),
});

export const categoryListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
  status: z.enum(["all", "active", "inactive"]).optional().default("all"),
  sortBy: z.enum(["name", "code", "createdAt"]).optional().default("name"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(ASSET_LIST_MAX_PAGE_SIZE).optional().default(ASSET_LIST_DEFAULT_PAGE_SIZE),
});

export const modelListQuerySchema = categoryListQuerySchema.extend({
  categoryId: z.string().trim().optional().default(""),
});

export const assignmentHistoryQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
  assetId: z.string().trim().optional().default(""),
  locationId: z.string().trim().optional().default(""),
  openOnly: z.coerce.boolean().optional().default(false),
  from: optionalDateString("From date"),
  to: optionalDateString("To date"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(ASSET_LIST_MAX_PAGE_SIZE).optional().default(ASSET_LIST_DEFAULT_PAGE_SIZE),
});

export const assetReportSchema = z.object({
  report: z.enum([
    "inventory",
    "available",
    "assigned",
    "category",
    "location",
    "department",
    "warranty",
    "assignments",
  ]),
  search: z.string().trim().max(100).optional().default(""),
  categoryId: z.string().trim().optional().default(""),
  locationId: z.string().trim().optional().default(""),
  departmentId: z.string().trim().optional().default(""),
  status: statusFilterSchema.optional().default("all"),
  from: optionalDateString("From date"),
  to: optionalDateString("To date"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(ASSET_LIST_MAX_PAGE_SIZE).optional().default(ASSET_LIST_DEFAULT_PAGE_SIZE),
});
export type AssetReportInput = z.infer<typeof assetReportSchema>;

export { assetIdParamSchema, idParam };
