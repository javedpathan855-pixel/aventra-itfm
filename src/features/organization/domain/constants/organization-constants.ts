// Organization domain constants (framework-independent).

export const ORGANIZATION_TYPES = [
  "Private Limited",
  "Public Limited",
  "Partnership",
  "Proprietorship",
  "LLP",
  "Non-Profit",
  "Enterprise",
  "Other",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_STATUSES = ["active", "suspended", "archived"] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const ADDRESS_TYPES = [
  "registered",
  "corporate",
  "billing",
  "operational",
  "branch",
  "other",
] as const;

export type AddressType = (typeof ADDRESS_TYPES)[number];

export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  registered: "Registered Office",
  corporate: "Corporate Office",
  billing: "Billing Address",
  operational: "Operational Office",
  branch: "Branch Office",
  other: "Other Address",
};

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const SUPPORTED_DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
] as const;
export type SupportedDateFormat = (typeof SUPPORTED_DATE_FORMATS)[number];

export const SUPPORTED_TIME_FORMATS = ["12h", "24h"] as const;
export type SupportedTimeFormat = (typeof SUPPORTED_TIME_FORMATS)[number];

export const SUPPORTED_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
