import { getEnv } from "@/config/env";
import { AppError } from "@/shared/error/app-error";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Server-only Resend email delivery service using the official HTTP API.
 * Keeps external dependencies at zero while leveraging validated env configuration.
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<{ id?: string }> => {
  const env = getEnv();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      // Never log response bodies: they can echo recipient addresses or
      // provider internals. Status line is sufficient for diagnostics.
      console.error("[EmailService] Failed to send email via Resend:", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new AppError("EMAIL_DELIVERY_ERROR", {
        message: "Failed to dispatch email. Please try again later.",
      });
    }

    const payload: unknown = await response.json();
    if (
      typeof payload === "object" &&
      payload !== null &&
      "id" in payload &&
      typeof (payload as { id: unknown }).id === "string"
    ) {
      return { id: (payload as { id: string }).id };
    }
    return {};
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Log only the message — the raw error object can carry request
    // details (headers, recipients) that must stay out of log aggregators.
    console.error(
      "[EmailService] Unexpected error sending email:",
      error instanceof Error ? error.message : "unknown error",
    );
    throw new AppError("EMAIL_DELIVERY_ERROR", {
      message: "An error occurred while sending the email.",
      cause: error,
    });
  }
};

/**
 * Render standard branded HTML template for 6-digit OTP verification code.
 */
export const buildVerificationOtpEmail = (otp: string): { subject: string; html: string; text: string } => {
  const subject = `Your Aventra Verification Code: ${otp}`;
  const text = `Your Aventra ITFM verification code is: ${otp}. It expires in 10 minutes.`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ededed;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080f1a; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background: #0c1424; border: 1px solid rgba(98, 116, 166, 0.24); border-radius: 16px; overflow: hidden; box-shadow: 0 24px 65px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="padding: 32px 32px 16px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Aventra ITFM</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #8c9cb8;">Enterprise IT Financial Management & Cost Optimization</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #ffffff;">Verify Your Email Address</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #8c9cb8;">
                Please use the following 6-digit verification code to complete your security authentication. This code will expire in 10 minutes.
              </p>
              <div style="display: inline-block; background: #111a30; border: 1px solid rgba(74, 99, 216, 0.4); border-radius: 12px; padding: 16px 32px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #4a63d8; font-family: monospace;">
                ${otp}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #5a6b88;">
                If you did not request this verification code, you can safely ignore this email. Someone else may have typed your email address by mistake.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html, text };
};

/**
 * Render standard branded HTML template for password reset link.
 */
export const buildPasswordResetEmail = (resetUrl: string): { subject: string; html: string; text: string } => {
  const subject = "Reset Your Aventra ITFM Password";
  const text = `Reset your password by opening the following link in your browser: ${resetUrl}. This link expires in 1 hour.`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ededed;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080f1a; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background: #0c1424; border: 1px solid rgba(98, 116, 166, 0.24); border-radius: 16px; overflow: hidden; box-shadow: 0 24px 65px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="padding: 32px 32px 16px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Aventra ITFM</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #8c9cb8;">Enterprise IT Financial Management & Cost Optimization</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 24px 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #ffffff;">Reset Your Password</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #8c9cb8;">
                We received a request to reset your password. Click the secure link below to create a new password. This link is valid for 1 hour.
              </p>
              <a href="${resetUrl}" style="display: inline-block; background-color: #4a63d8; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 14px rgba(74, 99, 216, 0.4);">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #5a6b88;">
                If you did not request a password reset, please disregard this email. Your credentials remain safe.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html, text };
};
