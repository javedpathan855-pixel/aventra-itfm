// Transactional mailer (infrastructure — server-only).
//
// Implements the mailer port over the existing Resend service: renders the
// invitation template (accept URL built from validated server config) and
// dispatches. The raw token is interpolated into the message only — never
// logged or persisted here.

import { getEnv } from "@/config/env";
import { INVITATION_EXPIRES_IN_SECONDS } from "../../domain/constants/auth-constants";
import type { InvitationEmail, MailerPort } from "../../repository/mailer";
import { buildInvitationEmail, sendEmail } from "./resend-email-service";

const HOURS_PER_SECOND = 3600;

const transactionalMailer: MailerPort = {
  sendInvitationEmail: async (input: InvitationEmail) => {
    const acceptUrl = `${getEnv().BETTER_AUTH_URL}/invitations/accept?token=${encodeURIComponent(input.token)}`;
    const rendered = buildInvitationEmail({
      organizationName: input.organizationName,
      role: input.role,
      acceptUrl,
      expiresInHours: Math.round(INVITATION_EXPIRES_IN_SECONDS / HOURS_PER_SECOND),
    });
    await sendEmail({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  },
};

export { transactionalMailer };
