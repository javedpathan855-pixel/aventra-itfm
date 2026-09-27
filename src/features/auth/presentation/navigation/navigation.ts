// Centralized navigation definition (presentation — UX only).
//
// Visibility is derived from permissions, but hiding an item never
// authorizes anything: every protected server operation enforces its own
// permission independently. Only routes that exist are listed — future
// pages (Members, Settings, …) add their entries with their routes.

import type {
  OrganizationPermission,
  PlatformPermission,
} from "../../domain/authorization/permissions";
import {
  hasOrganizationPermission,
  hasPlatformPermission,
} from "../../domain/authorization/permissions";
import type {
  OrganizationRole,
  PlatformRole,
} from "../../domain/authorization/roles";

type NavigationPermission =
  | { scope: "organization"; permission: OrganizationPermission }
  | { scope: "platform"; permission: PlatformPermission };

interface NavigationItem {
  label: string;
  href: string;
  /** Null = visible to any authenticated user. */
  permission: NavigationPermission | null;
}

interface NavigationContext {
  organizationRole: OrganizationRole | null;
  platformRole: PlatformRole | null;
}

const NAVIGATION: readonly NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", permission: null },
  {
    label: "Organization",
    href: "/organization",
    permission: { scope: "organization", permission: "organization.read" },
  },
];

/** Filter navigation items by already-resolved roles. Pure. */
const filterNavigation = (
  items: readonly NavigationItem[],
  context: NavigationContext,
): NavigationItem[] =>
  items.filter((item) => {
    if (item.permission === null) return true;
    if (item.permission.scope === "organization") {
      return hasOrganizationPermission(context.organizationRole, item.permission.permission);
    }
    return hasPlatformPermission(context.platformRole, item.permission.permission);
  });

export { NAVIGATION, filterNavigation };
export type { NavigationItem, NavigationPermission, NavigationContext };
