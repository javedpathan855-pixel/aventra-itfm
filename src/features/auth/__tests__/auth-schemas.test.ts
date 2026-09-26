import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loginSchema,
  registerSchema,
  otpVerificationSchema,
  resetPasswordSchema,
  passwordSchema,
} from "../domain/schemas/auth.schema";
import { MIN_PASSWORD_LENGTH, OTP_LENGTH } from "../domain/constants/auth-constants";

describe("Auth Validation Schemas", () => {
  describe("passwordSchema", () => {
    it(`enforces minimum length of ${MIN_PASSWORD_LENGTH}`, () => {
      assert.equal(passwordSchema.safeParse("short").success, false);
      assert.equal(passwordSchema.safeParse("1234567").success, false);
      assert.equal(passwordSchema.safeParse("12345678").success, true);
    });

    it("rejects empty passwords", () => {
      assert.equal(passwordSchema.safeParse("").success, false);
    });
  });

  describe("loginSchema", () => {
    it("validates correct email and password", () => {
      const res = loginSchema.safeParse({
        email: "finance.admin@aventra.io",
        password: "EnterprisePassword123",
        remember: true,
      });
      assert.equal(res.success, true);
    });

    it("fails on malformed email address", () => {
      const res = loginSchema.safeParse({
        email: "not-an-email",
        password: "EnterprisePassword123",
        remember: false,
      });
      assert.equal(res.success, false);
    });

    it("fails when password is below min length", () => {
      const res = loginSchema.safeParse({
        email: "valid@company.com",
        password: "123",
        remember: false,
      });
      assert.equal(res.success, false);
    });
  });

  describe("registerSchema", () => {
    it("validates matching passwords and valid user details", () => {
      const res = registerSchema.safeParse({
        name: "Dev Leader",
        email: "leader@tech.io",
        organizationName: "Acme Technologies",
        password: "StrongPassword890",
        confirmPassword: "StrongPassword890",
        termsAccepted: true,
      });
      assert.equal(res.success, true);
    });

    it("fails when passwords mismatch", () => {
      const res = registerSchema.safeParse({
        name: "Dev Leader",
        email: "leader@tech.io",
        organizationName: "Acme Technologies",
        password: "StrongPassword890",
        confirmPassword: "DifferentPassword890",
        termsAccepted: true,
      });
      assert.equal(res.success, false);
      if (!res.success) {
        assert.equal(res.error.issues[0].message, "Passwords do not match");
      }
    });

    it("fails when name is too short", () => {
      const res = registerSchema.safeParse({
        name: "A",
        email: "leader@tech.io",
        organizationName: "Acme Technologies",
        password: "StrongPassword890",
        confirmPassword: "StrongPassword890",
        termsAccepted: true,
      });
      assert.equal(res.success, false);
    });

    it("fails when the organization name is too short", () => {
      const res = registerSchema.safeParse({
        name: "Dev Leader",
        email: "leader@tech.io",
        organizationName: "A",
        password: "StrongPassword890",
        confirmPassword: "StrongPassword890",
        termsAccepted: true,
      });
      assert.equal(res.success, false);
    });

    it("fails when terms are not accepted", () => {
      const res = registerSchema.safeParse({
        name: "Dev Leader",
        email: "leader@tech.io",
        organizationName: "Acme Technologies",
        password: "StrongPassword890",
        confirmPassword: "StrongPassword890",
        termsAccepted: false,
      });
      assert.equal(res.success, false);
    });
  });

  describe("otpVerificationSchema", () => {
    it(`validates exactly ${OTP_LENGTH} numeric digits`, () => {
      const res = otpVerificationSchema.safeParse({
        email: "test@domain.com",
        otp: "123456",
      });
      assert.equal(res.success, true);
    });

    it("rejects non-numeric characters in OTP", () => {
      const res = otpVerificationSchema.safeParse({
        email: "test@domain.com",
        otp: "12345A",
      });
      assert.equal(res.success, false);
    });

    it("rejects codes that are too short or too long", () => {
      assert.equal(
        otpVerificationSchema.safeParse({ email: "test@domain.com", otp: "12345" }).success,
        false,
      );
      assert.equal(
        otpVerificationSchema.safeParse({ email: "test@domain.com", otp: "1234567" }).success,
        false,
      );
    });
  });

  describe("resetPasswordSchema", () => {
    it("validates new password confirmation", () => {
      const res = resetPasswordSchema.safeParse({
        password: "BrandNewPassword2026",
        confirmPassword: "BrandNewPassword2026",
      });
      assert.equal(res.success, true);
    });

    it("rejects mismatching confirmation", () => {
      const res = resetPasswordSchema.safeParse({
        password: "BrandNewPassword2026",
        confirmPassword: "WrongConfirmation2026",
      });
      assert.equal(res.success, false);
    });
  });
});
