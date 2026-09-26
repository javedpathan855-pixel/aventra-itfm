import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  forgotPasswordSchema,
  otpVerificationSchema,
  registerSchema,
} from "../domain/schemas/auth.schema";
import {
  getSafeRedirectUrl,
  normalizeEmail,
} from "../domain/services/auth-helpers";

describe("Auth domain edge inputs", () => {
  it("normalizes uppercase and whitespace emails deterministically", () => {
    assert.equal(normalizeEmail("  USER@DOMAIN.COM  "), "user@domain.com");
    assert.equal(normalizeEmail("USER@DOMAIN.COM"), normalizeEmail(" user@domain.com "));
  });

  it("rejects invalid and overlong registration values", () => {
    assert.equal(
      forgotPasswordSchema.safeParse({ email: "not-an-email" }).success,
      false,
    );
    assert.equal(forgotPasswordSchema.safeParse({ email: "" }).success, false);
    assert.equal(
      registerSchema.safeParse({
        name: "A".repeat(71),
        email: "user@company.com",
        organizationName: "Acme Technologies",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
        termsAccepted: true,
      }).success,
      false,
    );
    assert.equal(
      registerSchema.safeParse({
        name: "Jane Doe",
        email: "user@company.com",
        organizationName: "   ",
        password: "StrongPass123",
        confirmPassword: "StrongPass123",
        termsAccepted: true,
      }).success,
      false,
    );
  });

  it("rejects empty, spaced, and overlong OTP values", () => {
    assert.equal(
      otpVerificationSchema.safeParse({ email: "user@company.com", otp: "" }).success,
      false,
    );
    assert.equal(
      otpVerificationSchema.safeParse({ email: "user@company.com", otp: "12 456" }).success,
      false,
    );
    assert.equal(
      otpVerificationSchema.safeParse({ email: "bad-email", otp: "123456" }).success,
      false,
    );
  });

  it("blocks encoded and scheme-based open redirects", () => {
    const fallback = "/dashboard";
    assert.equal(getSafeRedirectUrl("https://evil.example", fallback), fallback);
    assert.equal(getSafeRedirectUrl("//evil.example/x", fallback), fallback);
    assert.equal(getSafeRedirectUrl("/\\evil.example", fallback), fallback);
    assert.equal(getSafeRedirectUrl("javascript:alert(1)", fallback), fallback);
    assert.equal(getSafeRedirectUrl("data:text/html,hi", fallback), fallback);
    // Encoded slashes stay on our origin as a relative path — still internal.
    assert.equal(
      getSafeRedirectUrl("/%2Fevil.example", fallback),
      "/%2Fevil.example",
    );
    assert.equal(getSafeRedirectUrl(null, fallback), fallback);
    assert.equal(getSafeRedirectUrl(undefined, fallback), fallback);
    assert.equal(getSafeRedirectUrl("", fallback), fallback);
  });

  it("permits safe internal paths with query strings", () => {
    assert.equal(getSafeRedirectUrl("/org/acme?tab=members", "/dashboard"), "/org/acme?tab=members");
    assert.equal(getSafeRedirectUrl("/auth?mode=login", "/dashboard"), "/auth?mode=login");
  });
});
