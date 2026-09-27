import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatRoleLabel,
  getRoleBadgeVariant,
} from "../presentation/utils/role-formatter";
import { getInitials } from "@/shared/components/ui/avatar";
import {
  NAVIGATION,
  filterNavigation,
  type NavigationItem,
} from "@/features/auth/presentation/navigation/navigation";
import type { AuthorizationContext } from "@/features/auth/domain/authorization/authorization-context";

describe("Dashboard Shell presentation utilities", () => {
  describe("Role label formatting", () => {
    it("formats known organization and platform roles to human-readable strings", () => {
      assert.equal(formatRoleLabel("SUPERADMIN"), "Super Admin");
      assert.equal(formatRoleLabel("OWNER"), "Owner");
      assert.equal(formatRoleLabel("ADMIN"), "Admin");
      assert.equal(formatRoleLabel("ENGINEER"), "Engineer");
      assert.equal(formatRoleLabel("USER"), "User");
    });

    it("normalizes case-insensitively and handles whitespace", () => {
      assert.equal(formatRoleLabel("  owner  "), "Owner");
      assert.equal(formatRoleLabel("admin"), "Admin");
      assert.equal(formatRoleLabel("superadmin"), "Super Admin");
    });

    it("returns empty string for null or undefined role", () => {
      assert.equal(formatRoleLabel(null), "");
      assert.equal(formatRoleLabel(undefined), "");
    });

    it("maps roles to appropriate badge variants without inventing colors", () => {
      assert.equal(getRoleBadgeVariant("SUPERADMIN"), "primary");
      assert.equal(getRoleBadgeVariant("OWNER"), "primary");
      assert.equal(getRoleBadgeVariant("ADMIN"), "secondary");
      assert.equal(getRoleBadgeVariant("ENGINEER"), "outline");
      assert.equal(getRoleBadgeVariant("USER"), "secondary");
      assert.equal(getRoleBadgeVariant(null), "default");
    });
  });

  describe("Avatar initials generation", () => {
    it("extracts two-letter initials from full names", () => {
      assert.equal(getInitials("Javed Pathan", null), "JP");
      assert.equal(getInitials("Alice Bob Charlie", null), "AB");
    });

    it("handles single-word names", () => {
      assert.equal(getInitials("Administrator", null), "AD");
    });

    it("falls back to email prefix when name is absent", () => {
      assert.equal(getInitials(null, "operations@aventra.com"), "OP");
      assert.equal(getInitials("", "javed@company.com"), "JA");
    });

    it("falls back to 'U' when neither is provided", () => {
      assert.equal(getInitials(null, null), "U");
      assert.equal(getInitials("", ""), "U");
    });
  });

  describe("Active route derivation", () => {
    const isRouteActive = (pathname: string, href: string): boolean =>
      pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

    it("marks /dashboard active when current pathname is exactly /dashboard", () => {
      assert.equal(isRouteActive("/dashboard", "/dashboard"), true);
    });

    it("does not falsely mark /dashboard active for unrelated routes", () => {
      assert.equal(isRouteActive("/auth", "/dashboard"), false);
      assert.equal(isRouteActive("/showcase", "/dashboard"), false);
      assert.equal(isRouteActive("/invitations/accept", "/dashboard"), false);
    });

    it("marks subroutes active for specific feature prefixes", () => {
      assert.equal(isRouteActive("/dashboard/members/123", "/dashboard/members"), true);
      assert.equal(isRouteActive("/dashboard/settings", "/dashboard/members"), false);
    });
  });

  describe("RBAC and live navigation model", () => {
    it("only ships live routes that actually exist in the application", () => {
      assert.deepEqual(
        NAVIGATION.map((item) => item.href),
        ["/dashboard"],
      );
    });

    it("renders dashboard item for every authenticated role", () => {
      for (const role of ["OWNER", "ADMIN", "ENGINEER", "USER"] as const) {
        const items = filterNavigation(NAVIGATION, {
          organizationRole: role,
          platformRole: null,
        });
        assert.equal(items.length, 1);
        assert.equal(items[0].href, "/dashboard");
        assert.equal(items[0].label, "Dashboard");
      }
    });

    it("renders dashboard for platform superadmin", () => {
      const items = filterNavigation(NAVIGATION, {
        organizationRole: null,
        platformRole: "SUPERADMIN",
      });
      assert.equal(items.length, 1);
      assert.equal(items[0].href, "/dashboard");
    });
  });

  describe("Authorization boundary integrity", () => {
    it("ensures presentation view models never act as authorization decisions", () => {
      // Presentation consumes filtered items, but mock context with forbidden permission must still be blocked by domain policy
      const mockContext: AuthorizationContext = {
        userId: "user-1",
        email: "engineer@company.com",
        platformRole: null,
        organizationId: "org-1",
        organizationRole: "ENGINEER",
        organization: { id: "org-1", name: "Engineering Org", slug: "engineering-org" },
      };

      const gatedItems: readonly NavigationItem[] = [
        { label: "Dashboard", href: "/dashboard", permission: null },
        {
          label: "Manage Members",
          href: "/organization/members",
          permission: { scope: "organization", permission: "member.invite" },
        },
      ];

      const visible = filterNavigation(gatedItems, {
        organizationRole: mockContext.organizationRole,
        platformRole: mockContext.platformRole,
      });

      // Engineer cannot see member.create item
      assert.equal(visible.length, 1);
      assert.equal(visible[0].href, "/dashboard");
      assert.ok(!visible.some((item) => item.href === "/organization/members"));
    });
  });
});
