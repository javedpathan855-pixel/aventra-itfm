import { describe, it, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "@/shared/error/app-error";
import { getEnv, resetEnvCache } from "@/config/env";
import { sendEmail } from "../infrastructure/email/resend-email-service";

const TEST_ENV = {
  DATABASE_URL: "postgresql://postgres:admin@localhost:5432/aventra-itfm?schema=public",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "abcdefghijklmnopqrstuvwxyz012345",
  RESEND_API_KEY: "re_test_key",
  RESEND_FROM_EMAIL: "Aventra ITFM <onboarding@resend.dev>",
};

beforeEach(() => {
  for (const [key, value] of Object.entries(TEST_ENV)) {
    process.env[key] = value;
  }
  resetEnvCache();
  // Fail fast if the fixture itself is invalid.
  getEnv();
});

afterEach(() => {
  for (const key of Object.keys(TEST_ENV)) {
    delete process.env[key];
  }
  resetEnvCache();
  // Each test installs its own fetch stub; delete it afterwards.
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.fetch;
});

const stubFetch = (impl: (url: string, init?: Record<string, unknown>) => Promise<unknown>): void => {
  (globalThis as unknown as Record<string, unknown>).fetch = impl;
};

const okResponse = (payload: unknown): unknown => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async (): Promise<unknown> => payload,
});

const errResponse = (): unknown => ({
  ok: false,
  status: 422,
  statusText: "Unprocessable Entity",
  text: async (): Promise<string> => "validation failed",
});

describe("Resend email service", () => {
  it("returns the message id on success and keeps the API key server-side", async () => {
    let seenAuth = "";
    stubFetch(async (_url, init) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      seenAuth = headers.Authorization ?? "";
      return okResponse({ id: "msg_123" });
    });
    const result = await sendEmail({ to: "user@company.com", subject: "Hi", html: "<p>Hi</p>" });
    assert.equal(result.id, "msg_123");
    assert.ok(seenAuth.startsWith("Bearer "));
  });

  it("tolerates unexpected payload shapes without unsafe casts", async () => {
    stubFetch(async () => okResponse({ unexpected: true }));
    const result = await sendEmail({ to: "user@company.com", subject: "Hi", html: "<p>Hi</p>" });
    assert.equal(result.id, undefined);
  });

  it("maps provider rejections to safe delivery errors", async () => {
    stubFetch(async () => errResponse());
    await assert.rejects(
      sendEmail({ to: "user@company.com", subject: "Hi", html: "<p>Hi</p>" }),
      (err: unknown) => err instanceof AppError && err.code === "EMAIL_DELIVERY_ERROR",
    );
  });

  it("maps network failures to safe delivery errors", async () => {
    stubFetch(async () => {
      throw new Error("socket hang up");
    });
    await assert.rejects(
      sendEmail({ to: "user@company.com", subject: "Hi", html: "<p>Hi</p>" }),
      (err: unknown) => err instanceof AppError && err.code === "EMAIL_DELIVERY_ERROR",
    );
  });
});
