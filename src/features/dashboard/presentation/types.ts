import type { ReactNode } from "react";
import type { PlatformRole } from "@/features/auth/domain/authorization/roles";

export interface DashboardUserViewModel {
  id: string;
  email: string;
  name?: string | null;
  platformRole: PlatformRole | null;
  roleLabel: string;
}

export interface DashboardOrgViewModel {
  id: string;
  name: string;
  slug: string;
  role: string;
  roleLabel: string;
}

export interface DashboardOrganizationItem {
  organizationId: string;
  name: string;
  slug: string;
  role: string;
  roleLabel: string;
  active: boolean;
}

export interface DashboardNavItemViewModel {
  label: string;
  href: string;
}

export interface DashboardShellProps {
  user: DashboardUserViewModel;
  activeOrganization: DashboardOrgViewModel | null;
  organizations: DashboardOrganizationItem[];
  navigationItems: DashboardNavItemViewModel[];
  children: ReactNode;
}
