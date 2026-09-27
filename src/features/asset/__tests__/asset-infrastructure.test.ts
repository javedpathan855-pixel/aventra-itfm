import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import { getPrisma } from "@/shared/infrastructure/prisma";
import { prismaAuthorizationRepository } from "@/features/auth/infrastructure/authorization/prisma-authorization-repository";
import { prismaAssetRepository } from "../infrastructure/prisma/prisma-asset-repository";
import type { AssetUseCasesDeps } from "../application/use-cases/asset-deps";
import type { AuditLogPort, AuditEvent } from "@/features/auth/repository/audit-log";
import { AppError } from "@/shared/error/app-error";
import { executeCreateCategory } from "../application/use-cases/manage-asset-categories.use-case";
import {
  executeArchiveAsset,
  executeCreateAsset,
  executeGetAssetDetail,
} from "../application/use-cases/manage-assets.use-case";
import { executeAssignAsset } from "../application/use-cases/manage-asset-assignments.use-case";
import { executeGetAssetDashboard } from "../application/use-cases/get-asset-dashboard.use-case";

// Real-Postgres integration: uniqueness constraints, transactional
// assignment guards and tenant isolation against the development
// database. Everything lives in a scratch organization that is removed
// afterwards; never run against production data.

class MemoryAuditLog implements AuditLogPort {
  events: AuditEvent[] = [];
  async record(event: Omit<AuditEvent, "timestamp">): Promise<void> {
    this.events.push({ ...event, timestamp: new Date().toISOString() });
  }
}

const STAMP = Date.now().toString(36);
const ORG_SLUG = `asset-it-${STAMP}`;
const ORG_ID = `org_asset_it_${STAMP}`;
const ORG_B_ID = `org_asset_it_b_${STAMP}`;

const USERS = {
  owner: `asset-owner-${STAMP}@x.test`,
  engineer: `asset-eng-${STAMP}@x.test`,
  member: `asset-user-${STAMP}@x.test`,
} as const;

