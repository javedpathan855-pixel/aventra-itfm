"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, ChevronDown, Search } from "lucide-react";
import cn from "@/shared/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export type SelectSize = "sm" | "md" | "lg";

export interface SelectProps {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | boolean;
  helperText?: ReactNode;
  label?: ReactNode;
  startIcon?: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Initial open state for uncontrolled usage (e.g. previews, tests). */
  defaultOpen?: boolean;
  size?: SelectSize;
  wrapperClassName?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export const getSelectedOption = (
  options: readonly SelectOption[],
  value: string | undefined,
): SelectOption | undefined =>
  value === undefined ? undefined : options.find((option) => option.value === value);

export const filterSelectOptions = (
  options: readonly SelectOption[],
  query: string,
): SelectOption[] => {
  const term = query.trim().toLowerCase();
  if (term.length === 0) return [...options];
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(term) ||
      option.value.toLowerCase().includes(term) ||
      (option.description?.toLowerCase().includes(term) ?? false),
  );
};

export type HighlightMove = "next" | "previous" | "first" | "last";

export const moveHighlightIndex = (
  options: readonly SelectOption[],
  currentIndex: number,
  move: HighlightMove,
): number => {
  const enabled = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !option.disabled)
    .map(({ index }) => index);
  if (enabled.length === 0) return -1;
  const first = enabled[0];
  const last = enabled[enabled.length - 1];
  if (first === undefined || last === undefined) return -1;
  if (move === "first") return first;
  if (move === "last") return last;
  const position = enabled.indexOf(currentIndex);
  if (position === -1) {
    return move === "next" ? first : last;
  }
  const nextPosition =
    move === "next"
      ? (position + 1) % enabled.length
      : (position - 1 + enabled.length) % enabled.length;
  return enabled[nextPosition] ?? first;
};

export interface PanelTriggerRect {
  top: number;
  bottom: number;
  left: number;
  width: number;
}

export interface PanelViewport {
  width: number;
  height: number;
}

export interface PanelPlacement {
  top: number;
  left: number;
  width: number;
  upward: boolean;
}

export const PANEL_GAP = 8;
export const PANEL_EDGE_MARGIN = 8;
export const PANEL_MAX_HEIGHT = 256;

/**
 * Compute fixed-position panel geometry from the trigger rectangle.
 * The panel is at least as wide as the trigger and grows to fit its
 * longest content line, clamped into the viewport. Opens below by
 * default; flips above when there is insufficient room below but more
 * room above. Pure and unit-tested — the single source of dropdown
 * placement.
 */
export const computePanelPlacement = (
  trigger: PanelTriggerRect,
  panelHeight: number,
  viewport: PanelViewport,
  gap: number = PANEL_GAP,
  contentWidth?: number,
): PanelPlacement => {  const height = Math.min(Math.max(panelHeight, 0), PANEL_MAX_HEIGHT);
  const spaceBelow = viewport.height - trigger.bottom;
  const spaceAbove = trigger.top;
  const upward = spaceBelow < height + gap && spaceAbove > spaceBelow;
  const top = upward ? trigger.top - height - gap : trigger.bottom + gap;
  const fittedWidth =
    contentWidth === undefined
      ? trigger.width
      : Math.max(trigger.width, Math.max(contentWidth, 0));
  const width = Math.max(0, Math.min(fittedWidth, viewport.width - PANEL_EDGE_MARGIN * 2));
  const maxLeft = Math.max(PANEL_EDGE_MARGIN, viewport.width - width - PANEL_EDGE_MARGIN);
  const left = Math.min(Math.max(trigger.left, PANEL_EDGE_MARGIN), maxLeft);
  return { top: Math.max(top, PANEL_EDGE_MARGIN), left, width, upward };
};

/**
 * Shallow placement equality. The panel state is replaced on every
 * measurement, so callers must skip identical frames or each scroll tick
 * rerenders the whole option list for no visible change.
 */
export const isSamePlacement = (
  current: PanelPlacement | null,
  next: PanelPlacement | null,
): boolean => {
  if (current === null || next === null) return current === next;
  return (
    current.top === next.top &&
    current.left === next.left &&
    current.width === next.width &&
    current.upward === next.upward
  );
};

/**
 * Position-only tracking for an open panel during scrolling.
 * Width and the above/below decision are frozen from the open-time
 * measurement: neither the trigger width nor the content width
 * legitimately changes because the page scrolled, so recomputing them
 * per scroll tick can only inject instability (transient scrollWidth,
 * scrollbar-threshold edges, fractional rects). The panel instead stays
 * glued to its trigger with byte-identical dimensions. Content height is
 * passed in by the caller (read live; it only changes with the content,
 * which takes the full-measure path). Pure and tested.
 */
