"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import cn from "@/shared/utils/cn";

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuId: string;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error(
      "Dropdown compound components must be rendered within a <Dropdown /> provider.",
    );
  }
  return context;
};

export interface DropdownProps {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export const Dropdown = ({
  children,
  open: controlledOpen,
  onOpenChange,
  className,
}: DropdownProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof controlledOpen === "boolean";
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const setIsOpen = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      const nextOpen = typeof action === "function" ? action(isOpen) : action;
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, isOpen, onOpenChange],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, [setIsOpen]);

  return (
    <DropdownContext.Provider
      value={{ isOpen, setIsOpen, close, triggerRef, menuId }}
    >
      <div className={cn("relative inline-block text-left", className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

export interface DropdownTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export const DropdownTrigger = ({
  children,
  className,
  onClick,
  onKeyDown,
  ...props
}: DropdownTriggerProps) => {
  const { isOpen, setIsOpen, triggerRef, menuId } = useDropdown();

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <button
      ref={triggerRef}
      type="button"
      id={`${menuId}-trigger`}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls={isOpen ? `${menuId}-menu` : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};

export interface DropdownContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: "left" | "right";
  children?: ReactNode;
}

export const DropdownContent = ({
  align = "left",
  children,
  className,
  ...props
}: DropdownContentProps) => {
  const { isOpen, close, triggerRef, menuId } = useDropdown();
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-focus first interactive item or menu container on open
  useEffect(() => {
    if (!isOpen) return;

    const firstItem = contentRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"]):not([disabled])',
    );
    if (firstItem) {
      firstItem.focus();
    } else {
      contentRef.current?.focus();
    }
  }, [isOpen]);

  // Handle document Escape key to close menu and restore focus to trigger
  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isOpen, close]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent | Event) => {
      const target = event.target as Node | null;
      if (!target) return;

      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsideContent = contentRef.current?.contains(target);

      if (!isInsideTrigger && !isInsideContent) {
        close();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, close, triggerRef]);

  // Keyboard navigation inside menu (ArrowDown, ArrowUp, Home, End, Escape, Tab)
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!contentRef.current) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === "Tab") {
      close();
      return;
    }

    const items = Array.from(
      contentRef.current.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"]):not([disabled])',
      ),
    );

    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      id={`${menuId}-menu`}
      role="menu"
      tabIndex={-1}
      aria-labelledby={`${menuId}-trigger`}
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute mt-2 z-50 rounded-xl border border-card-border bg-surface-elevated bg-card-background p-1.5",
        "shadow-[0_24px_50px_rgba(0,0,0,0.65),0_6px_18px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "backdrop-blur-xl",
        "animate-in fade-in-0 zoom-in-[0.98] slide-in-from-top-1 duration-150 ease-out motion-reduce:animate-none",
        "outline-none select-none",
        align === "right"
          ? "right-0 origin-top-right"
          : "left-0 origin-top-left",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "danger";
  disabled?: boolean;
  children?: ReactNode;
}

export const DropdownItem = ({
  variant = "default",
  disabled = false,
  children,
  className,
  onClick,
  ...props
}: DropdownItemProps) => {
  const { close } = useDropdown();

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    if (!e.defaultPrevented) {
      close();
    }
  };

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      aria-disabled={disabled}
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-left transition-colors duration-150 select-none outline-none cursor-pointer",
        "focus-visible:ring-1 focus-visible:ring-ring",
        variant === "default" && [
          "text-foreground/80 hover:bg-surface-muted/60 hover:text-foreground",
          "focus-visible:bg-surface-muted/60 focus-visible:text-foreground",
        ],
        variant === "danger" && [
          "text-muted-foreground hover:bg-error-muted/40 hover:text-error",
          "focus-visible:bg-error-muted/40 focus-visible:text-error focus-visible:ring-error",
        ],
        disabled && "pointer-events-none opacity-50 cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export type DropdownSeparatorProps = HTMLAttributes<HTMLDivElement>;

export const DropdownSeparator = ({
  className,
  ...props
}: DropdownSeparatorProps) => {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn("my-1 h-px bg-border-subtle", className)}
      {...props}
    />
  );
};

export interface DropdownLabelProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const DropdownLabel = ({
  children,
  className,
  ...props
}: DropdownLabelProps) => {
  return (
    <div
      className={cn(
        "px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted select-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
