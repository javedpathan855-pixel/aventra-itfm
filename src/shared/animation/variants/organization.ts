import type { Variants } from "framer-motion";
import { DURATIONS } from "../tokens/durations";
import { EASINGS } from "../tokens/easings";

/**
 * Organization section animations.
 *
 * Follows the auth variant conventions: opacity + transform only (GPU
 * friendly, no layout properties), durations/easings from shared tokens.
 * Respects `prefers-reduced-motion` via `<MotionConfig reducedMotion="user">`
 * at the view root — never add per-variant media handling here.
 */

/**
 * Stagger container for page/section entrances (management view, overview
 * grid, detail views). Orchestrates descendant `orgSectionItemVariants`
 * children in tree order.
 */
export const orgPageStaggerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

/**
 * Tighter stagger for card lists (locations, departments). Nests inside
 * `orgPageStaggerVariants`: the page orchestrates heading, toolbar and the
 * list section, then the list cascades its cards at a shorter interval so
 * long pages still settle quickly. No `delayChildren` — the list starts as
 * soon as its stagger slot begins.
 */
export const orgCardStaggerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.035,
    },
  },
};

/**
 * Standard entrance item: subtle rise + fade. Used for header cards,
 * readiness cards, tab bars, summary cards and list rows.
 */
export const orgSectionItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};

/**
 * Tab content transitions. Mirrors the auth form-switch rhythm
 * (fade + small horizontal shift) for a consistent product feel.
 */
export const orgTabContentVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.gentle,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};

/**
 * Dialog backdrop fade. Pairs with `orgDialogPanelVariants`.
 */
export const orgDialogBackdropVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};

/**
 * Dialog panel entrance: fade + settle-up + subtle scale (matches the
 * previous `zoom-in-95` CSS treatment). Transform/opacity only.
 */
export const orgDialogPanelVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.97,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.97,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};
