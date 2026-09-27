import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "@/shared/error/app-error";
import type {
  AuthorizationRepository,
  MembershipRecord,
  MemberWithUser,
  OrganizationRecord,
} from "@/features/auth/repository/authorization-repository";
import type { AuditLogPort, AuditEvent } from "@/features/auth/repository/audit-log";
import type { AssetCondition, AssetStatus } from "../domain/constants/asset-constants";
import type {
  AssetRepository,
  PersistAssetInput,
  PersistAssignmentInput,
  RecordHistoryInput,
} from "../repository/asset-repository";
import type {
  AssetAssignmentEntity,
  AssetDashboardMetrics,
  AssetDetail,
  AssetListItem,
  AssetListQuery,
  AssignmentHistoryQuery,
  CategoryListQuery,
  CategoryWithAssetCount,
  ModelListQuery,
  ModelWithAssetCount,
  PaginatedResult,
} from "../domain/entities/asset";
import { getWarrantyStatus } from "../domain/services/warranty";
import { executeListCategories, executeCreateCategory, executeUpdateCategory, executeSetCategoryActive } from "../application/use-cases/manage-asset-categories.use-case";
import { executeListModels, executeCreateModel, executeUpdateModel, executeSetModelActive } from "../application/use-cases/manage-asset-models.use-case";
import {
  executeArchiveAsset,
  executeCreateAsset,
  executeGetAssetDetail,
  executeListAssets,
  executeUpdateAsset,
} from "../application/use-cases/manage-assets.use-case";
import {
  executeAssignAsset,
  executeListAssignableEmployees,
  executeReturnAsset,
} from "../application/use-cases/manage-asset-assignments.use-case";
import { executeGetAssetDashboard } from "../application/use-cases/get-asset-dashboard.use-case";
import {
  buildCsvDocument,
  escapeCsvCell,
  executeExportAssetReport,
  executeGetAssetReport,
} from "../application/use-cases/get-asset-report.use-case";

class FakeAuthorizationRepository implements AuthorizationRepository {
  memberships: MembershipRecord[] = [];
  users = new Map<string, { platformRole: string | null }>();
  organizations = new Map<string, OrganizationRecord>();

  async getMembership(userId: string, organizationId: string) {
    return this.memberships.find((m) => m.userId === userId && m.organizationId === organizationId) ?? null;
  }
  async listMembershipsForUser(userId: string) {
    return this.memberships.filter((m) => m.userId === userId);
  }
  async listMembersOfOrganization(organizationId: string): Promise<MemberWithUser[]> {
    return this.memberships
      .filter((m) => m.organizationId === organizationId)
      .map((m) => ({ id: m.id, userId: m.userId, name: m.userId, email: `${m.userId}@x.test`, role: m.role }));
  }
  async getUserPlatformRole(userId: string) {
    return this.users.get(userId)?.platformRole ?? null;
  }
  async getOrganizationById(organizationId: string) {
    return this.organizations.get(organizationId) ?? null;
  }
  async createInvitation(): Promise<never> { throw new Error("not implemented"); }
  async findPendingInvitation(): Promise<null> { return null; }
  async findInvitationByToken(): Promise<null> { return null; }
  async acceptInvitation(): Promise<never> { throw new Error("not implemented"); }
  async cancelInvitation(): Promise<void> {}
  async updateMemberRole(input: { memberId: string; organizationId: string; role: string }): Promise<MembershipRecord> {
    const mem = this.memberships.find((m) => m.id === input.memberId);
    if (!mem) throw new AppError("NOT_FOUND");
    mem.role = input.role;
    return mem;
  }
  async removeMember(input: { memberId: string; organizationId: string }): Promise<void> {
    this.memberships = this.memberships.filter((m) => m.id !== input.memberId);
  }
}

class FakeAuditLogger implements AuditLogPort {
  events: AuditEvent[] = [];
  async record(event: Omit<AuditEvent, "timestamp">): Promise<void> {
    this.events.push({ ...event, timestamp: new Date().toISOString() });
  }
}

interface StoredCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

interface StoredModel {
  id: string;
  organizationId: string;
  categoryId: string;
  brand: string;
  modelName: string;
  modelCode: string | null;
  description: string | null;
  isActive: boolean;
}

interface StoredAsset {
  id: string;
  organizationId: string;
  assetTag: string;
  name: string;
  description: string | null;
  categoryId: string;
  modelId: string | null;
  brand: string | null;
  serialNumber: string | null;
  purchaseDate: Date;
  purchaseCost: string;
  currency: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  warrantyStartDate: Date | null;
  warrantyEndDate: Date | null;
  condition: AssetCondition;
  status: AssetStatus;
  currentLocationId: string | null;
  currentDepartmentId: string | null;
  activeAssignmentId: string | null;
  archivedAt: Date | null;
}

const NOT_FOUND = () => new AppError("NOT_FOUND", { message: "Not found." });

class FakeAssetRepository implements AssetRepository {
  categories = new Map<string, StoredCategory>();
  models = new Map<string, StoredModel>();
  assets = new Map<string, StoredAsset>();
  assignments = new Map<string, AssetAssignmentEntity>();
  history: { organizationId: string; assetId: string | null; eventType: string; actorUserId: string | null; summary: string }[] = [];
  locations = new Map<string, { id: string; organizationId: string; name: string; isActive: boolean }>();
  departments = new Map<string, { id: string; organizationId: string; name: string; isActive: boolean }>();
  seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  private categoryWithCounts(organizationId: string, c: StoredCategory): CategoryWithAssetCount {
    return {
      ...c,
      createdAt: new Date(),
      updatedAt: new Date(),
      assetCount: [...this.assets.values()].filter(
        (a) => a.organizationId === organizationId && a.categoryId === c.id && !a.archivedAt,
      ).length,
      modelCount: [...this.models.values()].filter(
        (m) => m.organizationId === organizationId && m.categoryId === c.id,
      ).length,
    };
  }

