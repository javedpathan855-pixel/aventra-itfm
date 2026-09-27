import cn from "@/shared/utils/cn";
import type { HTMLAttributes, ReactNode } from "react";

const BADGE_VARIANTS = {
  default:
    "border border-border bg-surface-elevated text-foreground",
  primary:
    "border border-primary/30 bg-primary-muted text-primary-hover font-semibold",
  secondary:
    "border border-border-subtle bg-secondary text-secondary-foreground",
  outline:
    "border border-border bg-transparent text-muted",
  success:
    "border border-success/30 bg-success-muted text-success",
  warning:
    "border border-warning/30 bg-warning-muted text-warning",
  error:
    "border border-error/30 bg-error-muted text-error",
};

const BADGE_SIZES = {
  sm: "text-[10px] leading-tight px-2 py-0.5 rounded",
  md: "text-xs px-2.5 py-0.5 rounded-md",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  className?: string;
  variant?: keyof typeof BADGE_VARIANTS;
  size?: keyof typeof BADGE_SIZES;
}

const Badge = ({
  children,
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-montserrat select-none tracking-wide transition-colors",
        BADGE_VARIANTS[variant],
        BADGE_SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge };
export type { BadgeProps };
