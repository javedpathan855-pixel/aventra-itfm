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
  children?: readonly DashboardNavItemViewModel[];
}

export interface DashboardShellProps {
  user: DashboardUserViewModel;
  activeOrganization: DashboardOrgViewModel | null;
  organizations: DashboardOrganizationItem[];
  navigationItems: DashboardNavItemViewModel[];
  children?: ReactNode;
  /**
   * Override for the main content container. Defaults to the centered
   * constrained layout; sections needing the full content width (e.g.
   * organization management) pass "w-full".
   */
  contentClassName?: string;
}
