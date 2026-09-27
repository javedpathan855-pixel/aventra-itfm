import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocationListView } from "../presentation/components/location-list-view";
import { DepartmentListView } from "../presentation/components/department-list-view";
import { AddressDialog } from "../presentation/components/address-dialog";
import { LocationDialog } from "../presentation/components/location-dialog";
import { LocationCreateView } from "../presentation/components/location-create-view";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { OrganizationSettingsTab } from "../presentation/components/organization-settings-tab";
import type { OrganizationProfileEntity } from "../domain/entities/organization-profile";

type StubRouter = React.ContextType<typeof AppRouterContext>;

const stubAppRouter = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
} as unknown as StubRouter;

const withAppRouter = (node: React.ReactElement) =>
  React.createElement(AppRouterContext.Provider, { value: stubAppRouter }, node);

const emptyLocations = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

const emptyDepartments = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

describe("Organization Select integration", () => {
  it("renders location status and sort filters as accessible comboboxes", () => {
    const html = renderToStaticMarkup(
      withAppRouter(
        React.createElement(LocationListView, {
        initialData: emptyLocations,
        userRole: "OWNER",
        }),
      ),
    );
    assert.ok(html.includes('aria-label="Filter by status"'));
    assert.ok(html.includes('aria-label="Sort locations"'));
    assert.ok(html.includes('role="combobox"'));
    // Defaults are selected and visible on the triggers.
    assert.ok(html.includes("All statuses"));
    assert.ok(html.includes(">Name<"));
  });

  it("renders location rows with data intact alongside filters", () => {
    const html = renderToStaticMarkup(
      withAppRouter(
        React.createElement(LocationListView, {
        initialData: {
          ...emptyLocations,
          total: 1,
          items: [
            {
              id: "loc-1",
              organizationId: "org-1",
              name: "Mumbai HQ",
              code: "MUM-HQ",
              description: null,
              email: null,
              phone: null,
              addressLine1: null,
              addressLine2: null,
              city: "Mumbai",
              state: null,
              postalCode: null,
              country: null,
              timezone: null,
              isDefault: true,
              isActive: true,
              createdAt: new Date("2026-01-01T00:00:00Z"),
              updatedAt: new Date("2026-01-01T00:00:00Z"),
              departmentCount: 2,
            },
          ],
        },
        userRole: "OWNER",
        }),
      ),
    );
    assert.ok(html.includes("Mumbai HQ"));
    assert.ok(html.includes("MUM-HQ"));
    assert.ok(html.includes('aria-label="Filter by status"'));
  });

  it("renders department status and sort filters as accessible comboboxes", () => {
    const html = renderToStaticMarkup(
      React.createElement(DepartmentListView, {
        initialData: emptyDepartments,
        userRole: "ADMIN",
      }),
    );
    assert.ok(html.includes('aria-label="Filter by status"'));
    assert.ok(html.includes('aria-label="Sort departments"'));
    assert.ok(html.includes("All statuses"));
    assert.ok(html.includes(">Name<"));
  });

  it("renders the address dialog with the current type preselected", () => {
    const html = renderToStaticMarkup(
      React.createElement(AddressDialog, {
        isOpen: true,
        onClose: () => {},
        onSave: async () => {},
        initialData: null,
        isSaving: false,
      }),
    );
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes("Registered Office"));
  });

  it("hides management controls but keeps filters for read-only roles", () => {
    const html = renderToStaticMarkup(
      withAppRouter(
        React.createElement(LocationListView, {
        initialData: emptyLocations,
        userRole: "USER",
        }),
      ),
    );
    assert.ok(!html.includes("Add Location"));
    assert.ok(html.includes('aria-label="Filter by status"'));
  });

  it("renders settings selects with current values and icons", () => {    const profile: OrganizationProfileEntity = {
      id: "org-1",
      name: "Acme",
      slug: "acme",
      logo: null,
      legalName: null,
      businessType: null,
      industry: null,
      description: null,
      establishedDate: null,
      website: null,
      contactEmail: null,
      phone: null,
      altPhone: null,
      status: "active",
      gstin: null,
      pan: null,
      cin: null,
      businessIdentifier: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      addresses: [],
      settings: {
        id: "set-1",
        organizationId: "org-1",
        displayName: null,
        timezone: "UTC",
        locale: "en-IN",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "24h",
        currency: "USD",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      },
    };
    const html = renderToStaticMarkup(
      React.createElement(OrganizationSettingsTab, {
        profile,
        onSettingsUpdated: () => {},
      }),
    );
    assert.ok(html.includes("UTC"));
    assert.ok(html.includes("USD (US Dollar - $)"));
    assert.ok(html.includes("MM/DD/YYYY (US Standard)"));
    assert.ok(html.includes("24-hour (e.g. 14:30)"));
    assert.ok(html.includes('role="combobox"'));
  });

  it("renders location cards with metadata, badges, menu and result summary", () => {
    const html = renderToStaticMarkup(
      withAppRouter(
        React.createElement(LocationListView, {
        initialData: {
          ...emptyLocations,
          total: 1,
          items: [
            {
              id: "loc-1",
              organizationId: "org-1",
              name: "Mumbai HQ",
              code: "MUM-HQ",
              description: null,
              email: null,
              phone: null,
              addressLine1: null,
              addressLine2: null,
              city: "Mumbai",
              state: "Maharashtra",
              postalCode: null,
              country: "India",
              timezone: null,
              isDefault: true,
              isActive: true,
              createdAt: new Date("2026-09-26T00:00:00Z"),
              updatedAt: new Date("2026-09-26T00:00:00Z"),
              departmentCount: 2,
            },
          ],
        },
        userRole: "OWNER",
        }),
      ),
    );
    assert.ok(html.includes("Mumbai HQ"));
    assert.ok(html.includes("MUM-HQ"));
    assert.ok(html.includes("Mumbai, Maharashtra, India"));
    assert.ok(html.includes("Default"));
    assert.ok(html.includes("Active"));
    assert.ok(html.includes("Departments"));
    assert.ok(html.includes("2 departments"));
    assert.ok(html.includes("Created On"));
    assert.ok(html.includes("2026"));
    assert.ok(html.includes('aria-label="Actions for Mumbai HQ"'));
    assert.ok(html.includes("/organization/locations/loc-1"));
    assert.ok(html.includes("Reset"));
    assert.ok(html.includes("Showing 1 to 1 of 1 location"));
    assert.ok(html.includes('placeholder="Search by name, code, or city"'));
  });

  it("renders department cards with location count, menu and result summary", () => {
    const html = renderToStaticMarkup(
      React.createElement(DepartmentListView, {
        initialData: {
          ...emptyDepartments,
          total: 1,
          items: [
            {
              id: "dept-1",
              organizationId: "org-1",
              name: "CFC Department",
              code: "CFC",
              description: null,
              isActive: true,
              createdAt: new Date("2026-09-26T00:00:00Z"),
              updatedAt: new Date("2026-09-26T00:00:00Z"),
              locationCount: 1,
            },
          ],
        },
        userRole: "ADMIN",
      }),
    );
    assert.ok(html.includes("CFC Department"));
    assert.ok(html.includes("CFC"));
    assert.ok(html.includes("1 location"));
    assert.ok(html.includes("Active"));
    assert.ok(html.includes("Created On"));
    assert.ok(html.includes("2026"));
    assert.ok(html.includes('aria-label="Actions for CFC Department"'));
    assert.ok(html.includes("/organization/departments/dept-1"));
    assert.ok(html.includes("Reset"));
    assert.ok(html.includes("Showing 1 to 1 of 1 department"));
    assert.ok(html.includes('placeholder="Search by name or code"'));
  });

  it("hides card action menus for read-only roles", () => {
    const html = renderToStaticMarkup(
      React.createElement(DepartmentListView, {
        initialData: {
          ...emptyDepartments,
          total: 1,
          items: [
            {
              id: "dept-1",
              organizationId: "org-1",
              name: "CFC Department",
              code: "CFC",
              description: null,
              isActive: false,
              createdAt: new Date("2026-09-26T00:00:00Z"),
              updatedAt: new Date("2026-09-26T00:00:00Z"),
              locationCount: 0,
            },
          ],
        },
        userRole: "USER",
      }),
    );
    assert.ok(html.includes("CFC Department"));
    assert.ok(html.includes("Inactive"));
    assert.ok(!html.includes("Add Department"));
    assert.ok(!html.includes("Actions for"));
  });

  it("disables settings selects for read-only roles", () => {
    const profile: OrganizationProfileEntity = {
      id: "org-1",
      name: "Acme",
      slug: "acme",
      logo: null,
      legalName: null,
      businessType: null,
      industry: null,
      description: null,
      establishedDate: null,
      website: null,
      contactEmail: null,
      phone: null,
      altPhone: null,
      status: "active",
      gstin: null,
      pan: null,
      cin: null,
      businessIdentifier: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      addresses: [],
      settings: null,
    };
    const html = renderToStaticMarkup(
      React.createElement(OrganizationSettingsTab, {
        profile,
        onSettingsUpdated: () => {},
        canEdit: false,
      }),
    );
    assert.ok(html.includes("disabled"));
    assert.ok(html.includes("Asia/Kolkata"));
  });

  it("renders the location dialog with sections, footer actions and defaults", () => {
    const html = renderToStaticMarkup(
      React.createElement(LocationDialog, {
        isOpen: true,
        onClose: () => {},
        onSave: async () => {},
        initialData: null,
        isSaving: false,
      }),
    );
    assert.ok(html.includes('role="dialog"'));
    assert.ok(html.includes("Add Location"));
    assert.ok(html.includes("Add a new location to your organization"));
    assert.ok(html.includes("Basic Information"));
    assert.ok(html.includes("Contact Information"));
    assert.ok(html.includes("Address Details"));
    assert.ok(html.includes("Set as default location"));
    assert.ok(html.includes("Cancel"));
    assert.ok(html.includes('placeholder="e.g. Mumbai HQ"'));
  });

  it("renders the location creation page with back link, sections and actions", () => {
    const html = renderToStaticMarkup(withAppRouter(React.createElement(LocationCreateView)));
    assert.ok(html.includes('href="/organization/locations"'));
    assert.ok(html.includes("Back to locations"));
    assert.ok(html.includes("Add Location"));
    assert.ok(html.includes("Create a new location for your organization"));
    assert.ok(html.includes("Basic Information"));
    assert.ok(html.includes("Contact Information"));
    assert.ok(html.includes("Address Details"));
    assert.ok(html.includes('placeholder="e.g. Mumbai HQ"'));
    assert.ok(html.includes('placeholder="e.g. MUM-HQ"'));
    assert.ok(html.includes('placeholder="Asia/Kolkata"'));
    assert.ok(html.includes("Set as default location"));
    assert.ok(html.includes("Cancel"));
    assert.ok(html.includes("Create Location"));
  });
});
