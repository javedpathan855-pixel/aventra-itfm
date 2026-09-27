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
import type { LogoStorageService } from "../infrastructure/storage/logo-storage-service";
import type {
  OrganizationAddressEntity,
  OrganizationProfileEntity,
  OrganizationSettingsEntity,
} from "../domain/entities/organization-profile";
import { executeGetOrganizationProfile } from "../application/use-cases/get-organization-profile.use-case";
import { executeUpdateOrganizationProfile } from "../application/use-cases/update-organization-profile.use-case";
import { executeUpdateOrganizationLegal } from "../application/use-cases/update-organization-legal.use-case";
import {
  executeCreateAddress,
  executeUpdateAddress,
  executeDeleteAddress,
  executeSetDefaultAddress,
} from "../application/use-cases/manage-organization-address.use-case";
import { executeUpdateOrganizationSettings } from "../application/use-cases/update-organization-settings.use-case";
import {
  executeUploadOrganizationLogo,
  executeRemoveOrganizationLogo,
} from "../application/use-cases/manage-organization-logo.use-case";
import type {
  UpdateGeneralProfileInput,
  UpdateLegalTaxInput,
  OrganizationAddressInput,
  OrganizationSettingsInput,
} from "../domain/schemas/organization.schema";

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

class FakeLogoStorageService implements LogoStorageService {
  async processAndStoreLogo(dataUrl: string): Promise<string> {
    if (!dataUrl.startsWith("data:image/png;base64,") && !dataUrl.startsWith("data:image/jpeg;base64,")) {
      throw new AppError("VALIDATION_ERROR", { message: "Invalid image format" });
    }
    return dataUrl;
  }
}

class FakeOrganizationRepository implements OrganizationRepository {
  profiles = new Map<string, OrganizationProfileEntity>();
  addresses = new Map<string, OrganizationAddressEntity[]>();
  settings = new Map<string, OrganizationSettingsEntity>();

  async getProfile(organizationId: string): Promise<OrganizationProfileEntity | null> {
    const p = this.profiles.get(organizationId);
    if (!p) return null;
    return {
      ...p,
      addresses: this.addresses.get(organizationId) || [],
      settings: this.settings.get(organizationId) || null,
    };
  }

  async updateGeneralProfile(organizationId: string, input: UpdateGeneralProfileInput): Promise<OrganizationProfileEntity> {
    const existing = await this.getProfile(organizationId);
    if (!existing) throw new AppError("NOT_FOUND");
    const establishedDate = input.establishedDate ? new Date(input.establishedDate) : existing.establishedDate;
    const updated: OrganizationProfileEntity = {
      ...existing,
      ...input,
      establishedDate,
      updatedAt: new Date(),
    };
    this.profiles.set(organizationId, updated);
    return updated;
  }

  async updateLegalTax(organizationId: string, input: UpdateLegalTaxInput): Promise<OrganizationProfileEntity> {
    const existing = await this.getProfile(organizationId);
    if (!existing) throw new AppError("NOT_FOUND");
    const updated: OrganizationProfileEntity = { ...existing, ...input, updatedAt: new Date() };
    this.profiles.set(organizationId, updated);
    return updated;
  }

  async listAddresses(organizationId: string): Promise<OrganizationAddressEntity[]> {
    return this.addresses.get(organizationId) || [];
  }

