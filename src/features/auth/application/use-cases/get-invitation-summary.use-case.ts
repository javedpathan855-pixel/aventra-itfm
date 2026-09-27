// Invitation summary use case (application layer).
//
// Read-only preview for the acceptance page: given a token, returns the
// organization name, role, and expiry for pending, unexpired invitations.
// Same safe message as acceptance for every failure mode — the token is
// an unguessable bearer secret, so possession alone grants the preview.

import { z } from "zod";
import { AppError, normalizeError } from "@/shared/error/app-error";
import type {
  AuthorizationDeps,
} from "../authorization/resolve-authorization-context";

const invitationSummarySchema = z.object({
  token: z.string().min(1, "Invitation token is required."),
});

interface InvitationSummaryResult {
  organizationName: string;
  role: string;
  email: string;
  expiresAt: Date | null;
}

const INVALID_MESSAGE = "This invitation is invalid or has expired.";

interface GetInvitationSummaryDeps {
  authorizationRepository: AuthorizationDeps["authorizationRepository"];
  getSession?: AuthorizationDeps["getSession"];
}

const executeGetInvitationSummary = async (
  rawInput: unknown,
  deps: GetInvitationSummaryDeps,
): Promise<InvitationSummaryResult> => {
  const parsed = invitationSummarySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", { cause: parsed.error });
  }

  try {
    const invitation = await deps.authorizationRepository.findInvitationByToken(
      parsed.data.token,
    );
    if (!invitation || invitation.status !== "pending") {
      throw new AppError("FORBIDDEN", { message: INVALID_MESSAGE });
    }
    if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
      throw new AppError("FORBIDDEN", { message: INVALID_MESSAGE });
    }
    const organization = await deps.authorizationRepository.getOrganizationById(
      invitation.organizationId,
    );
    if (!organization) {
      throw new AppError("FORBIDDEN", { message: INVALID_MESSAGE });
    }
    return {
      organizationName: organization.name,
      role: invitation.role,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
    };
  } catch (error) {
    throw normalizeError(error);
  }
};

export { executeGetInvitationSummary };
export type { InvitationSummaryResult };
