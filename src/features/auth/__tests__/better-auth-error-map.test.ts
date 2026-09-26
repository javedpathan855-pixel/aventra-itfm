import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppError, toErrorEnvelope } from "@/shared/error/app-error";
import {
  fromBetterAuthError,
  normalizeAuthError,
  readBetterAuthCode,
} from "../infrastructure/error/better-auth-error-map";
import {
  mapProviderCodeToAppCode,
  isVerificationErrorCode,
  isEnumerationSensitiveCode,
} from "../domain/error/auth-error";

describe("Better Auth error mapping", () => {
  it("reads codes from body.code and top-level code shapes", () => {
    assert.equal(readBetterAuthCode({ body: { code: "INVALID_OTP" } }), "INVALID_OTP");
    assert.equal(readBetterAuthCode({ code: "OTP_EXPIRED" }), "OTP_EXPIRED");
    assert.equal(readBetterAuthCode(null), null);
    assert.equal(readBetterAuthCode(new Error("boom")), null);
  });

  it("maps provider failures to safe application codes", () => {
    assert.equal(fromBetterAuthError({ code: "INVALID_EMAIL_OR_PASSWORD" })?.code, "INVALID_CREDENTIALS");
    assert.equal(fromBetterAuthError({ body: { code: "EMAIL_NOT_VERIFIED" } })?.code, "EMAIL_NOT_VERIFIED");
    assert.equal(fromBetterAuthError({ code: "INVALID_OTP" })?.code, "VERIFICATION_FAILED");
    assert.equal(fromBetterAuthError({ code: "OTP_EXPIRED" })?.code, "VERIFICATION_EXPIRED");
    assert.equal(fromBetterAuthError({ code: "TOO_MANY_ATTEMPTS" })?.code, "VERIFICATION_ATTEMPTS_EXCEEDED");
    assert.equal(fromBetterAuthError({ code: "TOO_MANY_REQUESTS" })?.code, "RATE_LIMITED");
    assert.equal(fromBetterAuthError({ code: "USER_ALREADY_EXISTS" })?.code, "CONFLICT");
    assert.equal(fromBetterAuthError({ code: "ORGANIZATION_ALREADY_EXISTS" })?.code, "CONFLICT");
    assert.equal(fromBetterAuthError({ code: "ORGANIZATION_SLUG_ALREADY_TAKEN" })?.code, "CONFLICT");
    assert.equal(fromBetterAuthError({ code: "INVALID_TOKEN" })?.code, "VERIFICATION_FAILED");
    assert.equal(fromBetterAuthError({ code: "EXPIRED_TOKEN" })?.code, "VERIFICATION_EXPIRED");
  });

  it("returns null for unrecognized errors and keeps cause out of envelopes", () => {
    assert.equal(fromBetterAuthError({ code: "SOME_RANDOM_CODE" }), null);
    assert.equal(fromBetterAuthError(null), null);
    const mapped = fromBetterAuthError({ code: "INVALID_OTP" });
    assert.ok(mapped?.cause !== undefined);
    // The transport envelope — the only client-visible shape — must not
    // carry raw provider codes.
    const envelope = toErrorEnvelope(mapped);
    assert.equal(JSON.stringify(envelope).includes("INVALID_OTP"), false);
  });

  it("normalizes unknown failures to INTERNAL_ERROR without leaking internals", () => {
    const original = new AppError("RATE_LIMITED");
    assert.equal(normalizeAuthError(original), original);
    const normalized = normalizeAuthError(new Error("SELECT * FROM user WHERE secret='x'"));
    assert.equal(normalized.code, "INTERNAL_ERROR");
    assert.equal(JSON.stringify(normalized).includes("SELECT"), false);
  });
});

describe("Auth domain error taxonomy", () => {
  it("maps known codes and rejects unknown ones", () => {
    assert.equal(mapProviderCodeToAppCode("INVALID_OTP"), "VERIFICATION_FAILED");
    assert.equal(mapProviderCodeToAppCode("NOPE"), null);
    assert.equal(mapProviderCodeToAppCode(null), null);
  });

  it("classifies verification and enumeration-sensitive codes", () => {
    assert.equal(isVerificationErrorCode("EMAIL_NOT_VERIFIED"), true);
    assert.equal(isVerificationErrorCode("VERIFICATION_EXPIRED"), true);
    assert.equal(isVerificationErrorCode("INVALID_CREDENTIALS"), false);
    assert.equal(isEnumerationSensitiveCode("NOT_FOUND"), true);
    assert.equal(isEnumerationSensitiveCode("RATE_LIMITED"), false);
  });
});
