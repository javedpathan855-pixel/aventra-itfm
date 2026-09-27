import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import proxyDefault, { isPublicPath, isProtectedPage } from "../../../proxy";

describe("Proxy route gating", () => {
  it("treats auth, showcase, and auth APIs as public", () => {
    for (const path of [
      "/",
      "/auth",
      "/auth?mode=login",
      "/auth/reset-password",
      "/showcase",
      "/showcase/playground",
      "/api/auth/callback",
      "/api/auth/session",
    ]) {
      assert.equal(isPublicPath(path.split("?")[0]), true, path);
      assert.equal(isProtectedPage(path.split("?")[0]), false, path);
    }
  });

  it("treats assets and framework internals as public", () => {
    for (const path of ["/favicon.ico", "/icons/lock.png", "/_next/static/chunk.js", "/robots.txt"]) {
      assert.equal(isPublicPath(path), true, path);
    }
  });

  it("gates dashboard and organization pages behind a session", () => {
    for (const path of ["/dashboard", "/dashboard/settings", "/organization", "/organization/members"]) {
      assert.equal(isPublicPath(path), false, path);
      assert.equal(isProtectedPage(path), true, path);
    }
  });

  it("leaves API authorization to in-route enforcement, not page gating", () => {
    assert.equal(isProtectedPage("/api/organization/members"), false);
    assert.equal(isPublicPath("/api/organization/members"), false);
  });
});

describe("Proxy redirects", () => {
  it("redirects anonymous protected pages to login", () => {
    const response = proxyDefault(new NextRequest("http://localhost:3000/dashboard"));
    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "http://localhost:3000/auth?callbackUrl=%2Fdashboard",
    );
  });

  it("preserves token query strings across the login round-trip", () => {
    const response = proxyDefault(
      new NextRequest("http://localhost:3000/invitations/accept?token=abc123"),
    );
    assert.equal(response.status, 307);
    const location = response.headers.get("location") ?? "";
    assert.ok(location.startsWith("http://localhost:3000/auth?callbackUrl="));
    assert.ok(!location.includes("token=abc123&"), "no stray token parameter");
    assert.ok(location.includes("token%3Dabc123"), "token preserved inside callbackUrl");
  });

  it("passes public pages through untouched", () => {
    const response = proxyDefault(new NextRequest("http://localhost:3000/auth?mode=login"));
    assert.equal(response.headers.get("location"), null);
  });
});
