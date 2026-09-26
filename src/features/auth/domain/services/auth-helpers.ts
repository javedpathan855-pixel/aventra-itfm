// Pure auth helpers: normalization and slug derivation.
//
// Framework-neutral (domain layer): no React, no Next.js, no ORM, no
// provider SDKs. Server actions and the repository reuse these so
// tenant identity is derived identically at every boundary.

/** Lowercase + trim. Email uniqueness is enforced on this form. */
const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const MAX_SLUG_BASE_LENGTH = 40;

/** URL-safe base slug for an organization name (no randomness here). */
const slugifyOrganizationName = (name: string): string => {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_BASE_LENGTH)
    .replace(/-+$/g, "");

  return base || "organization";
};

/**
 * Validate redirect destination to prevent open redirect vulnerabilities.
 * Only internal relative paths starting with a single '/' are permitted.
 * Disallows protocol-relative URLs (//), backslashes, and schemes (e.g. javascript:).
 */
const getSafeRedirectUrl = (
  rawUrl: string | null | undefined,
  fallback = "/dashboard",
): string => {
  if (!rawUrl || typeof rawUrl !== "string") {
    return fallback;
  }

  const trimmed = rawUrl.trim();

  // Must begin with single slash, not double slash or backslash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }

  // Prevent control characters or scheme injection
  try {
    const dummy = new URL(trimmed, "http://localhost");
    // Ensure the pathname is preserved and matches internal relative pattern
    if (dummy.origin !== "http://localhost") {
      return fallback;
    }
    return trimmed;
  } catch {
    return fallback;
  }
};

export {
  MAX_SLUG_BASE_LENGTH,
  normalizeEmail,
  slugifyOrganizationName,
  getSafeRedirectUrl,
};
