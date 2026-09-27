// Authorization context resolver (application layer — framework-independent).
//
// Single authoritative resolver for "who is calling, in which tenant,
// with what standing": session → user/platform role → active organization
// → membership/organization role. Rejects unauthenticated callers, unknown
// organizations, and non-members with safe application errors. Organizations
// are never taken from client input except as an explicitly verified
// candidate: membership is always re-checked server-side.

import { AppError } from "@/shared/error/app-error";
import type {
  AuthorizationContext,
} from "../../domain/authorization/authorization-context";
import {
  normalizeOrganizationRole,
  normalizePlatformRole,
} from "../../domain/authorization/roles";
import type { AuthorizationRepository } from "../../repository/authorization-repository";

interface SessionSnapshot {
  userId: string;
  email: string;
  name?: string | null;
  activeOrganizationId: string | null;
}

interface AuthorizationDeps {
  getSession: () => Promise<SessionSnapshot | null>;
  authorizationRepository: AuthorizationRepository;
}

interface ResolveAuthorizationInput {
  /** Explicit organization candidate (e.g. switch target). Verified, never trusted. */
  organizationId?: string | null;
  /** When true, a missing organization selection is rejected. */
  requireOrganization?: boolean;
  /** When true and no organization is active in session, auto-selects primary/owned membership. */
  autoSelectDefault?: boolean;
}

const parseResolveInput = (raw: unknown): ResolveAuthorizationInput => {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object") throw new AppError("VALIDATION_ERROR");
  const record = raw as Record<string, unknown>;
  const { organizationId, requireOrganization, autoSelectDefault } = record;
  if (organizationId !== undefined && organizationId !== null) {
    if (typeof organizationId !== "string" || organizationId.length === 0) {
      throw new AppError("VALIDATION_ERROR");
    }
  }
  if (requireOrganization !== undefined && typeof requireOrganization !== "boolean") {
    throw new AppError("VALIDATION_ERROR");
  }
  if (autoSelectDefault !== undefined && typeof autoSelectDefault !== "boolean") {
    throw new AppError("VALIDATION_ERROR");
  }
  return {
    organizationId: (organizationId as string | null | undefined) ?? null,
    requireOrganization: (requireOrganization as boolean | undefined) ?? false,
    autoSelectDefault: (autoSelectDefault as boolean | undefined) ?? false,
  };
};

/**
 * Resolve the authorization context. Throws UNAUTHENTICATED without a
 * session; FORBIDDEN for non-members (no existence leak: unknown and
 * foreign organizations fail identically); ORGANIZATION_NOT_FOUND only
 * when an explicitly requested organization id matches nothing AND the
 * caller asked about a specific unknown organization through a
 * platform-explicit path — member paths always use FORBIDDEN.
 */
const resolveAuthorizationContext = async (
  rawInput: unknown,
  deps: AuthorizationDeps,
): Promise<AuthorizationContext> => {
  const input = parseResolveInput(rawInput);
  const session = await deps.getSession();
  if (!session) {
    throw new AppError("UNAUTHENTICATED");
  }

  const platformRole = normalizePlatformRole(
    await deps.authorizationRepository.getUserPlatformRole(session.userId),
  );

  let organizationId = input.organizationId ?? session.activeOrganizationId;
  if (!organizationId && input.autoSelectDefault) {
    const userMemberships = await deps.authorizationRepository.listMembershipsForUser(
      session.userId,
    );
    if (userMemberships.length > 0) {
      const owned = userMemberships.find(
        (m) => normalizeOrganizationRole(m.role) === "OWNER",
      );
      organizationId = owned ? owned.organizationId : userMemberships[0].organizationId;
    }
  }

  if (!organizationId) {
    if (input.requireOrganization) {
      throw new AppError("FORBIDDEN", {
        message: "Select an organization to continue.",
      });
    }
    return {
      userId: session.userId,
      email: session.email,
      name: session.name ?? null,
      platformRole,
      organizationId: null,
      organizationRole: null,
      organization: null,
    };
  }

  const membership = await deps.authorizationRepository.getMembership(
    session.userId,
    organizationId,
  );
  if (!membership) {
    throw new AppError("FORBIDDEN", {
      message: "You don't have permission to access this organization.",
    });
  }
  const organizationRole = normalizeOrganizationRole(membership.role);
  if (!organizationRole) {
    throw new AppError("FORBIDDEN", {
      message: "You don't have permission to access this organization.",
    });
  }
  const organization = await deps.authorizationRepository.getOrganizationById(
    organizationId,
  );
  if (!organization) {
    throw new AppError("FORBIDDEN", {
      message: "You don't have permission to access this organization.",
    });
  }
  return {
    userId: session.userId,
    email: session.email,
    name: session.name ?? null,
    platformRole,
    organizationId,
    organizationRole,
    organization: { id: organization.id, name: organization.name, slug: organization.slug },
  };
};

export { resolveAuthorizationContext, parseResolveInput };
export type { AuthorizationDeps, ResolveAuthorizationInput, SessionSnapshot };
