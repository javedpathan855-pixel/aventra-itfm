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

interface AssetsLayoutProps {
  children: ReactNode;
}

/**
 * Protected assets shell (server-only).
 * Mirrors the organization shell: unified dashboard frame with sidebar,
 * header, switcher and full-width content. Navigation visibility derives
 * from asset permissions; every operation still enforces its own.
 */
const AssetsLayout = async ({ children }: AssetsLayoutProps) => {
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
      contentClassName="w-full"
    >
      {children}
    </DashboardShell>
  );
};

export default AssetsLayout;
