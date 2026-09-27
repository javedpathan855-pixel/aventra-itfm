"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Compass } from "lucide-react";
import cn from "@/shared/utils/cn";

interface DashboardNavItemProps {
  href: string;
  label: string;
  onNavigate?: () => void;
  className?: string;
}

export const DashboardNavItem = ({
  href,
  label,
  onNavigate,
  className,
}: DashboardNavItemProps) => {
  const pathname = usePathname();

  // /dashboard is active only on exact match or subroutes; other routes match prefix
  const isActive =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  const isDashboardRoute =
    href === "/dashboard" || href.startsWith("/dashboard");

  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3  px-3 py-2 text-sm font-medium transition-all duration-150 outline-none select-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          isActive
            ? "bg-card-background text-foreground font-semibold border-l-2 border-primary pl-2.5 shadow-xs"
            : "text-muted hover:bg-surface-elevated/60 hover:text-foreground",
          className,
        )}
      >
        {isDashboardRoute ? (
          <LayoutDashboard
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isActive
                ? "text-primary"
                : "text-muted group-hover:text-foreground",
            )}
            aria-hidden="true"
          />
        ) : (
          <Compass
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isActive
                ? "text-primary"
                : "text-muted group-hover:text-foreground",
            )}
            aria-hidden="true"
          />
        )}
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
};
