import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { filterNavigation, NAVIGATION } from "@/features/auth/presentation/navigation/navigation";
import { AssetListView } from "../presentation/components/asset-list-view";
import { AssetDashboardView } from "../presentation/components/asset-dashboard-view";
import { AssetTaxonomyView } from "../presentation/components/asset-taxonomy-view";
import { AssetFormView } from "../presentation/components/asset-form-view";
import { AssetDetailView } from "../presentation/components/asset-detail-view";
import { AssetReportView } from "../presentation/components/asset-report-view";
import type { AssetDetail, AssetListItem } from "../domain/entities/asset";

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

const emptyPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

const sampleItem: AssetListItem = {
  id: "ast-1",
  organizationId: "org-1",
  assetTag: "AST-LT-001",
  name: "MacBook Pro 14",
  description: null,
  categoryId: "cat-1",
  modelId: null,
  brand: "Apple",
  serialNumber: "SN-1",
  purchaseDate: new Date("2026-01-15T00:00:00Z"),
  purchaseCost: "185000.00",
  currency: "INR",
  vendorName: null,
  invoiceNumber: null,
  warrantyStartDate: null,
  warrantyEndDate: new Date("2029-01-15T00:00:00Z"),
  condition: "NEW",
  status: "AVAILABLE",
  currentLocationId: "loc-1",
  currentDepartmentId: null,
  activeAssignmentId: null,
  archivedAt: null,
  createdAt: new Date("2026-01-20T00:00:00Z"),
  updatedAt: new Date("2026-01-20T00:00:00Z"),
  categoryName: "Laptops",
  modelName: null,
  locationName: "HQ",
  departmentName: null,
  assigneeName: null,
  warrantyStatus: "ACTIVE",
};

const sampleDetail: AssetDetail = {
  ...sampleItem,
  modelCode: null,
  brandResolved: "Apple",
  assignments: [],
  activeAssignment: null,
  history: [
    {
      id: "h-1",
      organizationId: "org-1",
      assetId: "ast-1",
      eventType: "ASSET_CREATED",
      actorUserId: "u-1",
      summary: "Asset AST-LT-001 registered.",
      metadata: null,
      createdAt: new Date("2026-01-20T00:00:00Z"),
    },
  ],
};

const lookups = {
  categories: [{ id: "cat-1", name: "Laptops" }],
  models: [{ id: "mod-1", modelName: "MacBook Pro 14" }],
  locations: [{ id: "loc-1", name: "HQ" }],
  departments: [],
};

describe("Asset presentation — registry", () => {
  it("renders rows, badges, filters, menu and summary", () => {
    const html = renderToStaticMarkup(
      withAppRouter(
        React.createElement(AssetListView, {
          initialData: { ...emptyPage, total: 1, items: [sampleItem] },
          userRole: "OWNER",
          ...lookups,
        }),
      ),
    );
    assert.ok(html.includes("MacBook Pro 14"));
    assert.ok(html.includes("AST-LT-001"));
    assert.ok(html.includes("Laptops"));
    assert.ok(html.includes("Available"));
    assert.ok(html.includes('aria-label="Filter by status"'));
    assert.ok(html.includes('aria-label="Sort assets"'));
    assert.ok(html.includes('aria-label="Actions for MacBook Pro 14"'));
    assert.ok(html.includes("Showing 1 to 1 of 1 asset"));
    assert.ok(html.includes("Add Asset"));
    assert.ok(html.includes("Reset"));
  });

  it("hides management actions for read-only roles", () => {
    const html = renderToStaticMarkup(
      withAppRouter(
        React.createElement(AssetListView, {
          initialData: { ...emptyPage, total: 1, items: [sampleItem] },
          userRole: "USER",
          ...lookups,
        }),
      ),
    );
    assert.ok(html.includes("MacBook Pro 14"));
    assert.ok(!html.includes("Add Asset"));
    assert.ok(!html.includes("Actions for"));
  });
});

