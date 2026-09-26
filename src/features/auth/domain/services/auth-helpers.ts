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

export { MAX_SLUG_BASE_LENGTH, normalizeEmail, slugifyOrganizationName };