  async createAddress(organizationId: string, input: OrganizationAddressInput): Promise<OrganizationAddressEntity> {
    const current = this.addresses.get(organizationId) || [];
    const isFirst = current.length === 0;
    const isDefault = Boolean(input.isDefault || isFirst);

    if (isDefault) {
      current.forEach((a) => (a.isDefault = false));
    }

    const newAddr: OrganizationAddressEntity = {
      id: `addr_${Date.now()}_${Math.random()}`,
      organizationId,
      type: input.type,
      label: input.label ?? null,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      landmark: input.landmark ?? null,
      city: input.city,
      district: input.district ?? null,
      state: input.state,
      stateCode: input.stateCode ?? null,
      country: input.country ?? "India",
      postalCode: input.postalCode,
      isDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    current.push(newAddr);
    this.addresses.set(organizationId, current);
    return newAddr;
  }

  async updateAddress(organizationId: string, addressId: string, input: OrganizationAddressInput): Promise<OrganizationAddressEntity> {
    const current = this.addresses.get(organizationId) || [];
    const idx = current.findIndex((a) => a.id === addressId);
    if (idx === -1) throw new AppError("NOT_FOUND");

    if (input.isDefault) {
      current.forEach((a) => (a.isDefault = false));
    }

    const existing = current[idx];
    const updated: OrganizationAddressEntity = {
      ...existing,
      type: input.type,
      label: input.label ?? null,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      landmark: input.landmark ?? null,
      city: input.city,
      district: input.district ?? null,
      state: input.state,
      stateCode: input.stateCode ?? null,
      country: input.country ?? "India",
      postalCode: input.postalCode,
      isDefault: input.isDefault ?? existing.isDefault,
      updatedAt: new Date(),
    };
    current[idx] = updated;
    this.addresses.set(organizationId, current);
    return updated;
  }

  async deleteAddress(organizationId: string, addressId: string): Promise<boolean> {
    const current = this.addresses.get(organizationId) || [];
    const target = current.find((a) => a.id === addressId);
    if (!target) throw new AppError("NOT_FOUND");

    const filtered = current.filter((a) => a.id !== addressId);
    if (target.isDefault && filtered.length > 0) {
      filtered[0].isDefault = true;
    }
    this.addresses.set(organizationId, filtered);
    return true;
  }

  async setDefaultAddress(organizationId: string, addressId: string): Promise<OrganizationAddressEntity> {
    const current = this.addresses.get(organizationId) || [];
    const target = current.find((a) => a.id === addressId);
    if (!target) throw new AppError("NOT_FOUND");

    current.forEach((a) => {
      a.isDefault = a.id === addressId;
    });
    this.addresses.set(organizationId, current);
    return { ...target, isDefault: true };
  }

  async getSettings(organizationId: string): Promise<OrganizationSettingsEntity> {
    const s = this.settings.get(organizationId);
    if (s) return s;
    const def: OrganizationSettingsEntity = {
      id: `set_${organizationId}`,
      organizationId,
      displayName: null,
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12h",
      currency: "INR",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.settings.set(organizationId, def);
    return def;
  }

  async updateSettings(organizationId: string, input: OrganizationSettingsInput): Promise<OrganizationSettingsEntity> {    const newSettings: OrganizationSettingsEntity = {
      id: `set_${organizationId}`,
      organizationId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.settings.set(organizationId, newSettings);
    return newSettings;
  }

  async updateLogo(organizationId: string, logoUrl: string | null): Promise<OrganizationProfileEntity> {
    const existing = await this.getProfile(organizationId);
    if (!existing) throw new AppError("NOT_FOUND");
    const updated = { ...existing, logo: logoUrl, updatedAt: new Date() };
    this.profiles.set(organizationId, updated);
    return updated;
  }

  // Location/department port surface is covered by dedicated fakes in
  // organization-locations-departments.test.ts; these stubs keep this
  // legacy fake structurally complete without duplicating behavior.
  async listLocations(): Promise<never> { throw new Error("not implemented"); }
  async getLocationDetail(): Promise<never> { throw new Error("not implemented"); }
  async createLocation(): Promise<never> { throw new Error("not implemented"); }
  async updateLocation(): Promise<never> { throw new Error("not implemented"); }
  async setLocationActive(): Promise<never> { throw new Error("not implemented"); }
  async setDefaultLocation(): Promise<never> { throw new Error("not implemented"); }
  async listDepartments(): Promise<never> { throw new Error("not implemented"); }
  async getDepartmentDetail(): Promise<never> { throw new Error("not implemented"); }
  async createDepartment(): Promise<never> { throw new Error("not implemented"); }
  async updateDepartment(): Promise<never> { throw new Error("not implemented"); }
  async updateDepartmentWithAssignments(): Promise<never> { throw new Error("not implemented"); }
  async setDepartmentActive(): Promise<never> { throw new Error("not implemented"); }
  async syncAssignments(): Promise<never> { throw new Error("not implemented"); }
  async removeAssignment(): Promise<never> { throw new Error("not implemented"); }
}

describe("Organization Application Layer — Use Cases", () => {
  let authRepo: FakeAuthorizationRepository;
  let orgRepo: FakeOrganizationRepository;
  let auditLog: FakeAuditLogger;
  let logoStorage: FakeLogoStorageService;

  const userOwner = { id: "usr_owner", email: "owner@corp.com", name: "Alice Owner" };
  const userMember = { id: "usr_member", email: "member@corp.com", name: "Bob Member" };
  const activeOrg = { id: "org_alpha", name: "Alpha Corp", slug: "alpha-corp" };

  beforeEach(() => {
    authRepo = new FakeAuthorizationRepository();
    orgRepo = new FakeOrganizationRepository();
    auditLog = new FakeAuditLogger();
    logoStorage = new FakeLogoStorageService();

    authRepo.organizations.set(activeOrg.id, activeOrg);
    authRepo.memberships.push({
      id: "mem_1",
      userId: userOwner.id,
      organizationId: activeOrg.id,
      role: "OWNER",
    });

    orgRepo.profiles.set(activeOrg.id, {
      id: activeOrg.id,
      name: activeOrg.name,
      slug: activeOrg.slug,
      legalName: null,
      businessType: null,
      industry: null,
      description: null,
      website: null,
      contactEmail: null,
      phone: null,
      altPhone: null,
      establishedDate: null,
      logo: null,
      status: "active",
      gstin: null,
      pan: null,
      cin: null,
      businessIdentifier: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      addresses: [],
      settings: null,
    });
  });

  const makeDeps = (currentUserId = userOwner.id, activeOrgId: string | null = activeOrg.id) => ({
    getSession: async () => ({
      userId: currentUserId,
      email: `${currentUserId}@x.test`,
      name: currentUserId,
      activeOrganizationId: activeOrgId,
    }),
    authorizationRepository: authRepo,
    organizationRepository: orgRepo,
    logoStorageService: logoStorage,
    auditLog,
  });

  describe("executeGetOrganizationProfile", () => {
    it("returns profile, settings and readiness score for authorized member", async () => {
      const deps = makeDeps();
      const result = await executeGetOrganizationProfile({ autoSelectDefault: true }, deps);

      assert.equal(result.profile.id, activeOrg.id);
      assert.equal(result.profile.name, "Alpha Corp");
      assert.equal(result.role, "OWNER");
      assert.ok(result.completion);
      assert.equal(typeof result.completion.score, "number");
    });

    it("rejects unauthenticated caller", async () => {
      const deps = {
        ...makeDeps(),
        getSession: async () => null,
      };

      await assert.rejects(
        () => executeGetOrganizationProfile({ autoSelectDefault: true }, deps),
        (err: AppError) => err.code === "UNAUTHENTICATED",
      );
    });

    it("rejects caller who has no membership in the active organization", async () => {
      const deps = makeDeps("usr_stranger");

      await assert.rejects(
        () => executeGetOrganizationProfile({ autoSelectDefault: true }, deps),
        (err: AppError) => err.code === "FORBIDDEN",
      );
    });
  });

  describe("executeUpdateOrganizationProfile", () => {
    it("updates general organization details and logs audit event", async () => {
      const deps = makeDeps();
      const result = await executeUpdateOrganizationProfile(
        {
          name: "Alpha Corp Global",
          legalName: "Alpha Corporation Private Limited",
          businessType: "Private Limited",
          contactEmail: "admin@alphacorp.com",
          phone: "+91 9876543210",
        },
        deps,
      );

      assert.equal(result.profile.name, "Alpha Corp Global");
      assert.equal(result.profile.legalName, "Alpha Corporation Private Limited");
      assert.equal(result.profile.businessType, "Private Limited");
      assert.equal(result.profile.contactEmail, "admin@alphacorp.com");

      // Verify audit event
      const event = auditLog.events.find((e) => e.type === "ORGANIZATION_PROFILE_UPDATED");
      assert.ok(event);
      assert.equal(event?.organizationId, activeOrg.id);
    });

    it("rejects update when input violates validation rules", async () => {
      const deps = makeDeps();

      await assert.rejects(
        () =>
          executeUpdateOrganizationProfile(
            {
              name: "A", // too short (min 2)
            },
            deps,
          ),
        (err: AppError) => err.code === "VALIDATION_ERROR",
      );
    });

    it("rejects member without organization.update permission", async () => {
      authRepo.memberships.push({
        id: "mem_user_1",
        userId: userMember.id,
        organizationId: activeOrg.id,
        role: "USER",
      });

      const deps = makeDeps(userMember.id);
      await assert.rejects(
        () => executeUpdateOrganizationProfile({ name: "Renamed Org" }, deps),
        (err: AppError) => err.code === "FORBIDDEN",
      );
    });
  });

  describe("executeUpdateOrganizationLegal", () => {
    it("updates valid GSTIN, PAN, and CIN and records audit event", async () => {
      const deps = makeDeps();
      const result = await executeUpdateOrganizationLegal(
        {
          gstin: "27ABCDE1234F1Z5",
          pan: "ABCDE1234F",
          cin: "U12345MH2020PTC123456",
        },
        deps,
      );

      assert.equal(result.profile.gstin, "27ABCDE1234F1Z5");
      assert.equal(result.profile.pan, "ABCDE1234F");
      assert.equal(result.profile.cin, "U12345MH2020PTC123456");

      const event = auditLog.events.find((e) => e.type === "ORGANIZATION_LEGAL_UPDATED");
      assert.ok(event);
    });

    it("rejects invalid GSTIN format", async () => {
      const deps = makeDeps();

      await assert.rejects(
        () =>
          executeUpdateOrganizationLegal(
            {
              gstin: "MALFORMED_GSTIN",
            },
            deps,
          ),
        (err: AppError) => err.code === "VALIDATION_ERROR",
      );
    });
  });

  describe("Organization Address Management", () => {
    it("creates address and enforces default address rules", async () => {
      const deps = makeDeps();

      // First address becomes default automatically
      const res1 = await executeCreateAddress(
        {
          type: "registered",
          addressLine1: "123 Tech Park",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          postalCode: "400001",
        },
        deps,
      );

      assert.equal(res1.address.isDefault, true);
      assert.equal(res1.addresses.length, 1);

      // Second address created without isDefault stays non-default
      const res2 = await executeCreateAddress(
        {
          type: "branch",
          addressLine1: "456 Silicon Towers",
          city: "Bengaluru",
          state: "Karnataka",
          country: "India",
          postalCode: "560001",
          isDefault: false,
        },
        deps,
      );

      assert.equal(res2.address.isDefault, false);
      assert.equal(res2.addresses.length, 2);

      // Now set second address as default
      const res3 = await executeSetDefaultAddress(
        { addressId: res2.address.id },
        deps,
      );

      const addr1 = res3.addresses.find((a) => a.id === res1.address.id);
      const addr2 = res3.addresses.find((a) => a.id === res2.address.id);
      assert.equal(addr1?.isDefault, false);
      assert.equal(addr2?.isDefault, true);
    });

    it("updates existing address safely", async () => {
      const deps = makeDeps();
      const created = await executeCreateAddress(
        {
          type: "registered",
          addressLine1: "Old Street 1",
          city: "Pune",
          state: "Maharashtra",
          country: "India",
          postalCode: "411001",
        },
        deps,
      );

      const updated = await executeUpdateAddress(
        {
          id: created.address.id,
          type: "registered",
          addressLine1: "New Street 99",
          city: "Pune",
          state: "Maharashtra",
          country: "India",
          postalCode: "411001",
        },
        deps,
      );

      assert.equal(updated.address.addressLine1, "New Street 99");
    });

    it("deleting default address automatically promotes another address as default", async () => {
      const deps = makeDeps();

      const addr1 = await executeCreateAddress(
        {
          type: "registered",
          addressLine1: "Headquarters",
          city: "Delhi",
          state: "Delhi",
          country: "India",
          postalCode: "110001",
          isDefault: true,
        },
        deps,
      );

      const addr2 = await executeCreateAddress(
        {
          type: "operational",
          addressLine1: "Branch Office",
          city: "Noida",
          state: "Uttar Pradesh",
          country: "India",
          postalCode: "201301",
          isDefault: false,
        },
        deps,
      );

      const res = await executeDeleteAddress({ addressId: addr1.address.id }, deps);
      assert.equal(res.addresses.length, 1);
      assert.equal(res.addresses[0].id, addr2.address.id);
      assert.equal(res.addresses[0].isDefault, true);
    });
  });

  describe("Organization Settings", () => {
    it("updates regional and system preferences", async () => {
      const deps = makeDeps();
      const res = await executeUpdateOrganizationSettings(
        {
          displayName: "Alpha Global",
          timezone: "Asia/Kolkata",
          locale: "en-IN",
          dateFormat: "DD/MM/YYYY",
          timeFormat: "24h",
          currency: "INR",
        },
        deps,
      );

      assert.equal(res.settings.displayName, "Alpha Global");
      assert.equal(res.settings.timeFormat, "24h");
      assert.equal(res.settings.currency, "INR");
    });
  });

  describe("Organization Logo & Branding", () => {
    it("uploads and sets brand logo", async () => {
      const deps = makeDeps();
      const res = await executeUploadOrganizationLogo(
        {
          dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
        },
        deps,
      );

      assert.equal(res.profile.logo, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA");
      const event = auditLog.events.find((e) => e.type === "ORGANIZATION_LOGO_CHANGED");
      assert.ok(event);
    });

    it("removes organization logo", async () => {
      const deps = makeDeps();
      await executeUploadOrganizationLogo(
        { dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA" },
        deps,
      );

      const res = await executeRemoveOrganizationLogo({}, deps);
      assert.equal(res.profile.logo, null);
    });
  });

  describe("Null active-organization sessions (OWNER update regression)", () => {
    // Sessions without activeOrganizationId are legitimate (fresh logins).
    // Mutations must fall back to the caller's membership via
    // autoSelectDefault instead of rejecting with a permission error.
    // makeDeps(user, null) reproduces the reported OWNER bug:
    // "You don't have permission to access this organization."
    it("lets an OWNER with no active organization update general profile fields", async () => {
      const deps = makeDeps(userOwner.id, null);
      const result = await executeUpdateOrganizationProfile(
        { name: "Alpha Corp Global" },
        deps,
      );
      assert.equal(result.profile.name, "Alpha Corp Global");
      assert.ok(
        auditLog.events.some(
          (event) =>
            event.type === "ORGANIZATION_PROFILE_UPDATED" &&
            event.organizationId === activeOrg.id,
        ),
      );
    });

    it("lets an OWNER with no active organization update legal and tax details", async () => {
      const deps = makeDeps(userOwner.id, null);
      const result = await executeUpdateOrganizationLegal(
        {
          gstin: "27ABCDE1234F1Z5",
          pan: "ABCDE1234F",
          cin: "U12345MH2020PTC123456",
        },
        deps,
      );
      assert.equal(result.profile.gstin, "27ABCDE1234F1Z5");
    });

    it("lets an OWNER with no active organization update settings", async () => {
      const deps = makeDeps(userOwner.id, null);
      const result = await executeUpdateOrganizationSettings(
        {
          displayName: "Alpha Global",
          timezone: "Asia/Kolkata",
          locale: "en-IN",
          dateFormat: "DD/MM/YYYY",
          timeFormat: "24h",
          currency: "INR",
        },
        deps,
      );
      assert.equal(result.settings.displayName, "Alpha Global");
    });

    it("lets an OWNER with no active organization manage addresses", async () => {
      const deps = makeDeps(userOwner.id, null);
      const created = await executeCreateAddress(
        {
          type: "registered",
          addressLine1: "123 Tech Park",
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          postalCode: "400001",
        },
        deps,
      );
      assert.equal(created.address.city, "Mumbai");
    });

    it("lets an OWNER with no active organization manage the logo", async () => {
      const deps = makeDeps(userOwner.id, null);
      const result = await executeUploadOrganizationLogo(
        { dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA" },
        deps,
      );
      assert.equal(
        result.profile.logo,
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
      );
    });

    it("retains ADMIN update behavior with no active organization", async () => {
      authRepo.memberships.push({
        id: "mem_admin_1",
        userId: userMember.id,
        organizationId: activeOrg.id,
        role: "ADMIN",
      });
      const deps = makeDeps(userMember.id, null);
      const result = await executeUpdateOrganizationProfile(
        { name: "Alpha Admin Rename" },
        deps,
      );
      assert.equal(result.profile.name, "Alpha Admin Rename");
    });

    it("keeps ENGINEER and USER restricted with no active organization", async () => {
      authRepo.memberships.push({
        id: "mem_user_1",
        userId: userMember.id,
        organizationId: activeOrg.id,
        role: "USER",
      });
      const deps = makeDeps(userMember.id, null);
      await assert.rejects(
        () => executeUpdateOrganizationProfile({ name: "Hijacked" }, deps),
        (err: AppError) => err.code === "FORBIDDEN",
      );
    });

    it("rejects unauthenticated update requests", async () => {
      const deps = {
        ...makeDeps(userOwner.id, null),
        getSession: async () => null,
      };
      await assert.rejects(
        () => executeUpdateOrganizationProfile({ name: "Hijacked" }, deps),
        (err: AppError) => err.code === "UNAUTHENTICATED",
      );
    });

    it("denies updates for users without membership in any organization", async () => {
      const deps = makeDeps("usr_stranger", null);
      await assert.rejects(
        () => executeUpdateOrganizationProfile({ name: "Hijacked" }, deps),
        (err: AppError) => err.code === "FORBIDDEN",
      );
    });

    it("still rejects invalid input with a null active organization", async () => {
      const deps = makeDeps(userOwner.id, null);
      await assert.rejects(
        () => executeUpdateOrganizationProfile({ name: "A" }, deps),
        (err: AppError) => err.code === "VALIDATION_ERROR",
      );
    });

    it("persists update results instead of returning stale data", async () => {
      const deps = makeDeps(userOwner.id, null);
      const first = await executeUpdateOrganizationProfile(
        { name: "First Rename" },
        deps,
      );
      assert.equal(first.profile.name, "First Rename");
      const second = await executeUpdateOrganizationProfile(
        { name: "Second Rename" },
        deps,
      );
      assert.equal(second.profile.name, "Second Rename");
      const stored = await orgRepo.getProfile(activeOrg.id);
      assert.equal(stored?.name, "Second Rename");
    });
  });
});
