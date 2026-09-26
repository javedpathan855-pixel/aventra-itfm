import cn from "@/shared/utils/cn";
import { HTMLAttributes, ReactNode } from "react";

interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

const Divider = ({ className, children, ...props }: DividerProps) => {
  if (children) {
    return (
      <div
        className={cn(
          "relative flex w-full items-center justify-center my-3",
          className,
        )}
        {...props}
      >
        <div className="absolute inset-0 flex items-center">
          <div className="h-px w-full bg-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="rounded bg-surface px-3 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            {children}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="relative h-px w-full bg-background">
        <div className="absolute -inset-x-1 -top-0.75 h-1.75 bg-primary/20 blur-2xl" />

        <div className="absolute inset-0 h-px bg-linear-to-r from-transparent via-primary to-transparent" />
      </div>
    </div>
  );
};

export default Divider;
