import cn from "@/shared/utils/cn";
import type { HTMLAttributes } from "react";

const AVATAR_SIZES = {
  xs: "h-6 w-6 text-[10px] rounded-md",
  sm: "h-7 w-7 text-xs rounded-md",
  md: "h-8 w-8 text-xs rounded-md",
  lg: "h-10 w-10 text-sm rounded-lg",
};

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name?: string | null;
  email?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  shape?: "rounded" | "circle";
  className?: string;
}

const getInitials = (name?: string | null, email?: string | null): string => {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (name.trim().slice(0, 2)).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    const local = email.split("@")[0] || "";
    return (local.slice(0, 2) || "U").toUpperCase();
  }
  return "U";
};

const Avatar = ({
  name,
  email,
  size = "md",
  shape = "rounded",
  className,
  ...props
}: AvatarProps) => {
  const initials = getInitials(name, email);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center select-none font-semibold font-montserrat tracking-tight",
        "border border-border bg-surface-elevated text-foreground/90 shadow-xs",
        AVATAR_SIZES[size],
        shape === "circle" && "rounded-full",
        className,
      )}
      {...props}
    >
      <span>{initials}</span>
    </div>
  );
};

export { Avatar, getInitials };
export type { AvatarProps };
