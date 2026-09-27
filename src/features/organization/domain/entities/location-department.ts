// Location & department domain entities (framework-independent).

export interface LocationEntity {
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

export interface DepartmentEntity {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationDepartmentAssignmentEntity {
  id: string;
  organizationId: string;
  locationId: string;
  departmentId: string;
  createdAt: Date;
}

export interface LocationWithDepartmentCount extends LocationEntity {
  departmentCount: number;
}

export interface DepartmentWithLocationCount extends DepartmentEntity {
  locationCount: number;
}

export interface LocationDetail extends LocationEntity {
  departments: DepartmentEntity[];
  departmentCount: number;
}

export interface DepartmentDetail extends DepartmentEntity {
  locations: LocationEntity[];
  locationCount: number;
}

export type LocationStatusFilter = "all" | "active" | "inactive";
export type LocationSortField = "name" | "code" | "city" | "createdAt";
export type DepartmentSortField = "name" | "code" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface LocationListQuery {
  search?: string;
  status?: LocationStatusFilter;
  defaultOnly?: boolean;
  sortBy?: LocationSortField;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface DepartmentListQuery {
  search?: string;
  status?: LocationStatusFilter;
  sortBy?: DepartmentSortField;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
