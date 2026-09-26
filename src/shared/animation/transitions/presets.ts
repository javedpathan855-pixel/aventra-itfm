import type { Transition } from "framer-motion";
import { DURATIONS } from "../tokens/durations";
import { EASINGS } from "../tokens/easings";

export const transitions = {
  smooth: {
    duration: DURATIONS.normal,
    ease: EASINGS.smooth,
  },
  gentle: {
    duration: DURATIONS.medium,
    ease: EASINGS.gentle,
  },
  fast: {
    duration: DURATIONS.fast,
    ease: EASINGS.smooth,
  },
  authIntroShowcase: {
    duration: DURATIONS.intro,
    times: [0, 0.35, 1],
    ease: EASINGS.smooth,
  },
  authIntroFormSection: {
    duration: DURATIONS.slow,
    // Starts after the showcase settles left (showcase intro duration).
    delay: DURATIONS.intro,
    ease: EASINGS.gentle,
  },
  authFormTransition: {
    duration: DURATIONS.normal,
    ease: EASINGS.gentle,
  },
} satisfies Record<string, Transition>;
