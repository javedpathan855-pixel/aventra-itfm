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
  /** Nested items render as an expandable group under this entry. */
  children?: readonly NavigationItem[];
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
    children: [
      {
        label: "Overview",
        href: "/organization",
        permission: { scope: "organization", permission: "organization.read" },
      },
      {
        label: "Locations",
        href: "/organization/locations",
        permission: { scope: "organization", permission: "location.read" },
      },
      {
        label: "Departments",
        href: "/organization/departments",
        permission: { scope: "organization", permission: "department.read" },
      },
    ],
  },
  {
    label: "Assets",
    href: "/assets",
    permission: { scope: "organization", permission: "asset.read" },
    children: [
      {
        label: "Dashboard",
        href: "/assets/dashboard",
        permission: { scope: "organization", permission: "asset.read" },
      },
      {
        label: "Registry",
        href: "/assets",
        permission: { scope: "organization", permission: "asset.read" },
      },
      {
        label: "Categories & Models",
        href: "/assets/categories",
        permission: { scope: "organization", permission: "asset.category.read" },
      },
      {
        label: "Reports",
        href: "/assets/reports",
        permission: { scope: "organization", permission: "asset.report.read" },
      },
    ],
  },
];

/** Filter navigation items by already-resolved roles. Pure. */
const filterNavigationItem = (
  item: NavigationItem,
  context: NavigationContext,
): NavigationItem | null => {
  const children = item.children
    ?.map((child) => filterNavigationItem(child, context))
    .filter((child): child is NavigationItem => child !== null);
  const ownVisible =
    item.permission === null ||
    (item.permission.scope === "organization"
      ? hasOrganizationPermission(context.organizationRole, item.permission.permission)
      : hasPlatformPermission(context.platformRole, item.permission.permission));
  // A group survives on visible children alone so roles without the
  // parent permission (e.g. ENGINEER) still reach permitted pages.
  if (item.children) {
    if (!ownVisible && (!children || children.length === 0)) return null;
    return { ...item, children: children ?? [] };
  }
  return ownVisible ? item : null;
};

/** Filter navigation items by already-resolved roles. Pure. */
const filterNavigation = (
  items: readonly NavigationItem[],
  context: NavigationContext,
): NavigationItem[] =>
  items
    .map((item) => filterNavigationItem(item, context))
    .filter((item): item is NavigationItem => item !== null);

/** Exact leaf-route match. Parents never match by prefix. */
const isNavHrefActive = (pathname: string | null, href: string): boolean =>
  pathname !== null && pathname === href;

/** True when any nested child exactly matches the current route. */
const hasActiveNavChild = (
  pathname: string | null,
  children: readonly { href: string }[],
): boolean => children.some((child) => isNavHrefActive(pathname, child.href));

export { NAVIGATION, filterNavigation, isNavHrefActive, hasActiveNavChild };
export type { NavigationItem, NavigationPermission, NavigationContext };
