"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowDown, Check, X } from "lucide-react";
import cn from "@/shared/utils/cn";
import { toastVariants } from "@/shared/animation";
import { Button } from "./button";

export type ToastTone = "info" | "success" | "error" | "warning";

export type ToastPosition =
  | "top-right"
  | "bottom-right"
  | "top-center"
  | "bottom-center";

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "link";
}

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  progress?: number;
  action?: ToastAction;
  actions?: ToastAction[];
  duration?: number;
  icon?: ReactNode;
}

interface ToastItem extends ToastOptions {
  id: string;
  tone: ToastTone;
  duration: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 4;

const TONE_STYLES: Record<
  ToastTone,
  {
    gradient: string;
    border: string;
    iconWrapper: string;
    defaultIcon: ReactNode;
  }
> = {
  info: {
    gradient:
      "radial-gradient(circle at 88% 18%, rgba(56, 189, 248, 0.32), transparent 52%), radial-gradient(circle at 15% 85%, rgba(12, 18, 35, 0.4), transparent 50%), var(--surface)",
    border: "border-info/30",
    iconWrapper: "border-info/40 bg-info-muted/30 text-info",
    defaultIcon: <ArrowDown className="h-4 w-4 stroke-[2.5]" />,
  },
  success: {
    gradient:
      "radial-gradient(circle at 88% 18%, rgba(16, 185, 129, 0.28), transparent 52%), radial-gradient(circle at 15% 85%, rgba(12, 18, 35, 0.4), transparent 50%), var(--surface)",
    border: "border-success/30",
    iconWrapper: "border-success/40 bg-success-muted/30 text-success",
    defaultIcon: <Check className="h-4 w-4 stroke-[2.5]" />,
  },
  error: {
    gradient:
      "radial-gradient(circle at 88% 18%, rgba(244, 63, 94, 0.28), transparent 52%), radial-gradient(circle at 15% 85%, rgba(12, 18, 35, 0.4), transparent 50%), var(--surface)",
    border: "border-error/30",
    iconWrapper: "border-error/40 bg-error-muted/30 text-error",
    defaultIcon: <X className="h-4 w-4 stroke-[2.5]" />,
  },
  warning: {
    gradient:
      "radial-gradient(circle at 88% 18%, rgba(245, 158, 11, 0.28), transparent 52%), radial-gradient(circle at 15% 85%, rgba(12, 18, 35, 0.4), transparent 50%), var(--surface)",
    border: "border-warning/30",
    iconWrapper: "border-warning/40 bg-warning-muted/30 text-warning",
    defaultIcon: <AlertTriangle className="h-4 w-4 stroke-[2.5]" />,
  },
};

const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-right":
    "fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:top-6 sm:w-[420px]",
  "bottom-right":
    "fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[420px]",
  "top-center":
    "fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:top-6 sm:w-[420px] sm:-translate-x-1/2",
  "bottom-center":
    "fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[420px] sm:-translate-x-1/2",
};

// Global emitter for imperative toast calls outside of React components
type ToastEmitterAction =
  | { type: "add"; payload: ToastOptions }
  | { type: "dismiss"; payload: string }
  | { type: "clear" };

type Listener = (action: ToastEmitterAction) => void;
const listeners = new Set<Listener>();

const emit = (action: ToastEmitterAction) => {
  listeners.forEach((listener) => listener(action));
};

export interface ToastProviderProps {
  position?: ToastPosition;
  duration?: number;
  children: ReactNode;
}

