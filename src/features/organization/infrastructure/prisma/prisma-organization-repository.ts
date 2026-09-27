import { getPrisma } from "@/shared/infrastructure/prisma";
import { AppError } from "@/shared/error/app-error";
import type {
  OrganizationAddressEntity,
  OrganizationProfileEntity,
  OrganizationSettingsEntity,
} from "../../domain/entities/organization-profile";
import type {
  DepartmentEntity,
  LocationEntity,
} from "../../domain/entities/location-department";
import type { OrganizationRepository } from "../../repository/organization-repository";
import type {
  UpdateGeneralProfileInput,
  UpdateLegalTaxInput,
} from "../../domain/schemas/organization.schema";
import type { AddressType } from "../../domain/constants/organization-constants";

interface RawAddress {
  id: string;
  organizationId: string;
  type: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  district: string | null;
  state: string;
  stateCode: string | null;
  country: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RawSettings {
  id: string;
  organizationId: string;
  displayName: string | null;
  timezone: string;
  locale: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const mapAddress = (raw: RawAddress): OrganizationAddressEntity => ({
  id: raw.id,
  organizationId: raw.organizationId,
  type: raw.type as AddressType,
  label: raw.label,
  addressLine1: raw.addressLine1,
  addressLine2: raw.addressLine2,
  landmark: raw.landmark,
  city: raw.city,
  district: raw.district,
  state: raw.state,
  stateCode: raw.stateCode,
  country: raw.country,
  postalCode: raw.postalCode,
  isDefault: raw.isDefault,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const mapSettings = (raw: RawSettings): OrganizationSettingsEntity => ({
  id: raw.id,
  organizationId: raw.organizationId,
  displayName: raw.displayName,
  timezone: raw.timezone,
  locale: raw.locale,
  dateFormat: raw.dateFormat,
  timeFormat: raw.timeFormat,
  currency: raw.currency,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const mapProfile = (raw: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  legalName: string | null;
  businessType: string | null;
  industry: string | null;
  description: string | null;
  establishedDate: Date | null;
  website: string | null;
  contactEmail: string | null;
  phone: string | null;
  altPhone: string | null;
  status: string | null;
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  businessIdentifier: string | null;
  createdAt: Date;
  updatedAt: Date;
  addresses?: RawAddress[];
  settings?: RawSettings | null;
}): OrganizationProfileEntity => ({
  id: raw.id,
  name: raw.name,
  slug: raw.slug,
  logo: raw.logo,
  legalName: raw.legalName,
  businessType: raw.businessType,
  industry: raw.industry,
  description: raw.description,
  establishedDate: raw.establishedDate,
  website: raw.website,
  contactEmail: raw.contactEmail,
  phone: raw.phone,
  altPhone: raw.altPhone,
  status: raw.status || "active",
  gstin: raw.gstin,
  pan: raw.pan,
  cin: raw.cin,
  businessIdentifier: raw.businessIdentifier,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  addresses: (raw.addresses || []).map(mapAddress),
  settings: raw.settings ? mapSettings(raw.settings) : null,
});

interface RawLocation {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  timezone: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RawDepartment {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mapLocation = (raw: RawLocation): LocationEntity => ({
  id: raw.id,
  organizationId: raw.organizationId,
  name: raw.name,
  code: raw.code,
  description: raw.description,
  email: raw.email,
  phone: raw.phone,
  addressLine1: raw.addressLine1,
  addressLine2: raw.addressLine2,
  city: raw.city,
  state: raw.state,
  postalCode: raw.postalCode,
  country: raw.country,
  timezone: raw.timezone,
  isDefault: raw.isDefault,
  isActive: raw.isActive,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const mapDepartment = (raw: RawDepartment): DepartmentEntity => ({
  id: raw.id,
  organizationId: raw.organizationId,
  name: raw.name,
  code: raw.code,
  description: raw.description,
  isActive: raw.isActive,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

type TransactionClient = Parameters<Parameters<ReturnType<typeof getPrisma>["$transaction"]>[0]>[0];

const assertUniqueLocationCode = async (
  tx: TransactionClient,
  organizationId: string,
  code: string,
  excludeId: string | null,
): Promise<void> => {
  const existing = await tx.location.findFirst({
    where: {
      organizationId,
      code,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("CONFLICT", { message: "A location with this code already exists." });
  }
};

const assertUniqueDepartmentCode = async (
  tx: TransactionClient,
  organizationId: string,
  code: string,
  excludeId: string | null,
): Promise<void> => {
  const existing = await tx.department.findFirst({
    where: {
      organizationId,
      code,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("CONFLICT", { message: "A department with this code already exists." });
  }
};

export const prismaOrganizationRepository: OrganizationRepository = {
  getProfile: async (organizationId) => {
    const org = await getPrisma().organization.findUnique({
      where: { id: organizationId },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
        settings: true,
      },
    });
    return org ? mapProfile(org) : null;
  },

  updateGeneralProfile: async (organizationId, input: UpdateGeneralProfileInput) => {
    const updated = await getPrisma().organization.update({
      where: { id: organizationId },
      data: {
        name: input.name,
        legalName: input.legalName,
        businessType: input.businessType,
        industry: input.industry,
        description: input.description,
        establishedDate: input.establishedDate ? new Date(input.establishedDate) : null,
        website: input.website,
        contactEmail: input.contactEmail,
        phone: input.phone,
        altPhone: input.altPhone,
      },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
        settings: true,
      },
    });
    return mapProfile(updated);
  },

  updateLegalTax: async (organizationId, input: UpdateLegalTaxInput) => {
    const updated = await getPrisma().organization.update({
      where: { id: organizationId },
      data: {
        gstin: input.gstin,
        pan: input.pan,
        cin: input.cin,
        businessIdentifier: input.businessIdentifier,
      },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
        settings: true,
      },
    });
    return mapProfile(updated);
  },

  updateLogo: async (organizationId, logoUrl) => {
    const updated = await getPrisma().organization.update({
      where: { id: organizationId },
      data: { logo: logoUrl },
      include: {
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
        settings: true,
      },
    });
    return mapProfile(updated);
  },

  listAddresses: async (organizationId) => {
    const rows = await getPrisma().organizationAddress.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(mapAddress);
  },

  createAddress: async (organizationId, input) => {
    return getPrisma().$transaction(async (tx) => {
      const count = await tx.organizationAddress.count({
        where: { organizationId },
      });

      // If this is the only address, or marked isDefault, set others to false
      const shouldBeDefault = input.isDefault || count === 0;

      if (shouldBeDefault) {
        await tx.organizationAddress.updateMany({
          where: { organizationId },
          data: { isDefault: false },
        });
      }

      const created = await tx.organizationAddress.create({
        data: {
          organizationId,
          type: input.type,
          label: input.label,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          landmark: input.landmark,
          city: input.city,
          district: input.district,
          state: input.state,
          stateCode: input.stateCode,
          country: input.country,
          postalCode: input.postalCode,
          isDefault: shouldBeDefault,
        },
      });

      return mapAddress(created);
    });
  },

  updateAddress: async (organizationId, addressId, input) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.organizationAddress.findFirst({
        where: { id: addressId, organizationId },
      });
      if (!existing) {
        throw new AppError("NOT_FOUND", { message: "Address not found." });
      }

      if (input.isDefault) {
        await tx.organizationAddress.updateMany({
          where: { organizationId },
          data: { isDefault: false },
        });
      }

      const updated = await tx.organizationAddress.update({
        where: { id: addressId },
        data: {
          type: input.type,
          label: input.label,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          landmark: input.landmark,
          city: input.city,
          district: input.district,
          state: input.state,
          stateCode: input.stateCode,
          country: input.country,
          postalCode: input.postalCode,
          isDefault: input.isDefault,
        },
      });

      return mapAddress(updated);
    });
  },

  deleteAddress: async (organizationId, addressId) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.organizationAddress.findFirst({
        where: { id: addressId, organizationId },
      });
      if (!existing) {
        throw new AppError("NOT_FOUND", { message: "Address not found." });
      }

      await tx.organizationAddress.delete({
        where: { id: addressId },
      });

      // If the deleted address was default, promote another address to default
      if (existing.isDefault) {
        const nextAddress = await tx.organizationAddress.findFirst({
          where: { organizationId },
          orderBy: { createdAt: "asc" },
        });
        if (nextAddress) {
          await tx.organizationAddress.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }

      return true;
    });
  },

  setDefaultAddress: async (organizationId, addressId) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.organizationAddress.findFirst({
        where: { id: addressId, organizationId },
      });
      if (!existing) {
        throw new AppError("NOT_FOUND", { message: "Address not found." });
      }

      await tx.organizationAddress.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });

      const updated = await tx.organizationAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      return mapAddress(updated);
    });
  },

  getSettings: async (organizationId) => {
    const settings = await getPrisma().organizationSettings.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });
    return mapSettings(settings);
  },

