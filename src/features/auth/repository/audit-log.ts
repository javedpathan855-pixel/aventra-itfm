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
