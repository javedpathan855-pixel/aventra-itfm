import type { DashboardShellProps } from "../types";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";

/**
 * Server-rendered dashboard shell.
 * Composition and layout owner only — delegates interactive navigation
 * to client boundary subcomponents without imposing "use client" on the whole page.
 */
export const DashboardShell = ({
  user,
  activeOrganization,
  organizations,
  navigationItems,
  children,
}: DashboardShellProps) => {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground antialiased">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3.5 focus:py-2 focus:text-xs focus:font-semibold focus:text-primary-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Persistent desktop sidebar (Server Component, hidden on mobile via CSS) */}
      <DashboardSidebar navigationItems={navigationItems} />

      {/* Main content shell with sticky header */}
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          user={user}
          activeOrganization={activeOrganization}
          organizations={organizations}
          navigationItems={navigationItems}
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