  private modelWithCounts(organizationId: string, m: StoredModel): ModelWithAssetCount {
    const category = this.categories.get(m.categoryId);
    return {
      ...m,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryName: category?.name ?? "Unknown",
      assetCount: [...this.assets.values()].filter(
        (a) => a.organizationId === organizationId && a.modelId === m.id && !a.archivedAt,
      ).length,
    };
  }

  private toListItem(a: StoredAsset): AssetListItem {
    const category = this.categories.get(a.categoryId);
    const model = a.modelId ? this.models.get(a.modelId) ?? null : null;
    const location = a.currentLocationId ? this.locations.get(a.currentLocationId) ?? null : null;
    const department = a.currentDepartmentId ? this.departments.get(a.currentDepartmentId) ?? null : null;
    const active = a.activeAssignmentId ? this.assignments.get(a.activeAssignmentId) ?? null : null;
    return {
      ...a,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryName: category?.name ?? "Unknown",
      modelName: model?.modelName ?? null,
      locationName: location?.name ?? null,
      departmentName: department?.name ?? null,
      assigneeName: active?.assigneeName ?? null,
      warrantyStatus: getWarrantyStatus(a.warrantyEndDate, new Date()),
    };
  }

  private toDetail(a: StoredAsset): AssetDetail {
    const category = this.categories.get(a.categoryId);
    const model = a.modelId ? this.models.get(a.modelId) ?? null : null;
    const location = a.currentLocationId ? this.locations.get(a.currentLocationId) ?? null : null;
    const department = a.currentDepartmentId ? this.departments.get(a.currentDepartmentId) ?? null : null;
    const assignments = [...this.assignments.values()].filter((x) => x.assetId === a.id);
    return {
      ...a,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryName: category?.name ?? "Unknown",
      modelName: model?.modelName ?? null,
      modelCode: model?.modelCode ?? null,
      brandResolved: model?.brand ?? a.brand,
      locationName: location?.name ?? null,
      departmentName: department?.name ?? null,
      warrantyStatus: getWarrantyStatus(a.warrantyEndDate, new Date()),
      assignments,
      activeAssignment: assignments.find((x) => x.returnedAt === null) ?? null,
      history: [],
    };
  }

