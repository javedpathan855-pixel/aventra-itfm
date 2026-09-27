import { z } from "zod";
import {
  ADDRESS_TYPES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_TIME_FORMATS,
  SUPPORTED_TIMEZONES,
} from "../constants/organization-constants";
import { isValidCin, isValidGstin, isValidPan } from "../services/tax-validator";

export const updateGeneralProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name is too long"),
  legalName: z
    .string()
    .trim()
    .max(120, "Legal name is too long")
    .optional()
    .nullable()
    .transform((val) => val || null),
  businessType: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => val || null),
  industry: z
    .string()
    .trim()
    .max(100, "Industry name is too long")
    .optional()
    .nullable()
    .transform((val) => val || null),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .nullable()
    .transform((val) => val || null),
  establishedDate: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d <= new Date();
      },
      { message: "Established date cannot be in the future" },
    )
    .transform((val) => val || null),
  website: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const url = val.startsWith("http://") || val.startsWith("https://") ? val : `https://${val}`;
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid website URL" },
    )
    .transform((val) => {
      if (!val) return null;
      return val.startsWith("http://") || val.startsWith("https://") ? val : `https://${val}`;
    }),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email address",
    })
    .transform((val) => (val ? val.toLowerCase() : null)),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long")
    .optional()
    .nullable()
    .transform((val) => val || null),
  altPhone: z
    .string()
    .trim()
    .max(20, "Alternate phone number is too long")
    .optional()
    .nullable()
    .transform((val) => val || null),
});

export type UpdateGeneralProfileInput = z.infer<typeof updateGeneralProfileSchema>;
export type UpdateGeneralProfileFormInput = z.input<typeof updateGeneralProfileSchema>;

export const updateLegalTaxSchema = z.object({
  gstin: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || isValidGstin(val), {
      message: "Invalid GSTIN format. Expected 15 characters (e.g. 27ABCDE1234F1Z5).",
    })
    .transform((val) => (val ? val.toUpperCase() : null)),
  pan: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || isValidPan(val), {
      message: "Invalid PAN format. Expected 10 characters (e.g. ABCDE1234F).",
    })
    .transform((val) => (val ? val.toUpperCase() : null)),
  cin: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || isValidCin(val), {
      message: "Invalid CIN format. Expected 21 characters (e.g. U12345MH2020PTC123456).",
    })
    .transform((val) => (val ? val.toUpperCase() : null)),
  businessIdentifier: z
    .string()
    .trim()
    .max(60, "Business identifier is too long")
    .optional()
    .nullable()
    .transform((val) => val || null),
});

export type UpdateLegalTaxInput = z.infer<typeof updateLegalTaxSchema>;
export type UpdateLegalTaxFormInput = z.input<typeof updateLegalTaxSchema>;

export const organizationAddressSchema = z.object({
  id: z.string().optional().nullable(),
  type: z.enum(ADDRESS_TYPES, { message: "Invalid address type" }),
  label: z.string().trim().max(60).optional().nullable().transform((val) => val || null),
  addressLine1: z.string().trim().min(3, "Address line 1 must be at least 3 characters").max(200),
  addressLine2: z.string().trim().max(200).optional().nullable().transform((val) => val || null),
  landmark: z.string().trim().max(100).optional().nullable().transform((val) => val || null),
  city: z.string().trim().min(2, "City name must be at least 2 characters").max(100),
  district: z.string().trim().max(100).optional().nullable().transform((val) => val || null),
  state: z.string().trim().min(2, "State name must be at least 2 characters").max(100),
  stateCode: z.string().trim().max(10).optional().nullable().transform((val) => val || null),
  country: z.string().trim().min(2).default("India"),
  postalCode: z
    .string()
    .trim()
    .min(3, "Postal code must be at least 3 characters")
    .max(15, "Postal code is too long"),
  isDefault: z.boolean().default(false),
});

export type OrganizationAddressInput = z.infer<typeof organizationAddressSchema>;
export type OrganizationAddressFormInput = z.input<typeof organizationAddressSchema>;

export const organizationSettingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(100, "Display name is too long")
    .optional()
    .nullable()
    .transform((val) => val || null),
  timezone: z
    .string()
    .trim()
    .refine((val) => (SUPPORTED_TIMEZONES as readonly string[]).includes(val), {
      message: "Unsupported timezone identifier",
    }),
  locale: z.string().trim().min(2).max(20).default("en-IN"),
  dateFormat: z.enum(SUPPORTED_DATE_FORMATS, { message: "Invalid date format" }),
  timeFormat: z.enum(SUPPORTED_TIME_FORMATS, { message: "Invalid time format" }),
  currency: z.enum(SUPPORTED_CURRENCIES, { message: "Invalid currency" }),
});

export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;
export type OrganizationSettingsFormInput = z.input<typeof organizationSettingsSchema>;

export const logoUploadSchema = z.object({
  dataUrl: z
    .string()
    .min(1, "Logo data is required")
    .refine(
      (val) =>
        val.startsWith("data:image/png;base64,") ||
        val.startsWith("data:image/jpeg;base64,") ||
        val.startsWith("data:image/webp;base64,"),
      { message: "Logo must be a valid PNG, JPEG, or WebP image" },
    ),
});

export type LogoUploadInput = z.infer<typeof logoUploadSchema>;
