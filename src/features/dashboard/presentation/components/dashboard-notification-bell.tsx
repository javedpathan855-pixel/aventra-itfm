"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import cn from "@/shared/utils/cn";
import { Badge } from "@/shared/components/ui/badge";

interface DashboardNotificationBellProps {
  className?: string;
}

export const DashboardNotificationBell = ({
  className,
}: DashboardNotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="View notifications"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors select-none outline-none cursor-pointer",
          "hover:bg-surface-elevated/80 hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring",
          isOpen && "bg-surface-elevated text-foreground",
        )}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-72 sm:w-80 origin-top-right rounded-xl border border-border/80 bg-surface-elevated/95 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.65),0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] bg-[radial-gradient(circle_at_85%_15%,rgba(74,99,216,0.08),transparent_50%),var(--surface-elevated)] backdrop-blur-xl z-50 animate-in fade-in-0 zoom-in-[0.98] slide-in-from-top-1.5 duration-150 ease-out outline-none select-none motion-reduce:animate-none"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle mb-3">
            <span className="text-xs font-semibold text-foreground">Notifications</span>
            <Badge size="sm" variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              0 unread
            </Badge>
          </div>

          <div className="flex flex-col items-center justify-center py-5 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2.5">
              <CheckCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold text-foreground">All caught up!</p>
            <p className="text-[11px] text-muted mt-1 max-w-[210px] leading-relaxed">
              You have no unread notifications or pending system alerts at this time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