describe("Asset presentation — dashboard", () => {
  const metrics = {
    totalActive: 2,
    available: 1,
    assigned: 1,
    maintenance: 0,
    retired: 0,
    archived: 1,
    warrantyExpiringSoon: 0,
    warrantyExpired: 0,
    byCategory: [{ categoryId: "cat-1", categoryName: "Laptops", count: 2 }],
    byLocation: [{ locationId: "loc-1", locationName: "HQ", count: 1 }],
    byDepartment: [],
    recentlyRegistered: [sampleItem],
    recentAssignments: [],
    upcomingWarrantyExpirations: [],
  };

  it("renders KPIs, distributions and activity sections", () => {
    const html = renderToStaticMarkup(
      withAppRouter(React.createElement(AssetDashboardView, { metrics, userRole: "ADMIN" })),
    );
    assert.ok(html.includes("Asset Dashboard"));
    assert.ok(html.includes("Total Active"));
    assert.ok(html.includes("Available"));
    assert.ok(html.includes("Assigned"));
    assert.ok(html.includes("Assets by Category"));
    assert.ok(html.includes("Assets by Location"));
    assert.ok(html.includes("Recently Registered"));
    assert.ok(html.includes("MacBook Pro 14"));
    assert.ok(html.includes("Register Asset"));
  });

  it("hides the register action for engineers", () => {
    const html = renderToStaticMarkup(
      withAppRouter(React.createElement(AssetDashboardView, { metrics, userRole: "ENGINEER" })),
    );
    assert.ok(!html.includes("Register Asset"));
  });
});

describe("Asset presentation — taxonomy", () => {
  const categoriesPage = {
    ...emptyPage,
    total: 1,
    items: [
      {
        id: "cat-1",
        organizationId: "org-1",
        name: "Laptops",
        code: "LAPTOP",
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        assetCount: 2,
        modelCount: 1,
      },
    ],
  };

  it("renders category rows with counts and actions", () => {
    const html = renderToStaticMarkup(
      React.createElement(AssetTaxonomyView, {
        initialCategories: categoriesPage,
        initialModels: emptyPage,
        userRole: "ADMIN",
      }),
    );
    assert.ok(html.includes("Categories &amp; Models") || html.includes("Categories & Models"));
    assert.ok(html.includes("Laptops"));
    assert.ok(html.includes("LAPTOP"));
    assert.ok(html.includes("2 assets"));
    assert.ok(html.includes("Add Category"));
    assert.ok(html.includes('aria-label="Actions for Laptops"'));
  });
});

describe("Asset presentation — asset form", () => {
  it("renders sections, required markers and actions", () => {
    const html = renderToStaticMarkup(
      withAppRouter(
        React.createElement(AssetFormView, {
          mode: "create",
          categories: lookups.categories,
          initialModels: [],
          locations: lookups.locations,
          departments: [],
          defaultCurrency: "INR",
          cancelHref: "/assets",
          backLabel: "Back to registry",
          backHref: "/assets",
          title: "Add Asset",
          subtitle: "Register a new asset",
          submitLabel: "Create Asset",
          submittingLabel: "Creating...",
          successTitle: "Asset created",
        }),
      ),
    );
    assert.ok(html.includes("Add Asset"));
    assert.ok(html.includes("Basic Information"));
    assert.ok(html.includes("Purchase Information"));
    assert.ok(html.includes("Warranty"));
    assert.ok(html.includes("Location"));
    assert.ok(html.includes("Condition"));
    assert.ok(html.includes('placeholder="e.g. AST-LT-001"'));
    assert.ok(html.includes("Set as default location") === false);
    assert.ok(html.includes("Create Asset"));
    assert.ok(html.includes("Cancel"));
  });
});

