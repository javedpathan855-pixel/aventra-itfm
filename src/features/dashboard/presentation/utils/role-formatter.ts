import type { BadgeProps } from "@/shared/components/ui/badge";

export const formatRoleLabel = (role: string | null | undefined): string => {
  if (!role) return "";
  const normalized = role.trim().toUpperCase();
  switch (normalized) {
    case "SUPERADMIN":
      return "Super Admin";
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "ENGINEER":
      return "Engineer";
    case "USER":
      return "User";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }
};

export const getRoleBadgeVariant = (
  role: string | null | undefined,
): NonNullable<BadgeProps["variant"]> => {
  if (!role) return "default";
  const normalized = role.trim().toUpperCase();
  switch (normalized) {
    case "SUPERADMIN":
      return "primary";
    case "OWNER":
      return "primary";
    case "ADMIN":
      return "secondary";
    case "ENGINEER":
      return "outline";
    case "USER":
      return "secondary";
    default:
      return "default";
  }
};
