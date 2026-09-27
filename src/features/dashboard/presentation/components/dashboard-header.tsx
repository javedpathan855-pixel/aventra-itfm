"use client";

import { useState } from "react";
import { Home, Menu } from "lucide-react";
import cn from "@/shared/utils/cn";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { DashboardOrganizationSwitcher } from "./dashboard-organization-switcher";
import { DashboardUserMenu } from "./dashboard-user-menu";
import { DashboardNotificationBell } from "./dashboard-notification-bell";
import { DashboardMobileNav } from "./dashboard-mobile-nav";
import type {
  DashboardNavItemViewModel,
  DashboardOrgViewModel,
  DashboardOrganizationItem,
  DashboardUserViewModel,
} from "../types";

interface DashboardHeaderProps {
  user: DashboardUserViewModel;
  activeOrganization: DashboardOrgViewModel | null;
  organizations: DashboardOrganizationItem[];
  navigationItems?: DashboardNavItemViewModel[];
  className?: string;
}

export const DashboardHeader = ({
  user,
  activeOrganization,
  organizations,
  navigationItems = [],
  className,
}: DashboardHeaderProps) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 w-full items-center justify-between bg-background shadow-card px-4 sm:px-6 select-none",
        className,
      )}
    >
      {/* Mobile Drawer Navigation Component */}
      <DashboardMobileNav
        user={user}
        activeOrganization={activeOrganization}
        organizations={organizations}
        navigationItems={navigationItems}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Left: Mobile hamburger trigger & Shared Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setIsMobileNavOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface-elevated/70 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Vertical divider - mobile only */}
        <div
          className="h-5 w-[1px] bg-border/40 mx-0.5 sm:mx-1 lg:hidden"
          aria-hidden="true"
        />

        {/* Shared Breadcrumb Component */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" aria-label="Dashboard Home">
                <Home className="h-4 w-4" aria-hidden="true" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: Organization Switcher, Notifications, Divider, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Organization Switcher (composes shared Dropdown) */}
        <DashboardOrganizationSwitcher
          activeOrganization={activeOrganization}
          organizations={organizations}
          variant="header"
        />

        {/* Notifications Action (composes shared Dropdown) */}
        <DashboardNotificationBell />

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-border mx-0.5" aria-hidden="true" />

        {/* User Profile (composes shared Dropdown) */}
        <DashboardUserMenu
          user={user}
          activeOrganization={activeOrganization}
          variant="header"
        />
      </div>
    </header>
  );
};
