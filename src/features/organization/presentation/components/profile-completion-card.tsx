"use client";

import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import cn from "@/shared/utils/cn";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { ProfileCompletionResult } from "../../domain/entities/organization-profile";

interface ProfileCompletionCardProps {
  completion: ProfileCompletionResult;
  onNavigateTab?: (tabKey: string) => void;
  className?: string;
}

export const ProfileCompletionCard = ({
  completion,
  onNavigateTab,
  className,
}: ProfileCompletionCardProps) => {
  const { score, level, checklist } = completion;

  const badgeVariant =
    level === "complete" ? "success" : level === "in_progress" ? "warning" : "primary";

  const tabMapping: Record<string, string> = {
    basic_info: "general",
    contact_info: "general",
    address: "addresses",
    legal_tax: "legal",
    branding: "branding",
  };

  return (
    <Card className={cn("p-5 sm:p-6 flex flex-col gap-4 border-border/60", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-muted text-primary border border-primary/20">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Profile Readiness</h2>
            <p className="text-xs text-muted">Complete profile unlocks enterprise features</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant={badgeVariant} size="md">
            {score}% Complete
          </Badge>
          <span className="text-xs text-muted capitalize">{level.replace("_", " ")}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full rounded-full bg-surface-muted overflow-hidden border border-border/30"
      >
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out rounded-full",
            score >= 80 ? "bg-success" : score >= 40 ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${Math.max(score, 4)}%` }}
        />
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {checklist.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigateTab?.(tabMapping[item.key] || "general")}
            className={cn(
              "flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer",
              item.completed
                ? "border-success/20 bg-success-muted/10 text-foreground"
                : "border-border/40 bg-surface/40 hover:bg-surface-elevated/70 text-muted hover:text-foreground",
            )}
          >
            {item.completed ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 text-muted shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold leading-tight">{item.label}</span>
              <span className="text-[11px] text-muted leading-snug line-clamp-1">
                {item.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
};
