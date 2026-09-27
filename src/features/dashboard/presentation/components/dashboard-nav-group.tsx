"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Compass } from "lucide-react";
import cn from "@/shared/utils/cn";
import { hasActiveNavChild } from "@/features/auth/presentation/navigation/navigation";
import { DashboardNavItem } from "./dashboard-nav-item";
import type { DashboardNavItemViewModel } from "../types";

interface DashboardNavGroupProps {
  label: string;
  items: readonly DashboardNavItemViewModel[];
  onNavigate?: () => void;
  className?: string;
}

/**
 * Expandable parent navigation group. The header is a toggle control,
 * never a page link, so a parent can never carry selected-page styling:
 * only an exactly matching child (or landing) route is highlighted. The
 * group stays expanded whenever one of its children is active; users can
 * also expand or collapse it manually with mouse or keyboard.
 */
export const DashboardNavGroup = ({
  label,
  items,
  onNavigate,
  className,
}: DashboardNavGroupProps) => {
  const pathname = usePathname();
  const childActive = hasActiveNavChild(pathname, items);
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const expanded = manualOpen ?? childActive;

  return (
    <li className={className}>
      <button
        type="button"
        onClick={() => setManualOpen((open) => !(open ?? childActive))}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${label} submenu`}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 outline-none select-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          childActive ? "text-foreground" : "text-muted hover:bg-surface-elevated/60 hover:text-foreground",
        )}
      >
        <Compass
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            childActive && "text-primary",
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform duration-150", expanded && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <ul aria-label={`${label} submenu`} className="mt-1 space-y-1 pl-5">
          {items.map((child) => (
            <DashboardNavItem
              key={child.href}
              href={child.href}
              label={child.label}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