describe("Asset presentation — detail", () => {
  it("renders identity, actions, history and record sections", () => {
    const html = renderToStaticMarkup(
      React.createElement(AssetDetailView, {
        initialAsset: sampleDetail,
        userRole: "OWNER",
        employees: [],
        locations: lookups.locations,
        departments: [],
      }),
    );
    assert.ok(html.includes("MacBook Pro 14"));
    assert.ok(html.includes("Asset Identity"));
    assert.ok(html.includes("Purchase &amp; Warranty") || html.includes("Purchase & Warranty"));
    assert.ok(html.includes("Assignment History"));
    assert.ok(html.includes("Event History"));
    assert.ok(html.includes("Asset AST-LT-001 registered."));
    assert.ok(html.includes("Edit"));
    assert.ok(html.includes("Assign"));
    assert.ok(html.includes("Archive"));
  });

  it("offers return instead of assign when an assignment is active", () => {
    const assigned: AssetDetail = {
      ...sampleDetail,
      status: "ASSIGNED",
      activeAssignmentId: "asg-1",
      activeAssignment: {
        id: "asg-1",
        organizationId: "org-1",
        assetId: "ast-1",
        membershipId: "mem-1",
        assigneeUserId: "u-2",
        assigneeName: "Bob",
        assigneeEmail: "bob@x.test",
        locationId: "loc-1",
        locationName: "HQ",
        departmentId: null,
        departmentName: null,
        assignedAt: new Date("2026-09-01T00:00:00Z"),
        expectedReturnAt: null,
        returnedAt: null,
        assignmentCondition: "GOOD",
        returnCondition: null,
        notes: null,
        createdBy: "u-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      assignments: [],
    };
    assigned.assignments = assigned.activeAssignment ? [assigned.activeAssignment] : [];
    const html = renderToStaticMarkup(
      React.createElement(AssetDetailView, {
        initialAsset: assigned,
        userRole: "ENGINEER",
        employees: [],
        locations: lookups.locations,
        departments: [],
      }),
    );
    assert.ok(html.includes("Return"));
    assert.ok(!html.includes("Archive"));
    assert.ok(html.includes("Assigned to Bob"));
  });
});

describe("Asset presentation — reports", () => {
  it("renders report picker, filters and empty state", () => {
    const html = renderToStaticMarkup(
      React.createElement(AssetReportView, {
        categories: lookups.categories,
        locations: lookups.locations,
        departments: [],
        canExport: true,
      }),
    );
    assert.ok(html.includes("Asset Reports"));
    assert.ok(html.includes("Complete Asset Inventory"));
    assert.ok(html.includes("Run Report"));
    assert.ok(html.includes("Export CSV"));
    assert.ok(html.includes("No report yet"));
  });

  it("hides export for roles without the permission", () => {
    const html = renderToStaticMarkup(
      React.createElement(AssetReportView, {
        categories: [],
        locations: [],
        departments: [],
        canExport: false,
      }),
    );
    assert.ok(!html.includes("Export CSV"));
  });
});

describe("Asset navigation", () => {
  const assetsGroup = (role: "OWNER" | "ADMIN" | "ENGINEER" | "USER" | null) => {
    const items = filterNavigation(NAVIGATION, { organizationRole: role, platformRole: null });
    return items.find((item) => item.label === "Assets");
  };

  it("exposes dashboard, registry, taxonomy and reports to managers", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      const group = assetsGroup(role);
      assert.ok(group);
      assert.deepEqual(
        group?.children?.map((child) => child.label),
        ["Dashboard", "Registry", "Categories & Models", "Reports"],
      );
    }
  });

  it("hides reports from users but keeps readable sections", () => {
    const engineer = assetsGroup("ENGINEER");
    assert.deepEqual(
      engineer?.children?.map((child) => child.label),
      ["Dashboard", "Registry", "Categories & Models", "Reports"],
    );
    const user = assetsGroup("USER");
    assert.deepEqual(
      user?.children?.map((child) => child.label),
      ["Dashboard", "Registry", "Categories & Models"],
    );
    assert.equal(assetsGroup(null), undefined);
  });
});
