// Organization domain entities (framework-independent).

import type { AddressType, OrganizationStatus, OrganizationType } from "../constants/organization-constants";

export interface OrganizationAddressEntity {
  id: string;
  organizationId: string;
  type: AddressType;
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

export interface OrganizationSettingsEntity {
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

export interface OrganizationProfileEntity {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  legalName: string | null;
  businessType: OrganizationType | string | null;
  industry: string | null;
  description: string | null;
  establishedDate: Date | null;
  website: string | null;
  contactEmail: string | null;
  phone: string | null;
  altPhone: string | null;
  status: OrganizationStatus | string;
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  businessIdentifier: string | null;
  createdAt: Date;
  updatedAt: Date;
  addresses: OrganizationAddressEntity[];
  settings: OrganizationSettingsEntity | null;
}

export interface ProfileChecklistItem {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  weight: number;
}

export interface ProfileCompletionResult {
  score: number; // 0 to 100
  level: "incomplete" | "in_progress" | "complete";
  checklist: ProfileChecklistItem[];
}