export const trackPanelPosition = (
  trigger: PanelTriggerRect,
  panelHeight: number,
  frozenWidth: number,
  upward: boolean,
  viewport: PanelViewport,
  gap: number = PANEL_GAP,
): { top: number; left: number } => {
  const height = Math.min(Math.max(panelHeight, 0), PANEL_MAX_HEIGHT);
  const top = upward ? trigger.top - height - gap : trigger.bottom + gap;
  const maxLeft = Math.max(PANEL_EDGE_MARGIN, viewport.width - frozenWidth - PANEL_EDGE_MARGIN);
  const left = Math.min(Math.max(trigger.left, PANEL_EDGE_MARGIN), maxLeft);
  return { top: Math.max(top, PANEL_EDGE_MARGIN), left };
};

export type OptionVisualState = "selected" | "hover" | "keyboard" | "default";

/**
 * Resolve how an option row renders. Precedence is deliberate and total:
 * selection always wins (a selected row never shows hover styling),
 * otherwise the row under the pointer wins, otherwise the keyboard-active
 * row gets a subtle focus ring, otherwise the row is idle. Mouse hover,
 * selection, and keyboard highlight are therefore visually independent.
 */
export const resolveOptionVisualState = (input: {
  selected: boolean;
  hovered: boolean;
  keyboardActive: boolean;
}): OptionVisualState => {
  if (input.selected) return "selected";
  if (input.hovered) return "hover";
  if (input.keyboardActive) return "keyboard";
  return "default";
};

const SELECT_SIZES: Record<
  SelectSize,
  { trigger: string; chevron: string; icon: string; optionText: string }
> = {
  sm: {
    trigger: "h-8 px-3 text-xs rounded",
    chevron: "h-3.5 w-3.5",
    icon: "h-3.5 w-3.5",
    optionText: "text-xs",
  },
  md: {
    trigger: "h-10 px-4 text-sm rounded-md",
    chevron: "h-4 w-4",
    icon: "h-4 w-4",
    optionText: "text-sm",
  },
  lg: {
    trigger: "h-12 px-4 text-base rounded-md",
    chevron: "h-5 w-5",
    icon: "h-5 w-5",
    optionText: "text-sm",
  },
};

