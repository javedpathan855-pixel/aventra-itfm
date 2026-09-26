import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getEnv, resetEnvCache } from "@/config/env";

const validSource = {
  ...process.env,
  DATABASE_URL: "postgresql://postgres:admin@localhost:5432/aventra-itfm?schema=public",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "abcdefghijklmnopqrstuvwxyz012345",
  RESEND_API_KEY: "re_test_key",
  RESEND_FROM_EMAIL: "Aventra ITFM <onboarding@resend.dev>",
};

describe("Server environment validation", () => {
  it("accepts a valid development source without touching process.env", () => {
    resetEnvCache();
    const env = getEnv({ ...validSource });
    assert.equal(env.BETTER_AUTH_URL, "http://localhost:3000");
    resetEnvCache();
  });

  it("rejects short secrets without exposing values", () => {
    resetEnvCache();
    assert.throws(
      () => getEnv({ ...validSource, BETTER_AUTH_SECRET: "short" }),
      (err: unknown) =>
        err instanceof Error &&
        err.message.includes("BETTER_AUTH_SECRET") &&
        !err.message.includes("short"),
    );
    resetEnvCache();
  });

  it("requires HTTPS for non-localhost origins", () => {
    resetEnvCache();
    assert.throws(
      () => getEnv({ ...validSource, BETTER_AUTH_URL: "http://app.example.com" }),
      (err: unknown) => err instanceof Error && err.message.includes("BETTER_AUTH_URL"),
    );
    resetEnvCache();
    const prod = getEnv({ ...validSource, BETTER_AUTH_URL: "https://app.example.com" });
    assert.equal(prod.BETTER_AUTH_URL, "https://app.example.com");
    resetEnvCache();
  });

  it("requires a sender address containing an email", () => {
    resetEnvCache();
    assert.throws(
      () => getEnv({ ...validSource, RESEND_FROM_EMAIL: "not-an-address" }),
      (err: unknown) => err instanceof Error && err.message.includes("RESEND_FROM_EMAIL"),
    );
    resetEnvCache();
  });
});
