// Invitation token issuance (infrastructure — server-only).
//
// Cryptographic random tokens (256-bit) with SHA-256 hex digests for
// storage. Raw tokens leave this module exactly once (email dispatch);
// only digests are persisted or compared. Uses Node's secure random API —
// never Math.random().

import { createHash, randomBytes } from "node:crypto";

import { INVITATION_TOKEN_BYTES } from "../../domain/constants/auth-constants";

interface IssuedInvitationToken {
  /** Raw token for the acceptance link (handle once, never log/store). */
  token: string;
  /** SHA-256 hex digest for persistence and lookup. */
  tokenHash: string;
}

const issueInvitationToken = (): IssuedInvitationToken => {
  const token = randomBytes(INVITATION_TOKEN_BYTES).toString("hex");
  return { token, tokenHash: hashInvitationToken(token) };
};

const hashInvitationToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export { issueInvitationToken, hashInvitationToken };
export type { IssuedInvitationToken };
