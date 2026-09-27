import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import cn from "@/shared/utils/cn";

export interface BreadcrumbProps extends ComponentPropsWithoutRef<"nav"> {
  children: ReactNode;
}

export const Breadcrumb = ({
  className,
  children,
  ...props
}: BreadcrumbProps) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center", className)}
      {...props}
    >
      {children}
    </nav>
  );
};

export const BreadcrumbList = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"ol">) => {
  return (
    <ol
      className={cn("flex flex-wrap items-center gap-1.5 text-xs text-muted", className)}
      {...props}
    />
  );
};

export const BreadcrumbItem = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"li">) => {
  return (
    <li
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
};

export interface BreadcrumbLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  href: string;
}

export const BreadcrumbLink = ({
  className,
  ...props
}: BreadcrumbLinkProps) => {
  return (
    <Link
      className={cn(
        "inline-flex items-center gap-1 text-muted transition-colors hover:text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xs",
        className,
      )}
      {...props}
    />
  );
};

export const BreadcrumbPage = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) => {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-semibold text-foreground tracking-tight select-none", className)}
      {...props}
    />
  );
};

export const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"li">) => {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={cn("text-muted/40 select-none text-xs", className)}
      {...props}
    >
      {children ?? "/"}
    </li>
  );
};
