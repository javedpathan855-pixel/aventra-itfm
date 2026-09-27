// Canonical role model (domain layer — framework-independent).
//
// Platform and organization roles are separate concepts that must never
// be merged: SUPERADMIN answers "platform administrator", OWNER/ADMIN/
// ENGINEER/USER answer "member of organization X with what standing".
// Storage uses plain strings for Better Auth organization-plugin
// compatibility (the provider only knows owner/admin/member and rejects
// unknown role strings at its own boundary), so this taxonomy — not the
// provider — is the source of truth, enforced at our application/domain
// boundary. Provider representations ("owner") are normalized here.

const SUPERADMIN = "SUPERADMIN" as const;

/** Platform role. `null` = standard user (no admin marker stored). */
type PlatformRole = typeof SUPERADMIN;

const ORGANIZATION_ROLES = ["OWNER", "ADMIN", "ENGINEER", "USER"] as const;

type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/**
 * Normalize a stored/provided organization role to its canonical form.
 * Case-insensitive so the provider's lowercase "owner" (written at
 * registration) resolves to OWNER. Returns null for unknown values —
 * callers treat unknown as unauthorized, never as a default role.
 */
const normalizeOrganizationRole = (raw: unknown): OrganizationRole | null => {
  if (typeof raw !== "string") return null;
  const canonical = raw.trim().toUpperCase();
  return (ORGANIZATION_ROLES as readonly string[]).includes(canonical)
    ? (canonical as OrganizationRole)
    : null;
};

const isOrganizationRole = (raw: unknown): raw is OrganizationRole =>
  normalizeOrganizationRole(raw) !== null;

/**
 * Normalize a stored platform role. Exact match only — a platform role is
 * never inferred from email, domain, or organization data (see
 * bootstrap-superadmin: assignment is explicit server-side state).
 */
const normalizePlatformRole = (raw: unknown): PlatformRole | null =>
  raw === SUPERADMIN ? SUPERADMIN : null;

export { SUPERADMIN, ORGANIZATION_ROLES, normalizeOrganizationRole, isOrganizationRole, normalizePlatformRole };
export type { PlatformRole, OrganizationRole };
