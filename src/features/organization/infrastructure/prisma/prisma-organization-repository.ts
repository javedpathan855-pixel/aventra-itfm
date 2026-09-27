import { getPrisma } from "@/shared/infrastructure/prisma";
import { AppError } from "@/shared/error/app-error";
import type {
  OrganizationAddressEntity,
  OrganizationProfileEntity,
  OrganizationSettingsEntity,
} from "../../domain/entities/organization-profile";
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
};
