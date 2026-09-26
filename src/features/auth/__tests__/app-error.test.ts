import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AppError,
  fromPrismaError,
  normalizeError,
  toErrorEnvelope,
} from "@/shared/error/app-error";

describe("Application Error Model & Normalization", () => {
  describe("AppError instantiation", () => {
    it("creates categorized error with appropriate HTTP status", () => {
      const err = new AppError("INVALID_CREDENTIALS");
      assert.equal(err.code, "INVALID_CREDENTIALS");
      assert.equal(err.status, 401);
      assert.equal(typeof err.message, "string");
    });

    it("attaches details and keeps cause internal", () => {
      const internalDbErr = new Error("connection pool timeout on pg_pool:5432");
      const err = new AppError("DATABASE_ERROR", {
        details: { retryAfter: 30 },
        cause: internalDbErr,
      });

      assert.equal(err.code, "DATABASE_ERROR");
      assert.equal(err.status, 503);
      assert.equal(err.cause, internalDbErr);
    });
  });

  describe("fromPrismaError", () => {
    it("maps Prisma constraint violations to safe AppErrors without leaking SQL", () => {
      const p2002 = fromPrismaError({ code: "P2002", meta: { target: ["email"] } });
      assert.equal(p2002?.code, "CONFLICT");
      assert.equal(p2002?.status, 409);

      const p2025 = fromPrismaError({ code: "P2025" });
      assert.equal(p2025?.code, "NOT_FOUND");
    });
  });

  describe("normalizeError", () => {
    it("passes through AppError unchanged and wraps unknown errors safely", () => {
      const original = new AppError("RATE_LIMITED");
      assert.equal(normalizeError(original), original);

      const unknown = new Error("Generic unknown failure");
      const normalized = normalizeError(unknown);
      assert.equal(normalized.code, "INTERNAL_ERROR");
      assert.equal(normalized.cause, unknown);
    });
  });

  describe("toErrorEnvelope (Security & Information Leak Prevention)", () => {
    it("renders safe JSON envelope without exposing stack traces or cause", () => {
      const rawError = new Error("SELECT * FROM credentials WHERE secret_hash = 'xyz'");
      const envelope = toErrorEnvelope(rawError);

      assert.equal(envelope.status, 500);
      assert.equal(envelope.body.success, false);
      assert.equal(envelope.body.error.code, "INTERNAL_ERROR");
      assert.equal(envelope.body.error.message, "Something went wrong. Please try again.");

      const serialized = JSON.stringify(envelope);
      assert.equal(serialized.includes("secret_hash"), false);
      assert.equal(serialized.includes("SELECT"), false);
    });
  });
});
