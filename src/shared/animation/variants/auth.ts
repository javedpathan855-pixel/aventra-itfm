import type { Variants } from "framer-motion";
import { transitions } from "../transitions/presets";
import { DURATIONS } from "../tokens/durations";
import { EASINGS } from "../tokens/easings";

/**
 * Keyframe intro animation for the left showcase hero section
 */
export const authShowcaseIntroVariants: Variants = {
  initial: {
    left: "50%",
    opacity: 0,
  },
  animate: {
    left: ["50%", "50%", "25%"],
    opacity: [0, 1, 1],
    transition: transitions.authIntroShowcase,
  },
};

/**
 * Delayed entrance animation for the right form container section
 */
export const authFormSectionIntroVariants: Variants = {
  initial: {
    left: "50%",
    opacity: 0,
    x: 40,
  },
  animate: {
    left: "50%",
    opacity: 1,
    x: 0,
    transition: transitions.authIntroFormSection,
  },
};

/**
 * Smooth transition variant for toggling auth showcase views (Login <-> Forgot Password <-> Register)
 */
export const authShowcaseModeVariants: Variants = {
  initial: {
    opacity: 0,
    x: -24,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: 24,
    filter: "blur(4px)",
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};

/**
 * Smooth transition variant for auth forms (LoginForm and ForgotPasswordForm)
 */
export const authFormModeVariants: Variants = {
  initial: {
    opacity: 0,
    x: 24,
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
    x: -24,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};
