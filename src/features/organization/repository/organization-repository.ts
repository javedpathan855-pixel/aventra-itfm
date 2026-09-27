// Organization repository port (contracts only — framework-independent).

import type {
  OrganizationAddressEntity,
  OrganizationProfileEntity,
  OrganizationSettingsEntity,
} from "../domain/entities/organization-profile";
import type {
  DepartmentDetail,
  DepartmentListQuery,
  DepartmentWithLocationCount,
  LocationDetail,
  LocationListQuery,
  LocationWithDepartmentCount,
  PaginatedResult,
} from "../domain/entities/location-department";
import type {
  DepartmentInput,
  LocationInput,
} from "../domain/schemas/location.schema";
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

  /** List locations scoped to the organization with search, filters, and pagination */
  listLocations(
    organizationId: string,
    query: LocationListQuery,
  ): Promise<PaginatedResult<LocationWithDepartmentCount>>;

  /** Get a single location with its assigned departments (scoped to organization) */
  getLocationDetail(organizationId: string, locationId: string): Promise<LocationDetail | null>;

  /** Create a location (handles default-location atomic transition in tx) */
  createLocation(
    organizationId: string,
    input: LocationInput,
  ): Promise<LocationDetail>;

  /** Update a location scoped to organization (handles default transition in tx) */
  updateLocation(
    organizationId: string,
    locationId: string,
    input: LocationInput,
  ): Promise<LocationDetail>;

  /** Activate or deactivate a location; deactivating the default clears default status in tx */
  setLocationActive(
    organizationId: string,
    locationId: string,
    isActive: boolean,
  ): Promise<LocationDetail>;

  /** Set the default location, unsetting the previous default atomically */
  setDefaultLocation(organizationId: string, locationId: string): Promise<LocationDetail>;

  /** List departments scoped to the organization with search, filters, and pagination */
  listDepartments(
    organizationId: string,
    query: DepartmentListQuery,
  ): Promise<PaginatedResult<DepartmentWithLocationCount>>;

  /** Get a single department with its assigned locations (scoped to organization) */
  getDepartmentDetail(
    organizationId: string,
    departmentId: string,
  ): Promise<DepartmentDetail | null>;

  /** Create a department, optionally with an initial location assignment set */
  createDepartment(
    organizationId: string,
    input: DepartmentInput,
    locationIds?: string[],
  ): Promise<DepartmentDetail>;

  /** Update a department scoped to organization */
  updateDepartment(
    organizationId: string,
    departmentId: string,
    input: DepartmentInput,
  ): Promise<DepartmentDetail>;

  /**
   * Update department fields and replace its location assignment set in a
   * single transaction. Used by the department edit flow so field edits
   * and assignment edits never partially apply.
   */
  updateDepartmentWithAssignments(
    organizationId: string,
    departmentId: string,
    input: DepartmentInput,
    locationIds: string[],
  ): Promise<DepartmentDetail>;

  /** Activate or deactivate a department (assignments are preserved) */
  setDepartmentActive(
    organizationId: string,
    departmentId: string,
    isActive: boolean,
  ): Promise<DepartmentDetail>;

  /**
   * Replace the assignment set for one side of the relationship.
   * Exactly one of locationId / departmentId must be provided; the ids
   * array holds the counterpart IDs. Validated and applied atomically —
   * removing an assignment never deletes the location or department.
   */
  syncAssignments(
    organizationId: string,
    input: { locationId?: string; departmentId?: string; ids: string[] },
  ): Promise<{ assigned: number; removed: number }>;

  /** Remove a single assignment without deleting either side */
  removeAssignment(
    organizationId: string,
    input: { locationId: string; departmentId: string },
  ): Promise<boolean>;
}
