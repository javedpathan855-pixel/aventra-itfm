import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "@/shared/error/app-error";
import type {
  AuthorizationRepository,
  MembershipRecord,
  MemberWithUser,
  OrganizationRecord,
  InvitationRecord,
  CreatedInvitation,
} from "@/features/auth/repository/authorization-repository";
import type { AuditLogPort, AuditEvent } from "@/features/auth/repository/audit-log";
import type { OrganizationRepository } from "../repository/organization-repository";
import type {
  DepartmentDetail,
  DepartmentWithLocationCount,
  LocationDetail,
  LocationWithDepartmentCount,
  PaginatedResult,
} from "../domain/entities/location-department";
import {
  departmentSchema,
  locationSchema,
} from "../domain/schemas/location.schema";
import {
  normalizeEntityCode,
  normalizeEntityName,
} from "../domain/constants/location-constants";
import {
  executeCreateLocation,
  executeGetLocationDetail,
  executeListLocations,
  executeSetDefaultLocation,
  executeSetLocationActive,
  executeUpdateLocation,
} from "../application/use-cases/manage-organization-locations.use-case";
import {
  executeCreateDepartment,
  executeGetDepartmentDetail,
  executeListDepartments,
  executeSetDepartmentActive,
  executeUpdateDepartment,
} from "../application/use-cases/manage-organization-departments.use-case";
import {
  executeRemoveAssignment,
  executeSyncDepartmentAssignments,
  executeSyncLocationAssignments,
} from "../application/use-cases/manage-location-department-assignments.use-case";
import { executeGetViewerRole } from "../application/use-cases/get-viewer-role.use-case";

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
  async createInvitation(): Promise<CreatedInvitation> { throw new Error("not implemented"); }
  async findPendingInvitation(): Promise<InvitationRecord | null> { return null; }
  async findInvitationByToken(): Promise<InvitationRecord | null> { return null; }
  async acceptInvitation(): Promise<MembershipRecord> { throw new Error("not implemented"); }
  async cancelInvitation(): Promise<void> {}
  async updateMemberRole(input: { memberId: string; organizationId: string; role: string }): Promise<MembershipRecord> {
    const mem = this.memberships.find((m) => m.id === input.memberId);
    if (!mem) throw new AppError("NOT_FOUND");
    mem.role = input.role;
    return mem;
  }
  async removeMember(): Promise<void> {}
}

class FakeAuditLogger implements AuditLogPort {
  events: AuditEvent[] = [];
  async record(event: Omit<AuditEvent, "timestamp">): Promise<void> {
    this.events.push({ ...event, timestamp: new Date().toISOString() });
  }
}

interface StoredLocation extends LocationWithDepartmentCount {
  departments: string[];
}
interface StoredDepartment extends DepartmentWithLocationCount {
  locations: string[];
}

class FakeOrganizationRepository implements OrganizationRepository {
  locations = new Map<string, StoredLocation>();
  departments = new Map<string, StoredDepartment>();
  assignments = new Map<string, { locationId: string; departmentId: string }>();
  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  private scopedLocations(organizationId: string): StoredLocation[] {
    return [...this.locations.values()].filter((item) => item.organizationId === organizationId);
  }

  private scopedDepartments(organizationId: string): StoredDepartment[] {
    return [...this.departments.values()].filter((item) => item.organizationId === organizationId);
  }

  private refreshCounts(organizationId: string): void {
    for (const location of this.scopedLocations(organizationId)) {
      location.departmentCount = [...this.assignments.values()].filter(
        (assignment) => assignment.locationId === location.id,
      ).length;
    }
    for (const department of this.scopedDepartments(organizationId)) {
      department.locationCount = [...this.assignments.values()].filter(
        (assignment) => assignment.departmentId === department.id,
      ).length;
    }
  }

  async getProfile(): Promise<never> { throw new Error("not implemented"); }
  async updateGeneralProfile(): Promise<never> { throw new Error("not implemented"); }
  async updateLegalTax(): Promise<never> { throw new Error("not implemented"); }
  async updateLogo(): Promise<never> { throw new Error("not implemented"); }
  async listAddresses(): Promise<never> { throw new Error("not implemented"); }
  async createAddress(): Promise<never> { throw new Error("not implemented"); }
  async updateAddress(): Promise<never> { throw new Error("not implemented"); }
  async deleteAddress(): Promise<never> { throw new Error("not implemented"); }
  async setDefaultAddress(): Promise<never> { throw new Error("not implemented"); }
  async getSettings(): Promise<never> { throw new Error("not implemented"); }
  async updateSettings(): Promise<never> { throw new Error("not implemented"); }