describe("Asset infrastructure — Postgres integration", () => {
  const auditLog = new MemoryAuditLog();
  let categoryId = "";
  let locationId = "";
  let memberId = "";

  const makeDeps = (email: string, activeOrganizationId: string = ORG_ID): AssetUseCasesDeps => ({
    getSession: async () => ({
      userId: email,
      email,
      name: email,
      activeOrganizationId,
    }),
    authorizationRepository: prismaAuthorizationRepository,
    assetRepository: prismaAssetRepository,
    auditLog,
  });

  before(async () => {
    const prisma = getPrisma();
    await prisma.organization.create({ data: { id: ORG_ID, name: "Asset IT Org", slug: ORG_SLUG } });
    await prisma.organization.create({
      data: { id: ORG_B_ID, name: "Asset IT Org B", slug: `${ORG_SLUG}-b` },
    });
    for (const [email, role] of [
      [USERS.owner, "OWNER"],
      [USERS.engineer, "ENGINEER"],
      [USERS.member, "USER"],
    ] as const) {
      await prisma.user.create({ data: { id: email, name: email, email } });
      const membership = await prisma.member.create({
        data: { id: `mem_${email}`, organizationId: ORG_ID, userId: email, role },
      });
      if (role === "USER") memberId = membership.id;
    }
    const location = await prisma.location.create({
      data: { organizationId: ORG_ID, name: "IT HQ", code: "ITHQ" },
    });
    locationId = location.id;
    await prisma.member.create({
      data: { id: `mem_b_${STAMP}`, organizationId: ORG_B_ID, userId: USERS.owner, role: "OWNER" },
    });
  });

  after(async () => {
    const prisma = getPrisma();
    await prisma.assetAssignment.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.assetHistory.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.asset.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.assetModel.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.assetCategory.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.location.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.member.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.member.deleteMany({ where: { organizationId: ORG_B_ID } });
    await prisma.organization.delete({ where: { id: ORG_ID } });
    await prisma.organization.delete({ where: { id: ORG_B_ID } });
    await prisma.user.deleteMany({ where: { id: { in: [USERS.owner, USERS.engineer, USERS.member] } } });
  });

  it("enforces organization-scoped asset tag uniqueness at the database", async () => {
    const deps = makeDeps(USERS.owner);
    const { category } = await executeCreateCategory(
      { name: "Laptops", code: "LAPTOP", description: null },
      deps,
    );
    categoryId = category.id;
    const base = {
      name: "MacBook",
      assetTag: `IT-${STAMP}-001`,
      description: null,
      categoryId,
      modelId: null,
      brand: "Apple",
      serialNumber: null,
      purchaseDate: "2026-01-10",
      purchaseCost: "150000.00",
      currency: "INR",
      vendorName: null,
      invoiceNumber: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
      condition: "NEW" as const,
      currentLocationId: locationId,
      currentDepartmentId: null,
    };
    await executeCreateAsset(base, deps);
    await assert.rejects(() => executeCreateAsset({ ...base, name: "Clone" }, deps), (err: AppError) => {
      assert.equal(err.code, "CONFLICT");
      return true;
    });
  });

  it("allows only one active assignment under concurrency", async () => {
    const deps = makeDeps(USERS.owner);
    const { asset } = await executeCreateAsset(
      {
        name: "Shared Laptop",
        assetTag: `IT-${STAMP}-002`,
        description: null,
        categoryId,
        modelId: null,
        brand: null,
        serialNumber: null,
        purchaseDate: "2026-02-01",
        purchaseCost: "80000.00",
        currency: "INR",
        vendorName: null,
        invoiceNumber: null,
        warrantyStartDate: null,
        warrantyEndDate: null,
        condition: "GOOD",
        currentLocationId: locationId,
        currentDepartmentId: null,
      },
      deps,
    );
    const engineerDeps = makeDeps(USERS.engineer);
    const attempt = (suffix: string) =>
      executeAssignAsset(
        {
          assetId: asset.id,
          membershipId: memberId,
          locationId,
          departmentId: null,
          assignedAt: null,
          expectedReturnAt: null,
          condition: "GOOD",
          notes: suffix,
        },
        engineerDeps,
      );
    const outcomes = await Promise.allSettled([attempt("first"), attempt("second")]);
    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const rejected = outcomes.filter((o) => o.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal((rejected[0] as PromiseRejectedResult).reason.code, "CONFLICT");
    const { asset: reloaded } = await executeGetAssetDetail({ assetId: asset.id }, deps);
    assert.equal(reloaded.status, "ASSIGNED");
    assert.ok(reloaded.activeAssignmentId);
  });

  it("returns NOT_FOUND for cross-tenant reads without leaking existence", async () => {
    const deps = makeDeps(USERS.owner);
    const { asset } = await executeCreateAsset(
      {
        name: "Secret Laptop",
        assetTag: `IT-${STAMP}-009`,
        description: null,
        categoryId,
        modelId: null,
        brand: null,
        serialNumber: null,
        purchaseDate: "2026-03-01",
        purchaseCost: "50000.00",
        currency: "INR",
        vendorName: null,
        invoiceNumber: null,
        warrantyStartDate: null,
        warrantyEndDate: null,
        condition: "GOOD",
        currentLocationId: locationId,
        currentDepartmentId: null,
      },
      deps,
    );
    await assert.rejects(
      () => executeGetAssetDetail({ assetId: asset.id }, makeDeps(USERS.owner, ORG_B_ID)),
      (err: AppError) => err.code === "NOT_FOUND",
    );
  });

  it("isolates tenants and aggregates dashboard metrics from real rows", async () => {
    const deps = makeDeps(USERS.owner);
    const { metrics } = await executeGetAssetDashboard({}, deps);
    assert.ok(metrics.totalActive >= 2);
    assert.ok(metrics.assigned >= 1);
    assert.ok(metrics.byCategory.some((c) => c.categoryName === "Laptops" && c.count >= 2));
    assert.ok(metrics.byLocation.some((l) => l.locationName === "IT HQ"));
    await executeArchiveAsset(
      { assetId: (await executeCreateAsset({
        name: "Retired Box",
        assetTag: `IT-${STAMP}-003`,
        description: null,
        categoryId,
        modelId: null,
        brand: null,
        serialNumber: null,
        purchaseDate: "2025-01-01",
        purchaseCost: "10000.00",
        currency: "INR",
        vendorName: null,
        invoiceNumber: null,
        warrantyStartDate: null,
        warrantyEndDate: null,
        condition: "POOR",
        currentLocationId: null,
        currentDepartmentId: null,
      }, deps)).asset.id },
      deps,
    );
    const after = await executeGetAssetDashboard({}, deps);
    assert.equal(after.metrics.archived, metrics.archived + 1);
  });
});