// Trigger visuals mirror Input's default variant exactly (see input.tsx):
// same dimensions, border, radius, typography, placeholder, focus, error,
// and disabled treatment, so siblings render identically side by side.
// The open state reuses the focus treatment via aria-expanded. These sets
// are inlined at the trigger below (rather than hoisted) so each usage
// site stays greppable against input.tsx.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value: controlledValue,
      defaultValue = "",
      onChange,
      onBlur,
      name,
      id: customId,
      placeholder = "Select option",
      disabled = false,
      required = false,
      error,
      helperText,
      label,
      startIcon,
      searchable = false,
      searchPlaceholder = "Search...",
      emptyMessage = "No options available",
      defaultOpen = false,
      size = "md",
      wrapperClassName,
      className,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledby,
      "aria-describedby": ariaDescribedby,
      "aria-invalid": ariaInvalid,
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const listboxId = `${id}-listbox`;
    const hasError = ariaInvalid ?? Boolean(error);
    const sizeConfig = SELECT_SIZES[size];

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue);
    const value = isControlled ? controlledValue : internalValue;

    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [searchQuery, setSearchQuery] = useState("");
    // highlightIndex is the keyboard cursor (drives aria-activedescendant
    // and Enter-to-select). hoverIndex tracks the pointer only. The two
    // are styled independently so opening the menu or moving the mouse
    // never confuses one for the other.
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const [placement, setPlacement] = useState<PanelPlacement | null>(null);
    // Portal rendering requires a mounted DOM. Until then (SSR, static
    // markup tests) the panel falls back to inline rendering so markup
    // stays identical between server and first client paint.
    const [mounted, setMounted] = useState(false);

    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const optionRefs = useRef(new Map<number, HTMLDivElement>());

    useEffect(() => {
      setMounted(true);
    }, []);

    // Combine forwarded ref (e.g. React Hook Form) with the internal ref.
    const setTriggerRef = useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const visibleOptions = useMemo(
      () => (searchable ? filterSelectOptions(options, searchQuery) : [...options]),
      [options, searchable, searchQuery],
    );
    const selectedOption = useMemo(
      () => getSelectedOption(visibleOptions, value) ?? getSelectedOption(options, value),
      [visibleOptions, options, value],
    );
    const displayIcon = selectedOption?.icon ?? startIcon;

    const open = useCallback(() => {
      if (disabled) return;
      setSearchQuery("");
      setPlacement(null);
      setHoverIndex(null);
      // Highlight the selected option for keyboard users, or nothing when
      // there is no selection. Never pre-apply mouse-hover styling: hover
      // belongs exclusively to the pointer (see hoverIndex).
      const selectedIndex = options.findIndex((option) => option.value === value);
      setHighlightIndex(selectedIndex);
      setIsOpen(true);
    }, [disabled, options, value]);

    const close = useCallback((restoreFocus: boolean) => {
      setIsOpen(false);
      setSearchQuery("");
      setHoverIndex(null);
      if (restoreFocus) {
        triggerRef.current?.focus();
      }
    }, []);

    const selectValue = useCallback(
      (nextValue: string) => {
        const option = getSelectedOption(options, nextValue);
        if (!option || option.disabled) return;
        if (!isControlled) {
          setInternalValue(nextValue);
        }
        onChange?.(nextValue);
        close(false);
        triggerRef.current?.focus();
      },
      [options, isControlled, onChange, close],
    );

    // Measure and position the portal panel when it opens, when its
    // content set changes, and when the viewport resizes. Width comes
    // from a single content measurement per content set: recomputing it
    // on every scroll tick lets transient render state (font swaps,
    // scrollbar thresholds, fractional rects) resize the panel mid-scroll.
    // Scrolling therefore only tracks position (see the scroll listener
    // below), keeping dimensions byte-identical while open. Hidden until
    // the first measurement so no misplaced frame ever paints.
    // scrollWidth reports the full content width (labels never wrap), so
    // the panel grows to fit its longest line instead of truncating it.
    const measurePanel = useCallback(() => {
      const trigger = triggerRef.current;
      const list = listRef.current;
      if (!trigger || !list) return null;
      const rect = trigger.getBoundingClientRect();
      // Reserve room for a vertical scrollbar when the list overflows,
      // so the longest label is never clipped behind it.
      const scrollbarAllowance = list.scrollHeight > list.clientHeight ? 16 : 0;
      return computePanelPlacement(
        { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
        list.scrollHeight,
        { width: window.innerWidth, height: window.innerHeight },
        PANEL_GAP,
        list.scrollWidth + scrollbarAllowance,
      );
    }, []);

    useEffect(() => {
      if (!isOpen || !mounted) return;
      setPlacement((previous) => {
        const next = measurePanel();
        return next && !isSamePlacement(previous, next) ? next : previous;
      });
      const handleResize = () => {
        // A resize can legitimately change the trigger width and the
        // viewport clamp, so it takes a full remeasurement.
        setPlacement((previous) => {
          const next = measurePanel();
          return next && !isSamePlacement(previous, next) ? next : previous;
        });
      };
      const handleScroll = () => {
        // Track the trigger with frozen width and direction: position
        // follows the page, dimensions stay exactly as measured at open.
        // Content height is read live (it never changes mid-scroll without
        // a content update, which takes the full-measure path instead).
        // No-op frames (e.g. scrolling inside the option list itself)
        // keep referential state so nothing rerenders.
        setPlacement((previous) => {
          if (!previous) return previous;
          const trigger = triggerRef.current;
          const list = listRef.current;
          if (!trigger || !list) return previous;
          const rect = trigger.getBoundingClientRect();
          const { top, left } = trackPanelPosition(
            { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
            list.scrollHeight,
            previous.width,
            previous.upward,
            { width: window.innerWidth, height: window.innerHeight },
            PANEL_GAP,
          );
          const next: PanelPlacement = { top, left, width: previous.width, upward: previous.upward };
          return isSamePlacement(previous, next) ? previous : next;
        });
      };
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, { capture: true });
      };
    }, [isOpen, mounted, measurePanel, visibleOptions]);

    // Focus the search field when it becomes available.
    useEffect(() => {
      if (isOpen && searchable) {
        searchRef.current?.focus();
      }
    }, [isOpen, searchable]);

    // Close on outside pointer interaction. The portal panel lives
    // outside the root element, so both subtrees are checked.
    useEffect(() => {
      if (!isOpen) return;
      const handlePointerDown = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node | null;
        if (!target) return;
        const insideRoot = rootRef.current?.contains(target) ?? false;
        const insidePanel = panelRef.current?.contains(target) ?? false;
        if (!insideRoot && !insidePanel) {
          close(false);
        }
      };
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
      };
    }, [isOpen, close]);

    const moveHighlight = useCallback(
      (move: HighlightMove) => {
        setHighlightIndex((current) => {
          const next = moveHighlightIndex(visibleOptions, current, move);
          if (next >= 0) {
            // Scroll after paint so the element exists with final layout.
            requestAnimationFrame(() => {
              optionRefs.current
                .get(next)
                ?.scrollIntoView({ block: "nearest" });
            });
          }
          return next;
        });
      },
      [visibleOptions],
    );

    // Move focus to the next (or previous with Shift) focusable element
    // relative to the trigger. Needed because the portal panel sits at the
    // end of the document, outside the natural tab order.
    const moveFocusForTab = useCallback((backward: boolean) => {
      const trigger = triggerRef.current;
      if (typeof document === "undefined" || !trigger) return;
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (element) =>
          element.getClientRects().length > 0 &&
          !panelRef.current?.contains(element),
      );
      const ordered = backward ? [...candidates].reverse() : candidates;
      const passing = (element: HTMLElement): boolean =>
        backward
          ? Boolean(
              trigger.compareDocumentPosition(element) &
                Node.DOCUMENT_POSITION_PRECEDING,
            )
          : Boolean(
              trigger.compareDocumentPosition(element) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            );
      const next = ordered.find(passing);
      if (next) {
        next.focus();
      } else {
        trigger.blur();
      }
    }, []);

    const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        event.key.length === 1;

      if (event.key === "Tab") {
        if (isOpen) {
          event.preventDefault();
          close(false);
          moveFocusForTab(event.shiftKey);
        }
        return;
      }

      if (!isOpen) {
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key === "ArrowDown" ||
          event.key === "ArrowUp"
        ) {
          // Space would otherwise scroll the page or activate as a button.
          event.preventDefault();
          open();
        }
        return;
      }

      if (isTyping) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHighlight("next");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHighlight("previous");
      } else if (event.key === "Home") {
        event.preventDefault();
        moveHighlight("first");
      } else if (event.key === "End") {
        event.preventDefault();
        moveHighlight("last");
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const highlighted = highlightIndex >= 0 ? visibleOptions[highlightIndex] : undefined;
        if (highlighted && !highlighted.disabled) {
          selectValue(highlighted.value);
        }
      }
    };

    const handleTriggerBlur = (event: FocusEvent<HTMLButtonElement>) => {
      // Only treat blur as "left the select" when focus truly leaves both
      // the trigger subtree and the portal panel, so tabbing into the
      // search field keeps the dropdown open.
      const related = event.relatedTarget as Node | null;
      const insideRoot = !!related && (rootRef.current?.contains(related) ?? false);
      const insidePanel = !!related && (panelRef.current?.contains(related) ?? false);
      if (!related || (!insideRoot && !insidePanel)) {
        if (isOpen) close(false);
        onBlur?.(event);
      }
    };

    const highlightedOption =
      highlightIndex >= 0 ? visibleOptions[highlightIndex] : undefined;

    const panelContent = (
      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel ?? (typeof label === "string" ? label : "Options")}
        aria-activedescendant={
          highlightedOption ? `${listboxId}-option-${highlightIndex}` : undefined
        }
        onMouseLeave={() => setHoverIndex(null)}
        className={cn(
          "max-h-64 w-full overflow-y-auto overflow-x-hidden rounded-xl border border-card-border bg-surface-elevated p-1.5 shadow-card",
          "animate-in fade-in-0 zoom-in-[0.98] duration-150 ease-out motion-reduce:animate-none",
        )}
      >
        {searchable && (
          <div className="sticky top-0 bg-surface-elevated pb-1.5">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                type="text"
                role="searchbox"
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setHighlightIndex(-1);
                }}
                className="h-8 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground caret-primary outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>
        )}

        {visibleOptions.length === 0 ? (
          <p role="status" className="px-2.5 py-3 text-center text-xs text-muted">
            {searchQuery ? "No results found" : emptyMessage}
          </p>
        ) : (
                visibleOptions.map((option, index) => {
                  const visual = resolveOptionVisualState({
                    selected: option.value === value,
                    hovered: hoverIndex === index,
                    keyboardActive: highlightIndex === index,
                  });
                  const isSelected = visual === "selected";
                  return (
              <div
                key={option.value}
                ref={(node) => {
                  if (node) {
                    optionRefs.current.set(index, node);
                  } else {
                    optionRefs.current.delete(index);
                  }
                }}
                id={`${listboxId}-option-${index}`}
                role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        onClick={() => selectValue(option.value)}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => {
                          if (option.disabled) return;
                          // Pointer and keyboard cursors stay in sync so
                          // Enter-to-select and aria-activedescendant follow
                          // the row under the pointer.
                          setHoverIndex(index);
                          setHighlightIndex(index);
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 select-none outline-none",
                          sizeConfig.optionText,
                          "focus-visible:ring-1 focus-visible:ring-ring",
                          visual === "selected" &&
                            "bg-primary-muted font-semibold text-foreground",
                          visual === "hover" && "bg-surface-muted/60 text-foreground font-medium",
                          visual === "keyboard" &&
                            "font-medium text-foreground/80 ring-1 ring-inset ring-ring",
                          visual === "default" && "font-medium text-foreground/80",
                          option.disabled && "pointer-events-none cursor-not-allowed opacity-50",
                        )}
                      >
                {option.icon && (
                  <span className="flex shrink-0 items-center justify-center text-muted" aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                      <span className="min-w-0 flex-1">
                        <span className="block whitespace-nowrap" title={option.label}>
                          {option.label}
                        </span>
                  {option.description && (
                    <span className="block truncate text-[11px] font-normal text-muted">
                      {option.description}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                )}
              </div>
            );
          })
        )}
      </div>
    );

    const usePortal = mounted && typeof document !== "undefined";

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

        <div
          ref={rootRef}
          className="relative w-full"
          onKeyDown={handleContainerKeyDown}
        >
          <button
            ref={setTriggerRef}
            id={id}
            name={name}
            type="button"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            aria-activedescendant={
              isOpen && highlightedOption ? `${listboxId}-option-${highlightIndex}` : undefined
            }
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            aria-describedby={ariaDescribedby ?? (hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined)}
            aria-invalid={hasError}
            aria-required={required || undefined}
            disabled={disabled}
            onClick={() => {
              if (isOpen) {
                close(false);
              } else {
                open();
              }
            }}
            onBlur={handleTriggerBlur}
            className={cn(
              "flex w-full items-center gap-2 border text-left text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-200",
              "border-card-border bg-card-background shadow-card",
              "hover:border-border-strong",
              "focus:border-primary focus:bg-[linear-gradient(145deg,rgba(46,65,115,0.10),rgba(20,29,52,0.10))]",
              "focus:shadow-[0_0_0_1px_rgba(118,143,255,0.25),0_0_20px_rgba(74,99,216,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
              "aria-expanded:border-primary aria-expanded:bg-[linear-gradient(145deg,rgba(46,65,115,0.10),rgba(20,29,52,0.10))]",
              "aria-expanded:shadow-[0_0_0_1px_rgba(118,143,255,0.25),0_0_20px_rgba(74,99,216,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
              sizeConfig.trigger,
              disabled && "cursor-not-allowed opacity-50 focus:scale-100",
              hasError &&
                "border-error focus:border-error focus:shadow-[0_0_0_1px_rgba(244,63,94,0.30),0_0_22px_rgba(244,63,94,0.25),inset_0_1px_0_rgba(255,255,255,0.08)] aria-expanded:border-error aria-expanded:shadow-[0_0_0_1px_rgba(244,63,94,0.30),0_0_22px_rgba(244,63,94,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
              className,
            )}
          >
            {displayIcon && (
              <span className="pointer-events-none flex shrink-0 items-center justify-center text-muted" aria-hidden="true">
                {displayIcon}
              </span>
            )}
            <span className={cn("min-w-0 flex-1 truncate", !selectedOption && "text-muted-foreground")} title={selectedOption?.label}>{selectedOption ? selectedOption.label : placeholder}</span>
            <ChevronDown
              className={cn(
                "shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none",
                sizeConfig.chevron,
                isOpen && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>

          {isOpen &&
            (usePortal ? (
              createPortal(
                <div
                  ref={panelRef}
                  style={
                    placement
                      ? {
                          position: "fixed",
                          top: placement.top,
                          left: placement.left,
                          width: placement.width,
                          zIndex: 50,
                        }
                      : { position: "fixed", visibility: "hidden", zIndex: 50 }
                  }
                >
                  {panelContent}
                </div>,
                document.body,
              )
            ) : (
              // Server/static fallback: same out-of-flow fixed positioning
              // so markup — and therefore layout impact — matches the
              // portal path; hidden until the client measures and portals.
              <div ref={panelRef} style={{ position: "fixed", visibility: "hidden", zIndex: 50 }}>
                {panelContent}
              </div>
            ))}
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

Select.displayName = "Select";

export { Select };
export default Select;
