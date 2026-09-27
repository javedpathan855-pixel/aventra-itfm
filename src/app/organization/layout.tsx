import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppError } from "@/shared/error/app-error";
import {
  NAVIGATION,
  filterNavigation,
} from "@/features/auth/presentation/navigation/navigation";
import { DashboardShell } from "@/features/dashboard/presentation/components";
import { formatRoleLabel } from "@/features/dashboard/presentation/utils/role-formatter";
import { getDashboardServerContext } from "@/app/dashboard/loaders";

interface OrganizationLayoutProps {
  children: ReactNode;
}

/**
 * Protected organization shell (server-only).
 * Integrates into the unified dashboard shell with sidebar, header, and switcher.
 */
const OrganizationLayout = async ({ children }: OrganizationLayoutProps) => {
  let serverData;
  try {
    serverData = await getDashboardServerContext();
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
      redirect("/auth");
    }
    throw error;
  }

  const { context, organizations } = serverData;

  const navigationItems = filterNavigation(NAVIGATION, {
    organizationRole: context.organizationRole,
    platformRole: context.platformRole,
  });

  const activeOrganization =
    context.organization && context.organizationRole
      ? {
          id: context.organization.id,
          name: context.organization.name,
          slug: context.organization.slug,
          role: context.organizationRole,
          roleLabel: formatRoleLabel(context.organizationRole),
        }
      : null;

  const organizationItems = organizations.map((org) => ({
    ...org,
    roleLabel: formatRoleLabel(org.role),
  }));

  const user = {
    id: context.userId,
    name: context.name,
    email: context.email,
    platformRole: context.platformRole,
    roleLabel:
      context.platformRole === "SUPERADMIN"
        ? "Super Admin"
        : formatRoleLabel(context.organizationRole) || "User",
  };

  return (
    <DashboardShell
      user={user}
      activeOrganization={activeOrganization}
      organizations={organizationItems}
      navigationItems={navigationItems}
    >
      {children}
    </DashboardShell>
  );
};

export default OrganizationLayout;
