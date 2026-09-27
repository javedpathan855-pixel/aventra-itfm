"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import cn from "@/shared/utils/cn";
import { toast } from "@/shared/components/ui/toast";

interface DashboardFeatureCardProps {
  className?: string;
}

export const DashboardFeatureCard = ({
  className,
}: DashboardFeatureCardProps) => {
  const handleExplore = () => {
    toast.info("Aventra ITFM v1.1 Preview", {
      description:
        "Advanced ITFM capabilities including automated cloud bill ingestion and unit cost allocation are launching soon.",
      duration: 3500,
    });
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-surface-elevated/50 p-3 shadow-xs select-none",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-primary mb-1">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-[11px] font-semibold text-foreground tracking-tight">
          Unlock more features
        </span>
      </div>

      <p className="text-[10px] text-muted leading-relaxed mb-2.5">
        Advanced ITFM tools, automated cost allocation, and multi-cloud reporting.
      </p>

      <button
        type="button"
        onClick={handleExplore}
        className={cn(
          "group flex w-full items-center justify-between rounded-md border border-border/60 bg-surface px-2 py-1 text-[10px] font-medium text-muted transition-colors outline-none cursor-pointer",
          "hover:border-primary/40 hover:bg-surface-muted hover:text-foreground",
          "focus-visible:ring-1 focus-visible:ring-ring",
        )}
      >
        <span>Explore capabilities</span>
        <ArrowRight
          className="h-3 w-3 transition-transform group-hover:translate-x-0.5 text-muted group-hover:text-primary"
          aria-hidden="true"
        />
      </button>
    </div>
  );
};
