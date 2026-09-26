import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSafeRedirectUrl,
  normalizeEmail,
  slugifyOrganizationName,
} from "../domain/services/auth-helpers";

describe("Auth Domain Helpers", () => {
  describe("normalizeEmail", () => {
    it("lowercases and trims email addresses", () => {
      assert.equal(normalizeEmail("  USER@COMPANY.COM  "), "user@company.com");
      assert.equal(normalizeEmail("Alice.Smith@Domain.Org"), "alice.smith@domain.org");
    });
  });

  describe("slugifyOrganizationName", () => {
    it("converts organization names to URL-safe slugs", () => {
      assert.equal(slugifyOrganizationName("Aventra Technologies Inc."), "aventra-technologies-inc");
      assert.equal(slugifyOrganizationName("  IT Financial Mgmt  "), "it-financial-mgmt");
      assert.equal(slugifyOrganizationName("Special @#$% Characters!"), "special-characters");
    });

    it("falls back to 'organization' if name has no valid alphanumeric characters", () => {
      assert.equal(slugifyOrganizationName("!@#$%^&*()"), "organization");
      assert.equal(slugifyOrganizationName("   "), "organization");
    });
  });

  describe("getSafeRedirectUrl (Open Redirect Prevention)", () => {
    it("permits safe internal relative paths", () => {
      assert.equal(getSafeRedirectUrl("/dashboard"), "/dashboard");
      assert.equal(getSafeRedirectUrl("/settings/team"), "/settings/team");
      assert.equal(getSafeRedirectUrl("/invoices?page=2"), "/invoices?page=2");
    });

    it("rejects open redirect attacks to external hosts and protocol-relative URLs", () => {
      assert.equal(getSafeRedirectUrl("https://evil.com"), "/dashboard");
      assert.equal(getSafeRedirectUrl("http://attacker.org"), "/dashboard");
      assert.equal(getSafeRedirectUrl("//evil.com/fake-login"), "/dashboard");
      assert.equal(getSafeRedirectUrl("/\\evil.com"), "/dashboard");
      assert.equal(getSafeRedirectUrl("javascript:alert(1)"), "/dashboard");
      assert.equal(getSafeRedirectUrl("data:text/html,..."), "/dashboard");
    });

    it("falls back to provided fallback url when invalid or missing", () => {
      assert.equal(getSafeRedirectUrl(null, "/custom"), "/custom");
      assert.equal(getSafeRedirectUrl(undefined, "/custom"), "/custom");
      assert.equal(getSafeRedirectUrl("", "/custom"), "/custom");
    });
  });
});
