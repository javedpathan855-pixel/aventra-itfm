import Link from "next/link";
import cn from "@/shared/utils/cn";
import { Badge } from "@/shared/components/ui/badge";
import { DashboardNavItem } from "./dashboard-nav-item";
import { DashboardFeatureCard } from "./dashboard-feature-card";
import type {
  DashboardNavItemViewModel,
  DashboardOrgViewModel,
  DashboardOrganizationItem,
  DashboardUserViewModel,
} from "../types";

interface DashboardSidebarProps {
  navigationItems: DashboardNavItemViewModel[];
  user?: DashboardUserViewModel;
  activeOrganization?: DashboardOrgViewModel | null;
  organizations?: DashboardOrganizationItem[];
  className?: string;
}

export const DashboardSidebar = ({
  navigationItems,
  className,
}: DashboardSidebarProps) => {
  return (
    <aside
      aria-label="Sidebar navigation"
      className={cn(
        "hidden lg:flex h-screen w-64 shrink-0 flex-col bg-background sticky top-0 select-none z-30 border-r border-border/40",
        className,
      )}
    >
      {/* Brand & Application Name */}
      <div className="flex h-16 items-center justify-between px-5 shrink-0 border-b border-border/30">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-extrabold text-sm shadow-xs">
            A
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-foreground leading-tight">
              Aventra
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted font-medium">
              ITFM Platform
            </span>
          </div>
        </Link>
        <Badge
          size="sm"
          variant="outline"
          className="text-[9px] px-1.5 py-0 text-muted border-border/60"
        >
          v1.0
        </Badge>
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Main Navigation"
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        <div className="space-y-4">
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Main
            </div>
            <ul className="space-y-1">
              {navigationItems.map((item) => (
                <DashboardNavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                />
              ))}
            </ul>
          </div>
        </div>
      </nav>

      {/* Footer: Premium Feature Card */}
      <div className="border-t border-border/40 p-3 shrink-0 bg-surface/30">
        <DashboardFeatureCard />
      </div>
    </aside>
  );
};
