// Asset domain constants (framework-independent).

export const ASSET_STATUSES = ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const ASSET_NAME_MIN_LENGTH = 2;
export const ASSET_NAME_MAX_LENGTH = 100;
export const ASSET_TAG_MIN_LENGTH = 3;
export const ASSET_TAG_MAX_LENGTH = 24;
export const ASSET_DESCRIPTION_MAX_LENGTH = 1000;
export const ASSET_SERIAL_MAX_LENGTH = 100;
export const ASSET_VENDOR_MAX_LENGTH = 100;
export const ASSET_INVOICE_MAX_LENGTH = 60;
export const ASSET_NOTES_MAX_LENGTH = 1000;
export const ASSET_COST_MAX_VALUE = "99999999999.99";

export const CATEGORY_NAME_MIN_LENGTH = 2;
export const CATEGORY_NAME_MAX_LENGTH = 80;
export const CATEGORY_CODE_MIN_LENGTH = 2;
export const CATEGORY_CODE_MAX_LENGTH = 24;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500;

export const MODEL_BRAND_MAX_LENGTH = 60;
export const MODEL_NAME_MAX_LENGTH = 80;
export const MODEL_CODE_MAX_LENGTH = 40;
export const MODEL_DESCRIPTION_MAX_LENGTH = 500;

export const ASSET_LIST_DEFAULT_PAGE_SIZE = 20;
export const ASSET_LIST_MAX_PAGE_SIZE = 100;

/** Days before warranty expiry an asset counts as "expiring soon". */
export const WARRANTY_EXPIRING_SOON_DAYS = 30;

/** Maximum rows included in a single CSV export (memory safety). */
export const ASSET_EXPORT_MAX_ROWS = 5000;

export type WarrantyStatus = "NONE" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

/** Normalize an asset tag / code to its canonical stored form. */
export const normalizeAssetTag = (tag: string): string =>
  tag.trim().toUpperCase().replace(/\s+/g, "-");

/** Normalize a human-entered name to its canonical stored form. */
export const normalizeAssetName = (name: string): string =>
  name.trim().replace(/\s+/g, " ");

/** Queryable history event types (AssetHistory.eventType). */
export const ASSET_HISTORY_EVENTS = [
  "ASSET_CREATED",
  "ASSET_UPDATED",
  "ASSET_ARCHIVED",
  "ASSET_CATEGORY_CREATED",
  "ASSET_CATEGORY_UPDATED",
  "ASSET_CATEGORY_STATUS_CHANGED",
  "ASSET_MODEL_CREATED",
  "ASSET_MODEL_UPDATED",
  "ASSET_MODEL_STATUS_CHANGED",
  "ASSET_ASSIGNED",
  "ASSET_RETURNED",
] as const;
export type AssetHistoryEvent = (typeof ASSET_HISTORY_EVENTS)[number];
