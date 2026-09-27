"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Loader2, LogOut, Shield } from "lucide-react";
import cn from "@/shared/utils/cn";
import { Avatar } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "@/shared/components/ui/toast";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "@/shared/components/ui/dropdown";
import { authClient } from "@/features/auth/presentation/auth-client";
import type {
  DashboardOrgViewModel,
  DashboardUserViewModel,
} from "../types";
import { getRoleBadgeVariant } from "../utils/role-formatter";

interface DashboardUserMenuProps {
  user: DashboardUserViewModel;
  activeOrganization: DashboardOrgViewModel | null;
  variant?: "header" | "sidebar";
  className?: string;
  triggerClassName?: string;
}

export const DashboardUserMenu = ({
  user,
  activeOrganization,
  variant = "header",
  className,
  triggerClassName,
}: DashboardUserMenuProps) => {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      toast.success("Signed Out", {
        description: "You have been safely signed out.",
        duration: 2000,
      });
      router.push("/auth");
    } catch {
      toast.error("Sign Out Failed", {
        description: "Unable to sign out. Please try again.",
      });
      setIsSigningOut(false);
    }
  };

  const displayName = user.name || user.email.split("@")[0] || "User";

  return (
    <Dropdown className={className}>
      <DropdownTrigger
        aria-label={`User menu for ${user.email}`}
        className={cn(
          variant === "header"
            ? "group flex items-center gap-2 rounded-lg p-1 text-xs text-foreground transition-all duration-150 outline-none select-none hover:bg-surface-elevated/70 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            : "group flex items-center gap-2 rounded-md p-1.5 text-xs text-foreground transition-all duration-150 outline-none select-none hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background cursor-pointer",
          triggerClassName,
        )}
      >
        <Avatar
          name={user.name}
          email={user.email}
          size="sm"
          shape={variant === "header" ? "circle" : "rounded"}
          className={cn(
            variant === "header" &&
              "h-8 w-8 rounded-full bg-primary text-primary-foreground border-transparent text-xs font-semibold shadow-xs",
          )}
        />
        <div className="hidden sm:flex flex-col text-left leading-none">
          <span className="truncate max-w-[120px] sm:max-w-[150px] font-semibold text-xs text-foreground leading-tight">
            {displayName}
          </span>
          <span className="text-[10px] text-muted leading-tight truncate capitalize">
            {user.roleLabel}
          </span>
        </div>
        <ChevronDown
          className="h-3.5 w-3.5 text-muted transition-transform group-hover:text-foreground ml-0.5 shrink-0"
          aria-hidden="true"
        />
      </DropdownTrigger>

      <DropdownContent
        align={variant === "header" ? "right" : "left"}
        className="w-72 p-1.5"
      >
        {/* User Identity Header */}
        <div className="flex items-start gap-3 p-2.5">
          <Avatar
            name={user.name}
            email={user.email}
            size="md"
            shape="circle"
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground border-transparent font-semibold shadow-xs shrink-0"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-xs font-semibold text-foreground tracking-tight">
              {displayName}
            </span>
            <span className="truncate text-[11px] text-muted-foreground mt-0.5">
              {user.email}
            </span>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <Badge
                size="sm"
                variant={getRoleBadgeVariant(user.platformRole ?? activeOrganization?.role)}
                className="text-[9px] px-1.5 py-0 font-medium"
              >
                {user.roleLabel}
              </Badge>
              {user.platformRole === "SUPERADMIN" && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  Platform
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Active Workspace Info */}
        {activeOrganization && (
          <>
            <DropdownSeparator />
            <div className="px-1 py-1">
              <div className="px-2.5 pt-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
                Active Workspace
              </div>
              <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-primary-muted/20 border border-primary/25 text-xs text-foreground transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/15 border border-primary/30 text-primary">
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <span className="truncate font-medium text-xs text-foreground">
                    {activeOrganization.name}
                  </span>
                </div>
                <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" aria-hidden="true" />
              </div>
            </div>
            <DropdownItem
              onClick={() => router.push("/organization")}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Organization Settings</span>
            </DropdownItem>
          </>
        )}

        <DropdownSeparator />

        {/* Action item: Sign Out */}
        <DropdownItem
          variant="danger"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          {isSigningOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
          ) : (
            <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
};
