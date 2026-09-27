// Audit log port (contracts only — no logger implementation).
//
// Security-relevant authorization events. The application records events;
// infrastructure decides the sink. Recording must never throw and never
// influence authorization decisions. Payloads carry identifiers and roles
// only — never passwords, tokens, OTPs, secrets, or request bodies.

type AuditEventType =
  | "INVITATION_CREATED"
  | "INVITATION_ACCEPTED"
  | "INVITATION_CANCELLED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_REMOVED"
  | "ORGANIZATION_SWITCHED"
  | "ORGANIZATION_PROFILE_UPDATED"
  | "ORGANIZATION_LEGAL_UPDATED"
  | "ORGANIZATION_ADDRESS_CHANGED"
  | "ORGANIZATION_SETTINGS_UPDATED"
  | "ORGANIZATION_LOGO_CHANGED"
  | "LOCATION_CREATED"
  | "LOCATION_UPDATED"
  | "LOCATION_ACTIVATED"
  | "LOCATION_DEACTIVATED"
  | "LOCATION_DEFAULT_CHANGED"
  | "DEPARTMENT_CREATED"
  | "DEPARTMENT_UPDATED"
  | "DEPARTMENT_ACTIVATED"
  | "DEPARTMENT_DEACTIVATED"
  | "LOCATION_DEPARTMENT_ASSIGNED"
  | "LOCATION_DEPARTMENT_UNASSIGNED"
  | "AUTHORIZATION_DENIED"
  | "SUPERADMIN_BOOTSTRAP";

interface AuditEvent {
  type: AuditEventType;
  actorUserId: string | null;
  organizationId: string | null;
  targetUserId?: string;
  targetResourceId?: string;
  result: "allowed" | "denied";
  reason?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

interface AuditLogPort {
  record(event: Omit<AuditEvent, "timestamp">): Promise<void>;
}

export type { AuditEvent, AuditEventType, AuditLogPort };
