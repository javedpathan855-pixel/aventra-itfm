"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, ChevronsUpDown, Loader2 } from "lucide-react";
import cn from "@/shared/utils/cn";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "@/shared/components/ui/toast";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/shared/components/ui/dropdown";
import { switchOrganizationAction } from "@/app/dashboard/actions";
import type {
  DashboardOrgViewModel,
  DashboardOrganizationItem,
} from "../types";
import { getRoleBadgeVariant } from "../utils/role-formatter";

interface DashboardOrganizationSwitcherProps {
  activeOrganization: DashboardOrgViewModel | null;
  organizations: DashboardOrganizationItem[];
  variant?: "header" | "sidebar";
  className?: string;
  triggerClassName?: string;
}

export const DashboardOrganizationSwitcher = ({
  activeOrganization,
  organizations,
  variant = "header",
  className,
  triggerClassName,
}: DashboardOrganizationSwitcherProps) => {
  const router = useRouter();
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (organizationId: string) => {
    if (organizationId === activeOrganization?.id) {
      return;
    }

    setPendingOrgId(organizationId);
    startTransition(async () => {
      try {
        const result = await switchOrganizationAction({ organizationId });
        if (result.ok) {
          toast.success("Workspace Switched", {
            description: `Now viewing ${result.name}`,
            duration: 2500,
          });
          router.refresh();
        } else {
          toast.error("Switch Failed", {
            description: "Unable to switch workspace. Please try again.",
          });
        }
      } catch {
        toast.error("Error", {
          description: "An unexpected error occurred while switching workspace.",
        });
      } finally {
        setPendingOrgId(null);
      }
    });
  };

  const displayName = activeOrganization?.name || "Select Workspace";

  return (
    <Dropdown className={className}>
      <DropdownTrigger
        aria-label={`Current workspace: ${displayName}. Click to switch workspace.`}
        className={cn(
          variant === "header"
            ? "group flex items-center gap-2.5 rounded-lg border border-border/80 bg-surface/50 hover:bg-surface-elevated hover:border-border-strong px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            : "group flex items-center justify-between gap-2.5 rounded-md border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-150 outline-none select-none hover:border-border-strong hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background cursor-pointer",
          triggerClassName,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 border border-primary/20 text-primary">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          {variant === "header" ? (
            <span className="truncate max-w-[120px] sm:max-w-[180px] font-medium text-xs text-foreground tracking-tight">
              {displayName}
            </span>
          ) : (
            <div className="flex flex-col text-left min-w-0">
              <span className="truncate max-w-[130px] sm:max-w-[170px] font-semibold text-foreground">
                {displayName}
              </span>
              {activeOrganization && (
                <span className="text-[10px] text-muted truncate">
                  {activeOrganization.roleLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {variant === "header" ? (
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-hover:text-foreground ml-0.5"
            aria-hidden="true"
          />
        ) : (
          <ChevronsUpDown
            className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-hover:text-foreground"
            aria-hidden="true"
          />
        )}
      </DropdownTrigger>

      <DropdownContent
        align={variant === "header" ? "right" : "left"}
        className="w-68 sm:w-72 p-1.5"
      >
        <DropdownLabel>
          Workspaces ({organizations.length})
        </DropdownLabel>
        <DropdownSeparator />

        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
          {organizations.length === 0 ? (
            <div className="px-2.5 py-3 text-xs text-muted text-center select-none">
              No workspaces available
            </div>
          ) : (
            organizations.map((org) => {
              const isActive = org.active;
              const isItemPending = isPending && pendingOrgId === org.organizationId;

              return (
                <DropdownItem
                  key={org.organizationId}
                  disabled={isPending}
                  onClick={() => handleSelect(org.organizationId)}
                  className={cn(
                    "justify-between py-2 px-2.5 rounded-lg",
                    isActive
                      ? "bg-primary-muted/20 text-foreground font-medium border border-primary/25"
                      : "hover:bg-surface-muted/60 text-foreground/80 hover:text-foreground",
                    isPending && "pointer-events-none opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded",
                        isActive
                          ? "bg-primary/15 border border-primary/30 text-primary"
                          : "bg-surface-elevated/80 border border-border-subtle text-muted",
                      )}
                    >
                      <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium text-xs">{org.name}</span>
                      <span className="text-[10px] text-muted truncate">
                        {org.roleLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      size="sm"
                      variant={getRoleBadgeVariant(org.role)}
                      className="text-[9px] px-1.5 py-0 font-medium"
                    >
                      {org.roleLabel}
                    </Badge>
                    {isItemPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      isActive && (
                        <Check
                          className="h-3.5 w-3.5 text-primary"
                          aria-hidden="true"
                        />
                      )
                    )}
                  </div>
                </DropdownItem>
              );
            })
          )}
        </div>
      </DropdownContent>
    </Dropdown>
  );
};
