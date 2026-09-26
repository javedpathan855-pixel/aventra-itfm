"use client";

import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import cn from "@/shared/utils/cn";

export type CheckboxSize = "sm" | "md" | "lg";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  label?: ReactNode;
  children?: ReactNode;
  description?: ReactNode;
  size?: CheckboxSize;
  error?: string | boolean;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

const CHECKBOX_SIZES: Record<
  CheckboxSize,
  { box: string; icon: string; text: string }
> = {
  sm: {
    box: "h-4 w-4 rounded",
    icon: "h-3 w-3 stroke-[3]",
    text: "text-xs",
  },
  md: {
    box: "h-5 w-5 rounded-md",
    icon: "h-3.5 w-3.5 stroke-[3]",
    text: "text-sm",
  },
  lg: {
    box: "h-6 w-6 rounded-md",
    icon: "h-4 w-4 stroke-[3]",
    text: "text-base",
  },
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id: customId,
      name,
      checked: controlledChecked,
      defaultChecked = false,
      disabled = false,
      label,
      children,
      description,
      size = "md",
      error,
      className,
      onCheckedChange,
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const isControlled = controlledChecked !== undefined;
    const [internalChecked, setInternalChecked] = useState(
      Boolean(defaultChecked),
    );
    const isChecked = isControlled
      ? Boolean(controlledChecked)
      : internalChecked;

    const labelContent = label ?? children;
    const sizeConfig = CHECKBOX_SIZES[size];

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (!isControlled) {
        setInternalChecked(e.target.checked);
      }
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className={cn("inline-flex items-start", className)}>
        <label
          htmlFor={id}
          className={cn(
            "group relative flex cursor-pointer select-none items-start gap-2.5",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <div className="relative flex items-center justify-center pt-0.5">
            <input
              ref={ref}
              type="checkbox"
              id={id}
              name={name}
              checked={isChecked}
              disabled={disabled}
              onChange={handleChange}
              className="peer sr-only"
              aria-checked={isChecked}
              aria-disabled={disabled}
              aria-invalid={Boolean(error)}
              {...props}
            />

            <div
              className={cn(
                "relative flex items-center justify-center border transition-all duration-200",
                sizeConfig.box,
                isChecked
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_0_12px_rgba(74,99,216,0.4)]"
                  : "border-border bg-surface/70 hover:border-border-strong hover:bg-surface-elevated",
                error && "border-error focus-visible:ring-error/40",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
              )}
            >
              <AnimatePresence initial={false}>
                {isChecked && (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                    className="flex items-center justify-center"
                  >
                    <Check className={sizeConfig.icon} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {(labelContent || description) && (
            <div className="flex flex-col">
              {labelContent && (
                <span
                  className={cn(
                    "font-medium text-foreground transition-colors group-hover:text-foreground",
                    sizeConfig.text,
                    disabled && "text-muted",
                  )}
                >
                  {labelContent}
                </span>
              )}
              {description && (
                <span className="text-xs text-muted">{description}</span>
              )}
              {typeof error === "string" && (
                <span className="mt-1 text-xs text-error">{error}</span>
              )}
            </div>
          )}
        </label>
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
export default Checkbox;
