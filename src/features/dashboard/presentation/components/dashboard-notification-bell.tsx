"use client";

import { Bell, CheckCheck } from "lucide-react";
import cn from "@/shared/utils/cn";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dropdown,
  DropdownContent,
  DropdownSeparator,
  DropdownTrigger,
} from "@/shared/components/ui/dropdown";

interface DashboardNotificationBellProps {
  className?: string;
}

/**
 * Dashboard notification bell action.
 * Composes the shared Dropdown primitive for focus management,
 * keyboard accessibility, and Toast/Card surface elevation.
 */
export const DashboardNotificationBell = ({
  className,
}: DashboardNotificationBellProps) => {
  return (
    <Dropdown className={className}>
      <DropdownTrigger
        aria-label="View notifications"
        className={cn(
          "group flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors select-none outline-none cursor-pointer",
          "hover:bg-surface-elevated/80 hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
      </DropdownTrigger>

      <DropdownContent align="right" className="w-72 sm:w-80 p-3">
        <div className="flex items-center justify-between pb-2.5">
          <span className="text-xs font-semibold text-foreground">Notifications</span>
          <Badge size="sm" variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
            0 unread
          </Badge>
        </div>

        <DropdownSeparator className="mb-3" />

        <div className="flex flex-col items-center justify-center py-5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2.5">
            <CheckCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-foreground">All caught up!</p>
          <p className="text-[11px] text-muted mt-1 max-w-[210px] leading-relaxed">
            You have no unread notifications or pending system alerts at this time.
          </p>
        </div>
      </DropdownContent>
    </Dropdown>
  );
};
