// Organization repository port (contracts only — framework-independent).

import type {
  OrganizationAddressEntity,
  OrganizationProfileEntity,
  OrganizationSettingsEntity,
} from "../domain/entities/organization-profile";
import type {
  OrganizationAddressInput,
  OrganizationSettingsInput,
  UpdateGeneralProfileInput,
  UpdateLegalTaxInput,
} from "../domain/schemas/organization.schema";

export interface OrganizationRepository {
  /** Fetch complete organization profile scoped to tenant ID */
  getProfile(organizationId: string): Promise<OrganizationProfileEntity | null>;

  /** Update general identity information */
  updateGeneralProfile(
    organizationId: string,
    input: UpdateGeneralProfileInput,
  ): Promise<OrganizationProfileEntity>;

  /** Update business legal and tax identification details */
  updateLegalTax(
    organizationId: string,
    input: UpdateLegalTaxInput,
  ): Promise<OrganizationProfileEntity>;

  /** Update or clear organization logo URL */
  updateLogo(
    organizationId: string,
    logoUrl: string | null,
  ): Promise<OrganizationProfileEntity>;

  /** List all addresses scoped to the organization */
  listAddresses(organizationId: string): Promise<OrganizationAddressEntity[]>;

  /** Add a new address (handles default address atomic transition in tx) */
  createAddress(
    organizationId: string,
    input: OrganizationAddressInput,
  ): Promise<OrganizationAddressEntity>;

  /** Update an existing address scoped to organization */
  updateAddress(
    organizationId: string,
    addressId: string,
    input: OrganizationAddressInput,
  ): Promise<OrganizationAddressEntity>;

  /** Delete an address (scoped to organization) */
  deleteAddress(organizationId: string, addressId: string): Promise<boolean>;

  /** Set specified address as the default address for the organization */
  setDefaultAddress(
    organizationId: string,
    addressId: string,
  ): Promise<OrganizationAddressEntity>;

  /** Get or create default organization settings */
  getSettings(organizationId: string): Promise<OrganizationSettingsEntity>;

  /** Update organization settings (timezone, currency, formats) */
  updateSettings(
    organizationId: string,
    input: OrganizationSettingsInput,
  ): Promise<OrganizationSettingsEntity>;
}
