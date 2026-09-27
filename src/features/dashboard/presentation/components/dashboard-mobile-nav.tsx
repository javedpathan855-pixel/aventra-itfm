"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import cn from "@/shared/utils/cn";
import { DashboardNavItem } from "./dashboard-nav-item";
import { DashboardOrganizationSwitcher } from "./dashboard-organization-switcher";
import { DashboardUserMenu } from "./dashboard-user-menu";
import type {
  DashboardNavItemViewModel,
  DashboardOrgViewModel,
  DashboardOrganizationItem,
  DashboardUserViewModel,
} from "../types";

interface DashboardMobileNavProps {
  user: DashboardUserViewModel;
  activeOrganization: DashboardOrgViewModel | null;
  organizations: DashboardOrganizationItem[];
  navigationItems: DashboardNavItemViewModel[];
  isOpen?: boolean;
  onClose?: () => void;
}

export const DashboardMobileNav = ({
  user,
  activeOrganization,
  organizations,
  navigationItems,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: DashboardMobileNavProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setInternalIsOpen(false);
      triggerRef.current?.focus();
    }
  }, [isControlled, controlledOnClose]);

  // Lock body scroll when open and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  return (
    <div className="lg:hidden">
      {/* Menu trigger button (rendered only when uncontrolled) */}
      {!isControlled && (
        <button
          ref={triggerRef}
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation-drawer"
          onClick={() => setInternalIsOpen(true)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors select-none outline-none",
            "hover:bg-surface-elevated hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          )}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      {/* Drawer & Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div
            ref={drawerRef}
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-card animate-in slide-in-from-left duration-200"
          >
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between border-b border-border px-4 shrink-0">
              <Link
                href="/dashboard"
                onClick={handleClose}
                className="flex items-center gap-2.5 outline-none"
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

              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close navigation menu"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-elevated hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Workspace Context Switcher */}
            <div className="border-b border-border-subtle p-3 shrink-0">
              <DashboardOrganizationSwitcher
                activeOrganization={activeOrganization}
                organizations={organizations}
                className="w-full"
                triggerClassName="w-full"
              />
            </div>

            {/* Navigation items */}
            <nav aria-label="Mobile Navigation" className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-4">
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Main
                  </div>
                  <ul className="space-y-1">
                    {navigationItems.map((item) => (
                      <DashboardNavItem
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        onNavigate={handleClose}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </nav>

            {/* Footer Profile & Actions */}
            <div className="border-t border-border p-3 shrink-0 bg-surface/60">
              <DashboardUserMenu
                user={user}
                activeOrganization={activeOrganization}
                className="w-full"
                triggerClassName="w-full justify-between"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
