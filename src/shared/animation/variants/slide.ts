import type { Variants } from "framer-motion";
import { DURATIONS } from "../tokens/durations";
import { EASINGS } from "../tokens/easings";

export const slideInRightVariants: Variants = {
  initial: {
    opacity: 0,
    x: 32,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: -32,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};

export const slideInLeftVariants: Variants = {
  initial: {
    opacity: 0,
    x: -32,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: 32,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};
