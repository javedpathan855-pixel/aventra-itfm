// Location & department validation schemas (domain layer).
//
// Single source of truth for invariants. Presentation reuses these through
// zodResolver (UX); application use cases re-validate with safeParse
// (security boundary); infrastructure enforces uniqueness at the database.

import { z } from "zod";
import {
  DEPARTMENT_CODE_MAX_LENGTH,
  DEPARTMENT_CODE_MIN_LENGTH,
  DEPARTMENT_DESCRIPTION_MAX_LENGTH,
  DEPARTMENT_NAME_MAX_LENGTH,
  DEPARTMENT_NAME_MIN_LENGTH,
  LOCATION_CODE_MAX_LENGTH,
  LOCATION_CODE_MIN_LENGTH,
  LOCATION_DESCRIPTION_MAX_LENGTH,
  LOCATION_LIST_DEFAULT_PAGE_SIZE,
  LOCATION_LIST_MAX_PAGE_SIZE,
  LOCATION_NAME_MAX_LENGTH,
  LOCATION_NAME_MIN_LENGTH,
  normalizeEntityCode,
  normalizeEntityName,
} from "../constants/location-constants";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((val) => val || null);

const codeSchema = (minLength: number, maxLength: number, field: string) =>
  z
    .string()
    .trim()
    .min(minLength, `${field} must be at least ${minLength} characters`)
    .max(maxLength, `${field} must be at most ${maxLength} characters`)
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9-_]*$/,
      `${field} may only contain letters, numbers, hyphens, and underscores`,
    )
    .transform((val) => normalizeEntityCode(val));

const emailSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: "Please enter a valid email address",
  })
  .transform((val) => (val ? val.toLowerCase() : null));

const phoneSchema = z
  .string()
  .trim()
  .max(20, "Phone number is too long")
  .optional()
  .nullable()
  .transform((val) => val || null);

export const locationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(LOCATION_NAME_MIN_LENGTH, `Location name must be at least ${LOCATION_NAME_MIN_LENGTH} characters`)
    .max(LOCATION_NAME_MAX_LENGTH, `Location name must be at most ${LOCATION_NAME_MAX_LENGTH} characters`)
    .transform((val) => normalizeEntityName(val)),
  code: codeSchema(LOCATION_CODE_MIN_LENGTH, LOCATION_CODE_MAX_LENGTH, "Location code"),
  description: optionalText(LOCATION_DESCRIPTION_MAX_LENGTH),
  email: emailSchema,
  phone: phoneSchema,
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(20),
  country: optionalText(100),
  timezone: optionalText(100),
  isDefault: z.boolean().optional().default(false),
});

export type LocationInput = z.infer<typeof locationSchema>;
export type LocationFormInput = z.input<typeof locationSchema>;

export const departmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(DEPARTMENT_NAME_MIN_LENGTH, `Department name must be at least ${DEPARTMENT_NAME_MIN_LENGTH} characters`)
    .max(DEPARTMENT_NAME_MAX_LENGTH, `Department name must be at most ${DEPARTMENT_NAME_MAX_LENGTH} characters`)
    .transform((val) => normalizeEntityName(val)),
  code: codeSchema(DEPARTMENT_CODE_MIN_LENGTH, DEPARTMENT_CODE_MAX_LENGTH, "Department code"),
  description: optionalText(DEPARTMENT_DESCRIPTION_MAX_LENGTH),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type DepartmentFormInput = z.input<typeof departmentSchema>;

const idSchema = (field: string) =>
  z.string().trim().min(1, `${field} is required`);

export const assignmentSchema = z.object({
  locationId: idSchema("Location"),
  departmentId: idSchema("Department"),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const assignmentSetSchema = z.object({
  locationIds: z.array(idSchema("Location ID")).max(200, "Too many locations selected"),
  departmentIds: z.array(idSchema("Department ID")).max(200, "Too many departments selected"),
});

export type AssignmentSetInput = z.infer<typeof assignmentSetSchema>;

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LOCATION_LIST_MAX_PAGE_SIZE)
    .optional()
    .default(LOCATION_LIST_DEFAULT_PAGE_SIZE),
});

export const locationListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
  status: z.enum(["all", "active", "inactive"]).optional().default("all"),
  defaultOnly: z.coerce.boolean().optional().default(false),
  sortBy: z.enum(["name", "code", "city", "createdAt"]).optional().default("name"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  ...paginationSchema.shape,
});

export type LocationListQueryInput = z.infer<typeof locationListQuerySchema>;

export const departmentListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
  status: z.enum(["all", "active", "inactive"]).optional().default("all"),
  sortBy: z.enum(["name", "code", "createdAt"]).optional().default("name"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
  ...paginationSchema.shape,
});

export type DepartmentListQueryInput = z.infer<typeof departmentListQuerySchema>;
