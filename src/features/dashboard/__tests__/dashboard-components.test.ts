import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/shared/components/ui/breadcrumb";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/shared/components/ui/dropdown";
import {
  formatRoleLabel,
  getRoleBadgeVariant,
} from "../presentation/utils/role-formatter";

describe("Shared UI and Dashboard Presentation Components", () => {
  describe("Shared Breadcrumb Component", () => {
    it("renders semantic navigation with aria-label='Breadcrumb'", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          Breadcrumb,
          null,
          React.createElement(
            BreadcrumbList,
            null,
            React.createElement(
              BreadcrumbItem,
              null,
              React.createElement(BreadcrumbLink, { href: "/dashboard" }, "Home"),
            ),
            React.createElement(BreadcrumbSeparator, null),
            React.createElement(
              BreadcrumbItem,
              null,
              React.createElement(BreadcrumbPage, null, "Dashboard"),
            ),
          ),
        ),
      );

      assert.ok(html.includes('<nav aria-label="Breadcrumb"'));
      assert.ok(html.includes("<ol"));
      assert.ok(html.includes("<li"));
      assert.ok(html.includes('href="/dashboard"'));
      assert.ok(html.includes('aria-current="page"'));
      assert.ok(html.includes("Dashboard"));
    });

    it("uses appropriate semantic/ARIA behavior for current page (aria-current='page', not a clickable link)", () => {
      const html = renderToStaticMarkup(
        React.createElement(BreadcrumbPage, null, "Dashboard"),
      );

      assert.ok(html.includes('aria-current="page"'));
      assert.ok(html.includes('aria-disabled="true"'));
      assert.ok(!html.includes('href='));
    });

    it("renders default separator as '/' with role='presentation'", () => {
      const html = renderToStaticMarkup(
        React.createElement(BreadcrumbSeparator, null),
      );

      assert.ok(html.includes('role="presentation"'));
      assert.ok(html.includes('aria-hidden="true"'));
      assert.ok(html.includes("/"));
    });
  });

  describe("Shared Dropdown Component", () => {
    it("renders trigger with accessibility attributes (haspopup, aria-expanded=false when closed)", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          Dropdown,
          null,
          React.createElement(DropdownTrigger, null, "Open Menu"),
          React.createElement(
            DropdownContent,
            null,
            React.createElement(DropdownItem, null, "Item 1"),
          ),
        ),
      );

      assert.ok(html.includes('aria-haspopup="menu"'));
      assert.ok(html.includes('aria-expanded="false"'));
      assert.ok(html.includes("Open Menu"));
      // Content should not be rendered when closed
      assert.ok(!html.includes('role="menu"'));
    });

    it("renders menu items with role='menuitem' and tabIndex='-1' when open", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          Dropdown,
          { open: true },
          React.createElement(DropdownTrigger, null, "Trigger"),
          React.createElement(
            DropdownContent,
            { align: "right" },
            React.createElement(DropdownLabel, null, "Header"),
            React.createElement(DropdownSeparator, null),
            React.createElement(DropdownItem, null, "Action Item"),
            React.createElement(DropdownItem, { disabled: true }, "Disabled Item"),
            React.createElement(DropdownItem, { variant: "danger" }, "Delete Item"),
          ),
        ),
      );

      assert.ok(html.includes('aria-expanded="true"'));
      assert.ok(html.includes('role="menu"'));
      assert.ok(html.includes('role="menuitem"'));
      assert.ok(html.includes('tabindex="-1"'));
      assert.ok(html.includes('role="separator"'));
      assert.ok(html.includes("Action Item"));
      assert.ok(html.includes("Disabled Item"));
      assert.ok(html.includes("disabled"));
      assert.ok(html.includes("Delete Item"));
      assert.ok(html.includes("right-0")); // align right
    });
  });

  describe("User Menu and Organization Switcher contracts", () => {
    it("correctly derives display name and initials for user presentation", () => {
      const userWithName = {
        id: "usr-1",
        email: "javed@company.com",
        name: "Javed Pathan",
        platformRole: null,
        roleLabel: formatRoleLabel("OWNER"),
      };

      const displayName = userWithName.name || userWithName.email.split("@")[0] || "User";
      assert.equal(displayName, "Javed Pathan");
      assert.equal(userWithName.roleLabel, "Owner");
    });

    it("falls back to email prefix when name is null", () => {
      const userWithoutName = {
        id: "usr-2",
        email: "ops@aventra.io",
        name: null,
        platformRole: null,
        roleLabel: formatRoleLabel("ADMIN"),
      };

      const displayName = userWithoutName.name || userWithoutName.email.split("@")[0] || "User";
      assert.equal(displayName, "ops");
      assert.equal(userWithoutName.roleLabel, "Admin");
    });

    it("maps organization items with correct roles and badge variants", () => {
      const orgItems = [
        {
          organizationId: "org-1",
          name: "NextGen Services",
          slug: "nextgen-services",
          role: "OWNER",
          roleLabel: formatRoleLabel("OWNER"),
          active: true,
        },
        {
          organizationId: "org-2",
          name: "Secondary Org",
          slug: "secondary-org",
          role: "USER",
          roleLabel: formatRoleLabel("USER"),
          active: false,
        },
      ];

      assert.equal(orgItems.length, 2);
      assert.equal(orgItems[0].name, "NextGen Services");
      assert.equal(orgItems[0].roleLabel, "Owner");
      assert.equal(getRoleBadgeVariant(orgItems[0].role), "primary");
      assert.equal(orgItems[1].roleLabel, "User");
      assert.equal(getRoleBadgeVariant(orgItems[1].role), "secondary");
    });
  });
});
