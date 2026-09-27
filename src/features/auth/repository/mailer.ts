// Transactional mailer port (contracts only — no provider SDK).
//
// Outbound-email capabilities required by application use cases. The
// infrastructure adapter renders templates and dispatches through the
// existing email service. Raw tokens travel here for link construction
// only — adapters must never log or persist them.

interface InvitationEmail {
  to: string;
  organizationName: string;
  role: string;
  /** Raw acceptance token (link construction only — never logged/stored). */
  token: string;
  expiresAt: Date;
}

interface MailerPort {
  sendInvitationEmail(input: InvitationEmail): Promise<void>;
}

export type { MailerPort, InvitationEmail };
