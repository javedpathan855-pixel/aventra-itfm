// Indian Tax and Corporate Identification validators (domain service).
// Pure, framework-independent.

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const CIN_REGEX = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/**
 * Validates 15-character Goods and Services Tax Identification Number (GSTIN).
 * Format: 2 state digits + 10 PAN chars + 1 entity code + 1 'Z' default + 1 check digit.
 */
export const isValidGstin = (value: string | null | undefined): boolean => {
  if (!value || typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  return GSTIN_REGEX.test(normalized);
};

/**
 * Validates 10-character Permanent Account Number (PAN).
 * Format: 5 uppercase letters + 4 digits + 1 uppercase letter.
 */
export const isValidPan = (value: string | null | undefined): boolean => {
  if (!value || typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  return PAN_REGEX.test(normalized);
};

/**
 * Validates 21-character Corporate Identification Number (CIN).
 * Format: L/U + 5 industry digits + 2 state letters + 4 year digits + 3 entity letters + 6 registration digits.
 */
export const isValidCin = (value: string | null | undefined): boolean => {
  if (!value || typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  return CIN_REGEX.test(normalized);
};

/**
 * Masks sensitive tax identifiers for summary/audit view while preserving checkability.
 * Example PAN: "ABCDE1234F" -> "ABCDE****F"
 * Example GSTIN: "27ABCDE1234F1Z5" -> "27ABCDE****1Z5"
 */
export const maskTaxIdentifier = (value: string | null | undefined): string => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length <= 6) return trimmed;
  if (trimmed.length === 10) {
    // PAN: Keep first 5, mask 4 digits, keep last letter
    return `${trimmed.slice(0, 5)}****${trimmed.slice(9)}`;
  }
  if (trimmed.length === 15) {
    // GSTIN: Keep state + 5 chars of PAN, mask digits, keep last 3
    return `${trimmed.slice(0, 7)}****${trimmed.slice(12)}`;
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-2);
  return `${prefix}${"*".repeat(Math.max(trimmed.length - 6, 4))}${suffix}`;
};
