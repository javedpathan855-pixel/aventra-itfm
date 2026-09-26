"use client";

import { useState } from "react";
import { toast } from "@/shared/components/ui/toast";
import { Button } from "@/shared/components/ui/button";
import { ArrowDown, Check, X, Bell, RefreshCw, Sparkles } from "lucide-react";

const ShowcasePlaygroundClient = () => {
  const [progressValue, setProgressValue] = useState(68);

  const handleShowUploadToast = () => {
    toast({
      title: "Just a minute...",
      description:
        "Your file is uploading right now. Just give us a second to finish your upload.",
      tone: "info",
      progress: progressValue,
      icon: <ArrowDown className="h-4 w-4 stroke-[2.5]" />,
      action: {
        label: "Cancel",
        onClick: () => {
          toast.warning("Upload cancelled", {
            description: "The file transfer was stopped by the user.",
          });
        },
      },
      duration: 8000,
    });
  };

  const handleShowSuccessToast = () => {
    toast.success("Your file was uploaded!", {
      description:
        "Your file was successfully uploaded. You can copy the link to your clipboard.",
      icon: <Check className="h-4 w-4 stroke-[2.5]" />,
      actions: [
        {
          label: "Copy Link",
          onClick: () => {
            navigator.clipboard?.writeText(
              "https://aventra.io/f/report-2026.pdf",
            );
            toast.info("Link copied!", {
              description:
                "Direct download URL has been copied to your clipboard.",
              duration: 3000,
            });
          },
        },
        {
          label: "Done",
          onClick: () => {
            toast.info("Completed", {
              description: "File marked as ready.",
              duration: 2500,
            });
          },
        },
      ],
      duration: 6000,
    });
  };

  const handleShowErrorToast = () => {
    toast.error("We are so sorry!", {
      description:
        "There was an error and your file could not be uploaded. Would you like to try again?",
      icon: <X className="h-4 w-4 stroke-[2.5]" />,
      actions: [
        {
          label: "Retry",
          variant: "primary",
          onClick: () => {
            handleShowUploadToast();
          },
        },
        {
          label: "Cancel",
          onClick: () => {
            // Dismissed
          },
        },
      ],
      duration: 7000,
    });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6 sm:p-10 flex flex-col items-center justify-start gap-10">
      {/* Header section */}
      <header className="flex flex-col items-center text-center max-w-2xl gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Aventra Design System &bull; Toast Component</span>
        </div>
        <h1 className="font-montserrat text-3xl sm:text-4xl font-extrabold tracking-tight">
          Toast Notification Primitives
        </h1>
        <p className="text-muted text-sm sm:text-base leading-relaxed">
          Obsidian glassmorphic notifications with radial ambient gradients,
          custom progress bars, micro-actions, and design tokens strictly
          derived from{" "}
          <code className="text-foreground bg-surface px-1.5 py-0.5 rounded border border-border text-xs">
            globals.css
          </code>
          .
        </p>
      </header>

      {/* Interactive Trigger Bar */}
      <section className="flex flex-wrap items-center justify-center gap-3 p-4 rounded-2xl bg-surface border border-border/60 shadow-xl max-w-3xl w-full">
        <Button
          onClick={handleShowUploadToast}
          className="bg-info hover:bg-info/90 text-white font-medium text-xs flex items-center gap-2"
        >
          <ArrowDown className="h-4 w-4" />
          <span>Trigger Upload Toast</span>
        </Button>

        <Button
          onClick={handleShowSuccessToast}
          className="bg-success hover:bg-success/90 text-white font-medium text-xs flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          <span>Trigger Success Toast</span>
        </Button>

        <Button
          onClick={handleShowErrorToast}
          className="bg-error hover:bg-error/90 text-white font-medium text-xs flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          <span>Trigger Error Toast</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            const val = Math.floor(Math.random() * 80) + 15;
            setProgressValue(val);
            toast.info("Progress adjusted", {
              description: `Next upload trigger will simulate ${val}% completion.`,
              duration: 2500,
            });
          }}
          className="text-xs flex items-center gap-2 border-border/80"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Randomize Progress ({progressValue}%)</span>
        </Button>
      </section>

      {/* Static Visual Showcase matching the exact screenshot */}
      <section className="flex flex-col gap-6 max-w-100 w-full mt-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Static Reference Preview (1:1 with Screenshot)
          </span>
          <span className="text-[11px] text-muted-foreground">
            Tokens from globals.css
          </span>
        </div>

        {/* Card 1: Uploading Progress */}
        <div
          style={{
            background:
              "radial-gradient(circle at 88% 18%, rgba(56, 189, 248, 0.32), transparent 52%), radial-gradient(circle at 15% 85%, rgba(12, 18, 35, 0.4), transparent 50%), var(--surface)",
          }}
          className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-info/30 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-3.5 right-3.5 text-muted/60 hover:text-foreground hover:bg-white/5 active:scale-95"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex w-full items-start gap-3.5 pr-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-info/40 bg-info-muted/30 text-info shadow-sm">
              <ArrowDown className="h-4 w-4 stroke-[2.5]" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
              <h4 className="font-montserrat text-sm font-bold tracking-tight text-foreground">
                Just a minute...
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Your file is uploading right now. Just give us a second to
                finish your upload.
              </p>
              <div className="flex items-center gap-3 w-full mt-3">
                <div className="flex flex-1 items-center gap-2.5">
                  <div className="h-1.5 flex-1 rounded-full bg-surface-elevated overflow-hidden border border-border-subtle">
                    <div className="h-full w-[68%] rounded-full bg-primary shadow-[0_0_8px_rgba(74,99,216,0.6)]" />
                  </div>
                  <span className="text-[11px] font-semibold text-muted shrink-0">
                    68%
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  className="rounded-lg text-xs font-medium border-border/50 shadow-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Success Uploaded */}
        <div
          style={{
            background:
              "radial-gradient(circle at 88% 18%, rgba(16, 185, 129, 0.28), transparent 52%), radial-gradient(circle at 15% 85%, rgba(12, 18, 35, 0.4), transparent 50%), var(--surface)",
          }}
          className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-success/30 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-3.5 right-3.5 text-muted/60 hover:text-foreground hover:bg-white/5 active:scale-95"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex w-full items-start gap-3.5 pr-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-success/40 bg-success-muted/30 text-success shadow-sm">
              <Check className="h-4 w-4 stroke-[2.5]" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
              <h4 className="font-montserrat text-sm font-bold tracking-tight text-foreground">
                Your file was uploaded!
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Your file was succesfully uploaded. You can copy the link to
                your clipboard.
              </p>
              <div className="flex items-center gap-2.5 w-full mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg text-xs font-medium border-border/50 shadow-sm"
                >
                  Copy Link
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg text-xs font-medium border-border/50 shadow-sm"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Error */}
        <div
          style={{
            background:
              "radial-gradient(circle at 88% 18%, rgba(244, 63, 94, 0.28), transparent 52%), radial-gradient(circle at 15% 85%, rgba(12, 18, 35, 0.4), transparent 50%), var(--surface)",
          }}
          className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-error/30 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-3.5 right-3.5 text-muted/60 hover:text-foreground hover:bg-white/5 active:scale-95"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex w-full items-start gap-3.5 pr-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-error/40 bg-error-muted/30 text-error shadow-sm">
              <X className="h-4 w-4 stroke-[2.5]" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
              <h4 className="font-montserrat text-sm font-bold tracking-tight text-foreground">
                We are so sorry!
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                There was and error and your file could not be uploaded. Would
                you like to try again?
              </p>
              <div className="flex items-center gap-2.5 w-full mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg text-xs font-medium border-border/50 shadow-sm"
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg text-xs font-medium border-border/50 shadow-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ShowcasePlaygroundClient;
