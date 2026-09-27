// Framework-independent authorization context (domain layer).
//
// Safe representation passed between application, repository, and
// infrastructure: identifiers and canonical roles only — never database
// models, sessions, tokens, or provider shapes.

import type { OrganizationRole, PlatformRole } from "./roles";

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

interface AuthorizationContext {
  userId: string;
  /** Session email (server-side only — never serialized to the client). */
  email: string;
  name?: string | null;
  platformRole: PlatformRole | null;
  /** Active organization. Null when the user has none selected/available. */
  organizationId: string | null;
  /** Caller's role in the active organization. Null when not a member. */
  organizationRole: OrganizationRole | null;
  /** Active organization display data. Null when organizationId is null. */
  organization: OrganizationSummary | null;
}

/** True when the context carries an active organization membership. */
const isOrganizationMember = (
  context: AuthorizationContext,
): context is AuthorizationContext & { organizationId: string; organizationRole: OrganizationRole } =>
  context.organizationId !== null && context.organizationRole !== null;

export type { AuthorizationContext };
export { isOrganizationMember };
