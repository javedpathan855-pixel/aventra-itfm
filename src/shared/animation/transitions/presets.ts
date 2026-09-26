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
    times: [0, 0.5, 1],
    ease: EASINGS.smooth,
  },
  authIntroFormSection: {
    duration: DURATIONS.slow,
    delay: 1.75,
    ease: EASINGS.gentle,
  },
  authFormTransition: {
    duration: DURATIONS.normal,
    ease: EASINGS.gentle,
  },
} satisfies Record<string, Transition>;