const ToastProvider = ({
  position = "bottom-right",
  duration = DEFAULT_DURATION,
  children,
}: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, delay: number) => {
      const existing = timersRef.current.get(id);
      if (existing) clearTimeout(existing);
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), delay),
      );
    },
    [dismiss],
  );

  const addToast = useCallback(
    (options: ToastOptions): string => {
      const id = Math.random().toString(36).substring(2, 9);
      const delay = options.duration ?? duration;

      setToasts((prev) => {
        const next: ToastItem[] = [
          ...prev,
          {
            ...options,
            id,
            tone: options.tone ?? "info",
            duration: delay,
          },
        ];
        if (next.length > MAX_TOASTS) {
          const dropped = next.slice(0, next.length - MAX_TOASTS);
          dropped.forEach((d) => {
            const timer = timersRef.current.get(d.id);
            if (timer) clearTimeout(timer);
          });
          return next.slice(next.length - MAX_TOASTS);
        }
        return next;
      });

      if (delay > 0) {
        scheduleDismiss(id, delay);
      }

      return id;
    },
    [duration, scheduleDismiss],
  );

  const clear = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const listener: Listener = (action) => {
      if (action.type === "add") {
        addToast(action.payload);
      } else if (action.type === "dismiss") {
        dismiss(action.payload);
      } else if (action.type === "clear") {
        clear();
      }
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [addToast, dismiss, clear]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss, clear }}>
      {children}
      {mounted && typeof document !== "undefined"
        ? createPortal(
            <div
              role="region"
              aria-label="Notifications"
              className={cn(
                "pointer-events-none z-50 flex flex-col gap-3",
                POSITION_CLASSES[position],
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {toasts.map((item) => (
                  <ToastCard
                    key={item.id}
                    item={item}
                    onPause={() => {
                      const timer = timersRef.current.get(item.id);
                      if (timer) {
                        clearTimeout(timer);
                        timersRef.current.delete(item.id);
                      }
                    }}
                    onResume={() => {
                      if (item.duration > 0) {
                        scheduleDismiss(item.id, item.duration);
                      }
                    }}
                    onDismiss={() => dismiss(item.id)}
                  />
                ))}
              </AnimatePresence>
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
};

interface ToastCardProps {
  item: ToastItem;
  onPause: () => void;
  onResume: () => void;
  onDismiss: () => void;
}

const ToastCard = ({ item, onPause, onResume, onDismiss }: ToastCardProps) => {
  const toneConfig = TONE_STYLES[item.tone];
  const allActions = item.actions || (item.action ? [item.action] : []);

  const cardStyle: CSSProperties = {
    background: toneConfig.gradient,
  };

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      role={item.tone === "error" ? "alert" : "status"}
      style={cardStyle}
      className={cn(
        "pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-2xl",
        "border border-white/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "backdrop-blur-xl transition-[border-color,box-shadow] duration-200",
        toneConfig.border,
      )}
    >
      {/* Close Button using shared Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDismiss}
        aria-label="Close notification"
        className="absolute top-3.5 right-3.5 text-muted/60 hover:text-foreground hover:bg-white/5 active:scale-95"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Main Body */}
      <div className="flex w-full items-start gap-3.5 pr-6">
        {/* Circular Outlined Icon Badge */}
        <span
          aria-hidden="true"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm",
            toneConfig.iconWrapper,
          )}
        >
          {item.icon ?? toneConfig.defaultIcon}
        </span>

        {/* Text Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
          <h4 className="font-montserrat text-sm sm:text-base font-bold tracking-tight text-foreground">
            {item.title}
          </h4>
          {item.description && (
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Optional Progress Bar with percentage and shared action Button */}
          {item.progress !== undefined && (
            <div className="flex items-center gap-3 w-full mt-3">
              <div className="flex flex-1 items-center gap-2.5">
                <div className="h-1.5 flex-1 rounded-full bg-surface-elevated overflow-hidden border border-border-subtle">
                  <div
                    className="h-full rounded-full bg-primary shadow-[0_0_8px_rgba(74,99,216,0.6)] transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, item.progress))}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-muted shrink-0">
                  {Math.round(item.progress)}%
                </span>
              </div>

              {allActions.length > 0 && (
                <Button
                  type="button"
                  variant={allActions[0].variant ?? "secondary"}
                  size="xs"
                  onClick={allActions[0].onClick}
                >
                  {allActions[0].label}
                </Button>
              )}
            </div>
          )}

          {/* Regular Action Buttons using shared Button component */}
          {item.progress === undefined && allActions.length > 0 && (
            <div className="flex items-center gap-2.5 w-full mt-3">
              {allActions.map((act, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant={act.variant ?? "secondary"}
                  size="sm"
                  onClick={act.onClick}
                  className={cn(
                    act.variant !== "primary" && "border-border/50",
                  )}
                >
                  {act.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Imperative global toast API
export const toast = (options: ToastOptions) => {
  emit({ type: "add", payload: options });
};

toast.info = (title: string, options?: Omit<ToastOptions, "title" | "tone">) =>
  toast({ ...options, title, tone: "info" });

toast.success = (
  title: string,
  options?: Omit<ToastOptions, "title" | "tone">,
) => toast({ ...options, title, tone: "success" });

toast.error = (title: string, options?: Omit<ToastOptions, "title" | "tone">) =>
  toast({ ...options, title, tone: "error" });

toast.warning = (
  title: string,
  options?: Omit<ToastOptions, "title" | "tone">,
) => toast({ ...options, title, tone: "warning" });

export { ToastProvider };
