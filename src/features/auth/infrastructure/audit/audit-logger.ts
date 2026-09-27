// Audit logger (infrastructure — server-only).
//
// Implements the audit port as structured JSON lines on stdout (captured
// by the platform log aggregator). No persistent store: intentional
// foundation scope — promotion to a queryable audit table is future work.
// Never throws: authorization must never depend on audit availability.
// Never logs secrets: the event shape carries identifiers and roles only.

import type { AuditEvent, AuditLogPort } from "../../repository/audit-log";

const auditLogger: AuditLogPort = {
  record: async (event) => {
    try {
      const full: AuditEvent = { ...event, timestamp: new Date().toISOString() };
      console.log(JSON.stringify({ source: "authz-audit", ...full }));
    } catch {
      // Audit is best-effort by contract; swallow serialization failures.
    }
  },
};

/**
 * Record an authorization denial from a composition boundary (API route).
 * Call with the safe error code only — never messages, bodies, or tokens.
 */
const recordAuthorizationDenial = async (input: {
  route: string;
  code: string;
  actorUserId?: string | null;
  organizationId?: string | null;
}): Promise<void> => {
  await auditLogger.record({
    type: "AUTHORIZATION_DENIED",
    actorUserId: input.actorUserId ?? null,
    organizationId: input.organizationId ?? null,
    result: "denied",
    reason: input.code,
    metadata: { route: input.route },
  });
};

export { auditLogger, recordAuthorizationDenial };
