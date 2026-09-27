// Shared dependency surface for asset use cases (application layer).

import type { AuthorizationRepository } from "@/features/auth/repository/authorization-repository";
import type { AuditLogPort } from "@/features/auth/repository/audit-log";
import type { AssetRepository } from "../../repository/asset-repository";

interface SessionSnapshot {
  userId: string;
  email: string;
  name?: string | null;
  activeOrganizationId: string | null;
}

export interface AssetUseCasesDeps {
  getSession: () => Promise<SessionSnapshot | null>;
  authorizationRepository: AuthorizationRepository;
  assetRepository: AssetRepository;
  auditLog?: AuditLogPort;
}
