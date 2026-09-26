import type { Variants } from "framer-motion";
import { DURATIONS } from "../tokens/durations";
import { EASINGS } from "../tokens/easings";

export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: 16,
    scale: 0.94,
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
    y: -12,
    scale: 0.92,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};
