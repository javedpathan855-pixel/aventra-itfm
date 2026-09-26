import cn from "@/shared/utils/cn";
import { ReactNode, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

const BUTTON_VARIANTS = {
  default:
    "border border-card-border bg-card-background shadow-card text-foreground hover:bg-surface-elevated hover:border-border-strong active:scale-[0.99] transition-all duration-200",
  primary:
    "bg-primary text-primary-foreground shadow-md hover:bg-primary-hover active:bg-primary-active active:scale-[0.99] transition-all duration-200",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary-hover border border-border-subtle active:scale-[0.99] transition-all duration-200",
  outline:
    "border border-border text-foreground hover:bg-surface-muted active:scale-[0.99] transition-all duration-200",
  ghost:
    "bg-transparent text-muted hover:text-foreground hover:bg-surface-muted active:scale-[0.99] transition-all duration-200",
  link: "text-primary hover:text-primary-hover cursor-pointer underline bg-transparent shadow-none p-0 h-auto",
};

const BUTTON_SIZES = {
  xs: "h-7 px-2.5 text-xs rounded-md",
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-12 px-6 text-base rounded-md",
  icon: "h-8 w-8 p-0 rounded-lg",
  "icon-sm": "h-6 w-6 p-0 rounded-md",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  className?: string;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  isLoading?: boolean;
}

const Button = ({
  children,
  className,
  variant = "default",
  size = "md",
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center font-semibold font-montserrat select-none cursor-pointer backdrop-blur-[14px]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};

export { Button };