  async listLocations(
    organizationId: string,
    query: { search?: string; status?: string; defaultOnly?: boolean; sortBy?: string; sortDirection?: string; page?: number; pageSize?: number },
  ): Promise<PaginatedResult<LocationWithDepartmentCount>> {    this.refreshCounts(organizationId);
    let items = this.scopedLocations(organizationId);
    const term = (query.search || "").toLowerCase();
    if (term) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term) ||
          (item.city || "").toLowerCase().includes(term),
      );
    }
    if (query.status === "active") items = items.filter((item) => item.isActive);
    if (query.status === "inactive") items = items.filter((item) => !item.isActive);
    if (query.defaultOnly) items = items.filter((item) => item.isDefault);
    const direction = query.sortDirection === "desc" ? -1 : 1;
    const field = query.sortBy === "code" || query.sortBy === "city" || query.sortBy === "createdAt" ? query.sortBy : "name";
    items = [...items].sort((a, b) => {
      const left = String(a[field] ?? "");
      const right = String(b[field] ?? "");
      return left.localeCompare(right) * direction;
    });
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = items.length;
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize).map((item) => ({
        id: item.id,
        organizationId: item.organizationId,
        name: item.name,
        code: item.code,
        description: item.description,
        email: item.email,
        phone: item.phone,
        addressLine1: item.addressLine1,
        addressLine2: item.addressLine2,
        city: item.city,
        state: item.state,
        postalCode: item.postalCode,
        country: item.country,
        timezone: item.timezone,
        isDefault: item.isDefault,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        departmentCount: item.departmentCount,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getLocationDetail(organizationId: string, locationId: string): Promise<LocationDetail | null> {
    this.refreshCounts(organizationId);
    const location = this.locations.get(locationId);
    if (!location || location.organizationId !== organizationId) return null;
    const departments = [...this.assignments.values()]
      .filter((assignment) => assignment.locationId === locationId)
      .map((assignment) => this.departments.get(assignment.departmentId))
      .filter((department): department is StoredDepartment => Boolean(department));
    return {
      id: location.id,
      organizationId: location.organizationId,
      name: location.name,
      code: location.code,
      description: location.description,
      email: location.email,
      phone: location.phone,
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2,
      city: location.city,
      state: location.state,
      postalCode: location.postalCode,
      country: location.country,
      timezone: location.timezone,
      isDefault: location.isDefault,
      isActive: location.isActive,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      departments: departments.map((department) => ({
        id: department.id,
        organizationId: department.organizationId,
        name: department.name,
        code: department.code,
        description: department.description,
        isActive: department.isActive,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      })),
      departmentCount: departments.length,
    };
  }

  async createLocation(organizationId: string, input: Record<string, unknown>): Promise<LocationDetail> {
    if (this.scopedLocations(organizationId).some((item) => item.code === input.code)) {
      throw new AppError("CONFLICT", { message: "A location with this code already exists." });
    }
    if (input.isDefault) {
      for (const item of this.scopedLocations(organizationId)) item.isDefault = false;
    }
    const now = new Date();
    const location: StoredLocation = {
      id: this.nextId("loc"),
      organizationId,
      name: String(input.name),
      code: String(input.code),
      description: (input.description as string | null) ?? null,
      email: (input.email as string | null) ?? null,
      phone: (input.phone as string | null) ?? null,
      addressLine1: (input.addressLine1 as string | null) ?? null,
      addressLine2: (input.addressLine2 as string | null) ?? null,
      city: (input.city as string | null) ?? null,
      state: (input.state as string | null) ?? null,
      postalCode: (input.postalCode as string | null) ?? null,
      country: (input.country as string | null) ?? null,
      timezone: (input.timezone as string | null) ?? null,
      isDefault: Boolean(input.isDefault),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      departments: [],
      departmentCount: 0,
    };
    this.locations.set(location.id, location);
    return {
      id: location.id,
      organizationId: location.organizationId,
      name: location.name,
      code: location.code,
      description: location.description,
      email: location.email,
      phone: location.phone,
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2,
      city: location.city,
      state: location.state,
      postalCode: location.postalCode,
      country: location.country,
      timezone: location.timezone,
      isDefault: location.isDefault,
      isActive: location.isActive,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      departments: [],
      departmentCount: 0,
    };
  }

  async updateLocation(
    organizationId: string,
    locationId: string,
    input: Record<string, unknown>,
  ): Promise<LocationDetail> {
    const location = this.locations.get(locationId);
    if (!location || location.organizationId !== organizationId) {
      throw new AppError("NOT_FOUND", { message: "Location not found." });
    }
    if (
      this.scopedLocations(organizationId).some(
        (item) => item.id !== locationId && item.code === input.code,
      )
    ) {
      throw new AppError("CONFLICT", { message: "A location with this code already exists." });
    }
    if (input.isDefault) {
      for (const item of this.scopedLocations(organizationId)) item.isDefault = false;
    }
    Object.assign(location, input, { updatedAt: new Date() });
    const detail = await this.getLocationDetail(organizationId, locationId);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Location not found." });
    return detail;
  }

  async setLocationActive(
    organizationId: string,
    locationId: string,
    isActive: boolean,
  ): Promise<LocationDetail> {
    const location = this.locations.get(locationId);
    if (!location || location.organizationId !== organizationId) {
      throw new AppError("NOT_FOUND", { message: "Location not found." });
    }
    location.isActive = isActive;
    if (!isActive) location.isDefault = false;
    location.updatedAt = new Date();
    const detail = await this.getLocationDetail(organizationId, locationId);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Location not found." });
    return detail;
  }

  async setDefaultLocation(organizationId: string, locationId: string): Promise<LocationDetail> {
    const location = this.locations.get(locationId);
    if (!location || location.organizationId !== organizationId) {
      throw new AppError("NOT_FOUND", { message: "Location not found." });
    }
    for (const item of this.scopedLocations(organizationId)) item.isDefault = false;
    location.isDefault = true;
    location.updatedAt = new Date();
    const detail = await this.getLocationDetail(organizationId, locationId);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Location not found." });
    return detail;
  }

  async listDepartments(
    organizationId: string,
    query: { search?: string; status?: string; sortBy?: string; sortDirection?: string; page?: number; pageSize?: number },
  ): Promise<PaginatedResult<DepartmentWithLocationCount>> {
    this.refreshCounts(organizationId);
    let items = this.scopedDepartments(organizationId);
    const term = (query.search || "").toLowerCase();
    if (term) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term),
      );
    }
    if (query.status === "active") items = items.filter((item) => item.isActive);
    if (query.status === "inactive") items = items.filter((item) => !item.isActive);
    const direction = query.sortDirection === "desc" ? -1 : 1;
    const field = query.sortBy === "code" || query.sortBy === "createdAt" ? query.sortBy : "name";
    items = [...items].sort((a, b) => String(a[field]).localeCompare(String(b[field])) * direction);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = items.length;
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize).map((item) => ({
        id: item.id,
        organizationId: item.organizationId,
        name: item.name,
        code: item.code,
        description: item.description,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        locationCount: item.locationCount,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getDepartmentDetail(organizationId: string, departmentId: string): Promise<DepartmentDetail | null> {
    this.refreshCounts(organizationId);
    const department = this.departments.get(departmentId);
    if (!department || department.organizationId !== organizationId) return null;
    const locations = [...this.assignments.values()]
      .filter((assignment) => assignment.departmentId === departmentId)
      .map((assignment) => this.locations.get(assignment.locationId))
      .filter((location): location is StoredLocation => Boolean(location));
    return {
      id: department.id,
      organizationId: department.organizationId,
      name: department.name,
      code: department.code,
      description: department.description,
      isActive: department.isActive,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      locations: locations.map((location) => ({
        id: location.id,
        organizationId: location.organizationId,
        name: location.name,
        code: location.code,
        description: location.description,
        email: location.email,
        phone: location.phone,
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2,
        city: location.city,
        state: location.state,
        postalCode: location.postalCode,
        country: location.country,
        timezone: location.timezone,
        isDefault: location.isDefault,
        isActive: location.isActive,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      })),
      locationCount: locations.length,
    };
  }

  async createDepartment(
    organizationId: string,
    input: Record<string, unknown>,
    locationIds: string[] = [],
  ): Promise<DepartmentDetail> {
    if (this.scopedDepartments(organizationId).some((item) => item.code === input.code)) {
      throw new AppError("CONFLICT", { message: "A department with this code already exists." });
    }
    const now = new Date();
    const department: StoredDepartment = {
      id: this.nextId("dep"),
      organizationId,
      name: String(input.name),
      code: String(input.code),
      description: (input.description as string | null) ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      locations: [],
      locationCount: 0,
    };
    this.departments.set(department.id, department);
    for (const locationId of [...new Set(locationIds)]) {
      this.assignments.set(`${locationId}:${department.id}`, { locationId, departmentId: department.id });
    }
    const detail = await this.getDepartmentDetail(organizationId, department.id);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Department not found." });
    return detail;
  }

  async updateDepartment(
    organizationId: string,
    departmentId: string,
    input: Record<string, unknown>,
  ): Promise<DepartmentDetail> {
    const department = this.departments.get(departmentId);
    if (!department || department.organizationId !== organizationId) {
      throw new AppError("NOT_FOUND", { message: "Department not found." });
    }
    if (
      this.scopedDepartments(organizationId).some(
        (item) => item.id !== departmentId && item.code === input.code,
      )
    ) {
      throw new AppError("CONFLICT", { message: "A department with this code already exists." });
    }
    Object.assign(department, input, { updatedAt: new Date() });
    const detail = await this.getDepartmentDetail(organizationId, departmentId);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Department not found." });
    return detail;
  }

  async updateDepartmentWithAssignments(
    organizationId: string,
    departmentId: string,
    input: Record<string, unknown>,
    locationIds: string[],
  ): Promise<DepartmentDetail> {
    const updated = await this.updateDepartment(organizationId, departmentId, input);
    for (const key of [...this.assignments.keys()]) {
      const assignment = this.assignments.get(key);
      if (assignment && assignment.departmentId === departmentId) {
        this.assignments.delete(key);
      }
    }
    for (const locationId of [...new Set(locationIds)]) {
      this.assignments.set(`${locationId}:${departmentId}`, { locationId, departmentId });
    }
    const detail = await this.getDepartmentDetail(organizationId, departmentId);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Department not found." });
    return { ...updated, locations: detail.locations, locationCount: detail.locationCount };
  }

  async setDepartmentActive(
    organizationId: string,
    departmentId: string,
    isActive: boolean,
  ): Promise<DepartmentDetail> {
    const department = this.departments.get(departmentId);
    if (!department || department.organizationId !== organizationId) {
      throw new AppError("NOT_FOUND", { message: "Department not found." });
    }
    department.isActive = isActive;
    department.updatedAt = new Date();
    const detail = await this.getDepartmentDetail(organizationId, departmentId);
    if (!detail) throw new AppError("NOT_FOUND", { message: "Department not found." });
    return detail;
  }

  async syncAssignments(
    organizationId: string,
    input: { locationId?: string; departmentId?: string; ids: string[] },
  ): Promise<{ assigned: number; removed: number }> {
    const hasLocation = Boolean(input.locationId);
    const hasDepartment = Boolean(input.departmentId);
    if (hasLocation === hasDepartment) {
      throw new AppError("VALIDATION_ERROR", {
        message: "Provide exactly one of locationId or departmentId.",
      });
    }
    const ids = [...new Set(input.ids)];
    let removed = 0;
    for (const [key, assignment] of [...this.assignments.entries()]) {
      const matches = hasLocation
        ? assignment.locationId === input.locationId &&
          this.locations.get(assignment.locationId)?.organizationId === organizationId
        : assignment.departmentId === input.departmentId &&
          this.departments.get(assignment.departmentId)?.organizationId === organizationId;
      if (matches) {
        this.assignments.delete(key);
        removed += 1;
      }
    }
    for (const id of ids) {
      const key = hasLocation ? `${input.locationId}:${id}` : `${id}:${input.departmentId}`;
      this.assignments.set(key, {
        locationId: hasLocation ? (input.locationId as string) : id,
        departmentId: hasLocation ? id : (input.departmentId as string),
      });
    }
    return { assigned: ids.length, removed };
  }

  async removeAssignment(
    organizationId: string,
    input: { locationId: string; departmentId: string },
  ): Promise<boolean> {
    const key = `${input.locationId}:${input.departmentId}`;
    const assignment = this.assignments.get(key);
    if (!assignment) return false;
    const location = this.locations.get(assignment.locationId);
    const department = this.departments.get(assignment.departmentId);
    if (location?.organizationId !== organizationId || department?.organizationId !== organizationId) {
      return false;
    }
    this.assignments.delete(key);
    return true;
  }
}

describe("Location & Department Domain", () => {
  it("normalizes codes to trimmed uppercase and names to single spaces", () => {
    assert.equal(normalizeEntityCode("  mum-hq "), "MUM-HQ");
    assert.equal(normalizeEntityCode("blr_01"), "BLR_01");
    assert.equal(normalizeEntityName("  Mumbai   HQ  "), "Mumbai HQ");
  });

  it("validates location input and normalizes codes", () => {
    const valid = locationSchema.safeParse({
      name: "Mumbai HQ",
      code: "mum-hq",
      email: "HQ@corp.com",
      phone: "1234567890",
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.code, "MUM-HQ");
      assert.equal(valid.data.email, "hq@corp.com");
      assert.equal(valid.data.name, "Mumbai HQ");
    }
  });

  it("rejects invalid location codes, emails, and names", () => {
    assert.equal(
      locationSchema.safeParse({ name: "A", code: "MUM-HQ" }).success,
      false,
    );
    assert.equal(
      locationSchema.safeParse({ name: "Mumbai HQ", code: "MUM HQ!" }).success,
      false,
    );
    assert.equal(
      locationSchema.safeParse({ name: "Mumbai HQ", code: "MH", email: "not-an-email" }).success,
      false,
    );
  });

  it("validates department input and rejects bad codes", () => {
    assert.equal(
      departmentSchema.safeParse({ name: "Engineering", code: "eng" }).success,
      true,
    );
    assert.equal(departmentSchema.safeParse({ name: "E", code: "ENG" }).success, false);
    assert.equal(
      departmentSchema.safeParse({ name: "Engineering", code: "E N G" }).success,
      false,
    );
  });
});

describe("Location & Department Use Cases", () => {
  let authRepo: FakeAuthorizationRepository;
  let orgRepo: FakeOrganizationRepository;
  let auditLog: FakeAuditLogger;

  const ownerId = "usr_owner";
  const engineerId = "usr_engineer";
  const userId = "usr_user";
  const orgA = "org_alpha";
  const orgB = "org_beta";

  beforeEach(() => {
    authRepo = new FakeAuthorizationRepository();
    orgRepo = new FakeOrganizationRepository();
    auditLog = new FakeAuditLogger();
    authRepo.organizations.set(orgA, { id: orgA, name: "Alpha", slug: "alpha" });
    authRepo.memberships.push(
      { id: "mem_owner", userId: ownerId, organizationId: orgA, role: "OWNER" },
      { id: "mem_eng", userId: engineerId, organizationId: orgA, role: "ENGINEER" },
      { id: "mem_user", userId: userId, organizationId: orgA, role: "USER" },
    );
  });

  const makeDeps = (currentUserId = ownerId, activeOrgId: string | null = orgA) => ({
    getSession: async () => ({
      userId: currentUserId,
      email: `${currentUserId}@x.test`,
      name: currentUserId,
      activeOrganizationId: activeOrgId,
    }),
    authorizationRepository: authRepo,
    organizationRepository: orgRepo,
    auditLog,
  });

  const createLocation = (overrides: Record<string, unknown> = {}) =>
    executeCreateLocation(
      {
        name: "Mumbai HQ",
        code: "MUM-HQ",
        city: "Mumbai",
        state: "Maharashtra",
        ...overrides,
      },
      makeDeps(),
    );

  const createDepartment = (overrides: Record<string, unknown> = {}) =>
    executeCreateDepartment(
      { name: "Engineering", code: "ENG", ...overrides },
      makeDeps(),
    );

  it("creates a location with normalized code and audits the event", async () => {
    const { location } = await createLocation({ code: "mum-hq" });
    assert.equal(location.code, "MUM-HQ");
    assert.equal(location.isDefault, false);
    assert.equal(location.isActive, true);
    assert.ok(
      auditLog.events.some(
        (event) => event.type === "LOCATION_CREATED" && event.targetResourceId === location.id,
      ),
    );
  });

  it("rejects duplicate location codes case-insensitively with a clear error", async () => {
    await createLocation({ code: "MUM-HQ" });
    await assert.rejects(
      createLocation({ name: "Other", code: "mum-hq" }),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "CONFLICT" &&
        /code/i.test(error.message),
    );
  });

  it("allows the same code in a different organization", async () => {
    authRepo.organizations.set(orgB, { id: orgB, name: "Beta", slug: "beta" });
    authRepo.memberships.push({ id: "mem_owner_b", userId: ownerId, organizationId: orgB, role: "OWNER" });
    await createLocation({ code: "MUM-HQ" });
    const other = await executeCreateLocation(
      { name: "Mumbai Beta", code: "MUM-HQ" },
      makeDeps(ownerId, orgB),
    );
    assert.equal(other.location.code, "MUM-HQ");
    assert.equal(other.location.organizationId, orgB);
  });

  it("transitions the default location atomically", async () => {
    const first = await createLocation({ code: "LOC-1", isDefault: true });
    assert.equal(first.location.isDefault, true);
    const second = await createLocation({ code: "LOC-2", isDefault: true });
    assert.equal(second.location.isDefault, true);
    const { location: reloaded } = await executeGetLocationDetail(
      { locationId: first.location.id },
      makeDeps(),
    );
    assert.equal(reloaded.isDefault, false);
  });

  it("rejects setting an inactive location as default", async () => {
    const { location } = await createLocation({ code: "LOC-1" });
    await executeSetLocationActive({ locationId: location.id, isActive: false }, makeDeps());
    await assert.rejects(
      executeSetDefaultLocation({ locationId: location.id }, makeDeps()),
      (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
    );
  });

  it("clears default status when deactivating the default location", async () => {
    const { location } = await createLocation({ code: "LOC-1", isDefault: true });
    const deactivated = await executeSetLocationActive(
      { locationId: location.id, isActive: false },
      makeDeps(),
    );
    assert.equal(deactivated.location.isActive, false);
    assert.equal(deactivated.location.isDefault, false);
    assert.ok(
      auditLog.events.some(
        (event) => event.type === "LOCATION_DEACTIVATED" && event.targetResourceId === location.id,
      ),
    );
  });

  it("preserves assignments across deactivation and reactivation", async () => {
    const { location } = await createLocation({ code: "LOC-1" });
    const { department } = await createDepartment({ code: "ENG" });
    await executeSyncLocationAssignments(
      { locationId: location.id, departmentIds: [department.id] },
      makeDeps(),
    );
    await executeSetLocationActive({ locationId: location.id, isActive: false }, makeDeps());
    const reactivated = await executeSetLocationActive(
      { locationId: location.id, isActive: true },
      makeDeps(),
    );
    assert.equal(reactivated.location.departmentCount, 1);
    assert.deepEqual(
      reactivated.location.departments.map((item) => item.id),
      [department.id],
    );
  });

  it("creates a department with initial assignments and rejects invalid locations", async () => {
    const { location } = await createLocation({ code: "LOC-1" });
    const created = await executeCreateDepartment(
      { name: "Engineering", code: "ENG", locationIds: [location.id] },
      makeDeps(),
    );
    assert.equal(created.department.locationCount, 1);

    await assert.rejects(
      executeCreateDepartment(
        { name: "Ghost", code: "GHOST", locationIds: ["loc_missing"] },
        makeDeps(),
      ),
      (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
    );
    const missing = await executeGetDepartmentDetail({ departmentId: "dep_missing" }, makeDeps()).catch(
      (error: unknown) => error,
    );
    assert.ok(missing instanceof AppError && missing.code === "NOT_FOUND");
  });

  it("rejects duplicate department codes and assigns many-to-many both ways", async () => {
    await createDepartment({ code: "ENG" });
    await assert.rejects(
      createDepartment({ name: "Other", code: "eng" }),
      (error: unknown) => error instanceof AppError && error.code === "CONFLICT",
    );

    const locA = await createLocation({ name: "Site Alpha", code: "LOC-A" });
    const locB = await createLocation({ name: "Site Beta", code: "LOC-B" });
    const dep = await createDepartment({ name: "Ops", code: "OPS" });

    const synced = await executeSyncLocationAssignments(
      { locationId: locA.location.id, departmentIds: [dep.department.id] },
      makeDeps(),
    );
    assert.deepEqual(synced, { assigned: 1, removed: 0 });

    await executeSyncDepartmentAssignments(
      { departmentId: dep.department.id, locationIds: [locA.location.id, locB.location.id] },
      makeDeps(),
    );
    const detail = await executeGetDepartmentDetail({ departmentId: dep.department.id }, makeDeps());
    assert.equal(detail.department.locationCount, 2);

    const removed = await executeRemoveAssignment(
      { locationId: locA.location.id, departmentId: dep.department.id },
      makeDeps(),
    );
    assert.equal(removed.removed, true);
    const reloaded = await executeGetLocationDetail({ locationId: locA.location.id }, makeDeps());
    assert.equal(reloaded.location.departmentCount, 0);
    // Neither side was deleted.
    assert.ok((await executeGetLocationDetail({ locationId: locB.location.id }, makeDeps())).location);
  });

  it("deduplicates repeated ids in assignment syncs", async () => {
    const loc = await createLocation({ code: "LOC-1" });
    const dep = await createDepartment({ code: "ENG" });
    const result = await executeSyncLocationAssignments(
      { locationId: loc.location.id, departmentIds: [dep.department.id, dep.department.id] },
      makeDeps(),
    );
    assert.deepEqual(result, { assigned: 1, removed: 0 });
  });

  it("rejects cross-organization assignment IDs", async () => {
    authRepo.organizations.set(orgB, { id: orgB, name: "Beta", slug: "beta" });
    authRepo.memberships.push({ id: "mem_owner_b", userId: ownerId, organizationId: orgB, role: "OWNER" });
    const foreign = await executeCreateLocation(
      { name: "Foreign", code: "FOR-1" },
      makeDeps(ownerId, orgB),
    );
    const dep = await createDepartment({ code: "ENG" });
    await assert.rejects(
      executeSyncDepartmentAssignments(
        { departmentId: dep.department.id, locationIds: [foreign.location.id] },
        makeDeps(),
      ),
      (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
    );
  });

  it("rejects inactive counterparts for new assignments", async () => {
    const loc = await createLocation({ code: "LOC-1" });
    const dep = await createDepartment({ code: "ENG" });
    await executeSetLocationActive({ locationId: loc.location.id, isActive: false }, makeDeps());
    await assert.rejects(
      executeSyncDepartmentAssignments(
        { departmentId: dep.department.id, locationIds: [loc.location.id] },
        makeDeps(),
      ),
      (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
    );
  });

  it("scopes listing, counts, and search to the active organization", async () => {
    authRepo.organizations.set(orgB, { id: orgB, name: "Beta", slug: "beta" });
    authRepo.memberships.push({ id: "mem_owner_b", userId: ownerId, organizationId: orgB, role: "OWNER" });
    await createLocation({ name: "Mumbai HQ", code: "MUM-HQ", city: "Mumbai" });
    await executeCreateLocation(
      { name: "Delhi Beta", code: "DEL-1", city: "Delhi" },
      makeDeps(ownerId, orgB),
    );

    const page = await executeListLocations({ search: "Mumbai", pageSize: 1 }, makeDeps());
    assert.equal(page.total, 1);
    assert.equal(page.items[0].code, "MUM-HQ");
    assert.equal(page.totalPages, 1);

    const other = await executeListLocations({}, makeDeps(ownerId, orgB));
    assert.equal(other.total, 1);
    assert.equal(other.items[0].code, "DEL-1");
  });

  it("lists departments with search, status filter, and tenant isolation", async () => {
    authRepo.organizations.set(orgB, { id: orgB, name: "Beta", slug: "beta" });
    authRepo.memberships.push({ id: "mem_owner_b", userId: ownerId, organizationId: orgB, role: "OWNER" });
    await createDepartment({ name: "Engineering", code: "ENG" });
    await createDepartment({ name: "Support", code: "SUP" });
    const searched = await executeListDepartments({ search: "eng" }, makeDeps());
    assert.equal(searched.total, 1);
    assert.equal(searched.items[0].code, "ENG");

    const dep = await createDepartment({ name: "Temp", code: "TMP" });
    await executeSetDepartmentActive(
      { departmentId: dep.department.id, isActive: false },
      makeDeps(),
    );
    const activeOnly = await executeListDepartments({ status: "active" }, makeDeps());
    assert.ok(activeOnly.items.every((item) => item.isActive));
    assert.equal(activeOnly.total, 2);

    const other = await executeListDepartments({}, makeDeps(ownerId, orgB));
    assert.equal(other.total, 0);
  });

  it("paginates and sorts deterministically", async () => {    await createLocation({ name: "Zulu", code: "Z-1" });
    await createLocation({ name: "Alpha", code: "A-1" });
    const first = await executeListLocations({ sortBy: "name", sortDirection: "asc", pageSize: 1, page: 1 }, makeDeps());
    const second = await executeListLocations({ sortBy: "name", sortDirection: "asc", pageSize: 1, page: 2 }, makeDeps());
    assert.equal(first.items[0].code, "A-1");
    assert.equal(second.items[0].code, "Z-1");
    assert.equal(first.total, 2);
  });

  it("denies management to ENGINEER/USER but allows reads", async () => {
    await assert.rejects(
      executeCreateLocation(
        { name: "Test Site", code: "X-1" },
        makeDeps(engineerId, orgA),
      ),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
    await assert.rejects(
      executeCreateDepartment({ name: "Test Dept", code: "X-1" }, makeDeps(userId, orgA)),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
    const readable = await executeListLocations({}, makeDeps(engineerId, orgA));
    assert.ok(Array.isArray(readable.items));
    await assert.rejects(
      executeSyncLocationAssignments({ locationId: "loc_x", departmentIds: [] }, makeDeps(userId, orgA)),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
  });

  it("rejects unauthenticated access and foreign detail IDs", async () => {
    await assert.rejects(
      executeListLocations(
        {},
        {
          getSession: async () => null,
          authorizationRepository: authRepo,
          organizationRepository: orgRepo,
          auditLog,
        },
      ),
      (error: unknown) => error instanceof AppError && error.code === "UNAUTHENTICATED",
    );
    const { location } = await createLocation({ code: "LOC-1" });
    await assert.rejects(
      executeGetLocationDetail({ locationId: location.id }, makeDeps(ownerId, orgB)),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
    await assert.rejects(
      executeUpdateLocation(
        { locationId: location.id, name: "Hijacked", code: "HIJ" },
        makeDeps(ownerId, orgB),
      ),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
  });

  it("ignores forged organizationId input and stays in the active tenant", async () => {
    const { location } = await executeCreateLocation(
      { name: "Mumbai HQ", code: "MUM-HQ", organizationId: orgB },
      makeDeps(),
    );
    assert.equal(location.organizationId, orgA);
  });

  it("updates departments with assignments atomically", async () => {
    const loc = await createLocation({ code: "LOC-1" });
    const dep = await createDepartment({ code: "ENG" });
    const updated = await executeUpdateDepartment(
      { departmentId: dep.department.id, name: "Engineering", code: "ENG", locationIds: [loc.location.id] },
      makeDeps(),
    );
    assert.equal(updated.department.locationCount, 1);
    assert.deepEqual(
      updated.department.locations.map((item) => item.id),
      [loc.location.id],
    );
  });

  it("updates location fields and rejects duplicate codes on update", async () => {
    const first = await createLocation({ name: "Old Name", code: "LOC-1" });
    const updated = await executeUpdateLocation(
      { locationId: first.location.id, name: "New Name", code: "LOC-1" },
      makeDeps(),
    );
    assert.equal(updated.location.name, "New Name");
    await createLocation({ name: "Other", code: "LOC-2" });
    await assert.rejects(
      executeUpdateLocation(
        { locationId: first.location.id, name: "New Name", code: "loc-2" },
        makeDeps(),
      ),
      (error: unknown) => error instanceof AppError && error.code === "CONFLICT",
    );
  });

  it("reads department detail and toggles department active status", async () => {
    const dep = await createDepartment({ code: "ENG", description: "Core team" });
    const detail = await executeGetDepartmentDetail({ departmentId: dep.department.id }, makeDeps());
    assert.equal(detail.department.description, "Core team");
    const deactivated = await executeSetDepartmentActive(
      { departmentId: dep.department.id, isActive: false },
      makeDeps(),
    );
    assert.equal(deactivated.department.isActive, false);
    const reactivated = await executeSetDepartmentActive(
      { departmentId: dep.department.id, isActive: true },
      makeDeps(),
    );
    assert.equal(reactivated.department.isActive, true);
  });
});

describe("Null active-organization sessions (regression)", () => {
  // Sessions without activeOrganizationId are legitimate (fresh logins).
  // Use cases must fall back to the caller's membership instead of
  // rejecting with a permission error. makeDeps(user, null) reproduces
  // the reported OWNER bug: "You don't have permission to access this
  // organization." on the Locations/Departments pages.
  let authRepo: FakeAuthorizationRepository;
  let orgRepo: FakeOrganizationRepository;
  let auditLog: FakeAuditLogger;

  const ownerId = "usr_owner";
  const adminId = "usr_admin";
  const engineerId = "usr_engineer";
  const userId = "usr_user";
  const outsiderId = "usr_outsider";
  const orgA = "org_alpha";
  const orgB = "org_beta";

  beforeEach(() => {
    authRepo = new FakeAuthorizationRepository();
    orgRepo = new FakeOrganizationRepository();
    auditLog = new FakeAuditLogger();
    authRepo.organizations.set(orgA, { id: orgA, name: "Alpha", slug: "alpha" });
    authRepo.organizations.set(orgB, { id: orgB, name: "Beta", slug: "beta" });
    authRepo.memberships.push(
      { id: "mem_owner", userId: ownerId, organizationId: orgA, role: "OWNER" },
      { id: "mem_admin", userId: adminId, organizationId: orgA, role: "ADMIN" },
      { id: "mem_eng", userId: engineerId, organizationId: orgA, role: "ENGINEER" },
      { id: "mem_user", userId: userId, organizationId: orgA, role: "USER" },
      { id: "mem_owner_b", userId: ownerId, organizationId: orgB, role: "OWNER" },
    );
  });

  const makeNullSessionDeps = (currentUserId: string) => ({
    getSession: async () => ({
      userId: currentUserId,
      email: `${currentUserId}@x.test`,
      name: currentUserId,
      activeOrganizationId: null,
    }),
    authorizationRepository: authRepo,
    organizationRepository: orgRepo,
    auditLog,
  });

  const seedOrgA = async () => {
    const seeded = makeNullSessionDeps(ownerId);
    const { location } = await executeCreateLocation(
      { name: "Mumbai HQ", code: "MUM-HQ" },
      seeded,
    );
    const { department } = await executeCreateDepartment(
      { name: "Engineering", code: "ENG" },
      seeded,
    );
    return { location, department };
  };

  it("lets an OWNER with no active organization list locations", async () => {
    await seedOrgA();
    const page = await executeListLocations({}, makeNullSessionDeps(ownerId));
    assert.equal(page.total, 1);
    assert.equal(page.items[0].code, "MUM-HQ");
  });

  it("lets an OWNER with no active organization list departments", async () => {
    await seedOrgA();
    const page = await executeListDepartments({}, makeNullSessionDeps(ownerId));
    assert.equal(page.total, 1);
    assert.equal(page.items[0].code, "ENG");
  });

  it("lets an OWNER with no active organization open both detail pages", async () => {
    const { location, department } = await seedOrgA();
    const deps = makeNullSessionDeps(ownerId);
    const locationDetail = await executeGetLocationDetail({ locationId: location.id }, deps);
    assert.equal(locationDetail.location.id, location.id);
    const departmentDetail = await executeGetDepartmentDetail(
      { departmentId: department.id },
      deps,
    );
    assert.equal(departmentDetail.department.id, department.id);
  });

  it("retains ADMIN management access with no active organization", async () => {
    const deps = makeNullSessionDeps(adminId);
    const { location } = await executeCreateLocation({ name: "Delhi", code: "DEL-1" }, deps);
    assert.equal(location.code, "DEL-1");
    const { department } = await executeCreateDepartment({ name: "Ops", code: "OPS" }, deps);
    assert.equal(department.code, "OPS");
    await executeSyncLocationAssignments(
      { locationId: location.id, departmentIds: [department.id] },
      deps,
    );
    const reloaded = await executeGetLocationDetail({ locationId: location.id }, deps);
    assert.equal(reloaded.location.departmentCount, 1);
  });

  it("gives ENGINEER and USER read access but no management without an active organization", async () => {
    await seedOrgA();
    const readable = await executeListLocations({}, makeNullSessionDeps(engineerId));
    assert.ok(Array.isArray(readable.items));
    const readableDepartments = await executeListDepartments({}, makeNullSessionDeps(userId));
    assert.ok(Array.isArray(readableDepartments.items));
    await assert.rejects(
      executeCreateLocation({ name: "Denied", code: "DEN-1" }, makeNullSessionDeps(engineerId)),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
    await assert.rejects(
      executeCreateDepartment({ name: "Denied", code: "DEN-1" }, makeNullSessionDeps(userId)),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
    await assert.rejects(
      executeSyncDepartmentAssignments(
        { departmentId: "dep_x", locationIds: [] },
        makeNullSessionDeps(userId),
      ),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
  });

  it("denies a user with no membership instead of crashing", async () => {
    await assert.rejects(
      executeListLocations({}, makeNullSessionDeps(outsiderId)),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
    await assert.rejects(
      executeListDepartments({}, makeNullSessionDeps(outsiderId)),
      (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN",
    );
  });

  it("blocks cross-tenant reads when the session has no active organization", async () => {
    const { location, department } = await seedOrgA();
    // Owner of orgB only (member of no other org in this session view).
    authRepo.memberships.push({ id: "mem_b_only", userId: outsiderId, organizationId: orgB, role: "USER" });
    const deps = makeNullSessionDeps(outsiderId);
    // Either denial is safe: FORBIDDEN reveals nothing, and NOT_FOUND is
    // indistinguishable from a non-existent id (no existence leak).
    await assert.rejects(
      executeGetLocationDetail({ locationId: location.id }, deps),
      (error: unknown) =>
        error instanceof AppError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND"),
    );
    await assert.rejects(
      executeGetDepartmentDetail({ departmentId: department.id }, deps),
      (error: unknown) =>
        error instanceof AppError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND"),
    );
    const page = await executeListLocations({}, deps);
    assert.equal(page.total, 0);
  });

  it("ignores forged organizationId input with a null active organization", async () => {
    const { location } = await executeCreateLocation(
      { name: "Mumbai HQ", code: "MUM-HQ", organizationId: orgB },
      makeNullSessionDeps(ownerId),
    );
    // Auto-select prefers the OWNER membership (orgA, seeded first).
    assert.equal(location.organizationId, orgA);
  });

  it("prefers the OWNER membership when auto-selecting across memberships", async () => {
    // userId is USER of orgA (listed first) and OWNER of orgB: auto-select
    // must pick the OWNER membership even though it sorts later.
    authRepo.memberships.push(
      { id: "mem_user_b_owner", userId: userId, organizationId: orgB, role: "OWNER" },
    );
    const { location } = await executeCreateLocation(
      { name: "Preferred", code: "PRF-1" },
      makeNullSessionDeps(userId),
    );
    assert.equal(location.organizationId, orgB);
  });
});

describe("Viewer role resolution (page role gating)", () => {
  // Regression: the locations/departments pages previously derived the
  // viewer role from getOrganizationProfileAction, which requires
  // organization.read and therefore threw FORBIDDEN for ENGINEER/USER
  // (production incident: pages unusable for non-managers). The viewer
  // role use case requires no management permission.
  let authRepo: FakeAuthorizationRepository;
  let orgRepo: FakeOrganizationRepository;
  let auditLog: FakeAuditLogger;

  const ownerId = "usr_owner";
  const adminId = "usr_admin";
  const engineerId = "usr_engineer";
  const userId = "usr_user";
  const outsiderId = "usr_outsider";
  const orgA = "org_alpha";

  beforeEach(() => {
    authRepo = new FakeAuthorizationRepository();
    orgRepo = new FakeOrganizationRepository();
    auditLog = new FakeAuditLogger();
    authRepo.organizations.set(orgA, { id: orgA, name: "Alpha", slug: "alpha" });
    authRepo.memberships.push(
      { id: "mem_owner", userId: ownerId, organizationId: orgA, role: "OWNER" },
      { id: "mem_admin", userId: adminId, organizationId: orgA, role: "ADMIN" },
      { id: "mem_eng", userId: engineerId, organizationId: orgA, role: "ENGINEER" },
      { id: "mem_user", userId: userId, organizationId: orgA, role: "USER" },
    );
  });

  const makeDeps = (currentUserId: string | null) => ({
    getSession: async () =>
      currentUserId === null
        ? null
        : {
            userId: currentUserId,
            email: `${currentUserId}@x.test`,
            name: currentUserId,
            activeOrganizationId: null,
          },
    authorizationRepository: authRepo,
    organizationRepository: orgRepo,
    auditLog,
  });

  it("returns the canonical role for every member role without management permission", async () => {
    for (const [memberId, expected] of [
      [ownerId, "OWNER"],
      [adminId, "ADMIN"],
      [engineerId, "ENGINEER"],
      [userId, "USER"],
    ] as const) {
      const result = await executeGetViewerRole({}, makeDeps(memberId));
      assert.equal(result.role, expected);
    }
  });

  it("rejects unauthenticated callers before returning any role", async () => {
    await assert.rejects(
      executeGetViewerRole({}, makeDeps(null)),
      (error: unknown) => error instanceof AppError && error.code === "UNAUTHENTICATED",
    );
  });

  it("falls back to a non-manager role for users without membership", async () => {
    const result = await executeGetViewerRole({}, makeDeps(outsiderId));
    assert.equal(result.role, "USER");
  });
});
