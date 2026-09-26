import type { Variants } from "framer-motion";
import { DURATIONS } from "../tokens/durations";
import { EASINGS } from "../tokens/easings";

export const fadeInVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
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
