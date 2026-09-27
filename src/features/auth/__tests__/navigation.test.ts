import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NAVIGATION,
  filterNavigation,
  type NavigationItem,
} from "../presentation/navigation/navigation";

const GATED_FIXTURES: readonly NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", permission: null },
  { label: "Members", href: "/organization/members", permission: { scope: "organization", permission: "member.read" } },
  { label: "Platform Users", href: "/platform/users", permission: { scope: "platform", permission: "platform.user.read" } },
];

describe("Authorization-aware navigation", () => {
  it("always shows unauthenticated-safe items to every role", () => {
    for (const role of ["OWNER", "ADMIN", "ENGINEER", "USER", null] as const) {
      const visible = filterNavigation(GATED_FIXTURES, { organizationRole: role, platformRole: null });
      assert.ok(visible.some((item) => item.href === "/dashboard"), String(role));
    }
  });

  it("shows member-gated items to OWNER and ADMIN only", () => {
    const owner = filterNavigation(GATED_FIXTURES, { organizationRole: "OWNER", platformRole: null });
    const admin = filterNavigation(GATED_FIXTURES, { organizationRole: "ADMIN", platformRole: null });
    const engineer = filterNavigation(GATED_FIXTURES, { organizationRole: "ENGINEER", platformRole: null });
    const user = filterNavigation(GATED_FIXTURES, { organizationRole: "USER", platformRole: null });
    assert.ok(owner.some((item) => item.href === "/organization/members"));
    assert.ok(admin.some((item) => item.href === "/organization/members"));
    assert.ok(!engineer.some((item) => item.href === "/organization/members"));
    assert.ok(!user.some((item) => item.href === "/organization/members"));
  });

  it("shows platform items to SUPERADMIN only — never to owners", () => {
    const root = filterNavigation(GATED_FIXTURES, { organizationRole: null, platformRole: "SUPERADMIN" });
    const owner = filterNavigation(GATED_FIXTURES, { organizationRole: "OWNER", platformRole: null });
    assert.ok(root.some((item) => item.href === "/platform/users"));
    assert.ok(!owner.some((item) => item.href === "/platform/users"));
  });

  it("ships only existing routes in the live definition", () => {
    assert.deepEqual(
      NAVIGATION.map((item) => item.href),
      ["/dashboard", "/organization"],
    );
  });
});