  updateSettings: async (organizationId, input) => {
    const updated = await getPrisma().organizationSettings.upsert({
      where: { organizationId },
      update: {
        displayName: input.displayName,
        timezone: input.timezone,
        locale: input.locale,
        dateFormat: input.dateFormat,
        timeFormat: input.timeFormat,
        currency: input.currency,
      },
      create: {
        organizationId,
        displayName: input.displayName,
        timezone: input.timezone,
        locale: input.locale,
        dateFormat: input.dateFormat,
        timeFormat: input.timeFormat,
        currency: input.currency,
      },
    });
    return mapSettings(updated);
  },

  listLocations: async (organizationId, query) => {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      organizationId,
      ...(query.status && query.status !== "all" ? { isActive: query.status === "active" } : {}),
      ...(query.defaultOnly ? { isDefault: true } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { code: { contains: query.search, mode: "insensitive" as const } },
              { city: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const sortField = query.sortBy ?? "name";
    const orderBy =
      sortField === "city"
        ? [{ city: query.sortDirection ?? "asc" } as const, { name: "asc" } as const]
        : sortField === "code"
          ? [{ code: query.sortDirection ?? "asc" } as const]
          : sortField === "createdAt"
            ? [{ createdAt: query.sortDirection ?? "asc" } as const]
            : [{ name: query.sortDirection ?? "asc" } as const];
    const [total, rows] = await Promise.all([
      getPrisma().location.count({ where }),
      getPrisma().location.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { assignments: true } } },
      }),
    ]);
    return {
      items: rows.map((row) => ({ ...mapLocation(row), departmentCount: row._count.assignments })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  getLocationDetail: async (organizationId, locationId) => {
    const row = await getPrisma().location.findFirst({
      where: { id: locationId, organizationId },
      include: { assignments: { include: { department: true } } },
    });
    if (!row) return null;
    const departments = row.assignments.map((assignment) => mapDepartment(assignment.department));
    return { ...mapLocation(row), departments, departmentCount: departments.length };
  },

  createLocation: async (organizationId, input) => {
    return getPrisma().$transaction(async (tx) => {
      await assertUniqueLocationCode(tx, organizationId, input.code, null);
      if (input.isDefault) {
        await tx.location.updateMany({ where: { organizationId }, data: { isDefault: false } });
      }
      const created = await tx.location.create({
        data: { organizationId, ...input },
      });
      return { ...mapLocation(created), departments: [], departmentCount: 0 };
    });
  },

  updateLocation: async (organizationId, locationId, input) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.location.findFirst({ where: { id: locationId, organizationId } });
      if (!existing) {
        throw new AppError("NOT_FOUND", { message: "Location not found." });
      }
      await assertUniqueLocationCode(tx, organizationId, input.code, locationId);
      if (input.isDefault) {
        await tx.location.updateMany({ where: { organizationId }, data: { isDefault: false } });
      }
      const updated = await tx.location.update({
        where: { id: existing.id },
        data: { ...input },
        include: { assignments: { include: { department: true } } },
      });
      const departments = updated.assignments.map((assignment) => mapDepartment(assignment.department));
      return { ...mapLocation(updated), departments, departmentCount: departments.length };
    });
  },

  setLocationActive: async (organizationId, locationId, isActive) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.location.findFirst({ where: { id: locationId, organizationId } });
      if (!existing) {
        throw new AppError("NOT_FOUND", { message: "Location not found." });
      }
      // Deactivating the default clears default status in the same
      // transaction — assignments are preserved untouched.
      const updated = await tx.location.update({
        where: { id: existing.id },
        data: { isActive, ...(isActive ? {} : { isDefault: false }) },
        include: { assignments: { include: { department: true } } },
      });
      const departments = updated.assignments.map((assignment) => mapDepartment(assignment.department));
      return { ...mapLocation(updated), departments, departmentCount: departments.length };
    });
  },

  setDefaultLocation: async (organizationId, locationId) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.location.findFirst({ where: { id: locationId, organizationId } });
      if (!existing) {
        throw new AppError("NOT_FOUND", { message: "Location not found." });
      }
      await tx.location.updateMany({ where: { organizationId }, data: { isDefault: false } });
      const updated = await tx.location.update({
        where: { id: existing.id },
        data: { isDefault: true },
        include: { assignments: { include: { department: true } } },
      });
      const departments = updated.assignments.map((assignment) => mapDepartment(assignment.department));
      return { ...mapLocation(updated), departments, departmentCount: departments.length };
    });
  },

  listDepartments: async (organizationId, query) => {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      organizationId,
      ...(query.status && query.status !== "all" ? { isActive: query.status === "active" } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { code: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const sortField = query.sortBy ?? "name";
    const orderBy =
      sortField === "code"
        ? [{ code: query.sortDirection ?? "asc" } as const]
        : sortField === "createdAt"
          ? [{ createdAt: query.sortDirection ?? "asc" } as const]
          : [{ name: query.sortDirection ?? "asc" } as const];
    const [total, rows] = await Promise.all([
      getPrisma().department.count({ where }),
      getPrisma().department.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { assignments: true } } },
      }),
    ]);
    return {
      items: rows.map((row) => ({ ...mapDepartment(row), locationCount: row._count.assignments })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  getDepartmentDetail: async (organizationId, departmentId) => {
    const row = await getPrisma().department.findFirst({
      where: { id: departmentId, organizationId },
      include: { assignments: { include: { location: true } } },
    });
    if (!row) return null;
    const locations = row.assignments.map((assignment) => mapLocation(assignment.location));
    return { ...mapDepartment(row), locations, locationCount: locations.length };
  },

  createDepartment: async (organizationId, input, locationIds = []) => {
    return getPrisma().$transaction(async (tx) => {
      await assertUniqueDepartmentCode(tx, organizationId, input.code, null);
      const created = await tx.department.create({
        data: { organizationId, ...input },
      });
      if (locationIds.length > 0) {
        await tx.locationDepartment.createMany({
          data: [...new Set(locationIds)].map((locationId) => ({
            organizationId,
            locationId,
            departmentId: created.id,
          })),
          skipDuplicates: true,
        });
      }
      const locations = await tx.location.findMany({
        where: {
          id: { in: [...new Set(locationIds)] },
          organizationId,
        },
      });
      return { ...mapDepartment(created), locations: locations.map(mapLocation), locationCount: locations.length };
    });
  },

  updateDepartment: async (organizationId, departmentId, input) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.department.findFirst({ where: { id: departmentId, organizationId } });
      if (!existing) {
        throw new AppError("NOT_FOUND", { message: "Department not found." });
      }
      await assertUniqueDepartmentCode(tx, organizationId, input.code, departmentId);
      const updated = await tx.department.update({
        where: { id: existing.id },
        data: { ...input },
        include: { assignments: { include: { location: true } } },
      });
      const locations = updated.assignments.map((assignment) => mapLocation(assignment.location));
      return { ...mapDepartment(updated), locations, locationCount: locations.length };
    });
  },

  updateDepartmentWithAssignments: async (organizationId, departmentId, input, locationIds) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.department.findFirst({ where: { id: departmentId, organizationId } });
      if (!existing) {
        throw new AppError("NOT_FOUND", { message: "Department not found." });
      }
      await assertUniqueDepartmentCode(tx, organizationId, input.code, departmentId);
      const updated = await tx.department.update({
        where: { id: existing.id },
        data: { ...input },
      });
      const uniqueIds = [...new Set(locationIds)];
      await tx.locationDepartment.deleteMany({ where: { organizationId, departmentId: existing.id } });
      if (uniqueIds.length > 0) {
        await tx.locationDepartment.createMany({
          data: uniqueIds.map((locationId) => ({
            organizationId,
            locationId,
            departmentId: existing.id,
          })),
          skipDuplicates: true,
        });
      }
      const locations = await tx.location.findMany({
        where: { id: { in: uniqueIds }, organizationId },
      });
      return { ...mapDepartment(updated), locations: locations.map(mapLocation), locationCount: locations.length };
    });
  },

  setDepartmentActive: async (organizationId, departmentId, isActive) => {
    return getPrisma().$transaction(async (tx) => {
      const existing = await tx.department.findFirst({ where: { id: departmentId, organizationId } });
      if (!existing) {
        throw new AppError("NOT_FOUND", { message: "Department not found." });
      }
      // Assignments are preserved across deactivation cycles.
      const updated = await tx.department.update({
        where: { id: existing.id },
        data: { isActive },
        include: { assignments: { include: { location: true } } },
      });
      const locations = updated.assignments.map((assignment) => mapLocation(assignment.location));
      return { ...mapDepartment(updated), locations, locationCount: locations.length };
    });
  },

  syncAssignments: async (organizationId, input) => {
    const hasLocation = typeof input.locationId === "string" && input.locationId.length > 0;
    const hasDepartment = typeof input.departmentId === "string" && input.departmentId.length > 0;
    if (hasLocation === hasDepartment) {
      throw new AppError("VALIDATION_ERROR", {
        message: "Provide exactly one of locationId or departmentId.",
      });
    }
    return getPrisma().$transaction(async (tx) => {
      const ids = [...new Set(input.ids)];
      if (hasLocation) {
        const removed = await tx.locationDepartment.deleteMany({
          where: { organizationId, locationId: input.locationId as string },
        });
        if (ids.length > 0) {
          await tx.locationDepartment.createMany({
            data: ids.map((departmentId) => ({
              organizationId,
              locationId: input.locationId as string,
              departmentId,
            })),
            skipDuplicates: true,
          });
        }
        return { assigned: ids.length, removed: removed.count };
      }
      const removed = await tx.locationDepartment.deleteMany({
        where: { organizationId, departmentId: input.departmentId as string },
      });
      if (ids.length > 0) {
        await tx.locationDepartment.createMany({
          data: ids.map((locationId) => ({
            organizationId,
            locationId,
            departmentId: input.departmentId as string,
          })),
          skipDuplicates: true,
        });
      }
      return { assigned: ids.length, removed: removed.count };
    });
  },

  removeAssignment: async (organizationId, input) => {
    const removed = await getPrisma().locationDepartment.deleteMany({
      where: {
        organizationId,
        locationId: input.locationId,
        departmentId: input.departmentId,
      },
    });
    return removed.count > 0;
  },
};
