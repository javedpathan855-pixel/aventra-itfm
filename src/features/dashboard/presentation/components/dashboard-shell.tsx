"use client";

import { useState } from "react";
import cn from "@/shared/utils/cn";
import type { DashboardShellProps } from "../types";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardMobileNav } from "./dashboard-mobile-nav";

export const DashboardShell = ({
  user,
  activeOrganization,
  organizations,
  navigationItems,
  children,
}: DashboardShellProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleToggleNav = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMobileNavOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground antialiased">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3.5 focus:py-2 focus:text-xs focus:font-semibold focus:text-primary-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Persistent desktop sidebar with collapse transition */}
      <DashboardSidebar
        user={user}
        activeOrganization={activeOrganization}
        organizations={organizations}
        navigationItems={navigationItems}
        className={cn(
          "transition-all duration-300 ease-in-out",
          isSidebarCollapsed && "lg:hidden",
        )}
      />

      {/* Mobile Drawer Navigation */}
      <DashboardMobileNav
        user={user}
        activeOrganization={activeOrganization}
        organizations={organizations}
        navigationItems={navigationItems}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main content shell with sticky header */}
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          user={user}
          activeOrganization={activeOrganization}
          organizations={organizations}
          navigationItems={navigationItems}
          onToggleNav={handleToggleNav}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 outline-none"
        >
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
