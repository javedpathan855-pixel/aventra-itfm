import { z } from "zod";
import { MIN_PASSWORD_LENGTH, OTP_LENGTH } from "../constants/auth-constants";
import { ORGANIZATION_ROLES } from "../authorization/roles";

export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  );

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: passwordSchema,
  remember: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(70, "Full name is too long"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    // Workspace display name. Conservative invariant (no existing rule):
    // mirrors the name bounds with headroom for "Pvt. Ltd."-style suffixes.
    // Terms acceptance is a required registration invariant only — there is
    // no consent-persistence model, so nothing is stored.
    organizationName: z
      .string()
      .trim()
      .min(2, "Organization name must be at least 2 characters")
      .max(100, "Organization name is too long"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    termsAccepted: z
      .boolean()
      .refine((value) => value === true, {
        message: "Please accept the Terms of Service and Privacy Policy to continue.",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const otpVerificationSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  otp: z
    .string()
    .length(OTP_LENGTH, `Verification code must be ${OTP_LENGTH} digits`)
    .regex(/^\d+$/, "Verification code must contain only numbers"),
});

export type OtpVerificationFormData = z.infer<typeof otpVerificationSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Canonical member-invitation input. The role is restricted to canonical
// organization roles here; SUPERADMIN can never arrive (it is not a member
// of ORGANIZATION_ROLES) and invitation policy (who may invite whom) is
// enforced separately in domain/authorization/policies.ts.
export const invitationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  role: z.enum(ORGANIZATION_ROLES, { message: "Select a valid organization role." }),
});

export type InvitationFormData = z.infer<typeof invitationSchema>;