  private paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    };
  }

  async listCategories(organizationId: string, query: CategoryListQuery) {
    let items = [...this.categories.values()].filter((c) => c.organizationId === organizationId);
    if (query.status && query.status !== "all") {
      items = items.filter((c) => c.isActive === (query.status === "active"));
    }
    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (c) => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term),
      );
    }
    return this.paginate(
      items.map((c) => this.categoryWithCounts(organizationId, c)),
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async getCategoryById(organizationId: string, categoryId: string) {
    const c = this.categories.get(categoryId);
    if (!c || c.organizationId !== organizationId) return null;
    return this.categoryWithCounts(organizationId, c);
  }

  async createCategory(organizationId: string, input: { name: string; code: string; description: string | null }) {
    const dup = [...this.categories.values()].some(
      (c) => c.organizationId === organizationId && (c.code === input.code || c.name === input.name),
    );
    if (dup) throw new AppError("CONFLICT", { message: "Duplicate category." });
    const record: StoredCategory = {
      id: this.nextId("cat"),
      organizationId,
      ...input,
      isActive: true,
    };
    this.categories.set(record.id, record);
    return this.categoryWithCounts(organizationId, record);
  }

  async updateCategory(organizationId: string, categoryId: string, input: { name: string; code: string; description: string | null }) {
    const existing = this.categories.get(categoryId);
    if (!existing || existing.organizationId !== organizationId) throw NOT_FOUND();
    const dup = [...this.categories.values()].some(
      (c) => c.organizationId === organizationId && c.id !== categoryId && (c.code === input.code || c.name === input.name),
    );
    if (dup) throw new AppError("CONFLICT", { message: "Duplicate category." });
    const updated = { ...existing, ...input };
    this.categories.set(categoryId, updated);
    return this.categoryWithCounts(organizationId, updated);
  }

  async setCategoryActive(organizationId: string, categoryId: string, isActive: boolean) {
    const existing = this.categories.get(categoryId);
    if (!existing || existing.organizationId !== organizationId) throw NOT_FOUND();
    if (!isActive) {
      const referenced = [...this.assets.values()].some(
        (a) => a.organizationId === organizationId && a.categoryId === categoryId && !a.archivedAt,
      );
      if (referenced) throw new AppError("CONFLICT", { message: "Category is referenced." });
    }
    const updated = { ...existing, isActive };
    this.categories.set(categoryId, updated);
    return this.categoryWithCounts(organizationId, updated);
  }

  async listModels(organizationId: string, query: ModelListQuery) {
    let items = [...this.models.values()].filter((m) => m.organizationId === organizationId);
    if (query.status && query.status !== "all") {
      items = items.filter((m) => m.isActive === (query.status === "active"));
    }
    if (query.categoryId) items = items.filter((m) => m.categoryId === query.categoryId);
    return this.paginate(
      items.map((m) => this.modelWithCounts(organizationId, m)),
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async getModelById(organizationId: string, modelId: string) {
    const m = this.models.get(modelId);
    if (!m || m.organizationId !== organizationId) return null;
    return this.modelWithCounts(organizationId, m);
  }

  async createModel(
    organizationId: string,
    input: { categoryId: string; brand: string; modelName: string; modelCode: string | null; description: string | null },
  ) {
    const category = this.categories.get(input.categoryId);
    if (!category || category.organizationId !== organizationId) throw NOT_FOUND();
    if (!category.isActive) throw new AppError("VALIDATION_ERROR", { message: "Category inactive." });
    const dup = [...this.models.values()].some(
      (m) => m.organizationId === organizationId && m.brand === input.brand && m.modelName === input.modelName,
    );
    if (dup) throw new AppError("CONFLICT", { message: "Duplicate model." });
    const record: StoredModel = { id: this.nextId("mod"), organizationId, ...input, isActive: true };
    this.models.set(record.id, record);
    return this.modelWithCounts(organizationId, record);
  }

  async updateModel(
    organizationId: string,
    modelId: string,
    input: { categoryId: string; brand: string; modelName: string; modelCode: string | null; description: string | null },
  ) {
    const existing = this.models.get(modelId);
    if (!existing || existing.organizationId !== organizationId) throw NOT_FOUND();
    const category = this.categories.get(input.categoryId);
    if (!category || category.organizationId !== organizationId) throw NOT_FOUND();
    const updated = { ...existing, ...input };
    this.models.set(modelId, updated);
    return this.modelWithCounts(organizationId, updated);
  }

  async setModelActive(organizationId: string, modelId: string, isActive: boolean) {
    const existing = this.models.get(modelId);
    if (!existing || existing.organizationId !== organizationId) throw NOT_FOUND();
    const updated = { ...existing, isActive };
    this.models.set(modelId, updated);
    return this.modelWithCounts(organizationId, updated);
  }

  async listAssets(organizationId: string, query: AssetListQuery) {
    let items = [...this.assets.values()].filter((a) => a.organizationId === organizationId);
    if (query.status === "ARCHIVED") {
      items = items.filter((a) => a.archivedAt !== null);
    } else {
      items = items.filter((a) => a.archivedAt === null);
      if (query.status && query.status !== "all") items = items.filter((a) => a.status === query.status);
    }
    if (query.availability === "available") items = items.filter((a) => !a.activeAssignmentId);
    if (query.availability === "assigned") items = items.filter((a) => Boolean(a.activeAssignmentId));
    if (query.categoryId) items = items.filter((a) => a.categoryId === query.categoryId);
    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.assetTag.toLowerCase().includes(term) ||
          (a.serialNumber ?? "").toLowerCase().includes(term),
      );
    }
    return this.paginate(
      items.map((a) => this.toListItem(a)),
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async getAssetDetail(organizationId: string, assetId: string) {
    const a = this.assets.get(assetId);
    if (!a || a.organizationId !== organizationId) return null;
    return this.toDetail(a);
  }

  private checkAssetRefs(organizationId: string, input: PersistAssetInput, excludeId: string | null) {
    const dupTag = [...this.assets.values()].some(
      (a) => a.organizationId === organizationId && a.assetTag === input.assetTag && a.id !== excludeId,
    );
    if (dupTag) throw new AppError("CONFLICT", { message: "An asset with this tag already exists." });
    if (input.serialNumber) {
      const dupSerial = [...this.assets.values()].some(
        (a) =>
          a.organizationId === organizationId && a.serialNumber === input.serialNumber && a.id !== excludeId,
      );
      if (dupSerial) throw new AppError("CONFLICT", { message: "Duplicate serial." });
    }
    const category = this.categories.get(input.categoryId);
    if (!category || category.organizationId !== organizationId) throw NOT_FOUND();
    if (!category.isActive) throw new AppError("VALIDATION_ERROR", { message: "Category inactive." });
    if (input.modelId) {
      const model = this.models.get(input.modelId);
      if (!model || model.organizationId !== organizationId) throw NOT_FOUND();
      if (model.categoryId !== input.categoryId) {
        throw new AppError("VALIDATION_ERROR", { message: "Model does not belong to the category." });
      }
    }
    if (input.currentLocationId) {
      const loc = this.locations.get(input.currentLocationId);
      if (!loc || loc.organizationId !== organizationId) throw NOT_FOUND();
    }
  }

  async createAsset(organizationId: string, input: PersistAssetInput) {
    this.checkAssetRefs(organizationId, input, null);
    const record: StoredAsset = {
      id: this.nextId("ast"),
      organizationId,
      ...input,
      status: "AVAILABLE",
      activeAssignmentId: null,
      archivedAt: null,
    };
    this.assets.set(record.id, record);
    return this.toDetail(record);
  }

  async updateAsset(organizationId: string, assetId: string, input: PersistAssetInput) {
    const existing = this.assets.get(assetId);
    if (!existing || existing.organizationId !== organizationId) throw NOT_FOUND();
    if (existing.archivedAt) throw new AppError("VALIDATION_ERROR", { message: "Archived." });
    this.checkAssetRefs(organizationId, input, assetId);
    const updated: StoredAsset = {
      ...existing,
      ...input,
      status: existing.activeAssignmentId ? "ASSIGNED" : existing.status,
    };
    this.assets.set(assetId, updated);
    return this.toDetail(updated);
  }

  async archiveAsset(organizationId: string, assetId: string) {
    const existing = this.assets.get(assetId);
    if (!existing || existing.organizationId !== organizationId) throw NOT_FOUND();
    if (existing.archivedAt) throw new AppError("CONFLICT", { message: "Already archived." });
    if (existing.activeAssignmentId) {
      throw new AppError("VALIDATION_ERROR", { message: "Return first." });
    }
    const updated = { ...existing, archivedAt: new Date() };
    this.assets.set(assetId, updated);
    return this.toDetail(updated);
  }

  async assignAsset(organizationId: string, assetId: string, input: PersistAssignmentInput) {
    const existing = this.assets.get(assetId);
    if (!existing || existing.organizationId !== organizationId) throw NOT_FOUND();
    if (existing.archivedAt) throw new AppError("VALIDATION_ERROR", { message: "Archived." });
    if (existing.status !== "AVAILABLE" || existing.activeAssignmentId) {
      throw new AppError("CONFLICT", { message: "Not available." });
    }
    const location = this.locations.get(input.locationId);
    if (!location || location.organizationId !== organizationId) throw NOT_FOUND();
    const record: AssetAssignmentEntity = {
      id: this.nextId("asg"),
      organizationId,
      assetId,
      membershipId: input.membershipId,
      assigneeUserId: input.assigneeUserId,
      assigneeName: input.assigneeName,
      assigneeEmail: input.assigneeEmail,
      locationId: input.locationId,
      locationName: location.name,
      departmentId: input.departmentId,
      departmentName: null,
      assignedAt: input.assignedAt,
      expectedReturnAt: input.expectedReturnAt,
      returnedAt: null,
      assignmentCondition: input.condition,
      returnCondition: null,
      notes: input.notes,
      createdBy: input.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assignments.set(record.id, record);
    const updated = {
      ...existing,
      status: "ASSIGNED" as const,
      activeAssignmentId: record.id,
      currentLocationId: input.locationId,
      currentDepartmentId: input.departmentId,
    };
    this.assets.set(assetId, updated);
    return this.toDetail(updated);
  }

  async returnAsset(
    organizationId: string,
    assetId: string,
    input: { returnCondition: AssetCondition; notes: string | null; returnedAt: Date },
  ) {
    const existing = this.assets.get(assetId);
    if (!existing || existing.organizationId !== organizationId) throw NOT_FOUND();
    const assignmentId = existing.activeAssignmentId;
    if (!assignmentId) throw new AppError("VALIDATION_ERROR", { message: "No active assignment." });
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) throw NOT_FOUND();
    this.assignments.set(assignmentId, {
      ...assignment,
      returnedAt: input.returnedAt,
      returnCondition: input.returnCondition,
      notes: input.notes,
    });
    const updated = {
      ...existing,
      status: "AVAILABLE" as const,
      activeAssignmentId: null,
      condition: input.returnCondition,
    };
    this.assets.set(assetId, updated);
    return this.toDetail(updated);
  }

  async listAssignmentHistory(organizationId: string, query: AssignmentHistoryQuery) {
    let items = [...this.assignments.values()].filter((a) => a.organizationId === organizationId);
    if (query.assetId) items = items.filter((a) => a.assetId === query.assetId);
    if (query.openOnly) items = items.filter((a) => a.returnedAt === null);
    const withTags = items.map((a) => ({
      ...a,
      assetTag: this.assets.get(a.assetId)?.assetTag,
    }));
    return this.paginate(withTags, query.page ?? 1, query.pageSize ?? 20);
  }

  async recordHistory(organizationId: string, input: RecordHistoryInput): Promise<void> {
    this.history.push({ organizationId, ...input });
  }

  async getDashboardMetrics(organizationId: string): Promise<AssetDashboardMetrics> {
    const active = [...this.assets.values()].filter(
      (a) => a.organizationId === organizationId && !a.archivedAt,
    );
    const count = (status: string) => active.filter((a) => a.status === status).length;
    const byCategory = new Map<string, number>();
    const byLocation = new Map<string, number>();
    for (const a of active) {
      byCategory.set(a.categoryId, (byCategory.get(a.categoryId) ?? 0) + 1);
      if (a.currentLocationId) {
        byLocation.set(a.currentLocationId, (byLocation.get(a.currentLocationId) ?? 0) + 1);
      }
    }
    return {
      totalActive: active.length,
      available: count("AVAILABLE"),
      assigned: count("ASSIGNED"),
      maintenance: count("MAINTENANCE"),
      retired: count("RETIRED"),
      archived: [...this.assets.values()].filter(
        (a) => a.organizationId === organizationId && a.archivedAt,
      ).length,
      warrantyExpiringSoon: 0,
      warrantyExpired: 0,
      byCategory: [...byCategory.entries()].map(([categoryId, c]) => ({
        categoryId,
        categoryName: this.categories.get(categoryId)?.name ?? "Unknown",
        count: c,
      })),
      byLocation: [...byLocation.entries()].map(([locationId, c]) => ({
        locationId,
        locationName: this.locations.get(locationId)?.name ?? "Unknown",
        count: c,
      })),
      byDepartment: [],
      recentlyRegistered: active.slice(0, 5).map((a) => this.toListItem(a)),
      recentAssignments: [...this.assignments.values()]
        .filter((a) => a.organizationId === organizationId)
        .slice(0, 5),
      upcomingWarrantyExpirations: [],
    };
  }
}

describe("Asset application — categories", () => {
  let authRepo: FakeAuthorizationRepository;
  let assetRepo: FakeAssetRepository;
  let auditLog: FakeAuditLogger;

  const orgA = { id: "org_a", name: "Org A", slug: "org-a" };
  const orgB = { id: "org-b", name: "Org B", slug: "org-b" };

  beforeEach(() => {
    authRepo = new FakeAuthorizationRepository();
    assetRepo = new FakeAssetRepository();
    auditLog = new FakeAuditLogger();
    authRepo.organizations.set(orgA.id, orgA);
    authRepo.organizations.set(orgB.id, orgB);
    for (const [userId, role] of [
      ["usr_owner", "OWNER"],
      ["usr_admin", "ADMIN"],
      ["usr_engineer", "ENGINEER"],
      ["usr_user", "USER"],
    ] as const) {
      authRepo.memberships.push({ id: `mem_${userId}`, userId, organizationId: orgA.id, role });
    }
  });

  const makeDeps = (currentUserId = "usr_owner", activeOrgId: string | null = orgA.id) => ({
    getSession: async () => ({
      userId: currentUserId,
      email: `${currentUserId}@x.test`,
      name: currentUserId,
      activeOrganizationId: activeOrgId,
    }),
    authorizationRepository: authRepo,
    assetRepository: assetRepo,
    auditLog,
  });

  const validCategory = { name: "Laptops", code: "LAPTOP", description: null };

  it("creates a category and records audit", async () => {
    const { category } = await executeCreateCategory(validCategory, makeDeps());
    assert.equal(category.code, "LAPTOP");
    assert.ok(auditLog.events.some((e) => e.type === "ASSET_CATEGORY_CREATED"));
  });

  it("rejects duplicate codes and names within the organization", async () => {
    await executeCreateCategory(validCategory, makeDeps());
    await assert.rejects(
      () => executeCreateCategory({ ...validCategory, name: "Other" }, makeDeps()),
      (err: AppError) => err.code === "CONFLICT",
    );
    await assert.rejects(
      () => executeCreateCategory({ ...validCategory, code: "OTHER" }, makeDeps()),
      (err: AppError) => err.code === "CONFLICT",
    );
  });

  it("allows the same code in another organization", async () => {
    authRepo.memberships.push({ id: "mem_cross", userId: "usr_owner", organizationId: orgB.id, role: "OWNER" });
    await executeCreateCategory(validCategory, makeDeps());
    const { category } = await executeCreateCategory(validCategory, makeDeps("usr_owner", orgB.id));
    assert.equal(category.organizationId, orgB.id);
  });

  it("denies taxonomy management to engineers, users and strangers", async () => {
    for (const userId of ["usr_engineer", "usr_user", "usr_stranger"]) {
      await assert.rejects(
        () => executeCreateCategory(validCategory, makeDeps(userId)),
        (err: AppError) => err.code === "FORBIDDEN" || err.code === "UNAUTHENTICATED",
      );
    }
    await assert.rejects(
      () =>
        executeCreateCategory(validCategory, {
          ...makeDeps(),
          getSession: async () => null,
        }),
      (err: AppError) => err.code === "UNAUTHENTICATED",
    );
  });

  it("falls back to the default membership when no organization is active", async () => {
    const { category } = await executeCreateCategory(validCategory, makeDeps("usr_owner", null));
    assert.equal(category.organizationId, orgA.id);
  });

  it("blocks deactivation while active assets reference the category", async () => {
    const { category } = await executeCreateCategory(validCategory, makeDeps());
    assetRepo.locations.set("loc_1", { id: "loc_1", organizationId: orgA.id, name: "HQ", isActive: true });
    await executeCreateAsset(
      {
        name: "MacBook",
        assetTag: "AST-001",
        description: null,
        categoryId: category.id,
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
        condition: "NEW",
        currentLocationId: "loc_1",
        currentDepartmentId: null,
      },
      makeDeps(),
    );
    await assert.rejects(
      () => executeSetCategoryActive({ categoryId: category.id, isActive: false }, makeDeps()),
      (err: AppError) => err.code === "CONFLICT",
    );
  });

  it("updates categories and rejects cross-tenant updates", async () => {
    const { category } = await executeCreateCategory(validCategory, makeDeps());
    const updated = await executeUpdateCategory(
      { categoryId: category.id, name: "Notebooks", code: "NOTEBOOK", description: null },
      makeDeps(),
    );
    assert.equal(updated.category.name, "Notebooks");
    authRepo.memberships.push({ id: "mem_b", userId: "usr_owner", organizationId: orgB.id, role: "OWNER" });
    await assert.rejects(
      () =>
        executeUpdateCategory(
          { categoryId: category.id, name: "Hijacked", code: "HIJACK", description: null },
          makeDeps("usr_owner", orgB.id),
        ),
      (err: AppError) => err.code === "NOT_FOUND",
    );
  });
});

describe("Asset application — models", () => {
  let authRepo: FakeAuthorizationRepository;
  let assetRepo: FakeAssetRepository;
  let auditLog: FakeAuditLogger;
  const orgA = { id: "org_a", name: "Org A", slug: "org-a" };
  let categoryId = "";

  beforeEach(async () => {
    authRepo = new FakeAuthorizationRepository();
    assetRepo = new FakeAssetRepository();
    auditLog = new FakeAuditLogger();
    authRepo.organizations.set(orgA.id, orgA);
    authRepo.memberships.push({ id: "mem_owner", userId: "usr_owner", organizationId: orgA.id, role: "OWNER" });
    const deps = {
      getSession: async () => ({
        userId: "usr_owner",
        email: "o@x.test",
        name: "o",
        activeOrganizationId: orgA.id,
      }),
      authorizationRepository: authRepo,
      assetRepository: assetRepo,
      auditLog,
    };
    const { category } = await executeCreateCategory(
      { name: "Laptops", code: "LAPTOP", description: null },
      deps,
    );
    categoryId = category.id;
  });

  const makeDeps = (userId = "usr_owner") => ({
    getSession: async () => ({
      userId,
      email: `${userId}@x.test`,
      name: userId,
      activeOrganizationId: orgA.id,
    }),
    authorizationRepository: authRepo,
    assetRepository: assetRepo,
    auditLog,
  });

  it("creates models bound to an active category", async () => {
    const { model } = await executeCreateModel(
      { categoryId, brand: "Apple", modelName: "MacBook Pro 14", modelCode: null, description: null },
      makeDeps(),
    );
    assert.equal(model.brand, "Apple");
    assert.ok(auditLog.events.some((e) => e.type === "ASSET_MODEL_CREATED"));
  });

  it("rejects duplicate brand/model pairs and unknown categories", async () => {
    const input = { categoryId, brand: "Apple", modelName: "MacBook Pro 14", modelCode: null, description: null };
    await executeCreateModel(input, makeDeps());
    await assert.rejects(() => executeCreateModel(input, makeDeps()), (err: AppError) => err.code === "CONFLICT");
    await assert.rejects(
      () => executeCreateModel({ ...input, categoryId: "cat_missing" }, makeDeps()),
      (err: AppError) => err.code === "NOT_FOUND",
    );
  });

  it("lists models filtered by category", async () => {    await executeCreateModel(
      { categoryId, brand: "Apple", modelName: "MacBook Air", modelCode: null, description: null },
      makeDeps(),
    );
    const all = await executeListModels({}, makeDeps());
    assert.equal(all.total, 1);
    const filtered = await executeListModels({ categoryId: "cat_other" }, makeDeps());
    assert.equal(filtered.total, 0);
  });

  it("toggles model status and records audit", async () => {
    const { model } = await executeCreateModel(
      { categoryId, brand: "Dell", modelName: "XPS 13", modelCode: null, description: null },
      makeDeps(),
    );
    const { model: updated } = await executeSetModelActive(
      { modelId: model.id, isActive: false },
      makeDeps(),
    );
    assert.equal(updated.isActive, false);
    assert.ok(auditLog.events.some((e) => e.type === "ASSET_MODEL_STATUS_CHANGED"));
  });

  it("lists categories with search and renames models", async () => {
    const listed = await executeListCategories({ search: "lap" }, makeDeps());
    assert.equal(listed.total, 1);
    const empty = await executeListCategories({ search: "phones" }, makeDeps());
    assert.equal(empty.total, 0);
    const { model } = await executeCreateModel(
      { categoryId, brand: "Apple", modelName: "MacBook Pro 14", modelCode: null, description: null },
      makeDeps(),
    );
    const updated = await executeUpdateModel(
      { modelId: model.id, categoryId, brand: "Apple", modelName: "MacBook Pro 16", modelCode: null, description: null },
      makeDeps(),
    );
    assert.equal(updated.model.modelName, "MacBook Pro 16");
    assert.ok(auditLog.events.some((e) => e.type === "ASSET_MODEL_UPDATED"));
  });
});

describe("Asset application — registry", () => {
  let authRepo: FakeAuthorizationRepository;
  let assetRepo: FakeAssetRepository;
  let auditLog: FakeAuditLogger;
  const orgA = { id: "org_a", name: "Org A", slug: "org-a" };
  let categoryId = "";

  const validAsset = {
    name: "MacBook Pro 14",
    assetTag: "AST-001",
    description: null,
    categoryId: "",
    modelId: null,
    brand: "Apple",
    serialNumber: "SN-1",
    purchaseDate: "2026-01-15",
    purchaseCost: "185000.00",
    currency: "INR",
    vendorName: "Apple Store",
    invoiceNumber: null,
    warrantyStartDate: null,
    warrantyEndDate: "2029-01-15",
    condition: "NEW" as const,
    currentLocationId: null as string | null,
    currentDepartmentId: null as string | null,
  };

  beforeEach(async () => {
    authRepo = new FakeAuthorizationRepository();
    assetRepo = new FakeAssetRepository();
    auditLog = new FakeAuditLogger();
    authRepo.organizations.set(orgA.id, orgA);
    for (const [userId, role] of [
      ["usr_owner", "OWNER"],
      ["usr_engineer", "ENGINEER"],
      ["usr_user", "USER"],
    ] as const) {
      authRepo.memberships.push({ id: `mem_${userId}`, userId, organizationId: orgA.id, role });
    }
    const deps = {
      getSession: async () => ({
        userId: "usr_owner",
        email: "o@x.test",
        name: "o",
        activeOrganizationId: orgA.id,
      }),
      authorizationRepository: authRepo,
      assetRepository: assetRepo,
      auditLog,
    };
    const { category } = await executeCreateCategory(
      { name: "Laptops", code: "LAPTOP", description: null },
      deps,
    );
    categoryId = category.id;
    assetRepo.locations.set("loc_1", { id: "loc_1", organizationId: orgA.id, name: "HQ", isActive: true });
  });

  const makeDeps = (userId = "usr_owner", activeOrgId: string | null = orgA.id) => ({
    getSession: async () => ({
      userId,
      email: `${userId}@x.test`,
      name: userId,
      activeOrganizationId: activeOrgId,
    }),
    authorizationRepository: authRepo,
    assetRepository: assetRepo,
    auditLog,
  });

  it("creates assets with history and audit, defaulting to AVAILABLE", async () => {
    const { asset } = await executeCreateAsset({ ...validAsset, categoryId }, makeDeps());
    assert.equal(asset.status, "AVAILABLE");
    assert.equal(asset.purchaseCost, "185000.00");
    assert.ok(assetRepo.history.some((h) => h.eventType === "ASSET_CREATED" && h.assetId === asset.id));
    assert.ok(auditLog.events.some((e) => e.type === "ASSET_CREATED"));
  });

  it("rejects duplicate tags and invalid money", async () => {
    await executeCreateAsset({ ...validAsset, categoryId }, makeDeps());
    await assert.rejects(
      () => executeCreateAsset({ ...validAsset, categoryId, name: "Other" }, makeDeps()),
      (err: AppError) => err.code === "CONFLICT",
    );
    await assert.rejects(
      () => executeCreateAsset({ ...validAsset, categoryId, assetTag: "AST-002", purchaseCost: "12.345" }, makeDeps()),
      (err: AppError) => err.code === "VALIDATION_ERROR",
    );
  });

  it("rejects cross-organization category and location references", async () => {
    await assert.rejects(
      () => executeCreateAsset({ ...validAsset, categoryId: "cat_foreign" }, makeDeps()),
      (err: AppError) => err.code === "NOT_FOUND",
    );
    assetRepo.locations.set("loc_b", { id: "loc_b", organizationId: "org_b", name: "Far", isActive: true });
    await assert.rejects(
      () =>
        executeCreateAsset({ ...validAsset, categoryId, currentLocationId: "loc_b" }, makeDeps()),
      (err: AppError) => err.code === "NOT_FOUND",
    );
  });

  it("denies creation to engineers and strangers but allows reads", async () => {
    await assert.rejects(
      () => executeCreateAsset({ ...validAsset, categoryId }, makeDeps("usr_engineer")),
      (err: AppError) => err.code === "FORBIDDEN",
    );
    const list = await executeListAssets({}, makeDeps("usr_user"));
    assert.equal(list.total, 0);
    await assert.rejects(() => executeListAssets({}, makeDeps("usr_stranger")), (err: AppError) =>
      ["FORBIDDEN", "UNAUTHENTICATED"].includes(err.code),
    );
  });

  it("hides foreign assets as NOT_FOUND", async () => {
    const { asset } = await executeCreateAsset({ ...validAsset, categoryId }, makeDeps());
    authRepo.organizations.set("org_b", { id: "org_b", name: "B", slug: "b" });
    authRepo.memberships.push({ id: "mem_b", userId: "usr_owner", organizationId: "org_b", role: "OWNER" });
    await assert.rejects(
      () => executeGetAssetDetail({ assetId: asset.id }, makeDeps("usr_owner", "org_b")),
      (err: AppError) => err.code === "NOT_FOUND",
    );
  });

  it("archives only unassigned assets", async () => {
    const { asset } = await executeCreateAsset(
      { ...validAsset, categoryId, currentLocationId: "loc_1" },
      makeDeps(),
    );
    await executeAssignAsset(
      { assetId: asset.id, membershipId: "mem_usr_user", locationId: "loc_1", departmentId: null, assignedAt: null, expectedReturnAt: null, condition: "GOOD", notes: null },
      makeDeps(),
    );
    await assert.rejects(
      () => executeArchiveAsset({ assetId: asset.id }, makeDeps()),
      (err: AppError) => err.code === "VALIDATION_ERROR",
    );
    await executeReturnAsset(
      { assetId: asset.id, returnCondition: "GOOD", notes: null, returnedAt: null },
      makeDeps(),
    );
    const { asset: archived } = await executeArchiveAsset({ assetId: asset.id }, makeDeps());
    assert.ok(archived.archivedAt !== null);
    assert.ok(assetRepo.history.some((h) => h.eventType === "ASSET_ARCHIVED"));
  });

  it("assigns and returns with snapshots and status transitions", async () => {
    const { asset } = await executeCreateAsset(
      { ...validAsset, categoryId, currentLocationId: "loc_1" },
      makeDeps(),
    );
    const assigned = await executeAssignAsset(
      { assetId: asset.id, membershipId: "mem_usr_user", locationId: "loc_1", departmentId: null, assignedAt: null, expectedReturnAt: null, condition: "GOOD", notes: "handover" },
      makeDeps("usr_engineer"),
    );
    assert.equal(assigned.asset.status, "ASSIGNED");
    assert.equal(assigned.asset.activeAssignment?.assigneeName, "usr_user");
    await assert.rejects(
      () =>
        executeAssignAsset(
          { assetId: asset.id, membershipId: "mem_usr_engineer", locationId: "loc_1", departmentId: null, assignedAt: null, expectedReturnAt: null, condition: "GOOD", notes: null },
          makeDeps(),
        ),
      (err: AppError) => err.code === "CONFLICT",
    );
    const returned = await executeReturnAsset(
      { assetId: asset.id, returnCondition: "FAIR", notes: null, returnedAt: null },
      makeDeps(),
    );
    assert.equal(returned.asset.status, "AVAILABLE");
    assert.equal(returned.asset.condition, "FAIR");
    assert.ok(assetRepo.history.some((h) => h.eventType === "ASSET_ASSIGNED"));
    assert.ok(assetRepo.history.some((h) => h.eventType === "ASSET_RETURNED"));
    assert.ok(auditLog.events.some((e) => e.type === "ASSET_ASSIGNED"));
  });

  it("denies assignment to users but allows engineers", async () => {
    const { asset } = await executeCreateAsset(
      { ...validAsset, categoryId, currentLocationId: "loc_1" },
      makeDeps(),
    );
    await assert.rejects(
      () =>
        executeAssignAsset(
          { assetId: asset.id, membershipId: "mem_usr_user", locationId: "loc_1", departmentId: null, assignedAt: null, expectedReturnAt: null, condition: "GOOD", notes: null },
          makeDeps("usr_user"),
        ),
      (err: AppError) => err.code === "FORBIDDEN",
    );
  });

  it("exposes assignable employees to operators only", async () => {
    const { employees } = await executeListAssignableEmployees({}, makeDeps("usr_engineer"));
    assert.ok(employees.length >= 3);
    await assert.rejects(() => executeListAssignableEmployees({}, makeDeps("usr_user")), (err: AppError) =>
      ["FORBIDDEN", "UNAUTHENTICATED"].includes(err.code),
    );
  });

  it("updates assets and blocks edits once archived", async () => {
    const { asset } = await executeCreateAsset({ ...validAsset, categoryId }, makeDeps());
    const updated = await executeUpdateAsset(
      { ...validAsset, categoryId, assetId: asset.id, name: "MacBook Pro 16" },
      makeDeps(),
    );
    assert.equal(updated.asset.name, "MacBook Pro 16");
    assert.ok(assetRepo.history.some((h) => h.eventType === "ASSET_UPDATED"));
    await executeArchiveAsset({ assetId: asset.id }, makeDeps());
    await assert.rejects(
      () => executeUpdateAsset({ ...validAsset, categoryId, assetId: asset.id, name: "X2" }, makeDeps()),
      (err: AppError) => err.code === "VALIDATION_ERROR",
    );
  });

  it("computes dashboard metrics excluding archived assets", async () => {    const first = await executeCreateAsset({ ...validAsset, categoryId }, makeDeps());
    await executeCreateAsset(
      { ...validAsset, categoryId, assetTag: "AST-002", name: "Dell XPS", serialNumber: null },
      makeDeps(),
    );
    await executeArchiveAsset({ assetId: first.asset.id }, makeDeps());
    const { metrics } = await executeGetAssetDashboard({}, makeDeps());
    assert.equal(metrics.totalActive, 1);
    assert.equal(metrics.available, 1);
    assert.equal(metrics.archived, 1);
    assert.equal(metrics.byCategory[0]?.categoryName, "Laptops");
  });
});

describe("Asset application — reports and export", () => {
  let authRepo: FakeAuthorizationRepository;
  let assetRepo: FakeAssetRepository;
  let auditLog: FakeAuditLogger;
  const orgA = { id: "org_a", name: "Org A", slug: "org-a" };

  beforeEach(async () => {
    authRepo = new FakeAuthorizationRepository();
    assetRepo = new FakeAssetRepository();
    auditLog = new FakeAuditLogger();
    authRepo.organizations.set(orgA.id, orgA);
    for (const [userId, role] of [
      ["usr_owner", "OWNER"],
      ["usr_admin", "ADMIN"],
      ["usr_engineer", "ENGINEER"],
      ["usr_user", "USER"],
    ] as const) {
      authRepo.memberships.push({ id: `mem_${userId}`, userId, organizationId: orgA.id, role });
    }
    const deps = {
      getSession: async () => ({
        userId: "usr_owner",
        email: "o@x.test",
        name: "o",
        activeOrganizationId: orgA.id,
      }),
      authorizationRepository: authRepo,
      assetRepository: assetRepo,
      auditLog,
    };
    const { category } = await executeCreateCategory(
      { name: "Laptops", code: "LAPTOP", description: null },
      deps,
    );
    assetRepo.locations.set("loc_1", { id: "loc_1", organizationId: orgA.id, name: "HQ", isActive: true });
    const base = {
      categoryId: category.id,
      modelId: null,
      brand: "Apple",
      serialNumber: null,
      purchaseDate: "2026-01-15",
      purchaseCost: "100.00",
      currency: "INR",
      vendorName: null,
      invoiceNumber: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
      condition: "GOOD" as const,
      currentLocationId: "loc_1",
      currentDepartmentId: null,
      description: null,
    };
    await executeCreateAsset({ ...base, name: "Mac One", assetTag: "AST-001" }, deps);
    const second = await executeCreateAsset({ ...base, name: "Mac Two", assetTag: "AST-002" }, deps);
    await executeAssignAsset(
      { assetId: second.asset.id, membershipId: "mem_usr_user", locationId: "loc_1", departmentId: null, assignedAt: null, expectedReturnAt: null, condition: "GOOD", notes: null },
      deps,
    );
  });

  const makeDeps = (userId = "usr_owner") => ({
    getSession: async () => ({
      userId,
      email: `${userId}@x.test`,
      name: userId,
      activeOrganizationId: orgA.id,
    }),
    authorizationRepository: authRepo,
    assetRepository: assetRepo,
    auditLog,
  });

  it("runs inventory and filtered reports with stable columns", async () => {
    const inventory = await executeGetAssetReport({ report: "inventory" }, makeDeps());
    assert.equal(inventory.total, 2);
    assert.ok(inventory.columns.includes("Asset Tag"));
    const assigned = await executeGetAssetReport({ report: "assigned" }, makeDeps());
    assert.equal(assigned.total, 1);
    assert.ok(assigned.rows[0]?.includes("usr_user"));
    const available = await executeGetAssetReport({ report: "available" }, makeDeps());
    assert.equal(available.total, 1);
  });

  it("runs the assignment history report", async () => {
    const report = await executeGetAssetReport({ report: "assignments" }, makeDeps());
    assert.equal(report.total, 1);
    assert.ok(report.columns.includes("Employee"));
    assert.ok(report.rows[0]?.includes("AST-002"));
  });

  it("exports CSV with BOM, safe filename and injection guards", async () => {
    const result = await executeExportAssetReport({ report: "inventory" }, makeDeps("usr_admin"));
    assert.match(result.filename, /^aventra-assets-inventory-\d{4}-\d{2}-\d{2}\.csv$/);
    assert.ok(result.csv.startsWith("\uFEFF"));
    assert.equal(result.truncated, false);
    assert.equal(result.rowCount, 2);
  });

  it("neutralizes spreadsheet formula injection", () => {
    assert.equal(escapeCsvCell("=cmd(1)"), "'=cmd(1)");
    assert.equal(escapeCsvCell("+123"), "'+123");
    assert.equal(escapeCsvCell("normal"), "normal");
    assert.equal(escapeCsvCell('say "hi", ok'), '"say ""hi"", ok"');
    const doc = buildCsvDocument(["A", "B"], [["=x", "y"]]);
    assert.ok(doc.includes("'=x"));
  });

  it("restricts export to managers and reports to operators", async () => {
    await assert.rejects(() => executeExportAssetReport({ report: "inventory" }, makeDeps("usr_engineer")), (err: AppError) =>
      ["FORBIDDEN", "UNAUTHENTICATED"].includes(err.code),
    );
    await assert.rejects(() => executeExportAssetReport({ report: "inventory" }, makeDeps("usr_user")), (err: AppError) =>
      ["FORBIDDEN", "UNAUTHENTICATED"].includes(err.code),
    );
    const report = await executeGetAssetReport({ report: "inventory" }, makeDeps("usr_engineer"));
    assert.equal(report.total, 2);
    await assert.rejects(() => executeGetAssetReport({ report: "inventory" }, makeDeps("usr_user")), (err: AppError) =>
      ["FORBIDDEN", "UNAUTHENTICATED"].includes(err.code),
    );
  });
});
