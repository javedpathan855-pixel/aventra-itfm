"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import cn from "@/shared/utils/cn";

export type InputVariant = "default" | "filled" | "outline";
export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: string | boolean;
  variant?: InputVariant;
  inputSize?: InputSize;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  showPasswordToggle?: boolean;
  wrapperClassName?: string;
}

const INPUT_VARIANTS: Record<InputVariant, string> = {
  default: cn(
    "border-card-border bg-card-background shadow-card",
    "hover:border-border-strong",
    "focus:border-primary focus:bg-[linear-gradient(145deg,rgba(46,65,115,0.10),rgba(20,29,52,0.10))]",
    "focus:shadow-[0_0_0_1px_rgba(118,143,255,0.25),0_0_20px_rgba(74,99,216,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
  ),
  filled: cn(
    "border-border bg-surface",
    "hover:bg-surface-elevated hover:border-border-strong",
    "focus:border-primary focus:bg-surface-elevated focus:ring-2 focus:ring-ring/25",
  ),
  outline: cn(
    "border-border bg-transparent",
    "hover:border-border-strong hover:bg-surface/40",
    "focus:border-primary focus:bg-surface/50 focus:ring-2 focus:ring-ring/25",
  ),
};

const INPUT_SIZES: Record<
  InputSize,
  {
    input: string;
    icon: string;
    startPadding: string;
    endPadding: string;
  }
> = {
  sm: {
    input: "h-8 px-3 text-xs rounded",
    icon: "h-3.5 w-3.5",
    startPadding: "pl-8",
    endPadding: "pr-8",
  },
  md: {
    input: "h-10 px-4 text-sm rounded-md",
    icon: "h-4 w-4",
    startPadding: "pl-10",
    endPadding: "pr-10",
  },
  lg: {
    input: "h-12 px-4 text-base rounded-md",
    icon: "h-5 w-5",
    startPadding: "pl-11",
    endPadding: "pr-11",
  },
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id: customId,
      type = "text",
      label,
      helperText,
      error,
      variant = "default",
      inputSize = "md",
      startIcon,
      endIcon,
      showPasswordToggle = false,
      disabled,
      className,
      wrapperClassName,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const hasError = Boolean(error);
    const sizeConfig = INPUT_SIZES[inputSize];

    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPasswordType = type === "password";
    const resolvedType =
      isPasswordType && showPasswordToggle
        ? isPasswordVisible
          ? "text"
          : "password"
        : type;

    const renderPasswordToggle = isPasswordType && showPasswordToggle && (
      <button
        type="button"
        onClick={() => setIsPasswordVisible((prev) => !prev)}
        className="rounded-sm text-muted transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={isPasswordVisible ? "Hide password" : "Show password"}
        aria-pressed={isPasswordVisible}
      >
        {isPasswordVisible ? (
          <EyeOff className={sizeConfig.icon} />
        ) : (
          <Eye className={sizeConfig.icon} />
        )}
      </button>
    );

    const activeEndIcon = renderPasswordToggle || endIcon;

    return (
      <div className={cn("flex w-full flex-col gap-1.5", wrapperClassName)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "text-sm font-medium text-foreground transition-colors",
              disabled && "text-muted opacity-60",
            )}
          >
            {label}
          </label>
        )}

        <div className="relative flex w-full items-center">
          {startIcon && (
            <span
              className={cn(
                "pointer-events-none absolute left-3 flex items-center justify-center text-muted transition-colors",
                sizeConfig.icon,
              )}
            >
              {startIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            type={resolvedType}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${id}-error`
                : helperText
                  ? `${id}-helper`
                  : undefined
            }
            className={cn(
              "w-full border text-foreground placeholder:text-muted-foreground",
              "caret-primary outline-none transition-[border-color,box-shadow,background-color,transform] duration-200",
              sizeConfig.input,
              INPUT_VARIANTS[variant],
              startIcon && sizeConfig.startPadding,
              activeEndIcon && sizeConfig.endPadding,
              hasError &&
                "border-error focus:border-error focus:shadow-[0_0_0_1px_rgba(244,63,94,0.30),0_0_22px_rgba(244,63,94,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
              disabled && "cursor-not-allowed opacity-50 focus:scale-100",
              className,
            )}
            {...props}
          />

          {activeEndIcon && (
            <span
              className={cn(
                "absolute right-3 flex items-center justify-center text-muted",
                sizeConfig.icon,
              )}
            >
              {activeEndIcon}
            </span>
          )}
        </div>

        {typeof error === "string" ? (
          <div
            id={`${id}-error`}
            role="alert"
            className="flex items-center gap-1.5 text-xs font-medium text-error"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <span id={`${id}-helper`} className="text-xs text-muted">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
export default Input;
